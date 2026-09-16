import json, re, math, heapq
from pathlib import Path
from shapely.geometry import shape, mapping, Point
from shapely.ops import unary_union

SRC = Path(__file__).parent
OUT = SRC.parent / "src" / "data" / "nerGeo.js"

NER_STATES = {
    "Arunachal Pradesh": "AR", "Assam": "AS", "Manipur": "MN", "Meghalaya": "ML",
    "Mizoram": "MZ", "Nagaland": "NL", "Sikkim": "SK", "Tripura": "TR",
}

def slugify(name):
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

data = json.loads((SRC / "india.geojson").read_text(encoding="utf-8"))

# Group polygons by state, and separately by (state, district) for named districts.
by_state = {}
by_district = {}
for f in data["features"]:
    props = f["properties"]
    st = props.get("st_nm")
    if st not in NER_STATES:
        continue
    geom = shape(f["geometry"])
    if not geom.is_valid:
        geom = geom.buffer(0)
    by_state.setdefault(st, []).append(geom)
    dist = props.get("district")
    if dist:
        by_district.setdefault((st, dist), []).append(geom)

print("States found:", {k: len(v) for k, v in by_state.items()})

# Dissolve into one geometry per state, and one per district.
state_geoms = {st: unary_union(polys) for st, polys in by_state.items()}
district_geoms = {key: unary_union(polys) for key, polys in by_district.items()}

# Compute overall bounds (state-level union) for the projection.
all_geom = unary_union(list(state_geoms.values()))
minx, miny, maxx, maxy = all_geom.bounds
print("Bounds:", minx, miny, maxx, maxy)

lat0 = (miny + maxy) / 2
cos_lat0 = math.cos(math.radians(lat0))

VIEW_W = 1000
PAD = 20
lon_span = (maxx - minx) * cos_lat0
lat_span = (maxy - miny)
scale = (VIEW_W - 2 * PAD) / lon_span
VIEW_H = lat_span * scale + 2 * PAD

def project(lon, lat):
    x = PAD + (lon - minx) * cos_lat0 * scale
    y = PAD + (maxy - lat) * scale  # flip: north = up = smaller svg y
    return x, y

def ring_to_path(coords):
    pts = [project(lon, lat) for lon, lat in coords]
    d = "M " + " L ".join(f"{x:.2f},{y:.2f}" for x, y in pts) + " Z"
    return d

def geom_to_path(geom):
    polys = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
    parts = []
    all_pts = []
    for poly in polys:
        ext = list(poly.exterior.coords)
        parts.append(ring_to_path(ext))
        all_pts.extend(project(lon, lat) for lon, lat in ext)
        for interior in poly.interiors:
            parts.append(ring_to_path(list(interior.coords)))
    xs = [p[0] for p in all_pts]
    ys = [p[1] for p in all_pts]
    bbox = [min(xs), min(ys), max(xs), max(ys)]
    return " ".join(parts), bbox

def _signed_dist(geom, x, y):
    pt = Point(x, y)
    d = geom.boundary.distance(pt)
    return d if geom.contains(pt) else -d

def polylabel(geom, precision_fraction):
    # Pole of inaccessibility: the point inside the polygon farthest from any
    # edge — this is what "visually centered" actually means for a shape
    # that isn't convex (an elongated arc like Arunachal, or a state that
    # wraps around a neighbour like Assam around Meghalaya). A plain
    # centroid or Shapely's representative_point() can land near an edge or
    # corner for shapes like that; this is the same algorithm Mapbox's
    # `polylabel` uses for exactly this problem, reimplemented here so we
    # don't need an extra dependency for ~126 one-time label points.
    minx, miny, maxx, maxy = geom.bounds
    width, height = maxx - minx, maxy - miny
    cell_size = min(width, height)
    if cell_size == 0:
        p = geom.representative_point()
        return p.x, p.y
    precision = cell_size * precision_fraction
    h = cell_size / 2.0

    queue = []
    x = minx
    while x < maxx:
        y = miny
        while y < maxy:
            cx, cy = x + h, y + h
            d = _signed_dist(geom, cx, cy)
            heapq.heappush(queue, (-(d + h * math.sqrt(2)), -d, cx, cy, h))
            y += cell_size
        x += cell_size

    centroid = geom.centroid
    best_d = _signed_dist(geom, centroid.x, centroid.y)
    best_x, best_y = centroid.x, centroid.y
    for _, neg_d, cx, cy, _ in queue:
        if -neg_d > best_d:
            best_d, best_x, best_y = -neg_d, cx, cy

    while queue:
        neg_potential, _, x, y, cell_h = heapq.heappop(queue)
        potential = -neg_potential
        if potential - best_d <= precision:
            continue
        h2 = cell_h / 2.0
        for dx, dy in ((-h2, -h2), (h2, -h2), (-h2, h2), (h2, h2)):
            cx, cy = x + dx, y + dy
            d = _signed_dist(geom, cx, cy)
            if d > best_d:
                best_d, best_x, best_y = d, cx, cy
            cell_potential = d + h2 * math.sqrt(2)
            if cell_potential - best_d > precision:
                heapq.heappush(queue, (-cell_potential, -d, cx, cy, h2))

    return best_x, best_y

def label_point(geom, precision_fraction=0.01):
    x, y = polylabel(geom, precision_fraction)
    return project(x, y)

# Simplify: coarser for state outlines, finer for district outlines.
STATE_TOL = 0.006
DIST_TOL = 0.003

def r2(v):
    return round(v, 1)

state_out = {}
total_state_pts = 0
for name, code in NER_STATES.items():
    g = state_geoms[name].simplify(STATE_TOL, preserve_topology=True)
    d, bbox = geom_to_path(g)
    lx, ly = label_point(g)
    state_out[code] = {
        "d": d, "label": [r2(lx), r2(ly)], "name": name,
        "bbox": [r2(v) for v in bbox],
    }
    total_state_pts += d.count(" L ")

district_out = {}
total_dist_pts = 0
for (st, dist), g0 in district_geoms.items():
    code = NER_STATES[st]
    g = g0.simplify(DIST_TOL, preserve_topology=True)
    if g.is_empty:
        continue
    d, bbox = geom_to_path(g)
    lx, ly = label_point(g)
    slug = slugify(dist)
    district_out[slug] = {
        "d": d, "label": [r2(lx), r2(ly)], "name": dist, "state": code,
        "bbox": [r2(v) for v in bbox],
    }
    total_dist_pts += d.count(" L ")

print("State path points:", total_state_pts)
print("District path points:", total_dist_pts, "across", len(district_out), "districts")

js = "// AUTO-GENERATED by geodata_src/build_geo.py — do not hand-edit.\n"
js += "// Source: district-level polygons dissolved per state/district, from\n"
js += "// udit-001/india-maps-data (see docs/data-sources.md for provenance),\n"
js += "// simplified and projected (equirectangular, cos-latitude corrected)\n"
js += "// into a static SVG viewBox. Real GIS boundaries, not a schematic.\n\n"
js += f'export const NER_VIEWBOX = "0 0 {VIEW_W} {VIEW_H:.1f}";\n\n'
js += "export const STATE_PATHS = " + json.dumps(state_out, ensure_ascii=False) + ";\n\n"
js += "export const DISTRICT_PATHS = " + json.dumps(district_out, ensure_ascii=False) + ";\n"

OUT.write_text(js, encoding="utf-8")
print("Wrote", OUT, OUT.stat().st_size, "bytes")
