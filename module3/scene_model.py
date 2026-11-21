"""Estimate the visible road width blocked by obstacles from a single photo."""

import base64
import io
import logging
import threading
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from . import road_onnx
from .ade20k_classes import ADE20K_CLASSES
from .corridor import corridor, measure

SEVERITY_LEVELS = ["Clear", "Minor", "Moderate", "Severe", "Critical"]


def pct_to_severity(pct):
    """Blocked % of the road width -> severity index (Clear 0, Minor <=25, Moderate <=60, Severe <=85, Critical)."""
    if pct <= 0.5:
        return 0
    if pct <= 25.0:
        return 1
    if pct <= 60.0:
        return 2
    if pct <= 85.0:
        return 3
    return 4


MODEL_DIR = Path(__file__).resolve().parent / "saved_models" / "upernet_convnext_tiny_ade20k"
HF_REPO = "smp-hub/upernet-convnext-tiny"
log = logging.getLogger(__name__)

_ix = {n: i for i, n in enumerate(ADE20K_CLASSES)}
ROAD = [_ix[n] for n in ("road", "path", "dirt", "sidewalk")]   # 'dirt' = dirt track
OBSTACLE_GROUPS = {
    "fallen_tree": ["tree", "plant", "palm"],
    "fallen_pole": ["pole", "streetlight", "traffic"],         # 'traffic' = traffic light
    "loose_soil": ["earth", "land", "sand"],
    "fallen_rocks": ["rock", "mountain", "hill"],
    "water_flood": ["water"],
    "barricade": ["fence", "signboard", "barrel"],
}
GROUP_OF = {_ix[n]: g for g, names in OBSTACLE_GROUPS.items() for n in names}
# Require explicit debris on inferred road edges. Background hills and vegetation alone
# cannot establish that the roadway continues through those pixels.
GROUND_DEBRIS = [_ix[n] for n in ("earth", "land", "sand", "rock", "water", "fence", "barrel")]
DISPLAY = {"fallen_tree": "fallen trees", "fallen_pole": "fallen poles", "loose_soil": "soil and mud",
           "fallen_rocks": "rocks and debris", "water_flood": "flood water",
           "barricade": "barricades"}

_lock = threading.Lock()
_state = {"model": None, "error": None}


def weights_present():
    return (MODEL_DIR / "model.safetensors").exists() and (MODEL_DIR / "config.json").exists()


def _load():
    with _lock:
        if _state["model"] is not None or _state["error"] is not None:
            return
        if not weights_present():
            _state["error"] = "model weights missing: run  python -m module3.download_weights"
            return
        try:
            import segmentation_models_pytorch as smp
            from torch import nn

            model = smp.from_pretrained(str(MODEL_DIR)).eval()
            # The compact export also supplies quarter-resolution scores.
            model.segmentation_head[1] = nn.Identity()
            _state["model"] = model
        except Exception as exc:
            _state["error"] = f"{type(exc).__name__}: {exc}"


def available():
    _load()
    return _state["model"] is not None, _state["error"]


def _segment(img):
    """RGB PIL image -> (class mask HxW at inference size, resized PIL image)."""
    import torch
    batch, small, crop = road_onnx.prepare_input(img)
    with torch.inference_mode():
        scores = _state["model"](torch.from_numpy(batch))[0].numpy()
    return road_onnx.restore_mask(scores, small.size, crop), small


