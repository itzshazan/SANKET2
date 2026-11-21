"""Live landslide confidence from the trained model (if one has been trained)."""

import json
import threading
from typing import Any, Dict, List, Optional, Sequence, Tuple

from ..sources import openmeteo
from ..sources.cache import DiskCache, point_key
from ..sources.http import SourceError
from . import features as F
from .train import CARD_PATH, MODEL_PATH

_terrain = DiskCache("ml_terrain_v2")      # elevation stencil per point, never changes
_lock = threading.Lock()
_state: Dict[str, Any] = {"model": None, "card": None, "mtime": None}


def _load():
    if not MODEL_PATH.exists():
        return None, None
    mtime = MODEL_PATH.stat().st_mtime
    with _lock:
        if _state["mtime"] != mtime:
            import joblib
            _state.update(model=joblib.load(MODEL_PATH), mtime=mtime,
                          card=json.loads(CARD_PATH.read_text(encoding="utf-8")) if CARD_PATH.exists() else None)
        return _state["model"], _state["card"]


def available() -> bool:
    return _load()[0] is not None


def card() -> Optional[Dict[str, Any]]:
    return _load()[1]


def prefetch_terrain(points: Sequence[Tuple[float, float]]) -> None:
    """One elevation request for several points' stencils (cached forever)."""
    todo = [p for p in points if not _terrain.get(point_key(*p))]
    k = len(F.stencil_points(0.0, 0.0))
    per_req = (100 // k) * k
    coords = [q for p in todo for q in F.stencil_points(*p)]
    for i in range(0, len(coords), per_req):
        try:
            vals = openmeteo.elevation_points(coords[i:i + per_req], timeout=15)
        except SourceError:
            return
        for j in range(0, len(vals), k):
            _terrain.set(point_key(*todo[(i + j) // k]), vals[j:j + k])


def _terrain_for(lat: float, lon: float) -> Optional[List[float]]:
    hit = _terrain.get(point_key(lat, lon))
    if hit:
        return hit[0]
    prefetch_terrain([(lat, lon)])
    hit = _terrain.get(point_key(lat, lon))
    return hit[0] if hit else None


def confidence(hourly: Dict[str, list], lat: float, lon: float) -> Dict[str, Any]:
    model, crd = _load()
    if model is None:
        return {"status": "unavailable", "reason": "no trained model (run python -m module1.ml.train)"}
    wf = F.weather_features(hourly)
    if wf is None:
        return {"status": "unavailable", "reason": "not enough live weather history (need 240 h)"}
    elev = _terrain_for(lat, lon)
    if elev is None:
        return {"status": "unavailable", "reason": "elevation service unreachable"}
    feat = {**wf, **F.terrain_features(elev, lat)}
    p = float(model.predict_proba([F.vector(feat)])[0, 1])

    # Model-based explanation: how much each group raises the confidence compared with the
    # same place on a typical non-landslide day (group set to the training non-event median).
    drivers = []
    ref = (crd or {}).get("reference_non_event", {})
    for g, cols in (crd or {}).get("groups", {}).items():
        alt = dict(feat)
        for c in cols:
            if ref.get(c) is not None:
                alt[c] = ref[c]
        q = float(model.predict_proba([F.vector(alt)])[0, 1])
        drivers.append({"factor": g, "points": round((p - q) * 100, 1)})
    drivers.sort(key=lambda d: -abs(d["points"]))
    ops = ((crd or {}).get("evaluation", {}).get("time_split", {}).get("model_operating_points") or [])
    return {"status": "live", "confidence": round(p, 3), "drivers": drivers, "features": feat,
            "model": (crd or {}).get("name"), "operating_points_test": ops}
