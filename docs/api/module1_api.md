# SANKET Module 1 — API Specification

> **Base URL**: `http://localhost:8000/api/v1/module1`  
> **Protocol**: HTTP/1.1 REST  
> **Content-Type**: `application/json`

---

## Endpoints

### 1. Health Check
`GET /health`

**Response (`200 OK`)**:
```json
{
  "status": "ok",
  "service": "SANKET Module 1 — Landslide Risk Prediction",
  "version": "1.0.0",
  "model_loaded": true,
  "fallback_mode": false
}
```

---

### 2. Predict Landslide Risk
`POST /predict`

Evaluates incoming meteorological and terrain variables for a specific coordinate or zone.

**Request Body**:
```json
{
  "latitude": 24.7865,
  "longitude": 93.6421,
  "rainfall_24h": 134.0,
  "rainfall_72h": 280.0,
  "rainfall_7d": 395.0,
  "max_rainfall_1h": 38.5,
  "soil_moisture": 0.49,
  "slope": 38.0,
  "elevation": 750.0,
  "aspect": 210.0,
  "curvature": -1.2,
  "twi": 11.5,
  "flow_accumulation": 120.0,
  "ndvi": 0.58,
  "ndvi_change": -0.14,
  "historical_density": 4,
  "zone_id": "noney-a"
}
```

**Response (`200 OK`)**:
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

---

### 3. Explain Prediction (TreeSHAP)
`POST /explain`

Returns physical factor attributions for a given prediction vector.

**Response (`200 OK`)**:
```json
{
  "zone_id": "noney-a",
  "risk_level": "danger",
  "risk_probability": 0.8842,
  "method": "TreeSHAP",
  "factors": [
    { "factor": "Terrain Susceptibility", "status": "High", "weight": 0.84, "detail": "Slope: 38.0°" },
    { "factor": "Rainfall Trigger", "status": "High", "weight": 1.0, "detail": "72h rainfall: 280.0 mm" },
    { "factor": "Soil Moisture", "status": "Saturated", "weight": 0.98, "detail": "VWC: 49.0%" },
    { "factor": "Vegetation", "status": "Reduced", "weight": 0.14, "detail": "Delta NDVI: -0.14" },
    { "factor": "Historical Vulnerability", "status": "High", "weight": 0.67, "detail": "4 prior landslides in sector" }
  ]
}
```

---

### 4. Historical Backtest Replay
`GET /backtest/noney-2022`

Replays the 29 June 2022 Tupul railway construction site disaster across an 8-step chronological progression (-30 days to Day 0).
