"""Build the offline context data before training: python -m module1.ml.build_context."""

import argparse
import csv
import json
from datetime import date
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from xml.etree import ElementTree

import numpy as np
from PIL import Image

from ..inference import threshold_model as thresholds
from ..monitoring import hotspots
from ..sources.cache import point_key
from ..sources.http import get_bytes
from . import features as F
from . import context as C
from .dataset import COOLR_REPORTS, GOOD_ACCURACY, NASA_CSV, OUT_CSV, _km, era5_for, load_events


GIBS = "https://gibs.earthdata.nasa.gov"
TILES = f"{GIBS}/wmts/epsg4326/best/MODIS_Terra_L3_NDVI_Monthly/default"
MONTHS = [f"{year}-{month:02d}-01" for year in range(2004, 2007) for month in (2, 5, 8, 11)]


def _palette():
    xml = get_bytes(f"{GIBS}/colormaps/v1.3/MODIS_L3_NDVI.xml")
    colors = {}
    for entry in ElementTree.fromstring(xml).iter("ColorMapEntry"):
        if entry.get("transparent") != "false" or entry.get("nodata") == "true":
            continue
        r, g, b = map(int, entry.attrib["rgb"].split(","))
        lo, hi = map(float, entry.attrib["value"].strip("[()] ").split(","))
        colors[(r << 16) | (g << 8) | b] = (lo + hi) / 2
    if len(colors) < 100:
        raise ValueError("NASA GIBS NDVI color map is incomplete")
    keys = sorted(colors)
    return np.array(keys, dtype=np.uint32), np.array([colors[k] for k in keys])


def _tile(month, row, col, rgb_keys, ndvi):
    payload = get_bytes(f"{TILES}/{month}/1km/5/{row}/{col}.png", timeout=25)
    with Image.open(BytesIO(payload)) as image:
        pixels = np.asarray(image.convert("RGBA"), dtype=np.uint32)
    rgb = (pixels[..., 0] << 16) | (pixels[..., 1] << 8) | pixels[..., 2]
    idx = np.minimum(np.searchsorted(rgb_keys, rgb), len(rgb_keys) - 1)
    valid = (rgb_keys[idx] == rgb) & (pixels[..., 3] == 255)
    return np.where(valid, ndvi[idx], 0), valid


def build_vegetation():
    rgb, ndvi = _palette()
    row0, row1 = (90 - C.NORTH) // C.TILE_DEGREES, (90 - C.SOUTH) // C.TILE_DEGREES
    col0, col1 = (C.WEST + 180) // C.TILE_DEGREES, (C.EAST + 180) // C.TILE_DEGREES
    size = C.PIXELS_PER_TILE
    regions = [(r, c) for r in range(row0, row1) for c in range(col0, col1)]
    raster = np.full(((row1 - row0) * size, (col1 - col0) * size), C.NODATA, dtype=np.uint8)
    with ThreadPoolExecutor(max_workers=6) as pool:
        for row, col in regions:
            sums = np.zeros((size, size), dtype=np.float64)
            counts = np.zeros((size, size), dtype=np.uint8)
            for values, valid in pool.map(lambda month: _tile(month, row, col, rgb, ndvi), MONTHS):
                sums += values
                counts += valid
            r, c = (row - row0) * size, (col - col0) * size
            block = raster[r:r + size, c:c + size]
            valid = counts >= 3
            block[valid] = np.rint(100 * sums[valid] / counts[valid]).astype(np.uint8)
            print(f"Vegetation tile {row}, {col}: {valid.sum():,} usable cells", flush=True)
    Image.fromarray(raster).save(C.VEGETATION_PATH, optimize=True)


def build_history():
    if not all(path.is_file() for path in (NASA_CSV, COOLR_REPORTS)):
        raise FileNotFoundError("Download nasa_glc.csv and nasa_coolr_reports_india.csv into module1/data/raw/landslide")
    by_day = {}
    for e in load_events():
        if e["accuracy"].lower() not in GOOD_ACCURACY or e["category"].lower() in {"lahar", "snow_avalanche"}:
            continue
        pt = (e["lat"], e["lon"])
        same_day = by_day.setdefault(e["date"], [])
        if not any(_km(pt, old) <= 0.1 for old in same_day):
            same_day.append(pt)
    with C.HISTORY_PATH.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(("date", "lat", "lon"))
        writer.writerows((day.isoformat(), round(lat, 5), round(lon, 5))
                         for day, points in sorted(by_day.items()) for lat, lon in points)
    print(f"Exported {sum(map(len, by_day.values()))} dated NASA records", flush=True)


def build_weather():
    """Use weather through the previous local day because event times are usually unknown."""
    with OUT_CSV.open(encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    features = F.RAIN_SOIL_FEATURES + ["temp_mean_24h", "wind_max_24h"]
    keys = ["lat", "lon", "date"]
    weather_rows = []
    for r in rows:
        lat, lon = float(r["lat"]), float(r["lon"])
        raw = era5_for({"lat": lat, "lon": lon, "date": date.fromisoformat(r["date"])})["hourly"]
        indices = [i for i, t in enumerate(raw["time"]) if t[:10] < r["date"]]
        hourly = {field: [values[i] for i in indices] for field, values in raw.items()}
        values = F.context_weather_features(hourly, 1)
        if values is None:
            continue
        ratio = thresholds.evaluate(hourly["precipitation"], thresholds.region_for_state(r["state"]))["ratio"]
        weather_rows.append({**{k: r[k] for k in keys}, **values, "threshold_ratio": ratio})
    with C.WEATHER_TRAINING_PATH.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=keys + features + ["threshold_ratio"])
        writer.writeheader()
        writer.writerows(weather_rows)
    print(f"Exported pre-event weather for {len(weather_rows)} of {len(rows)} cases", flush=True)


def build_terrain():
    from .predict import _terrain, _terrain_for, prefetch_terrain

    points = [(p["lat"], p["lon"]) for d in hotspots.load().values() for p in d["points"]]
    prefetch_terrain(points)
    out = {}
    for lat, lon in points:
        key = point_key(lat, lon)
        cached = _terrain.get(key)
        vals = cached[0] if cached else _terrain_for(lat, lon)
        if vals is None:
            # Independent Copernicus DEM source when the elevation API is unavailable.
            from ..sources import terrain

            vals = terrain.copernicus_stencil(lat, lon)
        if vals is None:
            raise RuntimeError(f"Missing Copernicus elevation stencil for {key}")
        out[key] = vals
    C.TERRAIN_PATH.write_text(json.dumps(out, indent=1), encoding="utf-8")
    print(f"Exported terrain stencils for {len(out)} monitored hotspots", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-vegetation", action="store_true", help="keep the existing vegetation raster")
    args = parser.parse_args()
    C.DATA.mkdir(parents=True, exist_ok=True)
    build_history()
    build_weather()
    build_terrain()
    if not args.skip_vegetation:
        build_vegetation()


if __name__ == "__main__":
    main()

