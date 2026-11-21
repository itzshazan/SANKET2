"""Live monitoring: real data in, honest status out.

Fallback chain per input (every value carries status = live | stale | unavailable):
  rainfall / soil / temperature / wind : Open-Meteo forecast API -> three-hour AWS Open Data on quota errors
                                         -> last real reading (<= 48 h) -> unavailable
  terrain                              : Copernicus GLO-30 (cached forever)  ->  Open-Meteo 90 m
                                         elevation (elevation only)  ->  unavailable
  NDVI                                 : Sentinel-2 / CDSE  ->  last real value  ->  unavailable
  landslide history                    : imported inventory file  ->  unavailable
No value is ever invented. If rainfall is unavailable the hazard level is "unknown".
"""

import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence, Tuple

from ..inference import threshold_model as tm
from ..ml import predict as ml
from ..sources import ifs_open_data, openmeteo, sentinel2, terrain
from ..sources.cache import DiskCache, point_key
from ..sources.http import SourceError
from . import geo, hotspots, inventory

MAX_STALE_S = 48 * 3600
SEVERITY = {"unknown": -1, "normal": 0, "watch": 1, "warning": 2, "danger": 3}
_weather_cache = DiskCache("weather_last_good_v2")
_weather_lock = threading.Lock()
WEATHER_BATCH_SIZE = 20


# ----------------------------------------------------------------------------- weather
def _weather_fallback(hit, now: float, exc: SourceError) -> Dict[str, Any]:
    meta = {"reason": str(exc), "issue": "rate_limited" if exc.status == 429 else "feed_unavailable"}
    if hit and now - hit[1] <= MAX_STALE_S:
        return {**hit[0], **meta, "status": "stale", "age_minutes": int((now - hit[1]) / 60)}
    return {**meta, "status": "unavailable"}


def _weather_is_current(hit, now: datetime) -> bool:
    if not hit:
        return False
    reading, _ = hit
    step = reading.get("interval_hours", 1)
    expected = now.replace(hour=now.hour - now.hour % step, minute=0, second=0, microsecond=0)
    return reading["hourly"]["time"][-1] == expected.strftime("%Y-%m-%dT%H:00")


def _open_data_fallback(keys, points, readings, saved):
    try:
        fallback = ifs_open_data.fetch_live([points[key] for key in keys])
    except SourceError:
        return
    for key, weather in zip(keys, fallback):
        if not any(value is not None for value in weather["hourly"]["precipitation"]):
            continue
        saved[key] = weather
        readings[key] = {**weather, "status": "live", "age_minutes": 0}


def weather_for(points: Sequence[Tuple[float, float]]) -> List[Dict[str, Any]]:
    """Reuse completed-hour weather across dashboard and detail calls, then fetch missing points."""
    point_by_key = {point_key(*p): p for p in points}
    with _weather_lock:
        now = datetime.now(timezone.utc)
        hits = {key: _weather_cache.get(key) for key in point_by_key}
        readings = {}
        missing = []
        for key, hit in hits.items():
            if _weather_is_current(hit, now):
                readings[key] = {**hit[0], "status": "live", "age_minutes": int((now.timestamp() - hit[1]) / 60)}
            else:
                missing.append(key)

        saved = {}
        for start in range(0, len(missing), WEATHER_BATCH_SIZE):
            keys = missing[start:start + WEATHER_BATCH_SIZE]
            try:
                live = openmeteo.fetch_live([point_by_key[key] for key in keys])
            except SourceError as exc:
                remaining = missing[start:] if exc.status == 429 else keys
                readings.update({key: _weather_fallback(hits[key], now.timestamp(), exc) for key in remaining})
                if exc.status == 429:
                    _open_data_fallback(remaining, point_by_key, readings, saved)
                    break
            else:
                saved.update(zip(keys, live))
                readings.update({key: {**w, "status": "live", "age_minutes": 0} for key, w in zip(keys, live)})
        _weather_cache.set_many(saved)
    return [readings[point_key(*p)] for p in points]


def _last(values: list) -> Optional[float]:
    for v in reversed(values or []):
        if v is not None:
            return round(float(v), 3)
    return None


def summarize_weather(w: Dict[str, Any]) -> Dict[str, Any]:
    if w.get("status") == "unavailable":
        return {"status": "unavailable", "reason": w.get("reason"), "issue": w.get("issue")}
    h = w["hourly"]
    p = h["precipitation"]
    step = w.get("interval_hours", 1)
    last_day = [v for v in p[-24:] if v is not None]
    chart_count = 72 // step
    return {
        "status": w["status"], "age_minutes": w.get("age_minutes", 0), "reason": w.get("reason"),
        "issue": w.get("issue"),
        "source": w["source"], "fetched_at": w["fetched_at"],
        "window_end_utc": h["time"][-1] + "Z", "interval_hours": step,
        "rain_mm": {str(k): v for k, v in tm.window_sums(p, step_hours=step).items()},
        "max_hourly_rain_24h_mm": round(max(last_day), 1) if step == 1 and last_day else None,
        "soil_moisture_7_28cm": _last(h.get("soil_moisture_7_to_28cm")),
        "soil_moisture_28_100cm": _last(h.get("soil_moisture_28_to_100cm")),
        "temperature_c": _last(h.get("temperature_2m")),
        "wind_kmh": _last(h.get("wind_speed_10m")),
        "wind_gust_kmh": _last(h.get("wind_gusts_10m")),
        "hourly_rain_72h": [{"time": t + "Z", "mm": v}
                            for t, v in zip(h["time"][-chart_count:], p[-chart_count:])],
    }


