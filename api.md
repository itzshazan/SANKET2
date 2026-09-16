# API & Data Sources Documentation

## Project Data Integration

This document describes the external APIs and geospatial data sources
used by the application, including the data fetched from each source and
its role in the system.

------------------------------------------------------------------------

# 1. NASA GPM IMERG

## Purpose

NASA GPM IMERG provides satellite-based global precipitation and
rainfall data.

## Data Fetched

-   Rainfall intensity
-   Precipitation accumulation
-   Historical rainfall data
-   Near real-time precipitation estimates
-   Spatial rainfall distribution

## Primary Use Cases

-   Flood risk analysis
-   Rainfall monitoring
-   Weather pattern analysis
-   Hydrological modelling
-   Disaster prediction systems

## Key Data Type

  Parameter       Description
  --------------- ------------------------------------
  Precipitation   Amount of rainfall received
  Rainfall Rate   Rainfall intensity over time
  Temporal Data   Hourly/daily precipitation records
  Spatial Data    Geographic rainfall distribution

------------------------------------------------------------------------

# 2. NASA SMAP

## Purpose

NASA SMAP (Soil Moisture Active Passive) provides global soil moisture
observations.

## Data Fetched

-   Surface soil moisture
-   Soil moisture percentage
-   Soil freeze/thaw conditions
-   Land surface conditions

## Primary Use Cases

-   Flood prediction
-   Drought monitoring
-   Agricultural analysis
-   Soil saturation detection
-   Hydrological modelling

## Key Data Type

  Parameter           Description
  ------------------- ----------------------------------
  Soil Moisture       Water content present in soil
  Surface Condition   Land surface moisture state
  Freeze/Thaw State   Frozen or thawed soil conditions

------------------------------------------------------------------------

# 3. OpenStreetMap API

## Purpose

OpenStreetMap provides open geographic and infrastructure data.

## Data Fetched

-   Roads
-   Buildings
-   Streets
-   Administrative boundaries
-   Rivers and water bodies
-   Hospitals and emergency facilities
-   Bridges
-   Land-use information
-   Geographic coordinates
-   Points of interest

## Primary Use Cases

-   Interactive map visualization
-   Infrastructure analysis
-   Route planning
-   Population and settlement analysis
-   Flood impact assessment
-   Emergency response planning

## Key Data Type

  Category         Examples
  ---------------- ------------------------------------
  Transportation   Roads, highways, bridges
  Infrastructure   Buildings, hospitals
  Geography        Rivers, lakes, boundaries
  Locations        Coordinates and points of interest

------------------------------------------------------------------------

# 4. Open-Meteo API

## Purpose

Open-Meteo provides weather forecasts and historical weather
information.

## Data Fetched

-   Temperature
-   Humidity
-   Wind speed
-   Wind direction
-   Rainfall forecast
-   Precipitation probability
-   Atmospheric pressure
-   Cloud cover
-   Weather conditions

## Primary Use Cases

-   Weather monitoring
-   Rainfall forecasting
-   Flood prediction
-   Environmental analysis
-   Real-time dashboard updates

## Key Data Type

  Parameter       Description
  --------------- ----------------------------------
  Temperature     Current and forecast temperature
  Humidity        Atmospheric moisture
  Wind Speed      Speed of wind
  Precipitation   Rainfall forecast
  Pressure        Atmospheric pressure
  Cloud Cover     Percentage of cloud coverage

------------------------------------------------------------------------

# 5. Copernicus DEM

## Purpose

Copernicus Digital Elevation Model provides detailed terrain elevation
data.

## Data Fetched

-   Terrain elevation
-   Digital elevation data
-   Surface topography
-   Terrain height

## Derived Information

Using DEM data, the application can calculate:

-   Slope
-   Aspect
-   Flow direction
-   Drainage paths
-   Watershed boundaries
-   Terrain depressions
-   Low-lying areas

## Primary Use Cases

-   Flood susceptibility mapping
-   Terrain analysis
-   Water flow modelling
-   Drainage analysis
-   Landslide risk analysis

