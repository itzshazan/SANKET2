"""Dataset Builder and Spatial Partitioning.

Constructs full training dataset with positive and negative samples and spatial block assignments.
"""

from pathlib import Path
from typing import Dict, Tuple
import numpy as np
import pandas as pd
from .positive_samples import PositiveSampleExtractor
from .negative_samples import NegativeSampleGenerator
from ..features.pipeline import FeaturePipeline
from ..ingestion.rainfall import RainfallDataIngestor
from ..ingestion.soil_moisture import SoilMoistureIngestor
from ..ingestion.dem import DemRasterIngestor
from ..ingestion.satellite import SatelliteOpticsIngestor


class DatasetBuilder:
    """Builds, enriches, and splits the final Module 1 training dataset."""

    def __init__(self, raw_dir: Path):
        self.raw_dir = Path(raw_dir)
        self.rf_ingest = RainfallDataIngestor(raw_dir)
        self.sm_ingest = SoilMoistureIngestor(raw_dir)
        self.dem_ingest = DemRasterIngestor(raw_dir)
        self.sat_ingest = SatelliteOpticsIngestor(raw_dir)

    def build(self, inventory_df: pd.DataFrame, neg_ratio: float = 2.0) -> pd.DataFrame:
        pos_extractor = PositiveSampleExtractor()
        neg_generator = NegativeSampleGenerator()

        pos_df = pos_extractor.extract(inventory_df)
        neg_df = neg_generator.generate(pos_df, ratio=neg_ratio)

        # Merge base samples
        base_df = pd.concat([pos_df, neg_df], ignore_index=True)

        # Extract features from each domain
        enriched = self.rf_ingest.batch_extract(base_df)
        enriched = self.sm_ingest.batch_extract(enriched)
        enriched = self.dem_ingest.batch_extract(enriched)
        enriched = self.sat_ingest.batch_extract(enriched)

        # Apply feature pipeline
        pipeline = FeaturePipeline(inventory_df)
        transformed_df, _ = pipeline.fit_transform(enriched)

        # Assign spatial block cluster ID (1 degree grid cells for block spatial cross-validation)
        transformed_df["spatial_block"] = (
            np.floor(transformed_df["latitude"]).astype(int).astype(str)
            + "_"
            + np.floor(transformed_df["longitude"]).astype(int).astype(str)
        )

        return transformed_df
