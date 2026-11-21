"""Build the training table from real data only.

Positives (dated, rainfall-triggered, India):
  * NASA Global Landslide Catalog export, 2007-2016 (location accuracy <= 5 km)
  * NASA COOLR reports (live catalogue) - records not in the export above, up to 2024
  * Mapped event inventories, grid-thinned (one positive per ~5 km cell) and capped per event so
    one storm cannot dominate:
      - Kerala 2018 monsoon, 4,728 landslides (van Westen / Univ. Twente, DANS, CC-BY-4.0,
        doi:10.17026/dans-x6c-y7x2). No per-landslide date: dated to 16 Aug 2018, the peak of the
        14-19 Aug spell in which most occurred.
      - Himachal Pradesh 9 July 2023 (NASA COOLR event inventory)
Negatives : (a) same location, 3 other dates with no catalogued landslide within 25 km / +-7 days
            (teaches WHEN: the rain trigger);
            (b) a random point inside India on the same date, >= 25 km from any catalogued event
            (teaches WHERE: terrain).
Features  : ERA5 hourly weather for the 10 days up to the end of that day (IST); terrain from the
            ERA5 response's point elevation plus Open-Meteo elevation ~550 m N and E.
Quota     : Open-Meteo free tier = 600/min, 5,000/hour, 10,000/day, and every location (and every
            elevation point) counts. Calls are paced; on an hourly limit the run waits, on the
            daily limit it stops cleanly - just run it again tomorrow, cached work is kept.
Note: "no catalogued landslide" is not proof that none happened (the catalogue is news-based),
so some negatives are mislabeled; that limits achievable precision.

Run (resumable; every fetched sample is cached):  python -m module1.ml.dataset
"""

import csv
import json
import math
import random
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from ..inference import threshold_model as tm
from ..monitoring import geo
from ..sources import openmeteo
from ..sources.cache import CACHE_DIR
from ..sources.http import SourceError
from . import features as F

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
NASA_CSV = RAW / "landslide" / "nasa_glc.csv"
COOLR_REPORTS = RAW / "landslide" / "nasa_coolr_reports_india.csv"
COOLR_EVENTS = RAW / "landslide" / "nasa_coolr_events_india.csv"
KERALA_2018 = RAW / "events" / "kerala_2018_dans" / "Kerela landslide"
OUT_CSV = ROOT / "data" / "training" / "samples.csv"
RAW_DIR = CACHE_DIR / "ml_era5"
ELEV_CACHE = CACHE_DIR / "ml_elevation.json"

RAIN_TRIGGERS = {"downpour", "rain", "continuous_rain", "monsoon", "tropical_cyclone", "flooding"}
GOOD_ACCURACY = {"exact", "1km", "5km"}
N_TIME_NEG, N_SPACE_NEG = 3, 1
EXCLUDE_KM, EXCLUDE_DAYS = 25.0, 7
START, END = date(2007, 1, 15), date(2016, 12, 31)      # original catalogue period (kept identical)
EXT_END = date(2024, 12, 31)                             # extended period for the new sources
EVENT_CELL_DEG = 0.05                                    # ~5 km grid for thinning mapped inventories
EVENT_CAP = {"kerala_2018": 150, "coolr_event": 60}
MIN_INTERVAL_S = 0.75   # ~80 requests/min: stays under Open-Meteo's free 5,000/hour limit


def _km(a, b) -> float:
    return math.hypot((a[0] - b[0]) * 110.574, (a[1] - b[1]) * 111.32 * math.cos(math.radians(a[0])))


