"""Download dated Indian landslide records from NASA COOLR (public ArcGIS FeatureServer).

COOLR = Cooperative Open Online Landslide Repository: the live successor of the Global Landslide
Catalog (GLC). Two layers are used:
  * Reports : one record per reported landslide (news / citizen science / GLC), 2007 -> today
  * Events  : event-based inventories (often satellite-mapped), with before/after image dates

Output (read by module1.ml.dataset and module1.monitoring.inventory):
  module1/data/raw/landslide/nasa_coolr_reports_india.csv
  module1/data/raw/landslide/nasa_coolr_events_india.csv

Run:  python -m module1.ml.coolr
"""

import csv
import json
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

from ..sources.http import SourceError, get_json

BASE = "https://gis.earthdata.nasa.gov/portal/rest/services/Landslides"
LAYERS = {"reports": f"{BASE}/COOLR_Reports_Points/FeatureServer/0",
          "events": f"{BASE}/COOLR_Events_Points/FeatureServer/0"}
OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "raw" / "landslide"
INDIA_BBOX = {"xmin": 68.0, "ymin": 6.0, "xmax": 98.0, "ymax": 37.5, "spatialReference": {"wkid": 4326}}
PAGE = 1000


def _iso(ms):
    if ms in (None, ""):
        return ""
    if isinstance(ms, str):          # some layers already store text dates
        return ms.strip()
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _query(url: str, offset: int):
    q = {"where": "1=1", "geometry": json.dumps(INDIA_BBOX), "geometryType": "esriGeometryEnvelope", "inSR": 4326,
         "spatialRel": "esriSpatialRelIntersects", "outFields": "*", "outSR": 4326, "returnGeometry": "true",
         "orderByFields": "objectid", "resultOffset": offset, "resultRecordCount": PAGE, "f": "json"}
    for attempt in range(6):
        try:
            return get_json(f"{url}/query?{urllib.parse.urlencode(q)}", timeout=120)
        except SourceError as exc:
            wait = 10 * (attempt + 1)
            print(f"  retry in {wait}s ({exc})", flush=True)
            time.sleep(wait)
    raise SourceError(f"COOLR query failed at offset {offset}")


def download(layer: str) -> Path:
    url = LAYERS[layer]
    rows, offset = [], 0
    while True:
        res = _query(url, offset)
        feats = res.get("features", [])
        for f in feats:
            a = dict(f.get("attributes") or {})
            g = f.get("geometry") or {}
            if a.get("latitude") in (None, "") and "y" in g:
                a["latitude"], a["longitude"] = g["y"], g["x"]
            for k in ("event_date", "submitted_date", "last_edited_date", "sat_date_before", "sat_date_after"):
                if k in a:
                    a[k] = _iso(a[k])
            a["coolr_layer"] = layer
            rows.append(a)
        print(f"  {layer}: {len(rows)} records", flush=True)
        if len(feats) < PAGE and not res.get("exceededTransferLimit"):
            break
        offset += len(feats)
        if not feats:
            break
    # keep India only (the bbox also touches Nepal, Bhutan, Bangladesh, Myanmar, Pakistan, China)
    rows = [r for r in rows if (r.get("country_name") or "").strip().lower() in ("india", "")]
    out = OUT_DIR / f"nasa_coolr_{layer}_india.csv"
    cols = sorted({k for r in rows for k in r})
    for k in ("latitude", "longitude", "event_date"):
        cols.remove(k)
        cols.insert(0, k)
    with open(out, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    print(f"  saved {len(rows)} Indian records -> {out}", flush=True)
    return out


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for layer in LAYERS:
        try:
            download(layer)
        except SourceError as exc:
            print(f"{layer}: FAILED ({exc})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
