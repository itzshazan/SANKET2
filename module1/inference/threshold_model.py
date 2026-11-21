"""Rainfall-threshold hazard model (interim, until a model trained on real event data exists).

For every trailing window D (hours) it compares the rain that actually fell with the
published threshold for that region and duration:
  ID threshold: I_thr(D) = alpha * D^beta   (mm/h)  ->  ratio = (rain_D / D) / I_thr(D)
  ED threshold: E_thr(D) = a + b * D        (mm)    ->  ratio = rain_D / E_thr(D)
The largest ratio over all valid windows governs the hazard level.
"""

import json
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "thresholds.json"
LEVELS = ("normal", "watch", "warning", "danger")
SEVERITY_ORDER = ("unknown",) + LEVELS
MODEL_NAME = "Published regional rainfall thresholds (intensity/event-duration)"

with open(CONFIG_PATH, encoding="utf-8") as fh:
    CONFIG = json.load(fh)

_STATE_TO_REGION = {s: rid for rid, r in CONFIG["regions"].items() for s in r["states"]}


def region_for_state(state: Optional[str]) -> str:
    return _STATE_TO_REGION.get(state or "", "global_default")


def region_info(region_id: str) -> Dict[str, Any]:
    r = CONFIG["regions"][region_id]
    eq = (f"I = {r['alpha']} x D^{r['beta']} (I mm/h, D h)" if r["type"] == "ID"
          else f"E = {r['a']} + {r['b']} x D (E mm, D h)")
    return {"id": region_id, "label": r["label"], "type": r["type"], "equation": eq,
            "valid_hours": [r["d_min_h"], r["d_max_h"]], "basis": r["basis"],
            "citation": r["citation"], "doi": r.get("doi"), "status": r.get("status")}


def threshold_mm(region_id: str, hours: float) -> Optional[float]:
    """Rainfall total (mm) over `hours` that reaches the threshold, or None if outside its range."""
    r = CONFIG["regions"][region_id]
    if not (r["d_min_h"] <= hours <= r["d_max_h"]):
        return None
    if r["type"] == "ID":
        return r["alpha"] * hours ** r["beta"] * hours
    e = r["a"] + r["b"] * hours
    return e if e > 0 else None


def window_sums(precip: Sequence[Optional[float]]) -> Dict[int, Optional[float]]:
    """Trailing rain totals ending at the last element (latest completed hour)."""
    vals = [0.0 if v is None else float(v) for v in precip]
    out = {}
    for d in CONFIG["durations_hours"]:
        out[d] = round(sum(vals[-d:]), 1) if len(vals) >= d else None
    return out


def level_for_ratio(ratio: float, previous: Optional[str] = None) -> str:
    lv = CONFIG["levels"]
    cuts = [("danger", lv["danger"]), ("warning", lv["warning"]), ("watch", lv["watch"])]
    level = next((name for name, cut in cuts if ratio >= cut), "normal")
    if previous in LEVELS and LEVELS.index(previous) > LEVELS.index(level):
        # downward hysteresis: stay at the previous level until clearly below its boundary
        boundary = lv[previous]
        if ratio >= boundary * (1 - lv["hysteresis"]):
            level = previous
    return level


def evaluate(precip_hourly: Sequence[Optional[float]], region_id: str,
             previous_level: Optional[str] = None) -> Dict[str, Any]:
    sums = window_sums(precip_hourly)
    windows: List[Dict[str, Any]] = []
    best = None
    for d, rain in sums.items():
        thr = threshold_mm(region_id, d)
        if rain is None or thr is None:
            continue
        ratio = rain / thr
        row = {"hours": d, "rain_mm": rain, "threshold_mm": round(thr, 1), "ratio": round(ratio, 2)}
        windows.append(row)
        if best is None or ratio > best["ratio"]:
            best = row
    if best is None:
        return {"level": "unknown", "ratio": None, "governing_window": None, "windows": windows,
                "rain_windows_mm": sums, "region": region_info(region_id),
                "reason": "not enough rainfall history for any valid threshold duration"}
    if best["ratio"] == 0:   # no rain at all in any window: nothing governs the level
        return {"level": level_for_ratio(0.0, previous_level), "ratio": 0.0, "governing_window": None,
                "windows": windows, "rain_windows_mm": sums, "region": region_info(region_id),
                "levels": {k: CONFIG["levels"][k] for k in ("watch", "warning", "danger")},
                "reason": f"no rain in the last {max(CONFIG['durations_hours'])} hours"}
    return {
        "level": level_for_ratio(best["ratio"], previous_level),
        "ratio": best["ratio"],
        "governing_window": best,
        "windows": windows,
        "rain_windows_mm": sums,
        "region": region_info(region_id),
        "levels": {k: CONFIG["levels"][k] for k in ("watch", "warning", "danger")},
    }


class HysteresisMemory:
    """Remembers the last level per monitoring point so alerts do not flap."""

    def __init__(self):
        self._last: Dict[str, str] = {}
        self._lock = threading.Lock()

    def evaluate(self, key: Optional[str], precip, region_id: str) -> Dict[str, Any]:
        with self._lock:
            prev = self._last.get(key) if key else None
        res = evaluate(precip, region_id, prev)
        if key and res["level"] != "unknown":
            with self._lock:
                self._last[key] = res["level"]
        return res


hysteresis = HysteresisMemory()
