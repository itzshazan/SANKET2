"""Road blockage from a real photo with a pretrained scene-segmentation CNN.

Model: UPerNet decoder + ConvNeXt-Tiny encoder (pure CNN, no attention layers) trained on ADE20K,
about 25,000 real photographs labelled pixel by pixel into 150 classes. Weights:
smp-hub/upernet-convnext-tiny (MIT licence), loaded with segmentation-models-pytorch.
It is a general scene model and has not been fine-tuned on disaster photos.

Blocked % = how much of the road WIDTH is blocked at the worst point (what decides whether a
vehicle can pass), not blocked area: the clear road in front of the camera would otherwise dilute it.
  1. every pixel is classified (road, tree, rock, earth, car, water, ...);
  2. the road corridor is rebuilt from the visible road surface: its left/right edges are taken
     row by row, interpolated across rows where debris hides the road, and extended through
     rows that are mostly debris (towards the camera and away from it);
  3. for each row: blocked share = obstacle pixels / (road + obstacle pixels) inside the corridor;
     smoothed over a few rows, the maximum is the blocked %.
If no road surface is recognised the result says so instead of guessing.
"""

import base64
import io
import threading
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from .ade20k_classes import ADE20K_CLASSES

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
MAX_SIDE = 512                      # inference resolution (longer side), multiple of 32
MEAN = np.array([123.675, 116.28, 103.53], dtype=np.float32)
STD = np.array([58.395, 57.12, 57.375], dtype=np.float32)

_ix = {n: i for i, n in enumerate(ADE20K_CLASSES)}
ROAD = [_ix[n] for n in ("road", "path", "dirt", "sidewalk")]   # 'dirt' = dirt track
OBSTACLE_GROUPS = {
    "fallen_tree": ["tree", "plant", "palm"],
    "fallen_pole": ["pole", "streetlight", "traffic"],         # 'traffic' = traffic light
    "loose_soil": ["earth", "land", "sand"],
    "fallen_rocks": ["rock", "mountain", "hill"],
    "vehicle": ["car", "truck", "bus", "van", "minibike", "bicycle"],
    "water_flood": ["water", "river", "sea", "lake", "waterfall"],
    "barricade": ["fence", "signboard", "barrel"],
}
GROUP_OF = {_ix[n]: g for g, names in OBSTACLE_GROUPS.items() for n in names}
# only ground debris may extend the road beyond its far visible end (roadside forest at a bend must not)
GROUND_DEBRIS = [c for c, g in GROUP_OF.items() if g in ("loose_soil", "fallen_rocks", "water_flood", "barricade")]
DISPLAY = {"fallen_tree": "fallen trees", "fallen_pole": "fallen poles", "loose_soil": "soil and mud",
           "fallen_rocks": "rocks and debris", "vehicle": "vehicles", "water_flood": "flood water",
           "barricade": "barricades"}

USE_HULL = False       # convex-hull filling tested: fixes side intrusions but flags clear curved roads

UP_DEBRIS_ONLY = True  # ...but only through soil / rock / water / barricade rows
EXTEND_UP = True       # continue the road away from the camera through debris rows
MIN_ROW_WIDTH = 0.04   # ignore corridor rows narrower than this share of the image width
COUNT_VEHICLES = False # traffic is not a blockage (a crash cannot be told apart from traffic)

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
            _state["model"] = smp.from_pretrained(str(MODEL_DIR)).eval()
        except Exception as exc:
            _state["error"] = f"{type(exc).__name__}: {exc}"


def available():
    _load()
    return _state["model"] is not None, _state["error"]


def _segment(img):
    """RGB PIL image -> (class mask HxW at inference size, resized PIL image)."""
    import torch
    w, h = img.size
    s = MAX_SIDE / max(w, h)
    nw, nh = max(32, int(round(w * s / 32)) * 32), max(32, int(round(h * s / 32)) * 32)
    small = img.resize((nw, nh), Image.Resampling.BILINEAR)
    x = (np.asarray(small, dtype=np.float32) - MEAN) / STD
    t = torch.from_numpy(x).permute(2, 0, 1).unsqueeze(0)
    with torch.inference_mode():
        logits = _state["model"](t)
    return logits.argmax(1)[0].numpy().astype(np.int16), small


