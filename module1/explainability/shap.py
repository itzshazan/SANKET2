"""Factor attribution for Module 1 predictions.

Computes EXACT Shapley values over the five human-readable factor groups
(rainfall, soil moisture, terrain, vegetation, history) against a benign
reference state, using the real model. With 5 players that is only 32 model
evaluations per explanation, so it is exact and fast. (The previous version
ignored the model and used fixed if/else thresholds while labelling the result
"TreeSHAP".)

phi_i answers: "how many probability points did factor i add compared with a
calm, low-risk reference state?"
"""

from itertools import combinations
from math import factorial
from typing import Any, Dict, List

import numpy as np

from ..features.pipeline import FeaturePipeline

COLS = FeaturePipeline.CORE_FEATURE_COLUMNS

# Benign reference (dry, gentle, quiet history) that each factor is "switched on" from.
REFERENCE: Dict[str, float] = {
    "rainfall_24h": 2.0, "rainfall_72h": 5.0, "rainfall_7d": 20.0, "max_rainfall_1h": 1.0,
    "rainfall_exceedance": (5.0 / 72.0) / 0.994, "soil_moisture": 0.20, "elevation": 500.0,
    "slope": 12.0, "aspect": 180.0, "curvature": 0.0, "twi": 7.0, "flow_accumulation": 50.0,
    "ndvi": 0.70, "ndvi_change": 0.0, "historical_density": 2.0,
}

GROUPS: Dict[str, List[str]] = {
    "Rainfall Trigger": ["rainfall_24h", "rainfall_72h", "rainfall_7d", "max_rainfall_1h", "rainfall_exceedance"],
    "Soil Moisture": ["soil_moisture"],
    "Terrain Susceptibility": ["elevation", "slope", "aspect", "curvature", "twi", "flow_accumulation"],
    "Vegetation": ["ndvi", "ndvi_change"],
    "Historical Vulnerability": ["historical_density"],
}


def _status(factor: str, f: Dict[str, float]) -> Dict[str, str]:
    """Human-readable status + detail for a factor, from the actual input values."""
    if factor == "Terrain Susceptibility":
        s = f.get("slope", 22.0)
        return {"status": "High" if s >= 30 else "Moderate" if s >= 20 else "Low", "detail": f"Slope: {s:.1f}°"}
    if factor == "Rainfall Trigger":
        r = f.get("rainfall_72h", 0.0)
        return {"status": "High" if r >= 90 else "Elevated" if r >= 45 else "Low", "detail": f"72h rainfall: {r:.1f} mm"}
    if factor == "Soil Moisture":
        m = f.get("soil_moisture", 0.25)
        return {"status": "Saturated" if m >= 0.42 else "Elevated" if m >= 0.30 else "Normal", "detail": f"VWC: {m * 100:.1f}%"}
    if factor == "Vegetation":
        d = f.get("ndvi_change", 0.0)
        return {"status": "Reduced" if d <= -0.10 else "Stable", "detail": f"Delta NDVI: {d:+.2f}"}
    h = f.get("historical_density", 2)
    return {"status": "High" if h >= 20 else "Moderate" if h >= 8 else "Low", "detail": f"{h:g} prior landslides in sector (ISRO atlas)"}


class GroupShapleyExplainer:
    """Exact group-level Shapley attribution for the loaded model."""

    METHOD = "Group Shapley (exact, 5 factors, model-based)"

    def __init__(self, model=None):
        self.model = model

    def _value(self, x: Dict[str, float], on: frozenset) -> float:
        row = dict(REFERENCE)
        for g in on:
            for c in GROUPS[g]:
                row[c] = x[c]
        vec = np.array([[row[c] for c in COLS]], dtype=float)
        return float(self.model.predict_proba(vec)[0, 1])

    def explain_instance(self, feature_dict: Dict[str, float]) -> List[Dict[str, Any]]:
        x = {c: float(feature_dict.get(c) if feature_dict.get(c) is not None else REFERENCE[c]) for c in COLS}
        x["rainfall_exceedance"] = float(feature_dict.get("rainfall_exceedance", (x["rainfall_72h"] / 72.0) / 0.994))
        names = list(GROUPS)
        n = len(names)

        phi = {g: 0.0 for g in names}
        if self.model is not None:
            cache: Dict[frozenset, float] = {}
            val = lambda s: cache.setdefault(s, self._value(x, s))
            for g in names:
                others = [o for o in names if o != g]
                for k in range(n):
                    w = factorial(k) * factorial(n - k - 1) / factorial(n)
                    for combo in combinations(others, k):
                        s = frozenset(combo)
                        phi[g] += w * (val(s | {g}) - val(s))

        total = sum(abs(v) for v in phi.values()) or 1.0
        out = []
        for g, v in sorted(phi.items(), key=lambda kv: -abs(kv[1])):
            info = _status(g, x)
            out.append({
                "factor": g,
                "status": info["status"],
                "weight": round(abs(v) / total, 2),
                "detail": f"{info['detail']} · {v * 100:+.1f} pts of risk",
            })
        return out


# Backwards-compatible name used elsewhere in the code base.
TreeShapExplainer = GroupShapleyExplainer
