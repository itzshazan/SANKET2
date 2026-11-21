"""Historical landslide inventory (real records only).

Files in module1/data/raw/landslide/ (override with SANKET_INVENTORY_DIR):
  * GSI landslide inventory GeoJSON (points; SLIDE_NO, SLIDE_NAME, TRIGGERING, INITIATION ...)
  * NASA Global Landslide Catalog CSV export (latitude, longitude, event_date, landslide_category ...)
  * any other CSV with latitude/longitude columns, or GeoJSON with Point/Polygon features

The files are parsed once into a compact index (kept in the cache folder and rebuilt when a
file changes). Until a file is present the count is reported as unavailable, never estimated.
The same landslide can appear in both GSI and NASA catalogues, so counts are also given per source.
"""

import csv
import json
import math
import os
import re
import threading
from pathlib import Path
from typing import Any, Dict, List

import numpy as np

from ..sources.cache import CACHE_DIR

INVENTORY_DIR = Path(os.getenv("SANKET_INVENTORY_DIR") or Path(__file__).resolve().parent.parent / "data" / "raw" / "landslide")
# mapped event inventories (shapefiles), e.g. raw/events/kerala_2018_dans/*.shp
EVENTS_DIR = Path(os.getenv("SANKET_EVENTS_DIR") or INVENTORY_DIR.parent / "events")
EVENT_LABELS = {"kerala_2018_dans": "Kerala 2018 monsoon inventory (Univ. Twente / GSI)"}
INDEX_PATH = CACHE_DIR / "inventory_index_v2.json"
RADIUS_KM = 10.0

GSI_LABEL = "GSI landslide inventory"
NASA_LABEL = "NASA Global Landslide Catalog"
NASA_EXCLUDED_CATEGORIES = {"snow_avalanche", "lahar"}   # not slope failures in soil/rock
NASA_EXCLUDED_IMPORTS = {"test"}                          # test rows present in the export

_LAT_KEYS = ("latitude", "lat", "Latitude", "LATITUDE", "y")
_LON_KEYS = ("longitude", "lon", "long", "Longitude", "LONGITUDE", "x")
_YEAR_RE = re.compile(r"(?<!\d)(19\d\d|20\d\d)(?!\d)")

_lock = threading.Lock()
_idx: Dict[str, Any] = {}


def _pick(row: Dict[str, Any], keys):
    for k in keys:
        v = row.get(k)
        if v not in (None, "", " "):
            return v
    return None


def _year(*values) -> int:
    for v in values:
        if isinstance(v, (int, float)) and 1800 < v < 2100:
            return int(v)
        if isinstance(v, str):
            m = _YEAR_RE.search(v)
            if m:
                return int(m.group(1))
    return 0


def _parse_csv(path: Path, seen_ids: set) -> List[list]:
    out = []
    with open(path, encoding="utf-8-sig", newline="") as fh:
        reader = csv.DictReader(fh)
        nasa = "event_import_source" in (reader.fieldnames or [])
        for r in reader:
            if nasa and ((r.get("event_import_source") or "").strip().lower() in NASA_EXCLUDED_IMPORTS
                         or (r.get("landslide_category") or "").strip() in NASA_EXCLUDED_CATEGORIES):
                continue
            eid = (r.get("event_id") or "").strip()
            if nasa and eid:               # COOLR repeats the catalogue's events: count each once
                if eid in seen_ids:
                    continue
                seen_ids.add(eid)
            lat, lon = _pick(r, _LAT_KEYS), _pick(r, _LON_KEYS)
            try:
                lat, lon = float(lat), float(lon)
            except (TypeError, ValueError):
                continue
            out.append([lat, lon, _year(r.get("event_date"), r.get("date")),
                        NASA_LABEL if nasa else path.name,
                        (r.get("event_title") or r.get("name") or "")[:120],
                        (r.get("landslide_trigger") or r.get("trigger") or "")[:60]])
    return out


def _parse_geojson(path: Path) -> List[list]:
    with open(path, encoding="utf-8") as fh:
        fc = json.load(fh)
    out = []
    for f in fc.get("features", []):
        g, p = f.get("geometry") or {}, f.get("properties") or {}
        c = g.get("coordinates")
        if g.get("type") == "Point":
            lon, lat = c[0], c[1]
        elif g.get("type") in ("Polygon", "MultiPolygon"):
            ring = c[0] if g["type"] == "Polygon" else c[0][0]
            lon, lat = sum(q[0] for q in ring) / len(ring), sum(q[1] for q in ring) / len(ring)
        else:
            continue
        gsi = "SLIDE_NO" in p
        out.append([float(lat), float(lon), _year(p.get("INITIATION"), p.get("SLIDE_NO"), p.get("event_date")),
                    GSI_LABEL if gsi else path.name,
                    str(p.get("SLIDE_NAME") or p.get("name") or "").strip()[:120],
                    str(p.get("TRIGGERING") or p.get("trigger") or "").strip()[:60]])
    return out


