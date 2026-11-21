"""Copernicus DEM GLO-30 reader (AWS Open Data, no account needed).

Tiles: s3://copernicus-dem-30m/ (1 x 1 degree Cloud-Optimised GeoTIFFs, 1 arc-second).
Only the internal 1024 x 1024 blocks that cover the requested window are downloaded
(HTTP range requests), then kept on disk, so each block is fetched once.

Pure stdlib + numpy on purpose: GDAL/rasterio DLLs are blocked on some Windows setups.
"""

import math
import struct
import threading
import zlib
from pathlib import Path
from typing import Dict, Tuple

import numpy as np

from .cache import CACHE_DIR
from .http import SourceError, get_bytes

BASE_URL = "https://copernicus-dem-30m.s3.amazonaws.com"
SOURCE_LABEL = "Copernicus DEM GLO-30 (AWS Open Data)"
BLOCK_DIR = CACHE_DIR / "dem_blocks"

_TYPE_SIZE = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 11: 4, 12: 8, 16: 8}
_TYPE_FMT = {1: "B", 3: "H", 4: "I", 11: "f", 12: "d", 16: "Q"}


def tile_name(lat_floor: int, lon_floor: int) -> str:
    ns = "N" if lat_floor >= 0 else "S"
    ew = "E" if lon_floor >= 0 else "W"
    return f"Copernicus_DSM_COG_10_{ns}{abs(lat_floor):02d}_00_{ew}{abs(lon_floor):03d}_00_DEM"


class _Tile:
    """One 1-degree COG: parses the TIFF header once, then serves decoded blocks."""

    def __init__(self, name: str):
        self.name = name
        self.url = f"{BASE_URL}/{name}/{name}.tif"
        head = get_bytes(self.url, timeout=30, byte_range=(0, 65535))
        self._parse(head)

    def _read_values(self, head: bytes, typ: int, count: int, value_field: bytes):
        size = _TYPE_SIZE[typ] * count
        if size <= 4:
            raw = value_field[:size]
        else:
            off = struct.unpack(self.bo + "I", value_field)[0]
            raw = head[off:off + size] if off + size <= len(head) else \
                get_bytes(self.url, timeout=30, byte_range=(off, off + size - 1))
        if typ == 2:
            return raw.rstrip(b"\x00").decode("ascii", "replace")
        return list(struct.unpack(self.bo + _TYPE_FMT[typ] * count, raw))

    def _parse(self, head: bytes):
        self.bo = "<" if head[:2] == b"II" else ">"
        if struct.unpack(self.bo + "H", head[2:4])[0] != 42:
            raise SourceError(f"{self.name}: not a classic TIFF")
        ifd = struct.unpack(self.bo + "I", head[4:8])[0]
        n = struct.unpack(self.bo + "H", head[ifd:ifd + 2])[0]
        tags = {}
        for i in range(n):
            e = head[ifd + 2 + 12 * i: ifd + 14 + 12 * i]
            tag, typ, cnt = struct.unpack(self.bo + "HHI", e[:8])
            if typ in _TYPE_SIZE:
                tags[tag] = self._read_values(head, typ, cnt, e[8:12])
        self.width, self.height = tags[256][0], tags[257][0]
        self.block_w, self.block_h = tags[322][0], tags[323][0]
        self.compression, self.predictor = tags[259][0], tags.get(317, [1])[0]
        if tags[258][0] != 32 or tags.get(339, [1])[0] != 3:
            raise SourceError(f"{self.name}: expected float32 samples")
        if self.compression not in (1, 8, 32946):
            raise SourceError(f"{self.name}: unsupported compression {self.compression}")
        self.offsets, self.counts = tags[324], tags[325]
        self.blocks_across = math.ceil(self.width / self.block_w)
        sx, sy = tags[33550][0], tags[33550][1]
        tie = tags[33922]  # (i, j, k, x, y, z)
        geokeys = tags.get(34735, [])
        pixel_is_point = False
        for k in range(4, len(geokeys), 4):
            if geokeys[k] == 1025:  # GTRasterTypeGeoKey
                pixel_is_point = geokeys[k + 3] == 2
        # centre coordinate of pixel (0, 0)
        half = 0.0 if pixel_is_point else 0.5
        self.res_x, self.res_y = sx, sy
        self.x0 = tie[3] - tie[0] * sx + half * sx
        self.y0 = tie[4] + tie[1] * sy - half * sy
        nod = tags.get(42113)
        self.nodata = float(nod) if isinstance(nod, str) and nod.strip() else None

    def _decode(self, raw: bytes) -> np.ndarray:
        if self.compression in (8, 32946):
            raw = zlib.decompress(raw)
        h, w = self.block_h, self.block_w
        if self.predictor == 3:  # TIFF floating-point predictor (Adobe tech note 3)
            a = np.frombuffer(raw, dtype=np.uint8).reshape(h, w * 4)
            a = np.cumsum(a, axis=1, dtype=np.uint8)              # undo byte differencing
            a = np.ascontiguousarray(a.reshape(h, 4, w).transpose(0, 2, 1))  # MSB-first byte planes
            return a.view(">f4").reshape(h, w).astype(np.float32)
        arr = np.frombuffer(raw, dtype=self.bo + "f4").reshape(h, w).astype(np.float32)
        if self.predictor == 2:
            raise SourceError(f"{self.name}: integer predictor on float data not supported")
        return arr

    def block(self, bi: int, bj: int) -> np.ndarray:
        idx = bi * self.blocks_across + bj
        path = BLOCK_DIR / f"{self.name}_{idx}.bin"
        if path.exists():
            raw = path.read_bytes()
        else:
            off, cnt = self.offsets[idx], self.counts[idx]
            if cnt == 0:
                return np.full((self.block_h, self.block_w), np.nan, dtype=np.float32)
            raw = get_bytes(self.url, timeout=60, byte_range=(off, off + cnt - 1))
            BLOCK_DIR.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        arr = self._decode(raw)
        if self.nodata is not None:
            arr = np.where(arr == self.nodata, np.nan, arr)
        return arr