def _date(s: str) -> Optional[date]:
    s = (s or "").strip()
    for fmt in ("%m/%d/%Y %I:%M:%S %p", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _catalogue_rows(path: Path, source: str, strict_country: bool) -> List[Dict[str, Any]]:
    """strict_country: require country_name == India (as the first build did). Otherwise a blank
    country is accepted only when the point lies inside India's district boundaries."""
    out = []
    if not path.exists():
        return out
    with open(path, encoding="utf-8-sig", newline="") as fh:
        for r in csv.DictReader(fh):
            country = (r.get("country_name") or "").strip()
            if (r.get("event_import_source") or "").strip().lower() == "test":
                continue
            if country != "India" and (strict_country or country):
                continue
            d = _date(r.get("event_date"))
            try:
                lat, lon = float(r["latitude"]), float(r["longitude"])
            except (TypeError, ValueError):
                continue
            if d is None or (not country and geo.locate(lat, lon)[0] is None):
                continue
            out.append({"date": d, "end": d, "lat": lat, "lon": lon, "accuracy": r.get("location_accuracy", ""),
                        "trigger": r.get("landslide_trigger", ""), "category": r.get("landslide_category", ""),
                        "event_id": r.get("event_id", ""), "source": source})
    return out


def load_events() -> List[Dict[str, Any]]:
    """Catalogue records: the 2016 GLC export first (original order), then COOLR-only records."""
    glc = _catalogue_rows(NASA_CSV, "glc_2016", strict_country=True)
    ids = {e["event_id"] for e in glc}
    coolr = [e for e in _catalogue_rows(COOLR_REPORTS, "coolr_report", strict_country=False) if e["event_id"] not in ids]
    return glc + coolr


def load_mapped() -> List[Dict[str, Any]]:
    """Points from mapped event inventories (each with an event key and date window)."""
    pts = []
    if KERALA_2018.with_suffix(".shp").exists():
        import shapefile
        for sr in shapefile.Reader(str(KERALA_2018)).iterShapeRecords():
            x, y = sr.shape.points[0][:2]
            pts.append({"event": "kerala_2018", "lat": y, "lon": x, "date": date(2018, 8, 16),
                        "start": date(2018, 6, 1), "end": date(2018, 8, 26)})
    if COOLR_EVENTS.exists():
        with open(COOLR_EVENTS, encoding="utf-8", newline="") as fh:
            for r in csv.DictReader(fh):
                d = _date(r.get("event_date"))
                trig = (r.get("landslide_trigger") or "").lower()
                if d and "rain" in trig:
                    pts.append({"event": "coolr_event", "lat": float(r["latitude"]), "lon": float(r["longitude"]),
                                "date": d, "start": d - timedelta(days=3), "end": d + timedelta(days=3)})
    return pts


def _thin(points: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    cells = {}
    for p in points:
        k = (p["event"], round(p["lat"] / EVENT_CELL_DEG), round(p["lon"] / EVENT_CELL_DEG))
        cells.setdefault(k, p)
    return list(cells.values())


class _Exclusion:
    """Vectorised 'is there a recorded landslide within 25 km and +-7 days of (lat, lon, day)?'"""

    def __init__(self, recs: List[Dict[str, Any]]):
        self.lat = np.array([r["lat"] for r in recs])
        self.lon = np.array([r["lon"] for r in recs])
        self.a = np.array([(r.get("start") or r["date"]).toordinal() - EXCLUDE_DAYS for r in recs])
        self.b = np.array([(r.get("end") or r["date"]).toordinal() + EXCLUDE_DAYS for r in recs])

    def near(self, lat: float, lon: float, d: date) -> bool:
        if not len(self.lat):
            return False
        o = d.toordinal()
        m = (self.a <= o) & (o <= self.b)
        if not m.any():
            return False
        dist = np.hypot((self.lat[m] - lat) * 110.574, (self.lon[m] - lon) * 111.32 * math.cos(math.radians(lat)))
        return bool((dist <= EXCLUDE_KM).any())


def _positive_ok(e) -> bool:
    return (e["accuracy"] in GOOD_ACCURACY and e["trigger"] in RAIN_TRIGGERS
            and e["category"] not in ("snow_avalanche", "lahar"))


def _dedupe(events):
    seen, out = set(), []
    for e in events:                     # same place + same day reported twice -> keep one
        k = (round(e["lat"], 2), round(e["lon"], 2), e["date"])
        if k not in seen:
            seen.add(k)
            out.append(e)
    return out


def _add_negatives(samples, rng, e, group, state, excl, start, end, source):
    span = (end - start).days
    tries, made = 0, 0
    while made < N_TIME_NEG and tries < 200:
        tries += 1
        d = start + timedelta(days=rng.randrange(span))
        if not excl.near(e["lat"], e["lon"], d):
            samples.append({"group": group, "state": state, "kind": "neg_same_place", "label": 0,
                            "lat": e["lat"], "lon": e["lon"], "date": d, "source": source})
            made += 1
    tries, made = 0, 0
    while made < N_SPACE_NEG and tries < 500:
        tries += 1
        lat, lon = rng.uniform(8.0, 34.5), rng.uniform(68.5, 97.0)
        st, _ = geo.locate(lat, lon)
        if st and not excl.near(lat, lon, e["date"]):
            samples.append({"group": group, "state": st, "kind": "neg_same_day", "label": 0,
                            "lat": round(lat, 4), "lon": round(lon, 4), "date": e["date"], "source": source})
            made += 1


def build_samples(seed: int = 42) -> List[Dict[str, Any]]:
    rng = random.Random(seed)
    events = load_events()
    mapped = load_mapped()
    glc = [e for e in events if e["source"] == "glc_2016"]
    full_excl = _Exclusion(events + _thin(mapped))

    # 1) Original 2007-2016 positives: identical sampling to the first model (same order, same random
    #    stream, same exclusion set), so their cached ERA5 downloads are reused.
    old_pos = _dedupe([e for e in glc if _positive_ok(e) and START <= e["date"] <= END])
    old_excl = _Exclusion(glc)
    samples: List[Dict[str, Any]] = []
    for i, e in enumerate(old_pos):
        state = geo.locate(e["lat"], e["lon"])[0]
        samples.append({"group": i, "state": state, "kind": "positive", "label": 1,
                        "lat": e["lat"], "lon": e["lon"], "date": e["date"], "source": "glc_2016"})
        _add_negatives(samples, rng, e, i, state, old_excl, START, END, "glc_2016")
    # drop the (rare) old negatives that now fall next to a newly added landslide record
    samples = [s for s in samples if s["label"] == 1 or not full_excl.near(s["lat"], s["lon"], s["date"])]

    # 2) New positives: COOLR reports not in the export, then thinned mapped inventories
    seen = {(round(s["lat"], 2), round(s["lon"], 2), s["date"]) for s in samples if s["label"] == 1}
    new_pos = [e for e in _dedupe([e for e in events if e["source"] == "coolr_report" and _positive_ok(e)
                                   and START <= e["date"] <= EXT_END])
               if (round(e["lat"], 2), round(e["lon"], 2), e["date"]) not in seen]
    cap_rng = random.Random(7)
    for ev_key, cap in EVENT_CAP.items():
        cells = [p for p in _thin(mapped) if p["event"] == ev_key]
        cells.sort(key=lambda p: (p["lat"], p["lon"]))
        if len(cells) > cap:
            cells = cap_rng.sample(cells, cap)
        new_pos += [{**p, "source": ev_key} for p in cells]

    g0 = len(old_pos)
    for j, e in enumerate(new_pos):
        state = geo.locate(e["lat"], e["lon"])[0]
        samples.append({"group": g0 + j, "state": state, "kind": "positive", "label": 1,
                        "lat": e["lat"], "lon": e["lon"], "date": e["date"], "source": e["source"]})
        _add_negatives(samples, rng, e, g0 + j, state, full_excl, START, EXT_END, e["source"])
    return samples


_last_call = [0.0]


class DailyLimit(RuntimeError):
    pass


def _throttled(fn, *args, **kwargs):
    for attempt in range(12):
        wait = MIN_INTERVAL_S - (time.time() - _last_call[0])
        if wait > 0:
            time.sleep(wait)
        _last_call[0] = time.time()
        try:
            return fn(*args, **kwargs)
        except SourceError as exc:
            msg = str(exc)
            if "HTTP 429" in msg:
                if "aily" in msg:
                    raise DailyLimit(msg)
                pause = 600 if "ourly" in msg else 65
                print(f"  rate limited ({msg[-90:]}), waiting {pause} s", flush=True)
                time.sleep(pause)
                continue
            if attempt < 10:   # network blips (DNS, timeouts): back off up to ~5 min, then give up
                pause = min(300, 10 * 2 ** attempt)
                print(f"  network problem ({msg[:80]}), retrying in {pause} s", flush=True)
                time.sleep(pause)
                continue
            raise
    raise SourceError("gave up after repeated rate limiting")


def era5_for(s: Dict[str, Any]) -> Dict[str, Any]:
    """{'hourly': ERA5 hourly series, 'elevation': point elevation (GLO-90)}; cached on disk."""
    key = f"{s['lat']:.4f}_{s['lon']:.4f}_{s['date'].isoformat()}"
    path = RAW_DIR / f"{key}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    d = s["date"]
    raw = _throttled(openmeteo.fetch_era5_hourly, round(s["lat"], 4), round(s["lon"], 4),
                     (d - timedelta(days=11)).isoformat(), d.isoformat())
    out = {"hourly": raw["hourly"], "elevation": raw.get("grid_elevation_m")}
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out), encoding="utf-8")
    return out


