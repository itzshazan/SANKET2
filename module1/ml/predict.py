"""Live landslide confidence from the trained model (if one has been trained)."""

import json
import threading
from datetime import date
from typing import Any, Dict, List, Optional, Sequence, Tuple

from ..sources import openmeteo, terrain
from ..sources.cache import DiskCache, point_key
from ..sources.http import SourceError
from . import context as C
from . import features as F
from .train import VARIANTS

_terrain = DiskCache("ml_terrain_v2")      # elevation stencil per point, never changes
_lock = threading.Lock()
_state: Dict[str, Dict[str, Any]] = {}


def _load(variant="hourly"):
    _, model_path, card_path, _ = VARIANTS[variant]
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
    return any(_load(variant)[0] is not None for variant in ("context", "hourly", "rain_soil"))


def card(variant="hourly") -> Optional[Dict[str, Any]]:
    return _load(variant)[1]


def prefetch_terrain(points: Sequence[Tuple[float, float]]) -> None:
    """One elevation request for several points' stencils (cached forever)."""
    seeded = C.hotspot_terrain()
    todo = [p for p in points if point_key(*p) not in seeded and not _terrain.get(point_key(*p))]
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
    seeded = C.hotspot_terrain().get(point_key(lat, lon))
    if seeded is not None:
        return seeded
    hit = _terrain.get(point_key(lat, lon))
    if hit:
        return hit[0]
    prefetch_terrain([(lat, lon)])
    hit = _terrain.get(point_key(lat, lon))
    return hit[0] if hit else None


def confidence(weather: Dict[str, list], lat: float, lon: float, *, interval_hours: int = 1) -> Dict[str, Any]:
    model, crd = _load("context")
    missing = []
    if model is not None:
        features = F.context_weather_features(weather, interval_hours)
        times = weather.get("time") or []
        ndvi = C.vegetation_at(lat, lon)
        previous = C.nearby_landslides(lat, lon, date.fromisoformat(times[-1][:10])) if times else None
        if features is None:
            missing.append("complete weather series")
        if ndvi is None:
            missing.append("vegetation baseline")
        if previous is None:
            missing.append("dated landslide history")
        if not missing:
            elev = C.hotspot_terrain().get(point_key(lat, lon)) or terrain.copernicus_stencil(lat, lon)
            if elev is None:
                elev = _terrain_for(lat, lon)
            if elev is not None:
                full = {**features, **F.terrain_features(elev, lat), "vegetation_baseline_ndvi": ndvi,
                        "prior_landslides_10km": previous}
                return _explain(model, crd, full, "context", F.CONTEXT_FEATURES)
            missing.append("terrain")

    fallback = {"missing_inputs": missing} if missing else {}
    if interval_hours == 1:
        model, crd = _load()
        wf = F.weather_features(weather)
        if model is not None and wf is not None:
            elev = _terrain_for(lat, lon)
            if elev is not None:
                return {**_explain(model, crd, {**wf, **F.terrain_features(elev, lat)}, "hourly", F.FEATURES), **fallback}

    model, crd = _load("rain_soil")
    if model is None:
        return {"status": "unavailable", "reason": "The rain and soil confidence model is unavailable."}
    features = F.rain_soil_features(weather, interval_hours)
    if features is None:
        return {"status": "unavailable", "reason": "Confidence needs 10 days of rainfall and soil moisture."}
    return {**_explain(model, crd, features, "rain_soil", F.RAIN_SOIL_FEATURES), **fallback}


def _explain(model, crd, feat, variant, feature_names):
    # Compare each group with its non-event median while holding the other inputs fixed.
    ref = (crd or {}).get("reference_non_event", {})
    groups = (crd or {}).get("groups", {})
    rows = [F.vector(feat, feature_names)]
    for cols in groups.values():
        adjusted = {**feat, **{c: ref[c] for c in cols if ref.get(c) is not None}}
        rows.append(F.vector(adjusted, feature_names))
    p, *baseline = map(float, model.predict_proba(rows)[:, 1])
    drivers = [{"factor": group, "points": round((p - q) * 100, 1)} for group, q in zip(groups, baseline)]
    drivers.sort(key=lambda d: -abs(d["points"]))
    ops = ((crd or {}).get("evaluation", {}).get("time_split", {}).get("model_operating_points") or [])
    return {"status": "live", "confidence": round(p, 3), "drivers": drivers, "features": feat,
            "model": (crd or {}).get("name"), "variant": variant, "operating_points_test": ops}
