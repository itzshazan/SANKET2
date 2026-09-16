# SANKET — Flow Documentation

## 1. Core Product Flow

```text
OBSERVE
   ↓
DETECT
   ↓
INVESTIGATE
   ↓
ANALYSE
   ↓
DECIDE
   ↓
ACT
   ↓
REPORT
```

---

## 2. Application Navigation Flow

```text
                         SANKET
                            │
                            ▼
                        OVERVIEW
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   LIVE MONITOR          RISK MAP          ANALYTICS
        │                   │                   │
        │                   ▼                   │
        │          LOCATION INTELLIGENCE       │
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                  DECISION INTELLIGENCE
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
      ALERTS          INFRASTRUCTURE       HISTORY
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                            ▼
                         REPORTS
```

---

## 3. Core User Journey

```text
USER OPENS SANKET
        │
        ▼
VIEW OVERVIEW
"What is happening?"
        │
        ▼
IDENTIFY RISK ZONE
"Where is the risk?"
        │
        ▼
OPEN RISK MAP
        │
        ▼
SELECT LOCATION
        │
        ▼
LOCATION ANALYSIS
"Why is it risky?"
        │
        ▼
VIEW RISK FACTORS
├── Rainfall
├── Soil Moisture
├── Weather
├── Terrain
└── Infrastructure
        │
        ▼
MAKE DECISION
        │
   ┌────┴────┐
   ▼         ▼
 ALERT     REPORT
```

---

# 4. External Data Sources

```text
NASA GPM IMERG ────── Rainfall Data
NASA SMAP ─────────── Soil Moisture Data
OPEN-METEO API ────── Weather Data
OPENSTREETMAP API ─── Infrastructure Data
COPERNICUS DEM ────── Elevation / Terrain Data
```

---

# 5. Complete Geospatial Data Pipeline

```text
                         EXTERNAL DATA SOURCES
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼

 NASA GPM IMERG              NASA SMAP                OPEN-METEO API
 Rainfall Data              Soil Moisture              Weather Data

        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                                  ▼

                    ┌─────────────────────────┐
                    │  DATA INGESTION LAYER   │
                    └────────────┬────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼

          OPENSTREETMAP API                 COPERNICUS DEM
          Vector Geographic Data            Raster Terrain Data
                 │                               │
                 ▼                               ▼

              GEOPANDAS                       RASTERIO
          Vector Processing                Raster Processing
                 │                               │
                 └───────────────┬───────────────┘
                                 │
                                 ▼

                    ┌─────────────────────────┐
                    │    DATA PROCESSING      │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼

   DATA CLEANING         SPATIAL ANALYSIS       FEATURE EXTRACTION

        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                                 ▼

                    ┌─────────────────────────┐
                    │         POSTGIS         │
                    │ Spatial Data Storage    │
                    └────────────┬────────────┘
                                 │
                                 ▼

                    ┌─────────────────────────┐
                    │  FEATURE ENGINEERING    │
                    └────────────┬────────────┘
                                 │
                                 ▼

                    ┌─────────────────────────┐
                    │        ML MODEL         │
                    └────────────┬────────────┘
                                 │
                                 ▼

                    ┌─────────────────────────┐
                    │    RISK PREDICTION      │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼

              RISK ANALYTICS              ALERT ENGINE
                    │                         │
                    └────────────┬────────────┘
                                 │
                                 ▼

                    ┌─────────────────────────┐
                    │ INTERACTIVE GIS LAYER   │
                    │   FOLIUM / LEAFMAP      │
                    └────────────┬────────────┘
                                 │
                                 ▼

                    ┌─────────────────────────┐
                    │    SANKET FRONTEND      │
                    └────────────┬────────────┘
                                 │
                                 ▼

                    ┌─────────────────────────┐
                    │     MAP DASHBOARD       │
                    └─────────────────────────┘
```

---

# 6. GIS Processing Flow

