"""Baseline Logistic Regression Classifier with L2 Regularization."""

from typing import Dict, Any, Tuple
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler


class LogisticRegressionTrainer:
    """Trains a baseline linear probability model with scaled numerical features."""

    def __init__(self, c_param: float = 1.0, random_state: int = 42):
        self.scaler = StandardScaler()
        self.model = LogisticRegression(
            C=c_param,
            max_iter=1000,
            class_weight="balanced",
            random_state=random_state,
        )

    def fit(self, X: np.ndarray, y: np.ndarray) -> "LogisticRegressionTrainer":
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        X_scaled = self.scaler.transform(X)
        return self.model.predict_proba(X_scaled)[:, 1]

    def get_coefficients(self, feature_names: list) -> Dict[str, float]:
        return dict(zip(feature_names, self.model.coef_[0]))