def _parse_shapefile(path: Path) -> List[list]:
    import shapefile   # pyshp
    label = EVENT_LABELS.get(path.parent.name, path.parent.name)
    year = _year(path.parent.name)
    out = []
    for sr in shapefile.Reader(str(path.with_suffix(""))).iterShapeRecords():
        if not sr.shape.points:
            continue
        x, y = sr.shape.points[0][:2]
        rec = sr.record.as_dict()
        out.append([float(y), float(x), year, label,
                    str(rec.get("District") or rec.get("name") or "").strip()[:120],
                    str(rec.get("Type_of_sl") or "rainfall").strip()[:60]])
    return out


def _signature(files: List[Path]) -> List[list]:
    return [[f.name, f.stat().st_size, int(f.stat().st_mtime)] for f in files]


def _load() -> Dict[str, Any]:
    with _lock:
        if _idx:
            return _idx
        files = sorted(p for p in INVENTORY_DIR.glob("*") if p.suffix.lower() in (".csv", ".geojson", ".json"))
        files += sorted(EVENTS_DIR.glob("*/*.shp")) if EVENTS_DIR.exists() else []
        sig = _signature(files)
        rows = None
        if files and INDEX_PATH.exists():
            try:
                cached = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
                if cached.get("signature") == sig:
                    rows = cached["rows"]
            except (OSError, ValueError, KeyError):
                rows = None
        if rows is None:
            rows, seen_ids = [], set()
            for f in files:
                try:
                    suf = f.suffix.lower()
                    rows += (_parse_csv(f, seen_ids) if suf == ".csv" else
                             _parse_shapefile(f) if suf == ".shp" else _parse_geojson(f))
                except (OSError, ValueError, KeyError, ImportError) as exc:
                    print(f"inventory: skipped {f.name}: {exc}")
            if files:
                INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
                INDEX_PATH.write_text(json.dumps({"signature": sig, "rows": rows}), encoding="utf-8")
        _idx.update({
            "lat": np.array([r[0] for r in rows], dtype=np.float64),
            "lon": np.array([r[1] for r in rows], dtype=np.float64),
            "year": np.array([r[2] for r in rows], dtype=np.int32),
            "src": [r[3] for r in rows], "name": [r[4] for r in rows], "trigger": [r[5] for r in rows],
            "files": [f.name for f in files],
            "totals": {s: sum(1 for r in rows if r[3] == s) for s in {r[3] for r in rows}},
        })
        return _idx


def reload() -> None:
    with _lock:
        _idx.clear()


def summary() -> Dict[str, Any]:
    idx = _load()
    return {"loaded": bool(idx["src"]), "files": idx["files"], "records_by_source": idx["totals"]}


def nearby_count(lat: float, lon: float, radius_km: float = RADIUS_KM, nearest: int = 5) -> Dict[str, Any]:
    idx = _load()
    if not idx["src"]:
        return {"status": "unavailable", "reason": f"no landslide inventory file in {INVENTORY_DIR}"}
    dy = (idx["lat"] - lat) * 110.574
    dx = (idx["lon"] - lon) * 111.32 * math.cos(math.radians(lat))
    dist = np.hypot(dx, dy)
    inside = np.flatnonzero(dist <= radius_km)
    by_source: Dict[str, int] = {}
    for i in inside:
        by_source[idx["src"][i]] = by_source.get(idx["src"][i], 0) + 1
    years = idx["year"][inside]
    order = inside[np.argsort(dist[inside])][:nearest]
    return {
        "status": "live",
        "count": int(inside.size),
        "radius_km": radius_km,
        "by_source": by_source,
        "nearest_km": round(float(dist.min()), 2),
        "latest_year": int(years.max()) if years.size and years.max() > 0 else None,
        "nearest_events": [{
            "distance_km": round(float(dist[i]), 2), "year": int(idx["year"][i]) or None,
            "name": idx["name"][i] or None, "trigger": idx["trigger"][i] or None, "source": idx["src"][i],
            "lat": round(float(idx["lat"][i]), 5), "lon": round(float(idx["lon"][i]), 5),
        } for i in order],
        "source": ", ".join(idx["files"]),
        "note": "The same landslide may be listed in more than one catalogue.",
    }
