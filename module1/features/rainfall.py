"""Rainfall Feature Engineering & Regional Threshold Computation.

Computes cumulative precipitation (24h, 72h, 7d), Antecedent Precipitation Index (API),
and Intensity-Duration exceedance ratio E = I / I_0(D).
"""

from typing import Dict
import numpy as np
import pandas as pd


class RainfallFeatureEngine:
    """Extracts precipitation indices and empirical threshold exceedance ratios."""

    # NE Himalaya empirical intensity-duration threshold: I = 5.8294 * D^(-0.4141)
    THRESHOLD_ALPHA = 5.8294
    THRESHOLD_BETA = -0.4141
    API_DECAY = 0.90  # Standard daily antecedent precipitation decay factor

    def compute_threshold_intensity(self, duration_hours: float) -> float:
        """Computes failure threshold intensity I_0 in mm/hr for duration D."""
        d = max(duration_hours, 1.0)
        return float(self.THRESHOLD_ALPHA * (d ** self.THRESHOLD_BETA))

    def compute_exceedance_ratio(self, rainfall_24h: float, rainfall_72h: float) -> float:
        """Calculates E = I / I_0(D) for 72h sustained monsoon storm."""
        duration = 72.0
        observed_intensity = rainfall_72h / duration  # mm/hr
        threshold_intensity = self.compute_threshold_intensity(duration)
        return float(observed_intensity / max(threshold_intensity, 0.01))

    def transform_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        transformed = df.copy()
        if "rainfall_72h" in transformed.columns:
            transformed["rainfall_exceedance"] = transformed.apply(
                lambda r: self.compute_exceedance_ratio(r.get("rainfall_24h", 0), r["rainfall_72h"]),
                axis=1,
            )
            # Antecedent Precipitation Index proxy
            transformed["api_index"] = (
                transformed.get("rainfall_24h", 0) * 1.0
                + (transformed.get("rainfall_72h", 0) - transformed.get("rainfall_24h", 0)) * self.API_DECAY
            )
        return transformed
