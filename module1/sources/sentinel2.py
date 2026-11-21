"""Sentinel-2 L2A NDVI via the Copernicus Data Space Ecosystem (CDSE) Statistical API.

Needs COPERNICUS_CLIENT_ID / COPERNICUS_CLIENT_SECRET in .env (a CDSE Sentinel Hub OAuth
client). Clouds, cloud shadows and cirrus are masked with the Scene Classification Layer.

NDVI change = mean NDVI of the last 30 days minus the same 30 days one year earlier.
During the monsoon, cloud-free pixels are often unavailable: then the last real value is
served (flagged with its date) or NDVI is reported as unavailable.
"""

import json
import os
import threading
import time
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from .cache import DiskCache, point_key
from .http import SourceError, post

TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
STATS_URL = "https://sh.dataspace.copernicus.eu/api/v1/statistics"
SOURCE_LABEL = "Sentinel-2 L2A via Copernicus Data Space (SCL cloud mask)"
FRESH_S = 3 * 86400            # NDVI changes slowly: re-query at most every 3 days
MIN_VALID_FRACTION = 0.10      # need >= 10 % cloud-free pixels in the window
HALF_BOX_DEG = 0.0025          # ~550 m box around the point

_EVALSCRIPT = """//VERSION=3
function setup(){return{input:[{bands:["B04","B08","SCL","dataMask"]}],
 output:[{id:"ndvi",bands:1,sampleType:"FLOAT32"},{id:"dataMask",bands:1}]}}
function evaluatePixel(s){var clear=s.dataMask==1&&[0,1,3,8,9,10,11].indexOf(s.SCL)<0;
 return{ndvi:[(s.B08-s.B04)/(s.B08+s.B04+1e-6)],dataMask:[clear?1:0]}}"""

_cache = DiskCache("ndvi_v1")
_token: Dict[str, Any] = {"value": None, "expires": 0.0}
_lock = threading.Lock()


def configured() -> bool:
    return bool(os.getenv("COPERNICUS_CLIENT_ID", "").strip() and os.getenv("COPERNICUS_CLIENT_SECRET", "").strip())


def _access_token() -> str:
    with _lock:
        if _token["value"] and time.time() < _token["expires"] - 60:
            return _token["value"]
        data = urllib.parse.urlencode({
            "client_id": os.getenv("COPERNICUS_CLIENT_ID", "").strip(),
            "client_secret": os.getenv("COPERNICUS_CLIENT_SECRET", "").strip(),
            "grant_type": "client_credentials",
        }).encode()
        res = post(TOKEN_URL, data, {"Content-Type": "application/x-www-form-urlencoded"}, timeout=20)
        _token["value"] = res["access_token"]
        _token["expires"] = time.time() + float(res.get("expires_in", 600))
        return _token["value"]


def _mean_ndvi(lat: float, lon: float, start: datetime, end: datetime) -> Optional[Dict[str, Any]]:
    body = {
        "input": {
            "bounds": {"bbox": [lon - HALF_BOX_DEG, lat - HALF_BOX_DEG, lon + HALF_BOX_DEG, lat + HALF_BOX_DEG],
                       "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"}},
            "data": [{"type": "sentinel-2-l2a", "dataFilter": {"mosaickingOrder": "leastCC"}}],
        },
        "aggregation": {
            "timeRange": {"from": start.strftime("%Y-%m-%dT00:00:00Z"), "to": end.strftime("%Y-%m-%dT00:00:00Z")},
            "aggregationInterval": {"of": f"P{(end - start).days}D"},
            "evalscript": _EVALSCRIPT, "resx": 0.0001, "resy": 0.0001,
        },
    }
    res = post(STATS_URL, json.dumps(body).encode(),
               {"Authorization": f"Bearer {_access_token()}", "Content-Type": "application/json"}, timeout=40)
    for interval in res.get("data", []):
        st = interval["outputs"]["ndvi"]["bands"]["B0"]["stats"]
        total = st.get("sampleCount", 0) or 0
        valid = total - (st.get("noDataCount", 0) or 0)
        if total and valid / total >= MIN_VALID_FRACTION and st.get("mean") is not None:
            return {"mean": round(float(st["mean"]), 3), "valid_fraction": round(valid / total, 2),
                    "from": interval["interval"]["from"][:10], "to": interval["interval"]["to"][:10]}
    return None


def ndvi_at(lat: float, lon: float) -> Dict[str, Any]:
    """Real NDVI for a point with provenance. Never invents a value."""
    key = point_key(lat, lon, 3)
    fresh = _cache.get_fresh(key, FRESH_S)
    if fresh:
        return {**fresh, "status": "live"}
    if not configured():
        return {"status": "unavailable", "reason": "COPERNICUS_CLIENT_ID/SECRET not set in .env"}
    try:
        end = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        start = end - timedelta(days=30)
        cur = _mean_ndvi(lat, lon, start, end)
        if cur is None:
            raise SourceError("no cloud-free Sentinel-2 pixels in the last 30 days")
        base = _mean_ndvi(lat, lon, start - timedelta(days=365), end - timedelta(days=365))
        value = {
            "ndvi": cur["mean"], "period": f"{cur['from']} to {cur['to']}", "valid_fraction": cur["valid_fraction"],
            "ndvi_last_year": base["mean"] if base else None,
            "ndvi_change": round(cur["mean"] - base["mean"], 3) if base else None,
            "source": SOURCE_LABEL, "retrieved_at": datetime.now(timezone.utc).isoformat(),
        }
        _cache.set(key, value)
        return {**value, "status": "live"}
    except (SourceError, KeyError) as exc:
        hit = _cache.get(key)
        if hit:
            return {**hit[0], "status": "stale", "reason": f"latest query failed ({exc}); showing last real value"}
        return {"status": "unavailable", "reason": str(exc)}