def _overlay(small, corridor_mask, road, obstacle, left, right):
    base = np.asarray(small, dtype=np.float32).copy()
    green, red = np.array([40, 200, 90], np.float32), np.array([235, 50, 40], np.float32)
    r_in, o_in = road & corridor_mask, obstacle & corridor_mask
    base[r_in] = base[r_in] * 0.55 + green * 0.45
    base[o_in] = base[o_in] * 0.45 + red * 0.55
    im = Image.fromarray(base.clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    ys = np.flatnonzero(left >= 0)
    if ys.size > 1:
        d.line([(float(left[y]), float(y)) for y in ys], fill=(255, 220, 0), width=2)
        d.line([(float(right[y]), float(y)) for y in ys], fill=(255, 220, 0), width=2)
    buf = io.BytesIO()
    im.save(buf, format="JPEG", quality=82)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def analyze(img):
    """img: RGB PIL image. Returns a JSON-serialisable result."""
    compact = road_onnx.MODEL_PATH.is_file()
    if not compact:
        _load()
        if _state["model"] is None:
            return {"status": "unavailable", "reason": _state["error"]}
    t0 = time.perf_counter()
    with _lock:
        if compact:
            try:
                mask, small = road_onnx.segment(img)
            except Exception:
                log.exception("ONNX road segmentation failed")
                return {"status": "unavailable", "reason": "The road model could not process this photo."}
        else:
            mask, small = _segment(img)
    h, w = mask.shape
    road = np.isin(mask, ROAD)
    obstacle = np.isin(mask, list(GROUP_OF))

    total = mask.size
    counts = np.bincount(mask.ravel(), minlength=len(ADE20K_CLASSES))
    scene = [{"class": ADE20K_CLASSES[i], "share": round(float(counts[i] / total), 3)}
             for i in np.argsort(counts)[::-1][:6] if counts[i] > 0]
    out = {"model": "UPerNet + ConvNeXt-Tiny (ADE20K)", "scene": scene,
           "road_share_of_image": round(float(road.mean()), 3)}

    def inconclusive():
        return {**out, "status": "no_road", "inference_time_ms": round((time.perf_counter() - t0) * 1000, 1),
                "reason": "The road width could not be estimated reliably. Try a photo from a safe position "
                          "facing along the road, with both edges visible."}

    debris = np.isin(mask, GROUND_DEBRIS)
    edges = corridor(road, debris) if road.mean() >= 0.005 else None
    if edges is None:
        return inconclusive()
    left, right = edges
    cols = np.arange(w)[None, :]
    corridor_mask = (left[:, None] >= 0) & (cols >= left[:, None]) & (cols <= right[:, None])
    measurement = measure(corridor_mask, obstacle)
    if measurement is None:
        return inconclusive()
    pct, worst_row, band = measurement
    if pct == 0:
        road_px = (road & corridor_mask).sum()
        paved_px = ((mask == _ix["road"]) & corridor_mask).sum()
        path_px = (np.isin(mask, [_ix["path"], _ix["sidewalk"]]) & corridor_mask).sum()
        if road.mean() < 0.02 or (path_px > 0.5 * road_px and paved_px < 0.05 * road_px):
            return inconclusive()

    obs_in = obstacle & corridor_mask
    measured = mask[band][obs_in[band]] if pct > 0 else np.empty(0, dtype=mask.dtype)
    group_px = {g: 0 for g in OBSTACLE_GROUPS}
    for cls, count in zip(*np.unique(measured, return_counts=True)):
        group_px[GROUP_OF[int(cls)]] += int(count)
    shares = {g: round(n / measured.size, 3) if measured.size else 0.0 for g, n in group_px.items()}
    ranked = sorted(shares, key=shares.get, reverse=True)
    causes = [g for g in ranked if shares[g] >= 0.2][:2] or (ranked[:1] if measured.size else [])
    pct_r = round(pct, 1)
    if pct_r <= 0:
        summary = "No blockage detected in the visible road"
    else:
        summary = f"Estimated blockage from {' and '.join(DISPLAY[c] for c in causes)}" if causes else "Estimated blockage"

    out.update({
        "status": "ok",
        "blockage_percentage": pct_r,
        "is_blocked": pct_r > 0.5,
        "severity": SEVERITY_LEVELS[pct_to_severity(pct_r)],
        "obstacles": causes,
        "obstacle_display_names": [DISPLAY[c] for c in causes],
        "cause_share": shares,
        "summary": summary,
        "corridor_pixels": int(corridor_mask.sum()),
        "blocked_area_share": round(float(obs_in.sum() / max(corridor_mask.sum(), 1)), 3),
        "worst_row_fraction_of_height": round(worst_row / h, 3),
        "overlay": _overlay(small, corridor_mask, road, obstacle, left, right),
        "inference_time_ms": round((time.perf_counter() - t0) * 1000, 1),
    })
    return out
