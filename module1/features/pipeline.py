"""Unified Feature Pipeline.

Orchestrates rainfall, terrain, vegetation, and historical feature extraction into a single transform pipeline.
"""

from typing import List, Tuple
import pandas as pd
from .rainfall import RainfallFeatureEngine
from .terrain import TerrainFeatureEngine
from .vegetation import VegetationFeatureEngine
from .historical import HistoricalFeatureEngine


class FeaturePipeline:
    """End-to-end feature engineering pipeline for Module 1 tabular data."""

    CORE_FEATURE_COLUMNS = [
        "rainfall_24h",
        "rainfall_72h",
        "rainfall_7d",
        "max_rainfall_1h",
        "rainfall_exceedance",
        "soil_moisture",
        "elevation",
        "slope",
        "aspect",
        "curvature",
        "twi",
        "flow_accumulation",
        "ndvi",
        "ndvi_change",
        "historical_density",
    ]

    def __init__(self, historical_catalog_df: pd.DataFrame = None):
        self.rf_engine = RainfallFeatureEngine()
        self.terrain_engine = TerrainFeatureEngine()
        self.veg_engine = VegetationFeatureEngine()
        self.hist_engine = HistoricalFeatureEngine(historical_catalog_df)

    def fit_transform(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """Applies all feature transformations and extracts canonical ML columns."""
        res = df.copy()
        res = self.rf_engine.transform_dataframe(res)
        res = self.terrain_engine.transform_dataframe(res)
        res = self.veg_engine.transform_dataframe(res)
        res = self.hist_engine.compute_density(res)

        # Ensure all core columns exist
        for col in self.CORE_FEATURE_COLUMNS:
            if col not in res.columns:
                res[col] = 0.0

        return res, self.CORE_FEATURE_COLUMNS

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        transformed, _ = self.fit_transform(df)
        return transformed[self.CORE_FEATURE_COLUMNS]
