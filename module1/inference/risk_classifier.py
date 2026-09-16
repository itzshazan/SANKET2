"""Risk Level Classifier with Hysteresis Smoothing.

Maps continuous probability P in [0, 1] to the 4 operational levels:
- NORMAL  : P < 0.35
- WATCH   : 0.35 <= P < 0.60
- WARNING : 0.60 <= P < 0.80
- DANGER  : P >= 0.80

Enforces a hysteresis delta of 0.05 on downward transitions to prevent alarm flapping.
"""

from typing import Dict, Optional


class RiskLevelClassifier:
    """Manages threshold boundaries and transition hysteresis."""

    THRESHOLDS = {
        "danger": 0.80,
        "warning": 0.60,
        "watch": 0.35,
        "normal": 0.00,
    }
    HYSTERESIS_DELTA = 0.04

    def __init__(self):
        self.last_state: Dict[str, str] = {}

    def classify(self, probability: float, zone_id: Optional[str] = None) -> str:
        """Classifies risk level with downward hysteresis if previous zone state is tracked."""
        current_prev = self.last_state.get(zone_id) if zone_id else None

        # Standard upward escalation thresholds
        if probability >= self.THRESHOLDS["danger"]:
            level = "danger"
        elif probability >= self.THRESHOLDS["warning"]:
            level = "warning"
        elif probability >= self.THRESHOLDS["watch"]:
            level = "watch"
        else:
            level = "normal"

        # Apply downward hysteresis
        if current_prev == "danger" and probability >= (self.THRESHOLDS["danger"] - self.HYSTERESIS_DELTA):
            level = "danger"
        elif current_prev == "warning" and probability >= (self.THRESHOLDS["warning"] - self.HYSTERESIS_DELTA):
            level = "warning"
        elif current_prev == "watch" and probability >= (self.THRESHOLDS["watch"] - self.HYSTERESIS_DELTA):
            level = "watch"

        if zone_id:
            self.last_state[zone_id] = level

        return level
