# SANKET Module 1: landslide early warning (backend)

FastAPI service behind the SANKET web app. Every value comes from a real source; when a source is
down the last real reading is shown (flagged stale) or the value is marked unavailable.

## What it computes

* **Level** (Normal / Watch / Warning / Danger) for 105 hotspots in 21 districts: live rainfall over
  the last 1 h to 10 days compared with published regional rainfall thresholds
  (`config/thresholds.json`), only where the terrain is steep enough for landslides.
* **Landslide confidence (%)**: gradient-boosted trees trained on 950 real landslide days in India
  (2007–2024) and the same places on other days; tested on 2017–2024 landslides it never saw.

## Layout

| Path | Purpose |
|---|---|
| `api/` | FastAPI app (`main.py`), endpoints (`routes.py`), incidents and field reports (`records.py`) |
| `config/` | districts, historical events, rainfall thresholds |
| `sources/` | Open-Meteo (live ECMWF IFS and ERA5 archive), Copernicus GLO-30 DEM, Sentinel-2 NDVI, HTTP + disk cache |
| `monitoring/` | hotspot evaluation, district roll-up, landslide inventory lookup, time series |
| `inference/threshold_model.py` | published threshold rule, levels, hysteresis |
| `ingestion/osm.py` | infrastructure from OpenStreetMap (Overpass) |
| `ml/` | training data builder, model training, prediction, evaluation graphs |
| `models/` | trained confidence model and its model card |
| `data/` | hotspots, landslide inventories (`raw/`), training table, SQLite records, caches |

Module 3 (road blockage from a photo) lives in `../module3/` and is served by the same API.

## Run

```bash
pip install -r requirements.txt
python -m uvicorn module1.api.main:app --port 8000 --reload --timeout-graceful-shutdown 5
```

Rebuild the model: `python -m module1.ml.dataset`, then `python -m module1.ml.train`, then
`python -m module1.ml.figures` (evaluation graphs shown on the Data & Model page).