## Key Data Type

  Parameter        Description
  ---------------- ------------------------------------
  Elevation        Height above sea level
  Slope            Steepness of terrain
  Aspect           Direction terrain faces
  Flow Direction   Potential water movement direction

------------------------------------------------------------------------

# Data Integration Architecture

``` text
                    EXTERNAL DATA SOURCES
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   NASA GPM IMERG       NASA SMAP          Open-Meteo
   Rainfall Data       Soil Moisture       Weather Data
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    DATA INGESTION LAYER
                            │
                            ▼
                    DATA PROCESSING
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   Copernicus DEM     OpenStreetMap       Historical Data
   Terrain Data       Infrastructure       Data Storage
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                    ANALYTICS / ML ENGINE
                            │
                            ▼
                    RISK PREDICTION ENGINE
                            │
                            ▼
                     VISUALIZATION LAYER
```

# Data Summary

  -----------------------------------------------------------------------
  Source                  Data                    Main Purpose
  ----------------------- ----------------------- -----------------------
  NASA GPM IMERG          Rainfall and            Rainfall monitoring and
                          precipitation           flood prediction

  NASA SMAP               Soil moisture           Soil saturation and
                                                  hydrological analysis

  OpenStreetMap API       Roads, buildings,       Geographic and
                          infrastructure          infrastructure mapping

  Open-Meteo API          Weather and forecasts   Weather monitoring and
                                                  forecasting

  Copernicus DEM          Elevation and terrain   Terrain and water flow
                                                  analysis
  -----------------------------------------------------------------------

# Combined Application Workflow

``` text
Rainfall Data
     +
Weather Data
     +
Soil Moisture
     +
Terrain Elevation
     +
Infrastructure Data
        │
        ▼
   DATA FUSION
        │
        ▼
 FEATURE ENGINEERING
        │
        ▼
 MACHINE LEARNING / ANALYTICS
        │
        ▼
 FLOOD / RISK PREDICTION
        │
        ▼
 MAP-BASED VISUALIZATION
        │
        ▼
 DECISION SUPPORT
```

# Recommended Data Fetching Responsibilities

  API / Source     Fetch Frequency
  ---------------- ---------------------------------------------------
  NASA GPM IMERG   Based on available precipitation update intervals
  NASA SMAP        Based on satellite product availability
  OpenStreetMap    On-demand or cached periodically
  Open-Meteo       Real-time and forecast intervals
  Copernicus DEM   One-time download and local storage

# Important Implementation Notes

1.  Cache large geospatial datasets locally where possible.
2.  Do not repeatedly download Copernicus DEM for every user request.
3.  Store historical weather and rainfall data in a time-series or
    geospatial database.
4.  Normalize coordinates and timestamps across all data sources.
5.  Convert all geographic datasets into compatible coordinate reference
    systems (CRS).
6.  Handle missing satellite observations before feeding data into ML
    models.
7.  Maintain metadata for source, timestamp, resolution, and geographic
    coverage.
8.  Use asynchronous data ingestion where APIs support concurrent
    requests.

------------------------------------------------------------------------

## Final Data Pipeline

``` text
NASA GPM IMERG ──────┐
NASA SMAP ───────────┤
Open-Meteo API ──────┤
OpenStreetMap API ───┤──► Data Pipeline ─► Processing ─► ML Model
Copernicus DEM ──────┘                                  │
                                                        ▼
                                                 Risk Prediction
                                                        │
                                                        ▼
                                                   Map Dashboard
```


---

# Geospatial Technology Stack

In addition to external APIs and datasets, the application uses the following GIS and spatial technologies for processing, analysis, visualization, and storage.

## 6. Interactive GIS: Folium / Leafmap

### Purpose
Used for interactive web-based geospatial visualization.

### Capabilities
- Interactive maps
- Marker visualization
- Heatmaps
- Choropleth maps
- Flood-risk zone visualization
- Raster and vector layer overlays
- Satellite and terrain layers

### Role in the System
The processed predictions and geospatial datasets are displayed through an interactive map interface.

---