_tiles: Dict[str, _Tile] = {}
_missing: set = set()
_lock = threading.Lock()


def _get_tile(lat_floor: int, lon_floor: int) -> _Tile:
    name = tile_name(lat_floor, lon_floor)
    with _lock:
        if name in _tiles:
            return _tiles[name]
        if name in _missing:
            raise SourceError(f"No Copernicus DEM tile {name} (ocean or outside coverage)")
    try:
        tile = _Tile(name)
    except SourceError as exc:
        if "HTTP 404" in str(exc) or "HTTP 403" in str(exc):
            with _lock:
                _missing.add(name)
        raise
    with _lock:
        _tiles[name] = tile
    return tile


def read_window(lat: float, lon: float, half_deg: float) -> Tuple[np.ndarray, float, float, float]:
    """Elevation grid (metres, NaN = no data) centred on lat/lon.

    Returns (grid, lat_of_row0_centre, lon_of_col0_centre, resolution_deg). Row 0 is north.
    Windows may span several 1-degree tiles.
    """
    res = 1.0 / 3600.0
    n = int(round(half_deg / res))
    lats = (math.floor(lat / res) + 0.5) * res + np.arange(n, -n - 1, -1) * res
    lons = (math.floor(lon / res) + 0.5) * res + np.arange(-n, n + 1) * res
    out = np.full((lats.size, lons.size), np.nan, dtype=np.float32)

    for lat_floor in range(math.floor(lats.min()), math.floor(lats.max()) + 1):
        for lon_floor in range(math.floor(lons.min()), math.floor(lons.max()) + 1):
            rmask = (lats >= lat_floor) & (lats < lat_floor + 1)
            cmask = (lons >= lon_floor) & (lons < lon_floor + 1)
            if not rmask.any() or not cmask.any():
                continue
            tile = _get_tile(lat_floor, lon_floor)
            rows = np.rint((tile.y0 - lats[rmask]) / tile.res_y).astype(int).clip(0, tile.height - 1)
            cols = np.rint((lons[cmask] - tile.x0) / tile.res_x).astype(int).clip(0, tile.width - 1)
            sub = np.full((rows.size, cols.size), np.nan, dtype=np.float32)
            for bi in np.unique(rows // tile.block_h):
                for bj in np.unique(cols // tile.block_w):
                    blk = tile.block(int(bi), int(bj))
                    rsel = np.where(rows // tile.block_h == bi)[0]
                    csel = np.where(cols // tile.block_w == bj)[0]
                    sub[np.ix_(rsel, csel)] = blk[np.ix_(rows[rsel] - bi * tile.block_h, cols[csel] - bj * tile.block_w)]
            out[np.ix_(np.where(rmask)[0], np.where(cmask)[0])] = sub
    return out, float(lats[0]), float(lons[0]), res
