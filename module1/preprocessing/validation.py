"""Spatial and Temporal Data Validation.

Verifies coordinates lie strictly within North East Region (NER) limits and validates chronological integrity.
"""

from typing import Dict, Tuple
import pandas as pd


class SpatialTemporalValidator:
    """Validates geographic boundaries and date structures for the 8 NER states."""

    NER_BBOX = {
        "min_lat": 21.5,
        "max_lat": 29.5,
        "min_lon": 88.0,
        "max_lon": 97.5,
    }

    def validate_coordinates(self, lat: float, lon: float) -> bool:
        return (
            self.NER_BBOX["min_lat"] <= lat <= self.NER_BBOX["max_lat"]
            and self.NER_BBOX["min_lon"] <= lon <= self.NER_BBOX["max_lon"]
        )

    def validate_dataframe(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
        required_cols = ["latitude", "longitude"]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Missing required coordinate column: {col}")

        initial_len = len(df)

        # Coordinate check
        in_bounds = (
            (df["latitude"] >= self.NER_BBOX["min_lat"])
            & (df["latitude"] <= self.NER_BBOX["max_lat"])
            & (df["longitude"] >= self.NER_BBOX["min_lon"])
            & (df["longitude"] <= self.NER_BBOX["max_lon"])
        )
        valid_df = df[in_bounds].copy()
        dropped_geo = initial_len - len(valid_df)

        # Date validation if present
        dropped_date = 0
        if "event_date" in valid_df.columns:
            valid_df["event_date"] = pd.to_datetime(valid_df["event_date"], errors="coerce")
            valid_dates = valid_df["event_date"].notna()
            dropped_date = len(valid_df) - valid_dates.sum()
            valid_df = valid_df[valid_dates]

        stats = {
            "initial_rows": initial_len,
            "dropped_out_of_bounds": dropped_geo,
            "dropped_invalid_date": dropped_date,
            "valid_rows": len(valid_df),
        }
        return valid_df.reset_index(drop=True), stats
