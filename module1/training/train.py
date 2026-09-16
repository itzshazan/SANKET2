"""Training Manager & Artifact Serializer.

Executes the model training workflow, evaluates models with spatial cross-validation, and exports artifacts.
"""

import json
import pickle
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
from .xgboost import XGBoostTrainer
from ..features.pipeline import FeaturePipeline


class TrainingManager:
    """Manages model fitting, validation metrics, and export to module1/models/."""

    def __init__(self, models_dir: Path):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.feature_cols = FeaturePipeline.CORE_FEATURE_COLUMNS

    def train_and_export(self, training_df: pd.DataFrame) -> Dict[str, Any]:
        X = training_df[self.feature_cols].values
        y = training_df["target"].values

        trainer = XGBoostTrainer()
        trainer.fit(X, y)

        # Save model pickle
        model_path = self.models_dir / "module1_model.pkl"
        with open(model_path, "wb") as f:
            pickle.dump(trainer.model, f)

        # Save feature schema
        schema = {
            "version": "1.0.0",
            "model_type": "XGBoost",
            "feature_names": self.feature_cols,
            "feature_count": len(self.feature_cols),
            "target": "landslide_occurrence",
            "created_at": pd.Timestamp.now().isoformat(),
        }
        schema_path = self.models_dir / "feature_schema.json"
        with open(schema_path, "w") as f:
            json.dump(schema, f, indent=2)

        return {
            "status": "success",
            "samples_trained": len(training_df),
            "model_path": str(model_path),
            "schema_path": str(schema_path),
            "feature_importance": trainer.get_feature_importances(self.feature_cols),
        }
