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
    # Avoid eager packed copies of weights. The backend shares a 512 MB service.
    options.add_session_config_entry("session.disable_prepacking", "1")
    return ort.InferenceSession(str(path), sess_options=options, providers=["CPUExecutionProvider"])


@lru_cache(maxsize=1)
def session():
    return open_session(MODEL_PATH)


def restore_mask(scores, size, crop):
    from scipy import ndimage

    # Restore one class at a time to bound peak memory on Render Free.
    w, h = size
    zoom = (INPUT_SIDE / scores.shape[1], INPUT_SIDE / scores.shape[2])
    best = np.full((h, w), -np.inf, dtype=np.float32)
    mask = np.zeros((h, w), dtype=np.uint8)
    for label, grid in enumerate(scores):
        upsampled = ndimage.zoom(grid, zoom, order=1)[crop]
        np.copyto(mask, label, where=upsampled > best)
        np.maximum(best, upsampled, out=best)
    return mask


def prepare_input(img):
    """Preserve the photo's proportions as it goes through the network."""
    scale = INPUT_SIDE / max(img.size)
    w, h = (max(1, round(d * scale)) for d in img.size)
    small = img.resize((w, h), Image.Resampling.BILINEAR)
    x, y = (INPUT_SIDE - w) // 2, (INPUT_SIDE - h) // 2
    crop = np.s_[y:y + h, x:x + w]
    pixels = np.zeros((INPUT_SIDE, INPUT_SIDE, 3), dtype=np.float32)
    pixels[crop] = (np.asarray(small, dtype=np.float32) - MEAN) / STD
    batch = np.ascontiguousarray(pixels.transpose(2, 0, 1)[None])
    return batch, small, crop


def segment(img):
    batch, small, crop = prepare_input(img)
    scores = session().run(["scores"], {"pixels": batch})[0]
    return restore_mask(scores, small.size, crop), small
