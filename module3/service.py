"""SANKET Module 3: road blockage from a photo.

A CNN pretrained on real photographs (UPerNet + ConvNeXt-Tiny, ADE20K) labels every pixel; the
blocked share of the road width is measured from that (see scene_model.py).
torch is imported lazily on the first request so the rest of the API starts fast and light.
"""

import importlib.util
import io
import json
from pathlib import Path

from . import scene_model

ROOT = Path(__file__).resolve().parent
VALIDATION = ROOT / "validation" / "results.json"
MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 40_000_000


def _validation():
    try:
        return json.loads(VALIDATION.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def model_info():
    # cheap checks only: the 237 MB model is loaded on the first photo, not on every info request
    has_libs = all(importlib.util.find_spec(m) is not None for m in ("torch", "segmentation_models_pytorch"))
    ok = has_libs and scene_model.weights_present()
    err = (None if ok
           else "road-photo model not installed on this server: pip install -r requirements-road.txt" if not has_libs
           else "model weights missing: run  python -m module3.download_weights")
    return {
        "available": ok,
        "error": err,
        "model": {
            "name": "UPerNet + ConvNeXt-Tiny",
            "type": "pure CNN semantic segmentation (no attention layers)",
            "trained_on": "ADE20K: about 25,000 real photographs, 150 classes (road, tree, rock, earth, water, ...)",
            "weights": f"{scene_model.HF_REPO} (MIT licence)",
            "not_tuned_for": "disaster or landslide photos",
            "measure": "blocked share of the road width at the worst point along the visible road",
        },
        "validation": _validation(),
    }


def analyze(data: bytes):
    """Run the model on an uploaded image. Raises ValueError for bad input."""
    if not data:
        raise ValueError("empty file")
    if len(data) > MAX_BYTES:
        raise ValueError(f"image larger than {MAX_BYTES // (1024 * 1024)} MB")
    from PIL import Image, ImageOps, UnidentifiedImageError

    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError(f"not a readable image ({type(exc).__name__})") from exc
    img = ImageOps.exif_transpose(img).convert("RGB")      # phone photos: respect rotation

    result = scene_model.analyze(img)
    result["image_size"] = list(img.size)
    return result
