"""Model features, computed identically for training (ERA5 history) and live use (ECMWF IFS).

Weather: hourly precipitation, soil moisture 7-28 / 28-100 cm, 2 m temperature, 10 m wind
(ERA5 and ECMWF IFS share the same land-surface scheme and soil layers).
Terrain: Copernicus GLO-90 elevation (Open-Meteo) at the point and 2 neighbours ~550 m north and
east, so features describe the hillside at ~0.5 km scale. That scale is deliberate: catalogue
locations are only accurate to ~1-5 km, so single-pixel slope would be noise. (3 points, not 5,
because Open-Meteo counts every elevation point against the free daily quota.)
"""

import math
from typing import Dict, List, Optional, Sequence, Tuple

RAIN_WINDOWS = [1, 3, 6, 12, 24, 48, 72, 120, 168, 240]
RAIN_SOIL_WINDOWS = [h for h in RAIN_WINDOWS if h % 3 == 0]
RAIN_SOIL_FEATURES = [f"rain_{h}h" for h in RAIN_SOIL_WINDOWS] + [
    "soil_7_28", "soil_28_100", "soil_7_28_change_72h",
]
STENCIL_DEG = 0.005

FEATURES = (
    [f"rain_{h}h" for h in RAIN_WINDOWS]
    + ["max_hourly_rain_24h", "soil_7_28", "soil_28_100", "soil_7_28_change_72h",
       "temp_mean_24h", "wind_max_24h", "elevation_m", "relief_550m_m", "gradient_550m_deg"]
)
CONTEXT_FEATURES = RAIN_SOIL_FEATURES + [
    "temp_mean_24h", "wind_max_24h", "elevation_m", "relief_550m_m", "gradient_550m_deg",
    "vegetation_baseline_ndvi", "prior_landslides_10km",
]
# +1: risk may only rise with the feature (physically: more rain / wetter soil never lowers risk)
MONOTONIC = {**{f"rain_{h}h": 1 for h in RAIN_WINDOWS}, "max_hourly_rain_24h": 1,
             "soil_7_28": 1, "soil_28_100": 1, "soil_7_28_change_72h": 1}

LABELS = {
    **{f"rain_{h}h": f"Rain, last {h} h" for h in RAIN_WINDOWS},
    "max_hourly_rain_24h": "Max hourly rain (24 h)", "soil_7_28": "Soil moisture 7-28 cm",
    "soil_28_100": "Soil moisture 28-100 cm", "soil_7_28_change_72h": "Soil wetting, last 72 h",
    "temp_mean_24h": "Temperature (24 h mean)", "wind_max_24h": "Max wind (24 h)",
    "vegetation_baseline_ndvi": "MODIS vegetation baseline (NDVI)",
    "prior_landslides_10km": "Earlier NASA landslide records within 10 km",
    "elevation_m": "Elevation", "relief_550m_m": "Relief over ~550 m", "gradient_550m_deg": "Hillside gradient (~550 m)",
}


def _clean(values: Sequence[Optional[float]]) -> List[float]:
    return [0.0 if v is None else float(v) for v in values]


def _last(values: Sequence[Optional[float]]) -> Optional[float]:
    for v in reversed(list(values or [])):
        if v is not None:
            return float(v)
    return None


def weather_features(hourly: Dict[str, list]) -> Optional[Dict[str, float]]:
    """Hourly series ending at the evaluation hour (>= 240 hours) -> weather features."""
    p = _clean(hourly.get("precipitation") or [])
    if len(p) < max(RAIN_WINDOWS):
        return None
    sa = list(hourly.get("soil_moisture_7_to_28cm") or [])
    sb = list(hourly.get("soil_moisture_28_to_100cm") or [])
    t = [v for v in (hourly.get("temperature_2m") or [])[-24:] if v is not None]
    w = [v for v in (hourly.get("wind_speed_10m") or [])[-24:] if v is not None]
    sa_now, sa_before = _last(sa), _last(sa[:-72]) if len(sa) > 72 else None
    if sa_now is None or _last(sb) is None:
        return None
    out = {f"rain_{h}h": round(sum(p[-h:]), 2) for h in RAIN_WINDOWS}
    out.update({
        "max_hourly_rain_24h": round(max(p[-24:]), 2),
        "soil_7_28": round(sa_now, 4), "soil_28_100": round(_last(sb), 4),
        "soil_7_28_change_72h": round(sa_now - sa_before, 4) if sa_before is not None else 0.0,
        "temp_mean_24h": round(sum(t) / len(t), 2) if t else None,
        "wind_max_24h": round(max(w), 2) if w else None,
    })
    return out


def rain_soil_features(weather: Dict[str, list], interval_hours: int) -> Optional[Dict[str, float]]:
    """Features with the same definitions at one-hour and three-hour resolution."""
    precip = (weather.get("precipitation") or [])[-max(RAIN_SOIL_WINDOWS) // interval_hours:]
    if len(precip) * interval_hours < max(RAIN_SOIL_WINDOWS) or any(v is None for v in precip):
        return None
    shallow = weather.get("soil_moisture_7_to_28cm") or []
    deep = weather.get("soil_moisture_28_to_100cm") or []
    now, previous, lower = _last(shallow), _last(shallow[:-72 // interval_hours]), _last(deep)
    if now is None or previous is None or lower is None:
        return None
    return {
        **{f"rain_{hours}h": round(sum(precip[-hours // interval_hours:]), 2) for hours in RAIN_SOIL_WINDOWS},
        "soil_7_28": round(now, 4), "soil_28_100": round(lower, 4),
        "soil_7_28_change_72h": round(now - previous, 4),
    }


def context_weather_features(weather: Dict[str, list], interval_hours: int) -> Optional[Dict[str, float]]:
    """Align the inputs to 3-hour samples on both weather feeds, without interpolating missing data."""
    if interval_hours not in (1, 3):
        return None
    out = rain_soil_features(weather, interval_hours)
    if out is None:
        return None
    def samples(field):
        return (weather.get(field) or [])[-1:-24 // interval_hours - 1:-(3 // interval_hours)]

    t, w = samples("temperature_2m"), samples("wind_speed_10m")
    if len(t) != 8 or len(w) != 8 or None in t or None in w:
        return None
    return {**out, "temp_mean_24h": round(sum(t) / len(t), 2), "wind_max_24h": round(max(w), 2)}


def stencil_points(lat: float, lon: float) -> List[Tuple[float, float]]:
    """Centre, ~550 m north, ~550 m east."""
    d = STENCIL_DEG
    return [(lat, lon), (lat + d, lon), (lat, lon + d)]


def terrain_features(elev: Sequence[float], lat: float) -> Dict[str, float]:
    """elev = elevations at stencil_points (centre, N, E)."""
    c, n, e = (float(x) for x in elev)
    dy = STENCIL_DEG * 110_574.0
    dx = STENCIL_DEG * 111_320.0 * max(0.2, math.cos(math.radians(lat)))
    grad = math.degrees(math.atan(math.hypot((n - c) / dy, (e - c) / dx)))
    return {"elevation_m": round(c, 1), "relief_550m_m": round(max(elev) - min(elev), 1),
            "gradient_550m_deg": round(grad, 2)}


def vector(feat: Dict[str, Optional[float]], names: Sequence[str] = FEATURES) -> List[float]:
    return [float("nan") if feat.get(k) is None else float(feat[k]) for k in names]
