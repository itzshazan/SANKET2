"""Estimate a visible roadway from a semantic mask, using supported cross-sections."""

import numpy as np
from scipy import ndimage


MIN_BLOCKAGE_PERCENT = 10.0


def _debris_gap(gap, neighbour_width, road_width):
    return gap.size <= road_width and neighbour_width >= 0.15 * road_width and gap.mean() >= 0.60


def _trace_row(row, debris):
    """Join nearby road fragments while excluding separate paths on the same row."""
    changes = np.flatnonzero(np.diff(row, prepend=False, append=False))
    starts, ends = changes[::2], changes[1::2]
    lengths = ends - starts
    i = int(lengths.argmax())
    left, right = int(starts[i]), int(ends[i])
    gap = max(4, min(20, len(row) // 16))
    for j in range(i - 1, -1, -1):
        if left - ends[j] > gap and not _debris_gap(debris[ends[j]:left], lengths[j], lengths[i]):
            break
        left = int(starts[j])
    for j in range(i + 1, len(starts)):
        if starts[j] - right > gap and not _debris_gap(debris[right:starts[j]], lengths[j], lengths[i]):
            break
        right = int(ends[j])
    return left, right - 1


def _extend_far(left, right, rows, debris):
    # Edge trends from a supported stretch of road, with a bounded look-ahead.
    h, w = debris.shape
    top = rows[0]
    sample = rows[(rows <= top + max(8, h // 10))]
    if len(sample) < 5:
        return
    lm, lc = np.polyfit(sample - top, left[sample], 1)
    rm, rc = np.polyfit(sample - top, right[sample], 1)
    for y in range(top - 1, max(-1, top - h // 5), -1):
        l = int(np.clip(lc + lm * (y - top), 0, w - 1))
        r = int(np.clip(rc + rm * (y - top), 0, w - 1))
        if r - l < 6 or debris[y, l:r + 1].mean() < 0.60:
            break
        left[y], right[y] = l, r


def _fill_side_intrusions(left, right, span, debris):
    """Recover narrowed edges when debris touches them between visible anchors."""
    size = max(5, debris.shape[0] // 12) | 1
    l = left[span].astype(int)
    r = right[span].astype(int)
    expanded_left = ndimage.grey_opening(l, size=size, mode="nearest")
    expanded_right = ndimage.grey_closing(r, size=size, mode="nearest")
    for i in range(size // 2, len(span) - size // 2):
        y = span[i]
        missing_left = l[i] - expanded_left[i]
        missing_right = expanded_right[i] - r[i]
        if missing_left >= 3 and missing_right <= 2 and debris[y, expanded_left[i]:l[i]].mean() >= 0.6:
            left[y] = expanded_left[i]
        if missing_right >= 3 and missing_left <= 2 and debris[y, r[i] + 1:expanded_right[i] + 1].mean() >= 0.6:
            right[y] = expanded_right[i]


def corridor(road, debris):
    h, w = road.shape
    labels, count = ndimage.label(road, structure=np.ones((3, 3), dtype=bool))
    if count == 0:
        return None
    sizes = np.bincount(labels.ravel())[1:]
    keep = np.isin(labels, 1 + np.flatnonzero(sizes >= max(15, 0.02 * sizes.sum())))
    left = np.full(h, -1.0)
    right = np.full(h, -1.0)
    min_road_pixels = max(3, w // 80)
    for y in np.flatnonzero(keep.sum(axis=1) >= min_road_pixels):
        l, r = _trace_row(keep[y], debris[y])
        if r - l + 1 >= min_road_pixels:
            left[y], right[y] = l, r
    rows = np.flatnonzero(left >= 0)
    if rows.size < max(6, h // 45):
        return None

    span = np.arange(rows[0], rows[-1] + 1)
    for edge in (left, right):
        edge[span] = ndimage.median_filter(np.interp(span, rows, edge[rows]), size=5, mode="nearest")
    _fill_side_intrusions(left, right, span, debris)
    _extend_far(left, right, rows, debris)
    for y in range(rows[-1] + 1, min(h, rows[-1] + h // 8)):
        l, r = int(left[y - 1]), int(right[y - 1])
        if r - l < 6 or debris[y, l:r + 1].mean() < .6:
            break
        left[y], right[y] = l, r
    return left, right


def measure(corridor_mask, obstacle):
    h, w = obstacle.shape
    width = corridor_mask.sum(1)
    blocked = (corridor_mask & obstacle).sum(1)
    wide = width >= max(8, round(.02 * w))
    ratio = np.divide(blocked, width, where=wide, out=np.zeros(h))
    # Discard jagged single rows and use a short window across the obstruction.
    size = max(7, round(.035 * h)) | 1
    if np.count_nonzero(wide) < 3:
        return None
    stable = ndimage.uniform_filter1d(ratio, size=size, mode="constant")
    worst = int(stable.argmax())
    pct = min(100.0, 100 * float(stable[worst]))
    band = slice(max(0, worst - size // 2), min(h, worst + size // 2 + 1))
    return (pct if pct >= MIN_BLOCKAGE_PERCENT else 0.0), worst, band
