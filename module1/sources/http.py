"""Tiny HTTP helpers (stdlib only) shared by the real-data source clients."""

import json
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

USER_AGENT = "SANKET-Landslide-EWS/2.0"


class SourceError(RuntimeError):
    """A real data source could not deliver data (network, HTTP or format problem)."""


def get_bytes(url: str, timeout: float = 20.0, headers: Optional[Dict[str, str]] = None,
              byte_range: Optional[tuple] = None) -> bytes:
    h = {"User-Agent": USER_AGENT, **(headers or {})}
    if byte_range is not None:
        h["Range"] = f"bytes={byte_range[0]}-{byte_range[1]}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=timeout) as resp:
            return resp.read()
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read()[:200].decode("utf-8", "replace")
        except Exception:
            pass
        raise SourceError(f"HTTP {exc.code} from {url.split('?')[0]} {detail}".strip()) from exc
    except Exception as exc:  # timeout, DNS, TLS ...
        raise SourceError(f"{type(exc).__name__} contacting {url.split('?')[0]}: {exc}") from exc


def get_json(url: str, timeout: float = 20.0, headers: Optional[Dict[str, str]] = None) -> Any:
    raw = get_bytes(url, timeout=timeout, headers={"Accept": "application/json", **(headers or {})})
    try:
        return json.loads(raw.decode("utf-8"))
    except ValueError as exc:
        raise SourceError(f"Invalid JSON from {url.split('?')[0]}") from exc


def post(url: str, data: bytes, headers: Dict[str, str], timeout: float = 30.0) -> Any:
    h = {"User-Agent": USER_AGENT, "Accept": "application/json", **headers}
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=h), timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read()[:300].decode("utf-8", "replace")
        raise SourceError(f"HTTP {exc.code} from {url.split('?')[0]}: {detail}") from exc
    except Exception as exc:
        raise SourceError(f"{type(exc).__name__} contacting {url.split('?')[0]}: {exc}") from exc
