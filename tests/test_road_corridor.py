import numpy as np
import pytest
from PIL import Image, ImageOps

from module3.corridor import corridor, measure
from module3.service import _crop_white_frame


def _measure(road, debris):
    left, right = corridor(road, debris)
    cols = np.arange(road.shape[1])
    visible_width = (cols >= left[:, None]) & (cols <= right[:, None])
    return measure(visible_width, debris)[0]


def test_corridor_does_not_join_two_roads_across_a_hillside():
    road = np.zeros((160, 180), dtype=bool)
    road[20:, 24:50] = True
    road[20:, 120:142] = True
    hillside = np.zeros_like(road)
    hillside[40:100, 50:120] = True

    assert _measure(road, hillside) == 0


def test_corridor_recovers_road_width_under_a_side_intrusion():
    road = np.zeros((160, 180), dtype=bool)
    road[20:, 50:120] = True
    debris = np.zeros_like(road)
    debris[76:86, 50:85] = True
    road[debris] = False

    assert _measure(road, debris) == pytest.approx(50.0)


def test_only_a_complete_white_frame_is_removed():
    photo = Image.new("RGB", (170, 120), (40, 60, 70))
    horizon = ImageOps.expand(photo, (0, 20, 0, 0), "white")
    framed = ImageOps.expand(photo, 10, "white")

    assert _crop_white_frame(framed).size == photo.size
    assert _crop_white_frame(horizon).size == horizon.size
