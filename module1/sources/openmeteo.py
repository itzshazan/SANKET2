"""Open-Meteo weather with an optional forecast API key.

* Live: forecast API hourly series, `past_hours` up to the latest COMPLETED hour (UTC), so
  the 24 h window really is "the last 24 hours up to now" (at most ~1 h behind).
  Values are numerical-weather-model analysis / short-range forecast (ECMWF IFS).
* History: archive API, ERA5 reanalysis (ECMWF, ~0.25 deg), ~5 day delay.

Precipitation in Open-Meteo hourly data is the total of the PRECEDING hour.
"""

import os
import threading
import time
import urllib.parse
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Sequence, Tuple

from .http import SourceError, get_json

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
CUSTOMER_FORECAST_URL = "https://customer-api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
LIVE_SOURCE = "ECMWF IFS 0.25° via Open-Meteo (analysis + short-range forecast, hourly)"
ERA5_SOURCE = "ERA5 reanalysis (ECMWF) via Open-Meteo archive API"

# ECMWF IFS uses the same land-surface scheme and soil layers as ERA5, so live values match the
# ERA5 history the landslide model was trained on.
LIVE_MODEL = "ecmwf_ifs025"
LIVE_VARS = ["precipitation", "soil_moisture_7_to_28cm", "soil_moisture_28_to_100cm",
             "temperature_2m", "wind_speed_10m", "wind_gusts_10m"]
PAST_HOURS = 240  # 10 days: enough for the longest threshold window used
_forecast_lock = threading.Lock()
_forecast_cooldown_until = 0.0
_forecast_limit_message = None


def forecast_uses_key() -> bool:
    return bool(os.getenv("OPEN_METEO_API_KEY", "").strip())


def _retry_seconds(exc: SourceError) -> float:
    retry_after = exc.retry_after or ""
    if retry_after.isdecimal():
        return max(1, int(retry_after))
    if retry_after:
        try:
            until = parsedate_to_datetime(retry_after)
            if until.tzinfo is None:
                until = until.replace(tzinfo=timezone.utc)
            return max(1, until.timestamp() - time.time())
        except (ValueError, TypeError, OverflowError):
            pass
    return 900 if "daily" in str(exc).lower() else 60


def _forecast(params: dict, timeout: float) -> Any:
    global _forecast_cooldown_until, _forecast_limit_message
    api_key = os.getenv("OPEN_METEO_API_KEY", "").strip()
    url = CUSTOMER_FORECAST_URL if api_key else FORECAST_URL
    if api_key:
        params = {**params, "apikey": api_key}
    with _forecast_lock:
        if time.monotonic() < _forecast_cooldown_until:
            raise SourceError(_forecast_limit_message, status=429)
        try:
            return get_json(f"{url}?{urllib.parse.urlencode(params)}", timeout=timeout)
        except SourceError as exc:
            if exc.status == 429:
                _forecast_limit_message = "Open-Meteo forecast request limit reached (HTTP 429)."
                _forecast_cooldown_until = time.monotonic() + _retry_seconds(exc)
                raise SourceError(_forecast_limit_message, status=429) from None
            if api_key:
                # Upstream errors can echo URLs or query parameters containing the key.
                raise SourceError("Open-Meteo customer forecast is unavailable.", status=exc.status) from None
            raise


def _as_list(resp: Any) -> List[Dict[str, Any]]:
    return resp if isinstance(resp, list) else [resp]


def _completed_hours(hourly: Dict[str, list], now_utc: datetime) -> Dict[str, list]:
    """Keep only hours whose accumulation period has fully ended (time <= current hour)."""
    cutoff = now_utc.replace(minute=0, second=0, microsecond=0)
    keep = [i for i, t in enumerate(hourly["time"])
            if datetime.fromisoformat(t).replace(tzinfo=timezone.utc) <= cutoff]
    return {k: [v[i] for i in keep] for k, v in hourly.items()}


