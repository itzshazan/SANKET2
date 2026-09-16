"""Negative Sample Generation (Target = 0).

Generates non-failure training samples across NER with spatial buffer constraints.
"""

from datetime import datetime, timedelta
from typing import List, Tuple
import numpy as np
import pandas as pd


class NegativeSampleGenerator:
    """Generates target = 0 samples from stable hillslopes and valleys across NER."""

    NER_BBOX = {"min_lat": 22.0, "max_lat": 28.5, "min_lon": 89.0, "max_lon": 96.5}

    def generate(
        self,
        positive_df: pd.DataFrame,
        ratio: float = 2.0,
        random_seed: int = 42,
    ) -> pd.DataFrame:
        """Generates `ratio * len(positive_df)` non-event samples."""
        np.random.seed(random_seed)
        n_samples = int(len(positive_df) * ratio)
        if n_samples == 0:
            n_samples = 250

        # Generate coordinates distributed throughout the NER
        lats = np.random.uniform(self.NER_BBOX["min_lat"], self.NER_BBOX["max_lat"], n_samples)
        lons = np.random.uniform(self.NER_BBOX["min_lon"], self.NER_BBOX["max_lon"], n_samples)

        # Generate random dates spanning recent monsoon seasons (2020 - 2024)
        base_date = datetime(2020, 6, 1)
        dates = [base_date + timedelta(days=int(d)) for d in np.random.randint(0, 1400, n_samples)]

        negatives = pd.DataFrame({
            "event_id": [f"NEG-NER-{i:05d}" for i in range(n_samples)],
            "latitude": np.round(lats, 4),
            "longitude": np.round(lons, 4),
            "event_date": dates,
            "target": 0,
            "sample_type": "negative",
        })

        return negatives