```text
                    GEOSPATIAL DATA
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
         VECTOR DATA                RASTER DATA
              │                         │
              ▼                         ▼
          GEOPANDAS                  RASTERIO
              │                         │
              ├── Roads                   ├── Elevation
              ├── Buildings               ├── Terrain
              ├── Rivers                  ├── Rainfall Raster
              └── Hospitals               └── Satellite Data
              │                         │
              └────────────┬────────────┘
                           │
                           ▼
                    SPATIAL ANALYSIS
                           │
                           ▼
                        POSTGIS
```

---

# 7. Risk Prediction Flow

```text
ENVIRONMENTAL DATA
├── Rainfall
├── Soil Moisture
└── Weather
        │
        ▼
TERRAIN DATA
├── Elevation
├── Slope
└── Drainage
        │
        ▼
INFRASTRUCTURE DATA
├── Roads
├── Buildings
└── Hospitals
        │
        ▼
FEATURE ENGINEERING
        │
        ▼
ML MODEL
        │
        ▼
RISK SCORE
        │
   ┌────┼─────┬──────┐
   ▼    ▼     ▼      ▼
 LOW MODERATE HIGH CRITICAL
```

---

# 8. Alert and Decision Flow

```text
RISK PREDICTION
       │
       ▼
RISK SCORE
       │
 ┌─────┴─────┐
 ▼           ▼
LOW         HIGH
 │            │
 ▼            ▼
MONITOR    ALERT ENGINE
                │
                ▼
         CREATE INCIDENT
                │
                ▼
          NOTIFY USER
                │
                ▼
        INVESTIGATE AREA
                │
                ▼
          MAKE DECISION
                │
        ┌───────┴────────┐
        ▼                ▼
   MONITOR         EMERGENCY RESPONSE
```

---

# 9. Report Generation Flow

```text
REPORTS PAGE
      │
      ▼
SELECT REPORT TYPE
      │
      ▼
SELECT LOCATION
      │
      ▼
SELECT DATE RANGE
      │
      ▼
SELECT DATA LAYERS
      │
      ▼
GENERATE REPORT
      │
      ▼
REPORT PREVIEW
      │
      ▼
EXPORT
```

---

# 10. Frontend Data Flow

```text
SANKET BACKEND API
       │
       ▼
FRONTEND API LAYER
       │
 ┌─────┼─────┐
 ▼     ▼     ▼
ENV   MAP   RISK
DATA  DATA  DATA
 │     │     │
 └─────┼─────┘
       │
       ▼
STATE MANAGEMENT
       │
 ┌─────┼─────┐
 ▼     ▼     ▼
UI   MAP   DATA
STATE STATE STATE
       │
       ▼
REACT COMPONENTS
       │
 ┌─────┼─────────┐
 ▼     ▼         ▼
OVERVIEW RISK MAP ANALYTICS
```

---

# 11. Master End-to-End Flow

```text
DATA SOURCES
     │
     ▼
DATA INGESTION
     │
     ▼
GIS PROCESSING
GeoPandas + Rasterio
     │
     ▼
SPATIAL DATABASE
PostGIS
     │
     ▼
FEATURE ENGINEERING
     │
     ▼
ML MODEL
     │
     ▼
RISK PREDICTION
     │
     ├──────────► ALERT ENGINE
     │
     ├──────────► ANALYTICS
     │
     ▼
INTERACTIVE GIS
Folium / Leafmap
     │
     ▼
SANKET FRONTEND
     │
     ▼
DECISION SUPPORT
```

---

# 12. SANKET Philosophy

> SANKET is a geospatial decision intelligence platform.

```text
COLLECT DATA
     ↓
UNDERSTAND ENVIRONMENT
     ↓
ANALYSE GEOSPATIAL CONDITIONS
     ↓
PREDICT RISK
     ↓
VISUALIZE INTELLIGENCE
     ↓
DETECT CRITICAL SITUATIONS
     ↓
SUPPORT DECISION MAKING
     ↓
ENABLE ACTION
```
