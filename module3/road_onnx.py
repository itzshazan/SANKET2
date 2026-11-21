"""Run the road segmentation CNN with bounded CPU and memory on Render Free."""

from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image

INPUT_SIDE = 320
MODEL_PATH = (Path(__file__).resolve().parent / "saved_models" /
              "upernet_convnext_tiny_ade20k" / "model-int8-320.onnx")
MEAN = np.array([123.675, 116.28, 103.53], dtype=np.float32)
STD = np.array([58.395, 57.12, 57.375], dtype=np.float32)


def open_session(path):
    import onnxruntime as ort

    options = ort.SessionOptions()
    options.intra_op_num_threads = 1
    options.inter_op_num_threads = 1
    options.enable_cpu_mem_arena = False
    options.enable_mem_pattern = False
    return ort.InferenceSession(str(path), sess_options=options, providers=["CPUExecutionProvider"])


@lru_cache(maxsize=1)
def session():
    return open_session(MODEL_PATH)


def segment(img):
    """Apply the fixed-size model and map its scores back to the photo's aspect ratio."""
    from scipy import ndimage

    w, h = img.size
    scale = INPUT_SIDE / max(w, h)
    w, h = max(1, round(w * scale)), max(1, round(h * scale))
    small = img.resize((w, h), Image.Resampling.BILINEAR)
    x, y = (INPUT_SIDE - w) // 2, (INPUT_SIDE - h) // 2
    photo = np.s_[y:y + h, x:x + w]
    pixels = np.zeros((INPUT_SIDE, INPUT_SIDE, 3), dtype=np.float32)
    pixels[photo] = (np.asarray(small, dtype=np.float32) - MEAN) / STD
    batch = np.ascontiguousarray(pixels.transpose(2, 0, 1)[None])
    scores = session().run(["scores"], {"pixels": batch})[0]

    # Resize one class at a time to avoid allocating full-resolution ADE20K logits.
    zoom = (INPUT_SIDE / scores.shape[1], INPUT_SIDE / scores.shape[2])
    best = np.full((h, w), -np.inf, dtype=np.float32)
    mask = np.zeros((h, w), dtype=np.uint8)
    for label, grid in enumerate(scores):
        upsampled = ndimage.zoom(grid, zoom, order=1)[photo]
        np.copyto(mask, label, where=upsampled > best)
        np.maximum(best, upsampled, out=best)
    return mask, small
