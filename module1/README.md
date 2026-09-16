# SANKET — Module 1: Landslide Risk Prediction (ML System)

> **SIH Problem ID 26001** · Ministry of Development of North Eastern Region (MDoNER)  
> Core Machine Learning Subsystem for Tabular Landslide Risk Prediction & Explainability.

---

## 1. Overview

Module 1 answers the operational question:  
> **"How risky is this specific location for a landslide right now?"**

It is a **tabular machine learning risk-prediction model** fusing:
1. **Dynamic Meteorology**: 24h, 72h, and 7d rainfall totals (NASA GPM IMERG / IMD) + Antecedent Precipitation Index (API decay $k=0.9$) + empirical threshold exceedance $I/I_0(D)$.
2. **Soil Hydrology**: Volumetric Water Content (VWC) and saturation from NASA SMAP.
3. **Terrain Topography**: Copernicus DEM 30m morphometry (slope, aspect, curvature, Topographic Wetness Index - TWI, elevation).
4. **Vegetation Protection**: Sentinel-2 NDVI vigor and temporal vegetation loss anomalies ($\Delta \text{NDVI}$).
5. **Historical Spatial Prior**: ISRO Landslide Atlas and GSI records (spatial kernel density and distance to closest known failure).

---

## 2. Directory Structure

```
module1/
├── data/
│   ├── raw/                      # Raw inputs from ISRO, GPM, SMAP, Copernicus
│   │   ├── landslide/
│   │   ├── rainfall/
│   │   ├── soil_moisture/
│   │   ├── dem/
│   │   └── satellite/
│   ├── processed/                # Normalized, spatio-temporally aligned grids
│   └── final/                    # Final balanced training/validation splits
├── ingestion/                    # Ingestion connectors per remote source
├── preprocessing/                # Cleaners, coordinate bounds validators, aligners
├── features/                     # Domain-specific feature engineering engines
├── dataset/                      # Positive/negative sample extractors and dataset builder
├── training/                     # Model trainers: Logistic Regression, RF, XGBoost
├── evaluation/                   # Metrics (AUC-ROC, F1), spatial block CV, Noney backtester
├── inference/                    # Real-time predictor & 4-tier hysteresis risk classifier
├── explainability/               # TreeSHAP factor attribution generator
├── models/                       # Serialized pickle model artifacts & feature schema
├── api/                          # FastAPI serving layer (predict, explain, health endpoints)
└── config/
    └── config.yaml               # Centralized hyperparameters & regional bounds
```

---

## 3. Quickstart: Running the Module 1 API Server

```bash
# From workspace root:
python -m uvicorn module1.api.main:app --host 0.0.0.0 --port 8000 --reload
```

Once running:
- **Interactive Swagger Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/v1/module1/health`
- **Predict Endpoint**: `POST http://localhost:8000/api/v1/module1/predict`
- **SHAP Explain Endpoint**: `POST http://localhost:8000/api/v1/module1/explain`

---

## 4. API Request & Response Sample

### Request (`POST /api/v1/module1/predict`):
```json
{
  "latitude": 24.7865,
  "longitude": 93.6421,
  "rainfall_24h": 134.0,
  "rainfall_72h": 280.0,
  "rainfall_7d": 395.0,
  "soil_moisture": 0.49,
  "slope": 38.0,
  "elevation": 750.0,
  "zone_id": "noney-a"
}
```

### Response:
```json
{
  "risk_probability": 0.8842,
  "risk_level": "danger",
  "evaluated_at": "2026-09-05T18:30:00Z",
  "model_version": "1.0.0-xgb",
  "zone_id": "noney-a",
  "is_mock": false
}
```
