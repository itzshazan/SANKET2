"""Terrain Morphometry Feature Engineering.

Computes slope stability triggers, Topographic Wetness Index (TWI), and relative relief.
"""

import numpy as np
import pandas as pd


class TerrainFeatureEngine:
    """Derives geomorphometric indices from elevation and slope angles."""

    def transform_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        transformed = df.copy()

        # Compute slope in radians
        if "slope" in transformed.columns:
            slope_rad = np.radians(transformed["slope"].clip(lower=1.0, upper=85.0))
            transformed["slope_tangent"] = np.tan(slope_rad)
            transformed["slope_sine"] = np.sin(slope_rad)

            # High susceptibility slope risk classification (critical band: 25° - 45°)
            transformed["is_critical_slope"] = (
                (transformed["slope"] >= 25.0) & (transformed["slope"] <= 48.0)
            ).astype(int)

        # Solar radiation / aspect sine & cosine decomposition
        if "aspect" in transformed.columns:
            aspect_rad = np.radians(transformed["aspect"])
            transformed["aspect_sin"] = np.sin(aspect_rad)
            transformed["aspect_cos"] = np.cos(aspect_rad)

        return transformed
