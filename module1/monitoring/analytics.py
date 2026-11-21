"""Real time series for the Analytics page and real-event replays for the History page."""

import json
import time
from collections import OrderedDict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..inference import threshold_model as tm
from ..sources import openmeteo
from ..sources.cache import DiskCache, point_key
from ..sources.http import SourceError

EVENTS_PATH = Path(__file__).resolve().parent.parent / "config" / "events.json"
LOOKBACK_EXTRA_DAYS = 10        # rainfall needed before day 1 so long windows are complete
_series_cache = DiskCache("series_last_good_v2")
_history_cache = DiskCache("history_era5_v2")   # reanalysis does not change: kept forever


def _hourly_levels(times: List[str], precip: List[Optional[float]], region_id: str):
    """Threshold ratio + level at every hour, using only rain up to that hour."""
    rows = []
    for i in range(len(times)):
        ev = tm.evaluate(precip[: i + 1], region_id)
        rows.append({"time": times[i], "ratio": ev["ratio"], "level": ev["level"],
                     "window": (ev.get("governing_window") or {}).get("hours")})
    return rows


def _daily(times, precip, soil_a, soil_b, levels):
    days: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
    for i, t in enumerate(times):
        d = t[:10]
        row = days.setdefault(d, {"date": d, "rain_mm": 0.0, "max_hourly_mm": 0.0, "_sa": [], "_sb": [],
                                  "max_ratio": None, "peak_level": "normal", "hours": 0})
        p = precip[i] or 0.0
        row["rain_mm"] += p
        row["max_hourly_mm"] = max(row["max_hourly_mm"], p)
        row["hours"] += 1
        if soil_a and soil_a[i] is not None:
            row["_sa"].append(soil_a[i])
        if soil_b and soil_b[i] is not None:
            row["_sb"].append(soil_b[i])
        lv = levels[i]
        if lv["ratio"] is not None and (row["max_ratio"] is None or lv["ratio"] > row["max_ratio"]):
            row["max_ratio"], row["peak_level"] = lv["ratio"], lv["level"]
    out = []
    for row in days.values():
        sa, sb = row.pop("_sa"), row.pop("_sb")
        row["rain_mm"] = round(row["rain_mm"], 1)
        row["max_hourly_mm"] = round(row["max_hourly_mm"], 1)
        row["soil_a"] = round(sum(sa) / len(sa), 3) if sa else None
        row["soil_b"] = round(sum(sb) / len(sb), 3) if sb else None
        out.append(row)
    return out


def recent_series(lat: float, lon: float, state: Optional[str], days: int = 14) -> Dict[str, Any]:
    region_id = tm.region_for_state(state)
    key = f"{point_key(lat, lon)}:{days}"
    try:
        raw = openmeteo.fetch_recent_days(lat, lon, days + LOOKBACK_EXTRA_DAYS)
        _series_cache.set(key, raw)
        status, age, reason = "live", 0, None
    except SourceError as exc:
        hit = _series_cache.get(key)
        if not hit:
            return {"status": "unavailable", "reason": str(exc)}
        raw, status = hit[0], "stale"
        age, reason = int((time.time() - hit[1]) / 60), f"live request failed ({exc}); last real series shown"
    h = raw["hourly"]
    levels = _hourly_levels(h["time"], h["precipitation"], region_id)
    daily = _daily(h["time"], h["precipitation"], h.get("soil_moisture_7_to_28cm"),
                   h.get("soil_moisture_28_to_100cm"), levels)[-(days + 1):]   # last N full days + today so far
    return {"status": status, "age_minutes": age, "reason": reason, "source": raw["source"],
            "timezone": raw["timezone"], "soil_layers": ["7-28 cm", "28-100 cm"],
            "region": tm.region_info(region_id), "levels": tm.CONFIG["levels"], "daily": daily}


def list_events() -> List[Dict[str, Any]]:
    with open(EVENTS_PATH, encoding="utf-8") as fh:
        return json.load(fh)["events"]


def replay_event(event_id: str) -> Dict[str, Any]:
    ev = next((e for e in list_events() if e["id"] == event_id), None)
    if ev is None:
        raise KeyError(event_id)
    region_id = tm.region_for_state(ev["state"])
    hit = _history_cache.get(event_id)
    if hit:
        raw = hit[0]
    else:
        day = date.fromisoformat(ev["date"])
        start = (day - timedelta(days=7 + LOOKBACK_EXTRA_DAYS)).isoformat()
        raw = openmeteo.fetch_era5_hourly(ev["lat"], ev["lon"], start, day.isoformat())
        _history_cache.set(event_id, raw)
    h = raw["hourly"]
    levels = _hourly_levels(h["time"], h["precipitation"], region_id)
    daily = _daily(h["time"], h["precipitation"], h.get("soil_moisture_7_to_28cm"), None, levels)[-8:]
    model_on = False
    try:
        from ..ml import predict as ml
        model_on = ml.available()
    except Exception:
        ml = None
    if model_on:   # trained-model confidence at the end of each day (same features as live)
        for row in daily:
            idx = [i for i, t in enumerate(h["time"]) if t[:10] <= row["date"]]
            res = ml.confidence({k: [v[i] for i in idx] for k, v in h.items()}, ev["lat"], ev["lon"])
            row["confidence"] = res.get("confidence")

    # Lead time: first hour in the 7 days before the event day at which the level reached WARNING
    # (or DANGER), measured to 00:00 IST of the event day. Event times of day vary, so this is
    # a conservative (minimum) lead time.
    event_start = datetime.fromisoformat(ev["date"] + "T00:00")
    window_start = event_start - timedelta(days=7)
    first = {}
    for row in levels:
        t = datetime.fromisoformat(row["time"])
        if window_start <= t < event_start:
            for lv in ("watch", "warning", "danger"):
                if lv not in first and tm.SEVERITY_ORDER.index(row["level"]) >= tm.SEVERITY_ORDER.index(lv):
                    first[lv] = row["time"]
    lead = {lv: round((event_start - datetime.fromisoformat(t)).total_seconds() / 3600, 1) for lv, t in first.items()}
    # Reached in the very first hour of the window = it was ALREADY at that level a week before,
    # so the true lead time is unknown (>= 7 days) and the level gave no specific warning.
    already = [lv for lv, t in first.items() if datetime.fromisoformat(t) <= window_start]
    on_day = [r for r in levels if r["time"].startswith(ev["date"])]
    peak = max((r for r in on_day if r["ratio"] is not None), key=lambda r: r["ratio"], default=None)
    return {
        **ev, "source": raw["source"], "timezone": raw["timezone"], "grid_elevation_m": raw.get("grid_elevation_m"),
        "region": tm.region_info(region_id), "levels": tm.CONFIG["levels"],
        "daily": daily, "first_reached": first, "lead_time_hours": lead, "already_at_window_start": already,
        "event_day_peak": peak,
        "model_confidence_event_day": next((r.get("confidence") for r in daily if r["date"] == ev["date"]), None),
        "model_confidence_week_before": daily[0].get("confidence") if daily else None,
        "caveat": "ERA5 is a ~25 km reanalysis: it usually underestimates local orographic and convective "
                  "rainfall, so real rain at the slope was often heavier than shown.",
    }
