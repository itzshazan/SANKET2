"""SANKET Module 1 — Inference Package."""
from .predictor import LandslidePredictor
from .risk_classifier import RiskLevelClassifier

__all__ = [
    "LandslidePredictor",
    "RiskLevelClassifier",
]