def _corridor(road, obstacle, debris=None):
    """Row-wise left/right edges of the road corridor (arrays of length H, -1 = no corridor)."""
    from scipy import ndimage
    h, w = road.shape
    lab, n = ndimage.label(road)
    if n == 0:
        return None
    sizes = ndimage.sum(road, lab, index=np.arange(1, n + 1))
    keep = np.isin(lab, 1 + np.flatnonzero(sizes >= 0.02 * sizes.sum()))
    left = np.full(h, -1.0)
    right = np.full(h, -1.0)
    min_px = max(3, int(0.01 * w))
    for y in range(h):
        xs = np.flatnonzero(keep[y])
        if xs.size >= min_px:
            left[y], right[y] = xs.min(), xs.max()
    rows = np.flatnonzero(left >= 0)
    if rows.size < max(4, int(0.02 * h)):
        return None
    top, bottom = rows.min(), rows.max()
    span = np.arange(top, bottom + 1)
    left[span] = np.interp(span, rows, left[rows])          # fill rows hidden by debris
    right[span] = np.interp(span, rows, right[rows])
    # away from the camera: continue the edges' trend through rows that are mostly debris
    fit_rows = rows[: max(4, rows.size // 4)]
    lp = np.polyfit(fit_rows, left[fit_rows], 1)
    rp = np.polyfit(fit_rows, right[fit_rows], 1)
    for y in (range(top - 1, max(-1, top - int(0.35 * h)), -1) if EXTEND_UP else ()):
        l = int(np.clip(np.polyval(lp, y), 0, w - 1))
        r = int(np.clip(np.polyval(rp, y), 0, w - 1))
        if r - l < max(4, int(0.03 * w)):
            break
        if (obstacle if debris is None else debris)[y, l:r + 1].mean() < 0.5:
            break
        left[y], right[y] = l, r
    for y in range(bottom + 1, h):                            # debris covering the near road
        l, r = int(left[y - 1]), int(right[y - 1])
        seg = obstacle[y, l:r + 1]
        if seg.size == 0 or seg.mean() < 0.5:
            break
        left[y], right[y] = l, r
    k = 7                                                     # smooth jagged edges
    valid = np.flatnonzero(left >= 0)
    for arr in (left, right):
        v = arr[valid].copy()
        pad = np.pad(v, (k // 2, k // 2), mode="edge")
        arr[valid] = np.array([np.median(pad[i:i + k]) for i in range(v.size)])
    return left, right, keep


def _hull_mask(keep):
    """Filled convex hull of the kept road pixels (bool mask)."""
    from scipy.spatial import ConvexHull, QhullError
    ys, xs = np.nonzero(keep)
    if ys.size < 10:
        return np.zeros_like(keep)
    pts = np.column_stack([xs, ys]).astype(float)
    if pts.shape[0] > 6000:
        pts = pts[np.random.default_rng(0).choice(pts.shape[0], 6000, replace=False)]
    try:
        hull = ConvexHull(pts)
    except QhullError:
        return np.zeros_like(keep)
    im = Image.new("1", (keep.shape[1], keep.shape[0]), 0)
    ImageDraw.Draw(im).polygon([tuple(pts[i]) for i in hull.vertices], fill=1)
    return np.asarray(im, dtype=bool)


def _overlay(small, mask, corridor_mask, road, obstacle, left, right):
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
    _load()
    if _state["model"] is None:
        return {"status": "unavailable", "reason": _state["error"]}
    t0 = time.perf_counter()
    with _lock:                                   # one inference at a time keeps memory low
        mask, small = _segment(img)
    h, w = mask.shape
    road = np.isin(mask, ROAD)
    groups = [c for c, g in GROUP_OF.items() if COUNT_VEHICLES or g != "vehicle"]
    obstacle = np.isin(mask, groups)

    total = mask.size
    counts = np.bincount(mask.ravel(), minlength=len(ADE20K_CLASSES))
    scene = [{"class": ADE20K_CLASSES[i], "share": round(float(counts[i] / total), 3)}
             for i in np.argsort(counts)[::-1][:6] if counts[i] > 0]
    out = {"model": "UPerNet + ConvNeXt-Tiny (ADE20K)", "scene": scene,
           "road_share_of_image": round(float(road.mean()), 3)}

    debris = np.isin(mask, GROUND_DEBRIS) if UP_DEBRIS_ONLY else None
    cor = _corridor(road, obstacle, debris) if road.mean() >= 0.005 else None
    if cor is None:
        out.update({"status": "no_road", "inference_time_ms": round((time.perf_counter() - t0) * 1000, 1),
                    "reason": "No road surface recognised in this photo. Take the photo standing on the road, "
                              "looking along it."})
        return out
    left, right, keep = cor
    cols = np.arange(w)[None, :]
    corridor_mask = (left[:, None] >= 0) & (cols >= left[:, None]) & (cols <= right[:, None])
    if USE_HULL:
        corridor_mask |= _hull_mask(keep)
        rows_any = corridor_mask.any(1)
        left = np.where(rows_any, np.argmax(corridor_mask, 1), -1).astype(float)
        right = np.where(rows_any, w - 1 - np.argmax(corridor_mask[:, ::-1], 1), -1).astype(float)
    road_in = road & corridor_mask
    obs_in = obstacle & corridor_mask
    road_px, obs_px = int(road_in.sum()), int(obs_in.sum())
    row_road, row_obs = road_in.sum(1).astype(float), obs_in.sum(1).astype(float)
    row_total = row_road + row_obs
    wide = (right - left) >= max(8, MIN_ROW_WIDTH * w)        # ignore rows near the horizon
    frac = np.where(wide & (row_total > 0), row_obs / np.maximum(row_total, 1), 0.0)
    k = max(3, int(0.03 * h))
    smooth = np.convolve(frac, np.ones(k) / k, mode="same")
    worst_row = int(np.argmax(smooth))
    pct = 100.0 * float(smooth[worst_row])
    if pct < 10.0:                                # under 10 % of the width: passable / model noise
        pct = 0.0

    group_px = {g: 0 for g in OBSTACLE_GROUPS}
    for cls in np.unique(mask[obs_in]):
        group_px[GROUP_OF[int(cls)]] += int((mask[obs_in] == cls).sum())
    shares = {g: round(n / obs_px, 3) if obs_px else 0.0 for g, n in group_px.items()}
    causes = [g for g, s in sorted(shares.items(), key=lambda kv: -kv[1]) if s >= 0.2][:2] if pct > 0 else []
    pct_r = round(pct, 1)
    if pct_r <= 0 or not causes:
        summary = "Road is clear"
    else:
        names = [DISPLAY[c] for c in causes]
        summary = f"{int(round(pct_r))}% of the road is blocked by {' and '.join(names)}"

    out.update({
        "status": "ok",
        "blockage_percentage": pct_r,
        "is_blocked": pct_r > 0.5,
        "severity": SEVERITY_LEVELS[pct_to_severity(pct_r)],
        "obstacles": causes,
        "obstacle_display_names": [DISPLAY[c] for c in causes],
        "cause_share": shares,
        "summary": summary,
        "corridor_pixels": road_px + obs_px,
        "blocked_area_share": round(obs_px / max(road_px + obs_px, 1), 3),
        "worst_row_fraction_of_height": round(worst_row / h, 3),
        "overlay": _overlay(small, mask, corridor_mask, road, obstacle, left, right),
        "inference_time_ms": round((time.perf_counter() - t0) * 1000, 1),
    })
    return out
