"""Data Cleaning and Normalization Pipeline.

Handles missing value imputation, statistical outlier clipping, and timestamp parsing.
"""

from typing import List, Optional
import numpy as np
import pandas as pd


class DataCleaner:
    """Cleans tabular landslide, meteorological, and environmental observation records."""

    NUMERICAL_BOUNDS = {
        "rainfall_24h": (0.0, 500.0),
        "rainfall_72h": (0.0, 1200.0),
        "rainfall_7d": (0.0, 2000.0),
        "soil_moisture": (0.02, 0.60),
        "elevation": (50.0, 7500.0),
        "slope": (0.0, 85.0),
        "aspect": (0.0, 360.0),
        "twi": (1.0, 25.0),
        "ndvi": (-0.20, 1.00),
        "ndvi_change": (-1.00, 1.00),
    }

    def clean(self, df: pd.DataFrame) -> pd.DataFrame:
        cleaned = df.copy()

        # Deduplicate on location and date
        if "event_date" in cleaned.columns and "latitude" in cleaned.columns:
            cleaned = cleaned.drop_duplicates(subset=["latitude", "longitude", "event_date"])

        # Clean numerical columns
        for col, (lower, upper) in self.NUMERICAL_BOUNDS.items():
            if col in cleaned.columns:
                cleaned[col] = pd.to_numeric(cleaned[col], errors="coerce")
                # Impute missing with median
                median_val = cleaned[col].median()
                if pd.isna(median_val):
                    median_val = (lower + upper) / 2.0
                cleaned[col] = cleaned[col].fillna(median_val)
                # Clip outliers
                cleaned[col] = cleaned[col].clip(lower=lower, upper=upper)

        return cleaned.reset_index(drop=True)