def elevations(points: List[tuple]) -> Dict[str, float]:
    cache = json.loads(ELEV_CACHE.read_text(encoding="utf-8")) if ELEV_CACHE.exists() else {}
    todo = [p for p in points if f"{p[0]:.4f},{p[1]:.4f}" not in cache]
    for i in range(0, len(todo), 100):
        chunk = todo[i:i + 100]
        time.sleep(11)   # a 100-point request counts as 100 calls: stay under 600/min
        vals = _throttled(openmeteo.elevation_points, chunk, 30)
        for p, v in zip(chunk, vals):
            cache[f"{p[0]:.4f},{p[1]:.4f}"] = v
        ELEV_CACHE.parent.mkdir(parents=True, exist_ok=True)
        ELEV_CACHE.write_text(json.dumps(cache), encoding="utf-8")
        print(f"  elevation {min(i + 100, len(todo))}/{len(todo)}", flush=True)
    return cache


def main():
    samples = build_samples()
    n_pos = sum(s["label"] for s in samples)
    print(f"{len(samples)} samples: {n_pos} positives, {len(samples) - n_pos} negatives", flush=True)

    # neighbours only: the centre elevation comes with each ERA5 response
    pts = sorted({p for s in samples for p in F.stencil_points(round(s["lat"], 4), round(s["lon"], 4))[1:]})
    try:
        elev = elevations(pts)
    except DailyLimit as exc:
        print(f"Open-Meteo daily limit reached ({exc}). Run again tomorrow: cached work is kept.")
        return 1

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    cols = ["group", "kind", "label", "source", "lat", "lon", "date", "year", "state", "threshold_ratio"] + F.FEATURES
    written = 0
    with open(OUT_CSV, "w", encoding="utf-8", newline="") as fh:
        wr = csv.DictWriter(fh, fieldnames=cols)
        wr.writeheader()
        for k, s in enumerate(samples, 1):
            try:
                raw = era5_for(s)
            except DailyLimit as exc:
                print(f"Open-Meteo daily limit reached after {k - 1} samples ({exc}). Run again tomorrow: cached work is kept.")
                return 1
            except SourceError as exc:
                print(f"  skip {s['kind']} {s['date']}: {exc}", flush=True)
                continue
            h = raw["hourly"]
            # keep hours up to the end of the sample's day (IST)
            keep = [i for i, t in enumerate(h["time"]) if t[:10] <= s["date"].isoformat()]
            hh = {key: [v[i] for i in keep] for key, v in h.items()}
            wf = F.weather_features(hh)
            if wf is None:
                continue
            lat, lon = round(s["lat"], 4), round(s["lon"], 4)
            ev = [raw.get("elevation")] + [elev.get(f"{p[0]:.4f},{p[1]:.4f}") for p in F.stencil_points(lat, lon)[1:]]
            if any(v is None for v in ev):
                continue
            ratio = tm.evaluate(hh["precipitation"], tm.region_for_state(s["state"]))["ratio"]
            row = {"group": s["group"], "kind": s["kind"], "label": s["label"], "source": s.get("source", ""), "lat": lat, "lon": lon,
                   "date": s["date"].isoformat(), "year": s["date"].year, "state": s["state"],
                   "threshold_ratio": ratio, **wf, **F.terrain_features(ev, lat)}
            wr.writerow(row)
            written += 1
            if k % 100 == 0:
                fh.flush()
                print(f"  {k}/{len(samples)} processed, {written} written", flush=True)
    print(f"done: {written} rows -> {OUT_CSV}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
