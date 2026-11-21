"""Monitoring hotspots: several points per district instead of one district-centre point.

Source priority (each hotspot records which one it came from):
  1. GSI National Landslide Susceptibility Map: drop a GeoJSON export of the High / Very High
     susceptibility zones into module1/data/raw/gsi/ (any *.geojson). GSI's online services
     (bhusanket.gsi.gov.in ImageServer) require a token, so this is a file import.
  2. Interim: 30-45 degree hillslopes from the real Copernicus GLO-30 DEM, nearest the district
     centre first, inside the district boundary. This is a terrain proxy, NOT a validated
     susceptibility map, and is labelled as such.

Build / refresh:  python -m module1.monitoring.hotspots
"""

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CONFIG_DIR = Path(__file__).resolve().parent.parent / "config"
HOTSPOTS_PATH = DATA_DIR / "hotspots.json"
GSI_DIR = DATA_DIR / "raw" / "gsi"

POINTS_PER_DISTRICT = 5
SEARCH_RADIUS_DEG = 0.10       # ~11 km around the district centre
MIN_SEPARATION_KM = 2.0
SLOPE_BAND_DEG = (30.0, 45.0)  # landslide-prone hillslopes; steeper faces are mostly bare rock
MIN_SLOPE_DEG = 20.0           # used only if a district has too few 30-45 deg slopes
MAX_ELEVATION_M = 4000.0       # exclude glaciated summits

GSI_LABEL = "GSI National Landslide Susceptibility Map (imported file)"
DEM_LABEL = ("Copernicus GLO-30 DEM: 30-45° hillslopes nearest the district centre "
             "(interim terrain proxy until the GSI map is imported)")


def load_districts() -> List[Dict[str, Any]]:
    with open(CONFIG_DIR / "districts.json", encoding="utf-8") as fh:
        return json.load(fh)["districts"]


def _km(lat1, lon1, lat2, lon2) -> float:
    return math.hypot((lat1 - lat2) * 110.574, (lon1 - lon2) * 111.32 * math.cos(math.radians(lat1)))


def _centroid(geom: Dict[str, Any]):
    t, c = geom.get("type"), geom.get("coordinates")
    if t == "Point":
        return c[1], c[0]
    rings = [c[0]] if t == "Polygon" else [p[0] for p in c] if t == "MultiPolygon" else []
    pts = [pt for ring in rings for pt in ring]
    if not pts:
        return None
    return sum(p[1] for p in pts) / len(pts), sum(p[0] for p in pts) / len(pts)


def _susceptibility_class(props: Dict[str, Any]) -> int:
    """3 = very high, 2 = high, 0 = other; reads any property whose value names the class."""
    for v in props.values():
        s = str(v).strip().lower()
        if s in ("very high", "very_high", "vh"):
            return 3
        if s in ("high", "h"):
            return 2
    return 0


def _gsi_candidates() -> List[Dict[str, Any]]:
    out = []
    for path in sorted(GSI_DIR.glob("*.geojson")):
        with open(path, encoding="utf-8") as fh:
            fc = json.load(fh)
        for f in fc.get("features", []):
            cls = _susceptibility_class(f.get("properties") or {})
            cen = _centroid(f.get("geometry") or {})
            if cls and cen:
                out.append({"lat": cen[0], "lon": cen[1], "class": "Very High" if cls == 3 else "High", "rank": cls,
                            "file": path.name})
    return out


def build() -> Dict[str, Any]:
    from ..sources import terrain
    from . import geo

    gsi = _gsi_candidates()
    result = {"generated_at": datetime.now(timezone.utc).isoformat(), "districts": {}}
    for d in load_districts():
        points, source = [], None
        near = [g for g in gsi if _km(d["lat"], d["lon"], g["lat"], g["lon"]) <= SEARCH_RADIUS_DEG * 111]
        if near:
            near.sort(key=lambda g: (-g["rank"], _km(d["lat"], d["lon"], g["lat"], g["lon"])))
            for g in near:
                if all(_km(g["lat"], g["lon"], p["lat"], p["lon"]) >= MIN_SEPARATION_KM for p in points):
                    points.append({"lat": round(g["lat"], 5), "lon": round(g["lon"], 5),
                                   "susceptibility": g["class"], "file": g["file"]})
                if len(points) >= POINTS_PER_DISTRICT:
                    break
            source = GSI_LABEL
        else:
            try:
                boundary = geo.feature_at(d["lat"], d["lon"])
                points = terrain.slope_band_cells(d["lat"], d["lon"], SEARCH_RADIUS_DEG, POINTS_PER_DISTRICT,
                                                  MIN_SEPARATION_KM, SLOPE_BAND_DEG, MIN_SLOPE_DEG, MAX_ELEVATION_M,
                                                  accept=lambda la, lo: geo.contains(boundary, la, lo))
                source = DEM_LABEL
            except Exception as exc:  # DEM unreachable: keep the district centre only
                print(f"  {d['id']}: DEM hotspot search failed ({exc})", file=sys.stderr)
            if not points:
                points = [{"lat": d["lat"], "lon": d["lon"]}]
                source = source or "district centre (no hotspot source available)"
        for i, p in enumerate(points, 1):
            p["id"] = f"{d['id']}-h{i}"
            t = terrain.terrain_at(p["lat"], p["lon"])
            if t:
                p["terrain"] = t
        result["districts"][d["id"]] = {"source": source, "points": points}
        print(f"  {d['id']:<22} {len(points)} hotspots  [{source.split('(')[0].strip()}]")
    HOTSPOTS_PATH.write_text(json.dumps(result, indent=1), encoding="utf-8")
    return result


_loaded: Dict[str, Any] = {}


def load() -> Dict[str, Any]:
    """Hotspots per district id. Falls back to the district centre when no file has been built."""
    if not _loaded:
        data = {}
        if HOTSPOTS_PATH.exists():
            data = json.loads(HOTSPOTS_PATH.read_text(encoding="utf-8")).get("districts", {})
        for d in load_districts():
            if d["id"] not in data:
                data[d["id"]] = {"source": "district centre (run python -m module1.monitoring.hotspots)",
                                 "points": [{"id": f"{d['id']}-h1", "lat": d["lat"], "lon": d["lon"]}]}
        _loaded.update(data)
    return _loaded


if __name__ == "__main__":
    print(f"Building hotspots -> {HOTSPOTS_PATH}")
    build()
    print("done")
