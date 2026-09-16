"""Real-Time Landslide Risk Predictor.

Loads serialized XGBoost model artifact and evaluates incoming telemetry vectors.
"""

import pickle
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
from ..features.pipeline import FeaturePipeline
from .risk_classifier import RiskLevelClassifier


class LandslidePredictor:
    """Production predictor executing the Module 1 model inference pipeline."""

    def __init__(self, model_path: Path = None):
        self.model = None
        self.feature_cols = FeaturePipeline.CORE_FEATURE_COLUMNS
        self.classifier = RiskLevelClassifier()

        if model_path and Path(model_path).exists():
            try:
                with open(model_path, "rb") as f:
                    self.model = pickle.load(f)
            except Exception:
                self.model = None

    def predict(self, feature_dict: Dict[str, float]) -> Tuple[float, str]:
        """Calculates risk probability and 4-tier risk classification."""
        # Derive rainfall exceedance if missing
        rf_24 = feature_dict.get("rainfall_24h", 0.0)
        rf_72 = feature_dict.get("rainfall_72h", 0.0)
        if "rainfall_exceedance" not in feature_dict:
            # I = rf_72 / 72, I_0 = 5.8294 * 72^(-0.4141) = 0.994 mm/hr
            feature_dict["rainfall_exceedance"] = (rf_72 / 72.0) / 0.994

        if self.model is not None:
            vector = np.array([[feature_dict.get(col, 0.0) for col in self.feature_cols]])
            proba = float(self.model.predict_proba(vector)[0, 1])
        else:
            # Calibrated mathematical heuristic baseline matching Stage A x Stage B fusion formula
            slope = feature_dict.get("slope", 20.0)
            soil = feature_dict.get("soil_moisture", 0.25)
            exceed = feature_dict.get("rainfall_exceedance", 0.3)

            # Static susceptibility factor S [0, 1] based on slope and TWI
            s = np.clip((slope - 10.0) / 35.0, 0.0, 1.0)
            # Dynamic rainfall trigger E [0, 1]
            e = np.clip(exceed / 2.5, 0.0, 1.0)
            # Moisture factor M [0, 1]
            m = np.clip((soil - 0.20) / 0.30, 0.0, 1.0)

            # SANKET formula: H = S * f(E) + 0.3 * M
            h = 0.65 * (s * e) + 0.35 * m
            proba = float(np.clip(h, 0.05, 0.98))

        level = self.classifier.classify(proba)
        return round(proba, 4), level
