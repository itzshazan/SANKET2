"""Offline vegetation and dated landslide features shared by training and inference."""

import csv
import json
import math
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path


DATA = Path(__file__).resolve().parent.parent / "data" / "confidence"
VEGETATION_PATH = DATA / "vegetation_baseline.png"
HISTORY_PATH = DATA / "nasa_dated_landslides.csv"
TERRAIN_PATH = DATA / "hotspot_terrain.json"
WEATHER_TRAINING_PATH = DATA / "training_weather.csv"
NDVI_SOURCE = "NASA Terra MODIS via GIBS (2004–2006 vegetation baseline)"
HISTORY_SOURCE = "NASA Global Landslide Catalog and COOLR reports"
WEST, NORTH, EAST, SOUTH = 63, 45, 99, 0
PIXELS_PER_TILE = 512
TILE_DEGREES = 9
PIXELS_PER_DEGREE = PIXELS_PER_TILE / TILE_DEGREES
NODATA = 255
HISTORY_RADIUS_KM = 10
HISTORY_LAG = timedelta(days=30)


@lru_cache(maxsize=1)
def _vegetation():
    from PIL import Image

    if not VEGETATION_PATH.is_file():
        return None
    with Image.open(VEGETATION_PATH) as img:
        return img.copy()


def vegetation_at(lat, lon):
    if not (SOUTH < lat <= NORTH and WEST <= lon < EAST):
        return None
    img = _vegetation()
    if img is None:
        return None
    val = img.getpixel((int((lon - WEST) * PIXELS_PER_DEGREE), int((NORTH - lat) * PIXELS_PER_DEGREE)))
    return val / 100 if val != NODATA else None


@lru_cache(maxsize=1)
def hotspot_terrain():
    return json.loads(TERRAIN_PATH.read_text(encoding="utf-8")) if TERRAIN_PATH.is_file() else {}


@lru_cache(maxsize=1)
def _landslides():
    if not HISTORY_PATH.is_file():
        return None
    with HISTORY_PATH.open(encoding="utf-8", newline="") as fh:
        return [(date.fromisoformat(row["date"]), float(row["lat"]), float(row["lon"])) for row in csv.DictReader(fh)]


def nearby_landslides(lat, lon, as_of):
    """Count dated catalogue records within 10 km and at least 30 days before evaluation."""
    events = _landslides()
    if events is None:
        return None
    cutoff = as_of - HISTORY_LAG
    lon_km = 111.32 * math.cos(math.radians(lat))
    return sum(
        (110.574 * (lat - y)) ** 2 + (lon_km * (lon - x)) ** 2 <= HISTORY_RADIUS_KM ** 2
        for event_date, y, x in events if event_date <= cutoff
    )
