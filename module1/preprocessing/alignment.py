"""Multi-Resolution Spatiotemporal Alignment.

Harmonizes coarse satellite grids (IMERG ~10km, SMAP ~9km) with fine-scale terrain (DEM 30m) onto sample points.
"""

from datetime import datetime, timedelta
from typing import Optional
import numpy as np
import pandas as pd


class SpatiotemporalAligner:
    """Aligns multi-source geospatial and meteorological streams to sample coordinates."""

    def __init__(self, spatial_tolerance_km: float = 5.0, temporal_tolerance_days: int = 1):
        self.spatial_tolerance_km = spatial_tolerance_km
        self.temporal_tolerance_days = temporal_tolerance_days

    def align_samples(
        self,
        samples_df: pd.DataFrame,
        rainfall_features_df: pd.DataFrame,
        terrain_features_df: pd.DataFrame,
        soil_features_df: pd.DataFrame,
        vegetation_features_df: pd.DataFrame,
    ) -> pd.DataFrame:
        """Joins extracted feature blocks by sample index."""
        dfs = [
            samples_df.reset_index(drop=True),
            rainfall_features_df.reset_index(drop=True),
            terrain_features_df.reset_index(drop=True),
            soil_features_df.reset_index(drop=True),
            vegetation_features_df.reset_index(drop=True),
        ]

        # Concatenate and deduplicate identical column names
        combined = pd.concat(dfs, axis=1)
        combined = combined.loc[:, ~combined.columns.duplicated()]
        return combined
