"""Terrain metrics computed from real Copernicus GLO-30 elevation.

Methods (standard, documented so the numbers can be checked):
  * slope / aspect   : Horn (1981) 3x3 finite differences
  * curvature        : Zevenbergen & Thorne (1987) general curvature, 1/100 m (ArcGIS convention:
                       positive = convex/ridge, negative = concave/hollow)
  * flow accumulation: D8 single-direction routing inside the analysis window (no pit filling),
                       so catchments are truncated at the window edge (WINDOW_DEG)
  * TWI              : ln(a / tan(beta)), a = upslope area per unit contour width (m)
"""

import math
import threading
from typing import Any, Dict, Optional

import numpy as np
from scipy.ndimage import uniform_filter

from . import copernicus_dem
from .cache import DiskCache, point_key
from .http import SourceError

WINDOW_DEG = 0.03          # ~3.3 km each side of the point for flow routing
_terrain_cache = DiskCache("terrain_v2")   # terrain does not change: cached permanently
_lock = threading.Lock()


def cell_size_m(lat: float, res_deg: float):
    dy = res_deg * 110_574.0
    dx = res_deg * 111_320.0 * math.cos(math.radians(lat))
    return dx, dy


def horn_slope_aspect(z: np.ndarray, dx: float, dy: float):
    """Slope (deg) and aspect (deg clockwise from north, downslope direction) for the whole grid."""
    p = np.pad(z, 1, mode="edge")
    a, b, c = p[:-2, :-2], p[:-2, 1:-1], p[:-2, 2:]
    d, f = p[1:-1, :-2], p[1:-1, 2:]
    g, h, i = p[2:, :-2], p[2:, 1:-1], p[2:, 2:]
    dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * dx)   # + towards east
    dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * dy)   # + towards south (row index grows south)
    slope = np.degrees(np.arctan(np.hypot(dzdx, dzdy)))
    # downslope vector in (east, north) = (-dz/dx, +dzdy) because dzdy is measured southwards
    aspect = (np.degrees(np.arctan2(-dzdx, dzdy)) + 360.0) % 360.0
    return slope, aspect


def _d8_accumulation(z: np.ndarray, dx: float, dy: float) -> np.ndarray:
    rows, cols = z.shape
    zz = np.where(np.isnan(z), np.inf, z)
    p = np.pad(zz, 1, constant_values=np.inf)
    diag = math.hypot(dx, dy)
    offsets = [(-1, -1, diag), (-1, 0, dy), (-1, 1, diag), (0, -1, dx),
               (0, 1, dx), (1, -1, diag), (1, 0, dy), (1, 1, diag)]
    best = np.zeros_like(zz)
    recv = np.full(zz.shape, -1, dtype=np.int64)
    idx = np.arange(rows * cols).reshape(rows, cols)
    for dr, dc, dist in offsets:
        nb = p[1 + dr: 1 + dr + rows, 1 + dc: 1 + dc + cols]
        drop = np.where(np.isfinite(nb), (zz - nb) / dist, -np.inf)
        better = drop > best
        best = np.where(better, drop, best)
        nb_idx = np.roll(np.roll(idx, -dr, axis=0), -dc, axis=1)
        recv = np.where(better, nb_idx, recv)
    acc = np.ones(rows * cols, dtype=np.float64)
    order = np.argsort(-np.where(np.isfinite(zz), zz, -np.inf).ravel(), kind="stable")
    rflat = recv.ravel()
    for k in order:                     # highest cell first: pass accumulated area downstream
        r = rflat[k]
        if r >= 0:
            acc[r] += acc[k]
    return acc.reshape(rows, cols)