## 7. Vector GIS: GeoPandas

### Purpose
Used for processing and analysing vector-based geographic data.

### Supported Data
- GeoJSON
- Shapefiles
- Administrative boundaries
- Roads
- Buildings
- Rivers
- Flood zones
- Infrastructure layers

### Capabilities
- Spatial joins
- Buffer analysis
- Geographic filtering
- Coordinate transformations
- Intersection analysis
- Distance calculations

### Role in the System
GeoPandas processes OpenStreetMap and other vector datasets before they are passed to the analytics and visualization layers.

---

## 8. Raster GIS: Rasterio

### Purpose
Used for reading, processing, and analysing raster geospatial data.

### Supported Data
- GeoTIFF
- Digital Elevation Models
- Satellite imagery
- Rainfall rasters
- Soil moisture rasters

### Capabilities
- Raster reading and writing
- Pixel-level analysis
- Cropping and masking
- Reprojection
- Raster transformations
- Multi-band data processing

### Role in the System
Rasterio processes Copernicus DEM, satellite-derived rainfall data, and other raster datasets.

---

## 9. Spatial Database: PostGIS

### Purpose
PostGIS extends PostgreSQL with geospatial storage and spatial query capabilities.

### Data Stored
- Geographic coordinates
- Administrative boundaries
- Roads and infrastructure
- Flood-risk zones
- Historical predictions
- Spatial features
- Raster metadata

### Capabilities
- Spatial indexing
- Distance queries
- Point-in-polygon queries
- Intersection queries
- Geographic filtering
- Spatial joins

### Role in the System
PostGIS acts as the central spatial data storage and querying layer.

---

# Complete Geospatial Data Architecture

```text
                         EXTERNAL DATA SOURCES
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│ NASA GPM IMERG      NASA SMAP        Open-Meteo      OpenStreetMap  │
│ Rainfall            Soil Moisture    Weather         Infrastructure │
│                                                                      │
│                     Copernicus DEM                                  │
│                     Elevation / Terrain                             │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
                     DATA INGESTION LAYER
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
         VECTOR PROCESSING                RASTER PROCESSING
          GeoPandas                         Rasterio
                │                               │
                └───────────────┬───────────────┘
                                │
                                ▼
                         POSTGIS DATABASE
                     Spatial Data Storage Layer
                                │
                                ▼
                      FEATURE ENGINEERING
                                │
                                ▼
                       ML / ANALYTICS ENGINE
                                │
                                ▼
                         RISK PREDICTION
                                │
                                ▼
                     INTERACTIVE GIS LAYER
                       Folium / Leafmap
                                │
                                ▼
                         MAP DASHBOARD
```

# Technology Responsibility Matrix

| Technology | Category | Primary Responsibility |
|---|---|---|
| NASA GPM IMERG | Satellite Data | Rainfall and precipitation |
| NASA SMAP | Satellite Data | Soil moisture |
| Open-Meteo API | Weather API | Weather and forecasts |
| OpenStreetMap API | Geographic API | Roads, buildings and infrastructure |
| Copernicus DEM | Terrain Dataset | Elevation and topography |
| GeoPandas | Vector GIS | Vector spatial processing |
| Rasterio | Raster GIS | Raster data processing |
| PostGIS | Spatial Database | Geospatial data storage and queries |
| Folium | Interactive GIS | Web-based map visualization |
| Leafmap | Interactive GIS | Advanced interactive geospatial visualization |

# Recommended Processing Flow

```text
API / DATA SOURCE
        │
        ▼
DATA INGESTION
        │
        ├── Vector Data ──► GeoPandas
        │
        └── Raster Data ──► Rasterio
                              │
                              ▼
                         Data Cleaning
                              │
                              ▼
                     CRS Normalization
                              │
                              ▼
                     Feature Extraction
                              │
                              ▼
                         PostGIS
                              │
                              ▼
                       ML Processing
                              │
                              ▼
                     Prediction Results
                              │
                              ▼
                    Folium / Leafmap
                              │
                              ▼
                     Interactive Dashboard
```
