"""Vegetation and Landcover Feature Engineering.

Computes vegetation protection factors and sudden canopy loss indicators.
"""

import numpy as np
import pandas as pd


class VegetationFeatureEngine:
    """Derives vegetation vigor and defoliation indicators from Sentinel-2 NDVI."""

    def transform_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        transformed = df.copy()

        if "ndvi" in transformed.columns:
            # Low NDVI on steep slopes indicates bare soil or recent excavation
            transformed["is_barren"] = (transformed["ndvi"] < 0.30).astype(int)

        if "ndvi_change" in transformed.columns:
            # Significant vegetation drop (< -0.15) strongly correlates with fresh scarping
            transformed["vegetation_drop_flag"] = (transformed["ndvi_change"] < -0.12).astype(int)

        return transformed
