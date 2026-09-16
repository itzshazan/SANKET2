"""Historical Landslide Spatial Proximity & Susceptibility Density.

Computes spatial proximity to historical slide scars and localized event density.
"""

import numpy as np
import pandas as pd


class HistoricalFeatureEngine:
    """Computes spatial density and proximity to known landslide events."""

    def __init__(self, historical_catalog_df: pd.DataFrame = None):
        self.catalog = historical_catalog_df

    def compute_density(self, df: pd.DataFrame) -> pd.DataFrame:
        transformed = df.copy()

        # If catalog is provided, compute minimum Euclidean distance (approximate degrees)
        if self.catalog is not None and not self.catalog.empty:
            cat_lats = self.catalog["latitude"].values
            cat_lons = self.catalog["longitude"].values

            dists = []
            counts = []
            for _, row in transformed.iterrows():
                lat_diff = cat_lats - row["latitude"]
                lon_diff = cat_lons - row["longitude"]
                deg_dist = np.sqrt(lat_diff ** 2 + lon_diff ** 2)
                dists.append(float(np.min(deg_dist) * 111.0))  # approx km
                counts.append(int((deg_dist < 0.1).sum()))  # within ~11 km

            transformed["dist_to_historic_km"] = dists
            transformed["historical_density"] = counts
        else:
            # Synthetic baseline
            transformed["dist_to_historic_km"] = np.random.uniform(0.5, 25.0, len(transformed))
            transformed["historical_density"] = np.random.randint(0, 8, len(transformed))

        return transformed
