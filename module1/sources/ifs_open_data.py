"""ECMWF IFS 0.25° rolling time series published by Open-Meteo on AWS Open Data."""

from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from functools import lru_cache
from math import floor

import httpx
import numpy as np

from .http import SourceError, USER_AGENT

SOURCE = "ECMWF IFS 0.25° via Open-Meteo AWS Open Data (3-hourly, nearest grid cell)"
BASE_URL = "https://openmeteo.s3.amazonaws.com/data/ecmwf_ifs025"
STEP_HOURS = 3
STEP_SECONDS = STEP_HOURS * 3600
GRID_SHAPE = (721, 1440)
FIELDS = (
    "precipitation", "soil_moisture_7_to_28cm", "soil_moisture_28_to_100cm", "temperature_2m",
    "wind_u_component_10m", "wind_v_component_10m", "wind_gusts_10m",
)
PAGE_BYTES = 32 * 1024


class _ObjectRanges:
    """Read one object using small cached ranges and reject whole-object responses."""

    def __init__(self, client, url):
        self._client = client
        response = client.head(url).raise_for_status()
        self._size = int(response.headers["Content-Length"])
        self._etag = response.headers["ETag"]
        self._page = lru_cache(maxsize=32)(self._read_page)

    def size(self, path):
        return self._size

    def cat_file(self, path, start=None, end=None, **kwargs):
        if start is None or end is None or not 0 <= start <= end <= self._size or end - start > 2 * 1024 * 1024:
            raise SourceError("Invalid byte range for the public weather archive.")
        if start == end:
            return b""
        first, last = start // PAGE_BYTES, (end - 1) // PAGE_BYTES
        blocks = b"".join(self._page(path, index) for index in range(first, last + 1))
        offset = first * PAGE_BYTES
        return blocks[start - offset:end - offset]

    def _read_page(self, url, page):
        first = page * PAGE_BYTES
        last = min(first + PAGE_BYTES, self._size) - 1
        headers = {"Range": f"bytes={first}-{last}", "If-Match": self._etag}
        with self._client.stream("GET", url, headers=headers) as response:
            expected = f"bytes {first}-{last}/{self._size}"
            if (response.status_code != 206 or response.headers.get("Content-Range") != expected
                    or response.headers.get("Content-Length") != str(last - first + 1)):
                raise SourceError("The public weather archive object changed or rejected a byte range.")
            return response.read()

    def close(self):
        self._page.cache_clear()


def _grid_point(lat, lon):
    return floor((lat + 90) * 4 + 0.5), floor((lon + 180) * 4 + 0.5) % GRID_SHAPE[1]


def _read_chunk(client, field, chunk, first, stop, chunk_length, cells):
    from omfiles import OmFileReader

    url = f"{BASE_URL}/{field}/chunk_{chunk}.om"
    ranges = _ObjectRanges(client, url)
    try:
        with OmFileReader.from_fsspec(ranges, url) as reader:
            if tuple(reader.shape) != (*GRID_SHAPE, chunk_length):
                raise SourceError("Unexpected ECMWF IFS weather archive grid.")
            tiles = defaultdict(list)
            for row, col in cells:
                tiles[row, col // reader.chunks[1]].append(col)
            values = {}
            for (row, _), cols in tiles.items():
                left, right = min(cols), max(cols)
                tile = reader[row, left:right + 1, first:stop]
                for col in cols:
                    values[row, col] = tile[col - left].copy()
            return values
    finally:
        ranges.close()


def _read_field(client, field, chunk_length, cells, intervals):
    values = defaultdict(list)
    for chunk, first, stop in intervals:
        for cell, samples in _read_chunk(client, field, chunk, first, stop, chunk_length, cells).items():
            values[cell].append(samples)
    return field, {cell: np.concatenate(values[cell]) for cell in cells}


def fetch_live(points, hours=240):
    """Latest completed native intervals. Results follow the input point order."""
    if not points:
        return []
    now = datetime.now(timezone.utc)
    try:
        grid = [_grid_point(*point) for point in points]
        cells = set(grid)
        with httpx.Client(timeout=6.0, headers={"User-Agent": USER_AGENT},
                          limits=httpx.Limits(max_connections=8, max_keepalive_connections=8)) as client:
            meta = client.get(f"{BASE_URL}/static/meta.json").raise_for_status().json()
            chunk_length = int(meta["chunk_time_length"])
            if meta["temporal_resolution_seconds"] != STEP_SECONDS or chunk_length <= 0:
                raise SourceError("Unexpected ECMWF IFS time resolution in the public archive.")
            if now.timestamp() - meta["last_run_availability_time"] > 24 * 3600:
                raise SourceError("The public ECMWF IFS weather archive has not updated in 24 hours.")
            end = min(int(now.timestamp()), meta["data_end_time"] - 1) // STEP_SECONDS
            start = end - hours // STEP_HOURS + 1
            intervals = [
                (chunk, max(0, start - chunk * chunk_length), min(chunk_length, end + 1 - chunk * chunk_length))
                for chunk in range(start // chunk_length, end // chunk_length + 1)
            ]
            with ThreadPoolExecutor(max_workers=7) as pool:
                jobs = [pool.submit(_read_field, client, field, chunk_length, cells, intervals) for field in FIELDS]
                series = dict(job.result() for job in jobs)
    except (httpx.HTTPError, ImportError, KeyError, IndexError, ValueError, OSError, RuntimeError) as exc:
        if isinstance(exc, SourceError):
            raise
        raise SourceError(f"Public ECMWF IFS weather archive unavailable ({type(exc).__name__}).") from exc

    times = [datetime.fromtimestamp(t * STEP_SECONDS, timezone.utc).strftime("%Y-%m-%dT%H:%M")
             for t in range(start, end + 1)]
    results = []
    for cell in grid:
        fields = {field: samples[cell] for field, samples in series.items()}
        wind = np.hypot(fields.pop("wind_u_component_10m"), fields.pop("wind_v_component_10m"))
        fields["wind_speed_10m"] = wind * 3.6
        fields["wind_gusts_10m"] = fields["wind_gusts_10m"] * 3.6
        # Preserve absent readings, especially over ocean grid cells.
        hourly = {key: [round(float(v), 3) if np.isfinite(v) else None for v in data]
                  for key, data in fields.items()}
        results.append({
            "hourly": {"time": times, **hourly}, "interval_hours": STEP_HOURS,
            "fetched_at": now.isoformat(), "source": SOURCE,
        })
    return results