def compute_terrain(lat: float, lon: float) -> Dict[str, Any]:
    z, lat0, lon0, res = copernicus_dem.read_window(lat, lon, WINDOW_DEG)
    if np.isnan(z).mean() > 0.5:
        raise SourceError("Copernicus DEM has no data at this location")
    z = np.where(np.isnan(z), np.nanmean(z), z)
    dx, dy = cell_size_m(lat, res)
    r = int(round((lat0 - lat) / res))
    c = int(round((lon - lon0) / res))
    slope, aspect = horn_slope_aspect(z, dx, dy)

    w = z[r - 1:r + 2, c - 1:c + 2]
    D = ((w[1, 0] + w[1, 2]) / 2 - w[1, 1]) / dx ** 2
    E = ((w[0, 1] + w[2, 1]) / 2 - w[1, 1]) / dy ** 2
    curvature = float(-2 * (D + E) * 100)

    acc = _d8_accumulation(z, dx, dy)
    a = acc[r, c] * dx * dy / ((dx + dy) / 2)          # specific catchment area, m
    beta = math.radians(max(float(slope[r, c]), 0.1))
    twi = math.log(a / math.tan(beta))

    local = slope[max(r - 2, 0):r + 3, max(c - 2, 0):c + 3]
    smooth = uniform_filter(slope, size=5)                     # 150 m mean slope
    rr, cc = np.indices(z.shape)
    within_1km = np.hypot((rr - r) * dy, (cc - c) * dx) <= 1000
    steepest_1km = float(smooth[within_1km].max())
    return {
        "elevation_m": round(float(z[r, c]), 1),
        "slope_deg": round(float(slope[r, c]), 1),
        "slope_mean_150m_deg": round(float(local.mean()), 1),
        "steepest_slope_1km_deg": round(steepest_1km, 1),
        "aspect_deg": round(float(aspect[r, c]), 0),
        "curvature": round(curvature, 3),
        "flow_accumulation_cells": int(acc[r, c]),
        "twi": round(twi, 2),
        "source": copernicus_dem.SOURCE_LABEL,
        "method": "Horn slope, Zevenbergen-Thorne curvature, D8 accumulation in a ±3 km window (no pit filling)",
        "resolution_m": round((dx + dy) / 2, 1),
    }


def terrain_at(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Cached real terrain for a point, or None if the DEM cannot be read right now."""
    key = point_key(lat, lon)
    hit = _terrain_cache.get(key)
    if hit:
        return hit[0]
    try:
        with _lock:            # one DEM computation at a time keeps memory and downloads bounded
            hit = _terrain_cache.get(key)
            if hit:
                return hit[0]
            t = compute_terrain(lat, lon)
            _terrain_cache.set(key, t)
            return t
    except SourceError:
        return None


def slope_band_cells(lat: float, lon: float, half_deg: float, n: int, min_sep_km: float,
                     band_deg: tuple, fallback_min_deg: float, max_elev_m: float, accept=None):
    """Hillslope cells in a landslide-prone slope band, nearest the centre first.

    Cells whose 150 m mean slope lies in `band_deg` (e.g. 30-45 deg, where most rainfall-induced
    shallow landslides start; steeper faces are mostly bare rock) are taken in order of distance
    from the district centre (where people and roads are), spaced `min_sep_km` apart. If too few
    exist, cells >= `fallback_min_deg` are added. `accept(lat, lon)` can restrict picks to the
    district boundary. Interim hotspot source until a GSI susceptibility file is supplied.
    """
    z, lat0, lon0, res = copernicus_dem.read_window(lat, lon, half_deg)
    valid = ~np.isnan(z)
    z = np.where(valid, z, np.nanmean(z))
    dx, dy = cell_size_m(lat, res)
    slope, _ = horn_slope_aspect(z, dx, dy)
    smooth = uniform_filter(slope, size=5)
    ok = valid & (z <= max_elev_m) & (z > 0)
    rr_, cc_ = np.indices(z.shape)
    dist = np.hypot((rr_ - round((lat0 - lat) / res)) * dy, (cc_ - round((lon - lon0) / res)) * dx)
    picks, rejected, checks = [], [], 0
    kx = 111.32 * math.cos(math.radians(lat))
    in_band = ok & (smooth >= band_deg[0]) & (smooth <= band_deg[1])
    loose = ok & (smooth >= fallback_min_deg) & ~in_band
    order = np.concatenate([np.flatnonzero(in_band)[np.argsort(dist[in_band])],
                            np.flatnonzero(loose)[np.argsort(dist[loose])]])
    for k in order:
        s = smooth.ravel()[k]
        if len(picks) >= n or checks > 20000:
            break
        rr, cc = divmod(int(k), z.shape[1])
        plat, plon = lat0 - rr * res, lon0 + cc * res
        near = lambda q: math.hypot((plat - q[0]) * 110.574, (plon - q[1]) * kx)
        if any(near((q["lat"], q["lon"])) < min_sep_km for q in picks):
            continue
        if any(near(q) < 0.3 for q in rejected[-200:]):   # cheap skip next to known outside cells
            continue
        checks += 1
        if accept is not None and not accept(plat, plon):
            rejected.append((plat, plon))
            continue
        picks.append({"lat": round(plat, 5), "lon": round(plon, 5), "slope_mean_150m_deg": round(float(s), 1),
                      "elevation_m": round(float(z[rr, cc]), 1)})
    return picks