def fetch_live(points: Sequence[Tuple[float, float]], timeout: float = 12.0) -> List[Dict[str, Any]]:
    """Hourly series for up to ~20 points in ONE request. Raises SourceError on failure."""
    params = {
        "latitude": ",".join(f"{p[0]:.4f}" for p in points),
        "longitude": ",".join(f"{p[1]:.4f}" for p in points),
        "hourly": ",".join(LIVE_VARS),
        "past_hours": PAST_HOURS,
        "forecast_hours": 1,
        "models": LIVE_MODEL,
        "timezone": "UTC",
    }
    resp = _as_list(_forecast(params, timeout))
    if len(resp) != len(points):
        raise SourceError("Open-Meteo returned an unexpected number of locations")
    now = datetime.now(timezone.utc)
    fetched_at = now.isoformat()
    out = []
    for r in resp:
        if "hourly" not in r:
            raise SourceError(f"Open-Meteo error: {r.get('reason', 'no hourly data')}")
        hourly = _completed_hours(r["hourly"], now)
        if not hourly["time"]:
            raise SourceError("Open-Meteo returned no completed hours")
        out.append({"hourly": hourly, "fetched_at": fetched_at, "source": LIVE_SOURCE,
                    "grid_elevation_m": r.get("elevation")})
    return out


def fetch_recent_days(lat: float, lon: float, days: int = 14, timeout: float = 15.0) -> Dict[str, Any]:
    """Hourly precipitation + soil for the last `days` days (for the Analytics page)."""
    params = {
        "latitude": f"{lat:.4f}", "longitude": f"{lon:.4f}",
        "hourly": "precipitation,soil_moisture_7_to_28cm,soil_moisture_28_to_100cm",
        "past_days": days, "forecast_days": 1, "models": LIVE_MODEL, "timezone": "Asia/Kolkata",
    }
    r = _forecast(params, timeout)
    if "hourly" not in r:
        raise SourceError(f"Open-Meteo error: {r.get('reason', 'no hourly data')}")
    now_ist = datetime.now(timezone(timedelta(hours=5, minutes=30))).replace(tzinfo=None)
    h = r["hourly"]
    keep = [i for i, t in enumerate(h["time"]) if datetime.fromisoformat(t) <= now_ist]
    return {"hourly": {k: [v[i] for i in keep] for k, v in h.items()},
            "timezone": "Asia/Kolkata", "source": LIVE_SOURCE}


def fetch_era5_hourly(lat: float, lon: float, start: str, end: str, timeout: float = 30.0) -> Dict[str, Any]:
    """ERA5 hourly precipitation + soil moisture between two dates (YYYY-MM-DD, IST days)."""
    params = {
        "latitude": f"{lat:.4f}", "longitude": f"{lon:.4f}", "start_date": start, "end_date": end,
        "hourly": "precipitation,soil_moisture_7_to_28cm,soil_moisture_28_to_100cm,temperature_2m,wind_speed_10m",
        "models": "era5", "timezone": "Asia/Kolkata",
    }
    r = get_json(f"{ARCHIVE_URL}?{urllib.parse.urlencode(params)}", timeout=timeout)
    if "hourly" not in r:
        raise SourceError(f"Open-Meteo archive error: {r.get('reason', 'no hourly data')}")
    return {"hourly": r["hourly"], "timezone": "Asia/Kolkata", "source": ERA5_SOURCE,
            "grid_elevation_m": r.get("elevation")}


def elevation_points(points: Sequence[Tuple[float, float]], timeout: float = 10.0) -> List[float]:
    params = {"latitude": ",".join(f"{p[0]:.4f}" for p in points),
              "longitude": ",".join(f"{p[1]:.4f}" for p in points)}
    r = get_json(f"https://api.open-meteo.com/v1/elevation?{urllib.parse.urlencode(params)}", timeout=timeout)
    return [float(e) for e in r.get("elevation", [])]
