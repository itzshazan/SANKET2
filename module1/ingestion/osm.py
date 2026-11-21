"""OpenStreetMap Overpass: real hospitals, schools, helipads, main roads and bridges near a point.

Fallback chain: live Overpass (3 mirrors)  ->  last real Overpass response for the same query
(flagged stale, with its date)  ->  unavailable. No hand-made assets.

Exposure band = straight-line distance from the queried point (the district monitoring
centre or a clicked location). It is proximity, not a modelled debris run-out.
"""

import math
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import urllib.parse

from ..sources.cache import DiskCache
from ..sources.http import SourceError, post

OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
FRESH_S = 24 * 3600
NEAR_KM, MID_KM = 2.2, 4.8

_cache = DiskCache("osm_v2")


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def _query_overpass(query: str, timeout: int = 60) -> List[Dict[str, Any]]:
    """Ask all mirrors at once and use the first answer (public Overpass can take 30 s+)."""
    data = urllib.parse.urlencode({"data": query}).encode()
    errors = []
    pool = ThreadPoolExecutor(max_workers=len(OVERPASS_MIRRORS))
    futures = [pool.submit(post, m, data, {"Content-Type": "application/x-www-form-urlencoded"}, timeout)
               for m in OVERPASS_MIRRORS]
    try:
        for fut in as_completed(futures):
            try:
                return fut.result().get("elements", [])
            except SourceError as exc:
                errors.append(str(exc))
    finally:
        pool.shutdown(wait=False, cancel_futures=True)
    raise SourceError("all Overpass mirrors failed: " + " | ".join(errors))


def _classify(tags: Dict[str, str], el_id: int):
    amenity, highway = tags.get("amenity"), tags.get("highway")
    name = tags.get("name") or tags.get("name:en") or tags.get("ref") or ""
    if amenity in ("hospital", "clinic", "doctors"):
        beds = tags.get("beds")
        return "hospitals", "Hospital", name or f"Unnamed health facility (OSM {el_id})", f"{beds} beds (OSM tag)" if beds else "beds not tagged in OSM"
    if amenity in ("school", "college", "community_centre"):
        return "schools", "School", name or f"Unnamed school / community centre (OSM {el_id})", amenity.replace("_", " ")
    if tags.get("aeroway") == "helipad":
        return "helipads", "Helipad", name or f"Helipad (OSM {el_id})", "helipad (OSM)"
    if tags.get("bridge") == "yes":
        return "bridges", "Bridge", name or f"Bridge (OSM {el_id})", f"{highway or tags.get('railway') or 'bridge'}"
    if highway in ("primary", "secondary", "trunk"):
        ref = tags.get("ref", "")
        return "roads", "Road", name or (f"{ref}" if ref else f"{highway.title()} road (OSM {el_id})"), f"{highway} road"
    return None


def _build(elements: List[Dict[str, Any]], lat: float, lon: float, radius_km: float) -> List[Dict[str, Any]]:
    assets = []
    for el in elements:
        tags = el.get("tags", {})
        clat = el.get("lat") or (el.get("center") or {}).get("lat")
        clon = el.get("lon") or (el.get("center") or {}).get("lon")
        if clat is None or clon is None:
            continue
        dist = haversine_distance(lat, lon, clat, clon)
        if dist > radius_km * 1.25:
            continue
        cls = _classify(tags, el.get("id"))
        if not cls:
            continue
        asset_type, cat, name, cap = cls
        if dist <= NEAR_KM:
            risk, label = "danger", f"WITHIN {NEAR_KM} KM"
        elif dist <= MID_KM:
            risk, label = "warning", f"{NEAR_KM}-{MID_KM} KM"
        else:
            risk, label = "normal", f"> {MID_KM} KM"
        el_type, el_id = el.get("type", "node"), el.get("id")
        assets.append({
            "id": f"osm-{el_type}-{el_id}", "osm_id": el_id, "osm_type": el_type,
            "type": asset_type, "category": cat, "name": name,
            "location": f"{round(clat, 4)}° N, {round(clon, 4)}° E",
            "lat": round(clat, 5), "lon": round(clon, 5), "distance_km": dist,
            "risk": risk, "riskLabel": label,
            "exposure": f"{dist} km from the monitoring point (straight line)",
            "capacity": cap, "osm_url": f"https://www.openstreetmap.org/{el_type}/{el_id}",
            "tags": {k: v for k, v in tags.items() if k in ("name", "amenity", "highway", "ref", "operator", "lanes", "beds")},
        })
    assets.sort(key=lambda a: a["distance_km"])
    return assets


class OpenStreetMapService:
    def fetch_infrastructure(self, lat: float, lon: float, radius_km: float = 6.0,
                             district_name: Optional[str] = None, force_refresh: bool = False) -> Dict[str, Any]:
        key = f"{round(lat, 3)}_{round(lon, 3)}_{round(radius_km, 1)}"
        if not force_refresh:
            fresh = _cache.get_fresh(key, FRESH_S)
            if fresh:
                return {**fresh, "cached": True, "status": "live"}

        d = radius_km / 111.0
        cos_lat = max(0.2, math.cos(math.radians(lat)))
        s, n, w, e = round(lat - d, 4), round(lat + d, 4), round(lon - d / cos_lat, 4), round(lon + d / cos_lat, 4)
        bbox = f"({s},{w},{n},{e})"
        query = f"""[out:json][timeout:55];
(
  node["amenity"~"hospital|clinic|doctors"]{bbox};
  way["amenity"~"hospital|clinic"]{bbox};
  node["amenity"~"school|college|community_centre"]{bbox};
  node["aeroway"="helipad"]{bbox};
  way["highway"~"^(primary|secondary|trunk)$"]{bbox};
  way["bridge"="yes"]["highway"]{bbox};
);
out center 200;"""
        t0 = time.time()
        try:
            elements = _query_overpass(query)
        except SourceError as exc:
            hit = _cache.get(key)
            if hit:
                return {**hit[0], "cached": True, "status": "stale",
                        "reason": f"Overpass unreachable ({exc}); last real response from {hit[0]['fetched_at']}"}
            return {"status": "unavailable", "reason": str(exc), "assets": [], "total_assets": 0,
                    "by_category": {}, "high_risk_count": 0, "moderate_risk_count": 0, "secure_count": 0,
                    "center": {"latitude": lat, "longitude": lon}, "radius_km": radius_km}

        assets = _build(elements, lat, lon, radius_km)
        by_cat: Dict[str, int] = {}
        for a in assets:
            by_cat[a["type"]] = by_cat.get(a["type"], 0) + 1
        result = {
            "status": "live",
            "source": "OpenStreetMap Overpass API",
            "query_latency_ms": int((time.time() - t0) * 1000),
            "center": {"latitude": lat, "longitude": lon},
            "radius_km": radius_km,
            "district": district_name or "Custom point",
            "total_assets": len(assets),
            "high_risk_count": sum(a["risk"] == "danger" for a in assets),
            "moderate_risk_count": sum(a["risk"] == "warning" for a in assets),
            "secure_count": sum(a["risk"] == "normal" for a in assets),
            "proximity_bands_km": [NEAR_KM, MID_KM],
            "by_category": by_cat,
            "assets": assets,
            "cached": False,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        _cache.set(key, result)
        return result


osm_service = OpenStreetMapService()
