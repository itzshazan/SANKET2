"""Live landslide confidence from the trained model (if one has been trained)."""

import json
import threading
from typing import Any, Dict, List, Optional, Sequence, Tuple

from ..sources import openmeteo
from ..sources.cache import DiskCache, point_key
from ..sources.http import SourceError
from . import features as F
from .train import CARD_PATH, MODEL_PATH, RAIN_SOIL_CARD_PATH, RAIN_SOIL_MODEL_PATH

_terrain = DiskCache("ml_terrain_v2")      # elevation stencil per point, never changes
_lock = threading.Lock()
_state: Dict[str, Dict[str, Any]] = {}


def _load(variant="hourly"):
    model_path, card_path = ((RAIN_SOIL_MODEL_PATH, RAIN_SOIL_CARD_PATH) if variant == "rain_soil"
                             else (MODEL_PATH, CARD_PATH))
    if not model_path.exists():
        return None, None
    mtime = model_path.stat().st_mtime
    with _lock:
        slot = _state.setdefault(variant, {})
        if slot.get("mtime") != mtime:
            import joblib
            slot.update(model=joblib.load(model_path), mtime=mtime,
                        card=json.loads(card_path.read_text(encoding="utf-8")) if card_path.exists() else None)
        return slot["model"], slot["card"]


def available() -> bool:
    return _load()[0] is not None


def card(variant="hourly") -> Optional[Dict[str, Any]]:
    return _load(variant)[1]


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


def confidence(weather: Dict[str, list], lat: float, lon: float, *, interval_hours: int = 1) -> Dict[str, Any]:
    if interval_hours == 1:
        model, crd = _load()
        wf = F.weather_features(weather)
        if model is not None and wf is not None:
            elev = _terrain_for(lat, lon)
            if elev is not None:
                return _explain(model, crd, {**wf, **F.terrain_features(elev, lat)}, "hourly", F.FEATURES)

    model, crd = _load("rain_soil")
    if model is None:
        return {"status": "unavailable", "reason": "The rain and soil confidence model is unavailable."}
    features = F.rain_soil_features(weather, interval_hours)
    if features is None:
        return {"status": "unavailable", "reason": "Confidence needs 10 days of rainfall and soil moisture."}
    return _explain(model, crd, features, "rain_soil", F.RAIN_SOIL_FEATURES)


def _explain(model, crd, feat, variant, feature_names):
    p = float(model.predict_proba([F.vector(feat, feature_names)])[0, 1])

    # Model-based explanation: how much each group raises the confidence compared with the
    # same place on a typical non-landslide day (group set to the training non-event median).
    drivers = []
    ref = (crd or {}).get("reference_non_event", {})
    for g, cols in (crd or {}).get("groups", {}).items():
        alt = dict(feat)
        for c in cols:
            if ref.get(c) is not None:
                alt[c] = ref[c]
        q = float(model.predict_proba([F.vector(alt, feature_names)])[0, 1])
        drivers.append({"factor": g, "points": round((p - q) * 100, 1)})
    drivers.sort(key=lambda d: -abs(d["points"]))
    ops = ((crd or {}).get("evaluation", {}).get("time_split", {}).get("model_operating_points") or [])
    return {"status": "live", "confidence": round(p, 3), "drivers": drivers, "features": feat,
            "model": (crd or {}).get("name"), "variant": variant, "operating_points_test": ops}
