"""Random Forest Classifier for Landslide Susceptibility."""

from typing import Dict, Any
import numpy as np
from sklearn.ensemble import RandomForestClassifier


class RandomForestTrainer:
    """Trains an ensemble of decision trees with Gini impurity feature ranking."""

    def __init__(self, n_estimators: int = 150, max_depth: int = 10, random_state: int = 42):
        self.model = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            class_weight="balanced",
            n_jobs=-1,
            random_state=random_state,
        )

    def fit(self, X: np.ndarray, y: np.ndarray) -> "RandomForestTrainer":
        self.model.fit(X, y)
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(X)[:, 1]

    def get_feature_importances(self, feature_names: list) -> Dict[str, float]:
        return dict(zip(feature_names, self.model.feature_importances_))
