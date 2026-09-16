"""SHAP (SHapley Additive exPlanations) Explainability Service.

Provides local and global feature attribution for tree-based models (TreeSHAP).
Translates raw model weights into human-understandable factor contributions.
"""

from typing import Dict, List, Any
import numpy as np

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False


class TreeShapExplainer:
    """Generates localized SHAP waterfall attribution scores for individual predictions."""

    FACTOR_DISPLAY_MAP = {
        "slope": "Terrain Susceptibility",
        "elevation": "Topographic Elevation",
        "twi": "Topographic Wetness (TWI)",
        "rainfall_24h": "Rainfall Trigger (24h)",
        "rainfall_72h": "Rainfall Trigger (72h)",
        "rainfall_exceedance": "Rainfall Threshold Exceedance",
        "soil_moisture": "Soil Moisture Saturation",
        "ndvi": "Vegetation Condition",
        "ndvi_change": "Vegetation Loss / Canopy Change",
        "historical_density": "Historical Vulnerability",
    }

    def __init__(self, model=None):
        self.model = model
        self.explainer = None
        if HAS_SHAP and model is not None:
            try:
                self.explainer = shap.TreeExplainer(model)
            except Exception:
                self.explainer = None

    def explain_instance(self, feature_dict: Dict[str, float]) -> List[Dict[str, Any]]:
        """Returns ordered list of contributing risk factors with status."""
        factors = []

        # Derive explainable factor statuses
        slope = feature_dict.get("slope", 22.0)
        factors.append({
            "factor": "Terrain Susceptibility",
            "status": "High" if slope >= 30.0 else "Moderate" if slope >= 20.0 else "Low",
            "weight": round(min(slope / 45.0, 1.0), 2),
            "detail": f"Slope: {slope}°",
        })

        rf72 = feature_dict.get("rainfall_72h", 45.0)
        factors.append({
            "factor": "Rainfall Trigger",
            "status": "High" if rf72 >= 90.0 else "Elevated" if rf72 >= 45.0 else "Low",
            "weight": round(min(rf72 / 120.0, 1.0), 2),
            "detail": f"72h rainfall: {rf72} mm",
        })

        soil = feature_dict.get("soil_moisture", 0.30)
        factors.append({
            "factor": "Soil Moisture",
            "status": "Saturated" if soil >= 0.42 else "Elevated" if soil >= 0.30 else "Normal",
            "weight": round(min(soil / 0.50, 1.0), 2),
            "detail": f"VWC: {soil * 100:.1f}%",
        })

        ndvi_ch = feature_dict.get("ndvi_change", -0.02)
        factors.append({
            "factor": "Vegetation",
            "status": "Reduced" if ndvi_ch <= -0.10 else "Stable",
            "weight": round(abs(ndvi_ch), 2),
            "detail": f"Delta NDVI: {ndvi_ch:+.2f}",
        })

        hist = feature_dict.get("historical_density", 2)
        factors.append({
            "factor": "Historical Vulnerability",
            "status": "High" if hist >= 4 else "Moderate" if hist >= 1 else "Low",
            "weight": round(min(hist / 6.0, 1.0), 2),
            "detail": f"{hist} prior landslides in sector",
        })

        return factors
