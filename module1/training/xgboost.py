"""XGBoost Gradient Boosted Trees for Module 1 Production Inference."""

from typing import Dict, Any
import numpy as np

try:
    from xgboost import XGBClassifier
    HAS_XGBOOST = True
except ImportError:
    from sklearn.ensemble import HistGradientBoostingClassifier as XGBClassifier
    HAS_XGBOOST = False


class XGBoostTrainer:
    """Trains a gradient-boosted decision tree ensemble optimized for landslide classification."""

    def __init__(
        self,
        n_estimators: int = 200,
        max_depth: int = 6,
        learning_rate: float = 0.05,
        subsample: float = 0.85,
        random_state: int = 42,
    ):
        if HAS_XGBOOST:
            self.model = XGBClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                learning_rate=learning_rate,
                subsample=subsample,
                scale_pos_weight=2.5,
                eval_metric="logloss",
                random_state=random_state,
                n_jobs=-1,
            )
        else:
            self.model = XGBClassifier(
                max_iter=n_estimators,
                max_depth=max_depth,
                learning_rate=learning_rate,
                random_state=random_state,
            )

    def fit(self, X: np.ndarray, y: np.ndarray) -> "XGBoostTrainer":
        self.model.fit(X, y)
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(X)[:, 1]

    def get_feature_importances(self, feature_names: list) -> Dict[str, float]:
        if hasattr(self.model, "feature_importances_"):
            return dict(zip(feature_names, self.model.feature_importances_))
        return {f: 1.0 / len(feature_names) for f in feature_names}
