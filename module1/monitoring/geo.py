"""Point-in-polygon lookup against real Indian district boundaries.

Boundaries: web/geodata_src/india.geojson (district polygons with state names, from
udit-001/india-maps-data). Used to pick the regional threshold for any clicked point and to
keep hotspots inside their district.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

GEOJSON_PATH = Path(__file__).resolve().parents[2] / "web" / "geodata_src" / "india.geojson"
STATE_ALIASES = {"Jammu and Kashmir": "Jammu & Kashmir", "Andaman and Nicobar Islands": "Andaman & Nicobar"}

_features: List[Dict[str, Any]] = []


def _rings(geom: Dict[str, Any]) -> List[list]:
    if geom["type"] == "Polygon":
        return [geom["coordinates"][0]]
    if geom["type"] == "MultiPolygon":
        return [poly[0] for poly in geom["coordinates"]]
    return []


def _load():
    if _features or not GEOJSON_PATH.exists():
        return
    with open(GEOJSON_PATH, encoding="utf-8") as fh:
        fc = json.load(fh)
    for f in fc["features"]:
        props = f.get("properties") or {}
        if "district" not in props:
            continue
        rings = _rings(f["geometry"])
        xs = [p[0] for r in rings for p in r]
        ys = [p[1] for r in rings for p in r]
        _features.append({
            "district": props["district"],
            "state": STATE_ALIASES.get(props.get("st_nm"), props.get("st_nm")),
            "rings": rings, "bbox": (min(xs), min(ys), max(xs), max(ys)),
        })


def _in_ring(x: float, y: float, ring: list) -> bool:
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-15) + xi:
            inside = not inside
        j = i
    return inside


def feature_at(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    _load()
    for f in _features:
        x0, y0, x1, y1 = f["bbox"]
        if x0 <= lon <= x1 and y0 <= lat <= y1 and any(_in_ring(lon, lat, r) for r in f["rings"]):
            return f
    return None


def locate(lat: float, lon: float) -> Tuple[Optional[str], Optional[str]]:
    """(state, district) for a point, or (None, None) outside India's boundaries."""
    f = feature_at(lat, lon)
    return (f["state"], f["district"]) if f else (None, None)


def contains(feature: Optional[Dict[str, Any]], lat: float, lon: float) -> bool:
    return feature is None or any(_in_ring(lon, lat, r) for r in feature["rings"])
