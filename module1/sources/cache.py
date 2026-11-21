"""Small thread-safe JSON disk cache.

Used to keep the LAST REAL reading from every source, so a network failure falls back to
genuine (but older, clearly flagged) data instead of an invented value.
"""

import json
import os
import threading
import time
from pathlib import Path
from typing import Any, Optional, Tuple

CACHE_DIR = Path(os.getenv("SANKET_CACHE_DIR") or Path(__file__).resolve().parent.parent / "data" / "cache")


class DiskCache:
    def __init__(self, name: str):
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        self.path = CACHE_DIR / f"{name}.json"
        self._lock = threading.Lock()
        self._data = {}
        if self.path.exists():
            try:
                self._data = json.loads(self.path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                self._data = {}

    def get(self, key: str) -> Optional[Tuple[Any, float]]:
        """Returns (value, saved_at_epoch) or None."""
        with self._lock:
            entry = self._data.get(key)
        if not entry:
            return None
        return entry["value"], float(entry["saved_at"])

    def get_fresh(self, key: str, max_age_s: float) -> Optional[Any]:
        hit = self.get(key)
        if hit and time.time() - hit[1] <= max_age_s:
            return hit[0]
        return None

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._data[key] = {"value": value, "saved_at": time.time()}
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps(self._data), encoding="utf-8")
            os.replace(tmp, self.path)

    def delete(self, key: str) -> None:
        with self._lock:
            self._data.pop(key, None)


def point_key(lat: float, lon: float, digits: int = 4) -> str:
    return f"{round(lat, digits)},{round(lon, digits)}"
