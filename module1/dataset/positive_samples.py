"""Positive Sample Generation (Target = 1).

Extracts spatial-temporal feature vectors at verified historical landslide failure coordinates.
"""

from typing import Optional
import pandas as pd


class PositiveSampleExtractor:
    """Creates target = 1 training rows from historical landslide events."""

    def extract(self, inventory_df: pd.DataFrame) -> pd.DataFrame:
        positives = inventory_df.copy()
        positives["target"] = 1
        positives["sample_type"] = "positive"
        return positives.reset_index(drop=True)
