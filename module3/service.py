"""SANKET Module 3: road blockage from a photo.

A CNN pretrained on real photographs (UPerNet + ConvNeXt-Tiny, ADE20K) labels every pixel; the
blocked share of the road width is measured from that (see scene_model.py).
torch is imported lazily on the first request so the rest of the API starts fast and light.
"""

import importlib.util
import io
import json
import threading
from pathlib import Path

from . import road_onnx, scene_model

ROOT = Path(__file__).resolve().parent
MAX_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 40_000_000
MAX_DECODED_PIXELS = 8_000_000
_upload_slot = threading.Lock()


def validation_path():
    filename = "results-onnx.json" if road_onnx.MODEL_PATH.is_file() else "results.json"
    return ROOT / "validation" / filename


def _validation():
    try:
        return json.loads(validation_path().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def model_info():
    # Check the artifact and dependency without loading either model into the API process.
    compact = road_onnx.MODEL_PATH.is_file()
    if compact:
        ok = importlib.util.find_spec("onnxruntime") is not None
        err = None if ok else "ONNX Runtime is missing from this server."
    else:
        has_libs = all(importlib.util.find_spec(m) is not None for m in ("torch", "segmentation_models_pytorch"))
        ok = has_libs and scene_model.weights_present()
        err = (None if ok
               else "road-photo model not installed on this server: pip install -r requirements-road.txt" if not has_libs
               else "model weights missing: run python -m module3.download_weights")
    return {
        "runtime": "onnx-int8" if compact else "pytorch",
        "available": ok,
        "error": err,
        "model": {
            "name": "UPerNet + ConvNeXt-Tiny",
            "type": "pure CNN semantic segmentation (no attention layers)",
            "trained_on": "ADE20K: about 25,000 real photographs, 150 classes (road, tree, rock, earth, water, ...)",
            "weights": f"{scene_model.HF_REPO} (MIT licence)",
            "not_tuned_for": "disaster or landslide photos",
            "measure": "estimated blocked fraction of the visible road width over a short stretch",
        },
        "validation": _validation(),
    }


def _crop_white_frame(img):
    """Strip a rectangular white frame before it is mistaken for road or debris."""
    import numpy as np

    width, height = img.size
    scale = min(1.0, 384 / max(width, height))
    w, h = max(1, round(width * scale)), max(1, round(height * scale))
    sample = img.resize((w, h))
    white = (np.asarray(sample) >= 240).all(axis=2)
    inner_rows = np.flatnonzero(white.mean(axis=1) < 0.98)
    inner_cols = np.flatnonzero(white.mean(axis=0) < 0.98)
    if not inner_rows.size or not inner_cols.size:
        return img
    top, bottom = int(inner_rows[0]), int(inner_rows[-1]) + 1
    left, right = int(inner_cols[0]), int(inner_cols[-1]) + 1
    # An actual frame surrounds all four sides. Leave bright photo content alone.
    if min(top, h - bottom, left, w - right) < 3 or (bottom - top) * (right - left) < 0.6 * h * w:
        return img
    return img.crop((round(left * width / w), round(top * height / h),
                     round(right * width / w), round(bottom * height / h)))


def analyze(data: bytes):
    """Run the model on an uploaded image. Raises ValueError for bad input."""
    if not data:
        raise ValueError("empty file")
    if len(data) > MAX_BYTES:
        raise ValueError(f"image larger than {MAX_BYTES // (1024 * 1024)} MB")
    from PIL import Image, ImageOps, UnidentifiedImageError

    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    try:
        with Image.open(io.BytesIO(data)) as source:
            original_size = source.size[::-1] if source.getexif().get(274) in (5, 6, 7, 8) else source.size
            if road_onnx.MODEL_PATH.is_file():
                if source.width * source.height > MAX_PIXELS:
                    raise ValueError("image larger than 40 megapixels")
                # Pillow can decode large JPEGs at a smaller size. Other formats
                # need a full decode, so bound that allocation before it happens.
                source.draft("RGB", (512, 512))
                if source.width * source.height > MAX_DECODED_PIXELS:
                    raise ValueError("For images over 8 megapixels, upload a JPEG or resize the photo.")
                source.thumbnail((1024, 1024), Image.Resampling.BILINEAR)
            img = ImageOps.exif_transpose(source).convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError(f"not a readable image ({type(exc).__name__})") from exc

    result = scene_model.analyze(_crop_white_frame(img))
    result["image_size"] = list(original_size)
    return result


def analyze_upload(file):
    if not road_onnx.MODEL_PATH.is_file():
        return analyze(file.read(MAX_BYTES + 1))
    if not _upload_slot.acquire(blocking=False):
        return {"status": "unavailable", "reason": "Another photo is being checked. Try again in a moment."}
    try:
        return analyze(file.read(MAX_BYTES + 1))
    finally:
        _upload_slot.release()
