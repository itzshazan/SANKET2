"""Model Evaluation Metrics.

Computes Area Under ROC Curve (AUC-ROC), Precision-Recall AUC, F1 score, and Brier calibration score.
"""

from typing import Dict, Any
import numpy as np
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    brier_score_loss,
    confusion_matrix,
)


class ModelEvaluator:
    """Computes comprehensive binary classification and calibration metrics."""

    @staticmethod
    def evaluate(y_true: np.ndarray, y_pred_proba: np.ndarray, threshold: float = 0.50) -> Dict[str, Any]:
        y_pred = (y_pred_proba >= threshold).astype(int)

        auc = float(roc_auc_score(y_true, y_pred_proba)) if len(np.unique(y_true)) > 1 else 0.5
        pr_auc = float(average_precision_score(y_true, y_pred_proba)) if len(np.unique(y_true)) > 1 else 0.5

        f1 = float(f1_score(y_true, y_pred, zero_division=0))
        precision = float(precision_score(y_true, y_pred, zero_division=0))
        recall = float(recall_score(y_true, y_pred, zero_division=0))
        brier = float(brier_score_loss(y_true, y_pred_proba))

        tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()

        return {
            "auc_roc": round(auc, 4),
            "pr_auc": round(pr_auc, 4),
            "f1": round(f1, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "brier_score": round(brier, 4),
            "confusion_matrix": {
                "true_negatives": int(tn),
                "false_positives": int(fp),
                "false_negatives": int(fn),
                "true_positives": int(tp),
            },
        }