# ----------------------------------------------------------------------------- terrain
def terrain_for(lat: float, lon: float, cached_only: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if cached_only:
        return {**cached_only, "status": "live"}
    t = terrain.terrain_at(lat, lon)
    if t:
        return {**t, "status": "live"}
    try:
        elev = openmeteo.elevation_points([(lat, lon)])[0]
        return {"status": "partial", "elevation_m": elev, "source": "Open-Meteo elevation (Copernicus GLO-90)",
                "reason": "Copernicus GLO-30 tile unreachable; slope/curvature/TWI unavailable"}
    except (SourceError, IndexError) as exc:
        return {"status": "unavailable", "reason": str(exc)}


# ----------------------------------------------------------------------------- evaluation
def _evaluate(w: Dict[str, Any], region_id: str, key: Optional[str]) -> Dict[str, Any]:
    if w.get("status") == "unavailable":
        return {"level": "unknown", "ratio": None, "reason": "no rainfall data (live and last-known both unavailable)",
                "region": tm.region_info(region_id)}
    return tm.hysteresis.evaluate(key, w["hourly"]["precipitation"], region_id,
                                  step_hours=w.get("interval_hours", 1))


def _apply_terrain_gate(ev: Dict[str, Any], terrain: Dict[str, Any]) -> None:
    """Rainfall thresholds describe hillslopes; on flat ground they are not applied."""
    gate = tm.CONFIG.get("terrain_gate") or {}
    cut = gate.get("min_steepest_slope_1km_deg")
    steep = (terrain or {}).get("steepest_slope_1km_deg")
    if cut is None or steep is None:
        return                      # unknown terrain: keep the rainfall rule (never silently relax it)
    ev["terrain_gate"] = {"steepest_slope_1km_deg": steep, "min_deg": cut, "applicable": steep >= cut,
                          "note": gate.get("note")}
    if steep < cut and ev.get("level") not in (None, "unknown"):
        ev["rain_level"] = ev["level"]
        ev["level"] = "normal"
        ev["reason"] = f"not landslide terrain: steepest slope within 1 km is {steep} deg (< {cut} deg)"


def assess_point(lat: float, lon: float, *, state: Optional[str] = None, key: Optional[str] = None,
                 with_terrain: bool = True, with_ndvi: bool = False, weather: Optional[Dict[str, Any]] = None,
                 cached_terrain: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    district = None
    if state is None:
        state, district = geo.locate(lat, lon)
    region_id = tm.region_for_state(state)
    w = weather or weather_for([(lat, lon)])[0]
    confidence = (ml.confidence(w["hourly"], lat, lon, interval_hours=w.get("interval_hours", 1))
                  if w.get("status") != "unavailable" else {"status": "unavailable", "reason": "no weather data"})
    out = {
        "latitude": lat, "longitude": lon, "state": state, "district": district,
        "evaluation": _evaluate(w, region_id, key),
        "weather": summarize_weather(w),
        "landslide_history": inventory.nearby_count(lat, lon),
        "confidence": confidence,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "model": tm.MODEL_NAME,
    }
    if with_terrain:
        out["terrain"] = terrain_for(lat, lon, cached_terrain)
        _apply_terrain_gate(out["evaluation"], out["terrain"])
    if with_ndvi:
        out["vegetation"] = sentinel2.ndvi_at(lat, lon)
    return out


# ----------------------------------------------------------------------------- districts
_registry = {d["id"]: d for d in hotspots.load_districts()}


def registry() -> Dict[str, Dict[str, Any]]:
    return _registry


def assess_district(district_id: str, detail: bool = False,
                    weather_by_point: Optional[Dict[Tuple[float, float], Dict[str, Any]]] = None) -> Dict[str, Any]:
    d = _registry[district_id]
    hs = hotspots.load()[district_id]
    pts = hs["points"]
    locations = [(p["lat"], p["lon"]) for p in pts]
    weathers = weather_for(locations) if weather_by_point is None else [weather_by_point[p] for p in locations]
    hourly_locations = [loc for loc, w in zip(locations, weathers)
                        if w["status"] != "unavailable" and w.get("interval_hours", 1) == 1]
    if hourly_locations:
        ml.prefetch_terrain(hourly_locations)
    results = []

    def one(i):
        p = pts[i]
        return assess_point(p["lat"], p["lon"], state=d["state"], key=p["id"], weather=weathers[i],
                            with_terrain=detail or "terrain" in p, with_ndvi=detail,
                            cached_terrain=p.get("terrain"))

    if detail:
        with ThreadPoolExecutor(max_workers=5) as pool:
            results = list(pool.map(one, range(len(pts))))
    else:
        results = [one(i) for i in range(len(pts))]

    worst_i = max(range(len(results)), key=lambda i: (SEVERITY[results[i]["evaluation"]["level"]],
                                                      results[i]["evaluation"].get("ratio") or 0))
    worst = results[worst_i]
    hotspot_rows = []
    for p, r in zip(pts, results):
        t = r.get("terrain") or {}
        row = {
            "id": p["id"], "lat": p["lat"], "lon": p["lon"], "susceptibility": p.get("susceptibility"),
            "level": r["evaluation"]["level"], "ratio": r["evaluation"].get("ratio"),
            "governing_window": r["evaluation"].get("governing_window"),
            "rain_24h_mm": (r["weather"].get("rain_mm") or {}).get("24"),
            "rain_72h_mm": (r["weather"].get("rain_mm") or {}).get("72"),
            "slope_deg": t.get("slope_deg"), "elevation_m": t.get("elevation_m"),
            "weather_status": r["weather"]["status"],
            "confidence": r["confidence"].get("confidence"),
            "confidence_variant": r["confidence"].get("variant"),
        }
        if detail:
            row.update({"terrain": r.get("terrain"), "vegetation": r.get("vegetation"), "confidence_detail": r["confidence"],
                        "evaluation": r["evaluation"], "landslide_history": r["landslide_history"]})
        hotspot_rows.append(row)

    statuses = {r["weather"]["status"] for r in results}
    confs = [row for row in hotspot_rows if row["confidence"] is not None]
    top_conf = max(confs, default={}, key=lambda row: (row["confidence_variant"] == "hourly", row["confidence"]))
    out = {
        **d,
        "level": worst["evaluation"]["level"],
        "ratio": worst["evaluation"].get("ratio"),
        "governing_hotspot": pts[worst_i]["id"],
        "governing_window": worst["evaluation"].get("governing_window"),
        "threshold_region": worst["evaluation"].get("region"),
        "weather": {k: v for k, v in worst["weather"].items() if k != "hourly_rain_72h" or detail},
        "weather_status": "live" if statuses == {"live"} else "unavailable" if statuses == {"unavailable"} else "stale",
        "weather_issue": next((w["issue"] for w in weathers if w.get("issue") == "rate_limited"), None),
        "hotspot_source": hs["source"],
        "confidence": top_conf.get("confidence"), "confidence_hotspot": top_conf.get("id"),
        "confidence_variant": top_conf.get("confidence_variant"),
        "confidence_status": "live" if confs else (results[0]["confidence"].get("status") if results else "unavailable"),
        "hotspots": hotspot_rows,
        "evaluated_at": worst["evaluated_at"],
    }
    if detail:
        out["evaluation"] = worst["evaluation"]
    return out


_live_cache: Dict[str, Any] = {"value": None, "ts": 0.0}
_live_lock = threading.Lock()
LIVE_TTL_S = 600


def all_districts_live(force: bool = False) -> Dict[str, Any]:
    requested_at = time.time()
    with _live_lock:
        cached = _live_cache["value"]
        if cached and (_live_cache["ts"] >= requested_at or
                       (not force and requested_at - _live_cache["ts"] < LIVE_TTL_S)):
            return {**cached, "cached": True}
        return _refresh_districts_live()


def _refresh_districts_live() -> Dict[str, Any]:
    locations = [(p["lat"], p["lon"]) for district in hotspots.load().values() for p in district["points"]]
    weather_by_point = dict(zip(locations, weather_for(locations)))

    def safe(did):
        try:
            return did, assess_district(did, weather_by_point=weather_by_point)
        except Exception as exc:   # one bad district must not hide the others
            d = _registry[did]
            return did, {**d, "level": "unknown", "ratio": None, "weather_status": "unavailable",
                         "error": f"{type(exc).__name__}: {exc}", "hotspots": []}

    with ThreadPoolExecutor(max_workers=3) as pool:
        districts = dict(pool.map(safe, list(_registry)))
    counts = {lv: 0 for lv in SEVERITY}
    for v in districts.values():
        counts[v["level"]] += 1
    value = {
        "districts": districts, "count": len(districts), "counts": counts,
        "model": tm.MODEL_NAME, "levels": tm.CONFIG["levels"],
        "updated_at": datetime.now(timezone.utc).isoformat(), "cache_ttl_seconds": LIVE_TTL_S, "cached": False,
    }
    _live_cache.update(value=value, ts=time.time())
    return value
