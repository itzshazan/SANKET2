# SANKET Module 1 — Landslide Risk Prediction

> **Purpose:** This document defines the first implementation of Module 1 of SANKET, from historical landslide records and environmental data through ML training, explainability, and operational risk prediction.

---

## 1. Module Overview

### What is Module 1?

Module 1 is the **Landslide Risk Prediction** module.

Its main question is:

> **“How risky is this location for a landslide?”**

It is a **tabular machine-learning model**. It does not detect a landslide directly from an image.

The model learns relationships between historical landslide/non-landslide cases and environmental/terrain conditions such as rainfall, soil moisture, slope, terrain wetness, vegetation condition, and historical landslide context.

### High-level idea

```text
Historical landslide/non-landslide examples
                    ↓
             Feature extraction
                    ↓
            ML-ready dataset
                    ↓
             ML model training
                    ↓
              Saved model
                    ↓
        Current / forecast conditions
                    ↓
             Risk probability
                    ↓
              Risk level
                    ↓
            SHAP explanation
                    ↓
                  GIS
                    ↓
                Alerts
```

---

# 2. What Problem Does Module 1 Solve?

The North Eastern Region is vulnerable to landslides because of mountainous terrain, rainfall, soil/water conditions, and other environmental factors.

A traditional system may wait for a landslide to happen or for someone to report it.

Module 1 tries to move toward **prediction**:

```text
Instead of:
Landslide happens → report → response

SANKET aims for:
Risk increasing → prediction → warning → preventive action
```

Module 1 therefore acts as an early-warning component.

It does **not** replace visual evidence or field verification. Those are handled by the other SANKET modules.

---

# 3. What Does the Model Predict?

For a chosen prediction time `T`, the model estimates the probability that a landslide event will occur in a future window.

Example project design:

```text
Prediction time = T

Use only information available at or before T
                    ↓
Predict landslide during T → T+24 hours
```

A 24-hour horizon is an example for the first implementation. The final production horizon is a **project decision** and must be selected after checking data availability, operational needs, and validation results. A 72-hour horizon can also be evaluated.

### Example output

```text
risk_probability = 0.87
```

This means the trained model assigned a high predicted probability under the model's learned scale.

It does **not** automatically mean that there is an 87% scientifically guaranteed chance of a landslide. Probability calibration and threshold selection must be validated.

---

# 4. Module 1 in the Overall SANKET System

The complete system can be understood as:

```text
                    SANKET
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
    MODULE 1        MODULE 2        MODULE 3
    ML Risk         Landslide       Road /
    Prediction      Evidence        Obstruction
        │              │              │
        └──────────────┼──────────────┘
                       ↓
                     GIS
                       ↓
                 Risk Fusion
                       ↓
                Impact Analysis
                       ↓
                    SHAP
                       ↓
                  Final Risk
                       ↓
                    Alerts
                       ↓
             Authorities / Communities
                       ↑
                 Field Feedback
```

### Roles

| Component | Main question |
|---|---|
| Module 1 | How risky is this location? |
| Module 2 | Is there visual evidence of a landslide? |
| Module 3 | Has the road been affected? |
| GIS | Where is it and what is affected? |
| Risk Fusion | How do different signals combine? |
| Impact Analysis | What could be affected? |
| SHAP | Why did Module 1 produce this prediction? |
| Alert System | Who should be warned and when? |

---

# 5. Final Feature List

For the **first version (V1)**, keep Module 1 practical and focused.

## Core features

1. Rainfall — 24 hour
2. Rainfall — 72 hour / 3 day
3. Rainfall — 7 day
4. Soil Moisture
5. Elevation
6. Slope
7. TWI (Topographic Wetness Index)
8. NDVI
9. NDVI Change
10. Historical Landslide Count or Density

---

## 5.1 Rainfall 24h

### What is it?

The total/derived amount of rainfall over the recent 24-hour window.

### Why does it matter?

Heavy rainfall can increase water entering the ground, increase pore-water pressure, and reduce slope stability.

### Real-time?

**Time-dependent.**

For operational prediction, a near-real-time/current precipitation source can be used.

For historical training, use historical precipitation corresponding to the historical sample's time.

### Source

- NASA GPM IMERG — historical rainfall / backtesting
- IMD — operational/current/forecast weather and rainfall

NASA describes IMERG as a precipitation product that combines satellite observations and provides products at multiple temporal resolutions. The current GPM directory identifies V07B and gives 30-minute and daily products among available data products. [NASA GPM IMERG](https://gpm.nasa.gov/data/imerg)

### How extracted?

```text
lat + lon + prediction/event time
                ↓
      precipitation data
                ↓
      recent 24h accumulation
                ↓
          rainfall_24h
```

### Example

```text
rainfall_24h = 85 mm
```

---

## 5.2 Rainfall 72h / 3-day

### What is it?

Rainfall accumulated over the previous 72 hours.

### Why important?

A slope may not fail because of one short rainfall burst alone. Several days of continuous rain can progressively wet the soil.

### Real-time?

**Time-dependent.**

### Source

- NASA GPM IMERG
- IMD for operational weather/rainfall

### How extracted?

```text
Recent 72h precipitation
        ↓
sum/derive
        ↓
rainfall_72h
```

### Example

```text
rainfall_72h = 190 mm
```

---

## 5.3 Rainfall 7d

### What is it?

Rainfall accumulated over the previous seven days.

### Why important?

It represents a longer wet period and can provide context about prolonged rainfall.

### Real-time?

**Time-dependent.**

### Source

NASA GPM IMERG for historical analysis; IMD/current data for operations where appropriate.

### Example

```text
rainfall_7d = 320 mm
```

---

## 5.4 Soil Moisture

### What is it?

Soil moisture describes how much water is present in the soil.

Simple idea:

```text
Dry soil
   ↓
lower soil moisture

Wet soil
   ↓
higher soil moisture
```

### Why important?

Very wet soil can contribute to reduced slope stability.

### Real-time?

**Not true second-by-second real-time.**

Satellite/model products are observations/analyses available at specific times. Operational use should use the **latest suitable available observation**.

NASA Earthdata currently exposes multiple SMAP soil-moisture products, including daily and higher-frequency products. For example, NASA Worldview shows SMAP surface and root-zone soil moisture layers. [NASA Earthdata / Worldview](https://worldview.earthdata.nasa.gov/)

### Source

- NASA SMAP / NASA Earthdata

### How extracted?

```text
location + historical/operational time
                  ↓
          matching SMAP product
                  ↓
            soil_moisture
```

### Example

```text
soil_moisture = 0.41
```

The exact unit and product must be stored with the selected SMAP product definition.

---

# 5.5 Elevation

### What is it?

The height of a location relative to a defined vertical reference, commonly expressed in metres.

Example:

```text
Location A = 300 m
Location B = 1620 m
```

### Why important?

It provides terrain context and can be correlated with environmental/landform conditions.

Elevation is not by itself a landslide decision.

### Real-time?

**Mostly static.**

A normal DEM elevation value does not need to be refreshed every minute.

### Source

- Copernicus DEM

### How extracted?

```text
latitude + longitude
        ↓
DEM raster lookup
        ↓
elevation
```

### Example

```text
elevation = 1620 m
```

---

# 5.6 Slope

### What is it?

Slope tells us how steep the ground is.

Example:

```text
5°  → relatively gentle
15° → moderate
34° → steep
```

### Why important?

Slope is one of the most important terrain variables for landslide susceptibility/risk because steeper terrain generally has stronger gravity-driven downslope forces.

### Real-time?

**Mostly static.**

### Source

- Copernicus DEM

### Important

Slope is **not a separate API**.

It is calculated from the DEM.

```text
DEM
 ↓
terrain calculation
 ↓
slope
```

### Example

```text
slope = 34°
```

---

# 5.7 TWI — Topographic Wetness Index

### What is it?

TWI is an index that represents the terrain's tendency to be wetter / accumulate water.

Simple idea:

```text
       \        /
        \      /
         \____/
            ↑
       water tends
       to accumulate
```

### Why important?

Wet locations can be relevant to slope instability. TWI adds terrain-based wetness context.

### Real-time?

**Mostly static / derived from terrain.**

It changes only when the underlying terrain representation changes. It is not a live weather measurement.

### Source

- Derived from DEM

### How calculated?

```text
DEM
 ↓
hydrological / terrain processing
 ↓
TWI
```

TWI must be calculated using a clearly documented formula and DEM-processing method.

### Example

```text
twi = 8.3
```

`8.3` is an index value, not “8.3 litres of water”.

---

# 5.8 NDVI

### What is it?

NDVI stands for **Normalized Difference Vegetation Index**.

It is a satellite-derived indicator of vegetation/greenness.

Simple idea:

```text
Dense / healthy vegetation
          ↓
       NDVI higher

Little vegetation / bare surface
          ↓
       NDVI lower
```

### Why important?

Vegetation and vegetation condition can provide supporting information about slope/environmental state.

Vegetation roots can also contribute to soil reinforcement.

### Real-time?

**No, not second-by-second real-time.**

Satellite observations occur at particular times and may be affected by cloud cover.

### Source

- Sentinel-2 through Copernicus Data Space

### How calculated?

Sentinel-2 provides spectral bands, including red and near-infrared (NIR).

Common formula:

```text
NDVI = (NIR - Red) / (NIR + Red)
```

```text
Sentinel-2
    ↓
Red + NIR
    ↓
NDVI calculation
    ↓
ndvi
```

### Example

```text
NDVI = 0.62
```

This is **not 62% vegetation**.

---

# 5.9 NDVI Change

### What is it?

NDVI Change compares a recent NDVI value with an earlier/baseline value.

Example:

```text
Old NDVI    = 0.72
Recent NDVI = 0.62
```

Therefore:

```text
NDVI Change = 0.62 - 0.72
            = -0.10
```

### Why important?

It can show that vegetation conditions changed over time.

Possible causes can include:

- natural disturbance
- land clearing
- construction
- seasonal changes
- fire
- landslide-related disturbance

Therefore:

> **NDVI change is a supporting signal, not proof of a landslide.**

### Real-time?

**Time-dependent but satellite-observation based.**

### Source

Sentinel-2 / Copernicus Data Space.

### Example

```text
ndvi_change = -0.10
```

---

# 5.10 Historical Landslide Count / Density

### What is it?

For a prediction location, count or estimate the concentration of previously recorded landslides nearby.

Example:

```text
Prediction location
       ↓
5 km analysis radius
       ↓
Past mapped events
       ↓
7 events
```

Then:

```text
historical_landslide_count = 7
```

### Why important?

An area with repeated historical failures may represent a historically vulnerable area.

### Real-time?

**Historical/context feature.**

It can be updated when the database receives new events, but it is not a live sensor measurement.

### Source

Primary:
- ISRO Landslide Atlas

Additional:
- GSI/NLSM
- NASA COOLR

### Important

The exact radius, time window, and count/density definition must be fixed before training.

---

# 6. Features Removed From the First Version

The following features are **not mandatory in V1**.

## Aspect

Tells the direction a slope faces.

Useful in some models, but secondary for the first prototype.

## Curvature

Describes whether terrain is locally convex/concave/flat.

Potentially useful, but adds complexity.

## Flow Accumulation

Represents terrain-based drainage accumulation.

Related to hydrological terrain information already represented partly through TWI. For a first model, keep TWI and test flow accumulation later.

## Geology

Geology can be important, but integrating reliable, spatially consistent geological layers across the complete study area is more complicated. Add it after the V1 pipeline is stable.

## Roads

Roads are mainly important for:

```text
Risk
 ↓
GIS
 ↓
Which roads are affected?
```

Road/obstruction information is a major part of Module 3 and impact analysis.

## Human Population

Population is mainly used to estimate:

```text
Risk
 ↓
Impact
 ↓
How many people may be exposed?
```

It is not a required first-version predictor of whether the ground will fail.

## Buildings / Infrastructure

Likewise, these are primarily impact/exposure features.

## Field Photographs

Field photographs belong to Module 3 / field evidence.

## Road Status

OPEN / PARTIALLY BLOCKED / BLOCKED is Module 3 output and GIS/impact information.

---

# 7. Raw Historical Dataset

The raw historical landslide inventory may initially have only basic fields:

```text
latitude
longitude
date / time
event or landslide label/attributes
```

Example:

| latitude | longitude | date | target |
|---:|---:|---|---:|
| 27.10 | 88.45 | 2021-07-15 | 1 |

This is **not yet the ML-ready dataset**.

The historical inventory provides the event examples/labels. The environmental feature values must be added from other datasets.

---

# 8. How Raw Data Becomes ML-Ready

This is the most important data-engineering stage of Module 1.

```text
Historical Landslide Inventory
            ↓
      latitude + longitude
            +
          date/time
            ↓
 ┌──────────┼───────────────┐
 ↓          ↓               ↓
Rainfall   SMAP            DEM
 ↓          ↓               ↓
24h/72h/7d Soil moisture  Elevation
                         Slope
                         TWI
 └──────────┬───────────────┘
            ↓
        Sentinel-2
            ↓
          NDVI
      NDVI Change
            ↓
 Historical events
            ↓
 Historical Count/Density
            ↓
 Spatial + temporal alignment
            ↓
      Quality checks
            ↓
      ML-ready dataset
```

### Important

**No manual environmental data entry.**

Python/GIS code should automatically extract these values.

---

# 9. Positive and Negative Samples

## Positive sample

A historical mapped landslide event:

```text
target = 1
```

## Negative sample

A carefully selected location/time without a mapped landslide event:

```text
target = 0
```

### Why are both needed?

A binary classifier must learn both:

```text
conditions where landslide occurred
                  +
conditions where landslide did not occur
                  ↓
             classification
```

### Practical first prototype strategy

A reasonable starting point is to generate negative samples from the same study region and relevant periods, while excluding locations/times that overlap known landslide events.

Maintain a documented sampling rule.

Avoid creating negatives from locations that are simply missing from the database and assuming that “not recorded” always means “did not happen”.

---

# 10. Prediction Horizon

The prediction horizon must be defined before creating the training labels.

Example:

```text
Prediction time T
       ↓
Use only information available by T
       ↓
Target = 1 if landslide occurs during
         T → T+24h
```

Alternative:

```text
T → T+72h
```

The same definition must be applied consistently to positive and negative samples.

---

# 11. Data Leakage Prevention

Data leakage means the model receives information that would not have been available at prediction time.

## Wrong

```text
Landslide occurs: 15 July
        ↓
Use satellite image from 16 July
        ↓
Train model to predict the 15 July event
```

This is future information.

## Correct

```text
Prediction time = T
        ↓
Use information available by T
        ↓
Predict future event window
```

### Pay special attention to

- rainfall after prediction time
- soil moisture after prediction time
- satellite imagery acquired after prediction time
- post-event NDVI
- historical count accidentally including the event being predicted
- future knowledge hidden in preprocessing

For an early-warning model:

> **Every feature must obey the same prediction-time cutoff.**

---

# 12. Final ML Dataset Schema

Recommended V1 schema:

| Column | Type | Meaning | Main source |
|---|---|---|---|
| latitude | float | Sample location | Historical inventory |
| longitude | float | Sample location | Historical inventory |
| prediction_time / date | datetime | Prediction cutoff | Historical/derived |
| rainfall_24h | float | Recent 24h rainfall | GPM IMERG / IMD |
| rainfall_72h | float | Recent 72h rainfall | GPM IMERG / IMD |
| rainfall_7d | float | Recent 7-day rainfall | GPM IMERG / IMD |
| soil_moisture | float | Soil wetness | SMAP/Earthdata |
| elevation | float | Height | Copernicus DEM |
| slope | float | Steepness | Derived from DEM |
| twi | float | Terrain wetness index | Derived from DEM |
| ndvi | float | Vegetation indicator | Sentinel-2 |
| ndvi_change | float | Vegetation change | Sentinel-2 |
| historical_landslide_count | integer/float | Nearby past events | ISRO/GSI/COOLR |
| target | integer | 0/1 label | Label construction |

The exact time windows, spatial radius, and matching rules must be recorded in the dataset metadata.

---

# 13. Training Features X and Target y

The model features are:

```text
X =
rainfall_24h
rainfall_72h
rainfall_7d
soil_moisture
elevation
slope
twi
ndvi
ndvi_change
historical_landslide_count
```

Target:

```text
y = target
```

where:

```text
target = 1 → positive landslide event
target = 0 → non-event sample
```

Latitude/longitude may be retained for GIS and auditing. Do not automatically assume that raw coordinates should be passed into the model; they can cause location memorization and poor geographic generalization.

---

# 14. Google Colab Training Architecture

Google Colab is the primary development environment for the first ML-training stage.

Recommended notebook sequence:

```text
01_data_inventory.ipynb
        ↓
02_rainfall_features.ipynb
        ↓
03_soil_moisture_features.ipynb
        ↓
04_dem_features.ipynb
        ↓
05_ndvi_features.ipynb
        ↓
06_dataset_builder.ipynb
        ↓
07_model_training.ipynb
        ↓
08_evaluation.ipynb
        ↓
09_shap.ipynb
        ↓
10_save_model.ipynb
```

---

# 15. Python Libraries

Typical first-version libraries:

```python
pandas
numpy
geopandas
rasterio
rioxarray
xarray
shapely
requests
scikit-learn
xgboost
matplotlib
shap
joblib
```

Depending on the chosen Copernicus access workflow, an appropriate Copernicus/openEO/Sentinel access library may also be used.

---

# 16. Candidate ML Models

Start with three models so that the team has a real baseline comparison.

## 16.1 Logistic Regression

Good baseline.

Advantages:

- simple
- fast
- interpretable
- useful for checking whether the feature set has signal

## 16.2 Random Forest

Useful for nonlinear relationships and interactions.

Advantages:

- strong tabular baseline
- handles nonlinear feature interactions
- relatively easy to interpret

## 16.3 XGBoost

A strong candidate for structured/tabular environmental features.

Use it as a main candidate, not as a guaranteed winner.

### Recommended experiment

```text
Same dataset
Same time-aware split
        ↓
Logistic Regression
Random Forest
XGBoost
        ↓
Compare metrics
        ↓
Select best validated model
```

---

# 17. Train / Validation / Test Strategy

Avoid using a random split as the only evidence of model quality.

### Preferred first approach

```text
Older historical period
        ↓
TRAIN

Later period
        ↓
VALIDATION

Newest held-out period
        ↓
TEST
```

Example:

```text
2018–2022 → train
2023      → validation
2024      → test
```

These years are only an example; use the periods actually supported by the final dataset.

### Geographic generalization

Where possible, perform an additional geographic holdout.

For example:

```text
Some locations/areas → training
Other held-out areas → testing
```

This checks whether the model learned general environmental relationships rather than memorizing specific coordinates.

---

# 18. Class Imbalance

Landslide cases are usually much rarer than non-landslide cases.

Therefore:

```text
95% non-event
5% event
```

could produce misleadingly high accuracy while missing actual landslides.

Discuss:

- careful negative sampling
- class weights
- threshold tuning
- precision/recall tradeoff

Do not judge the system using accuracy alone.

---

# 19. Evaluation Metrics

Report at least:

### Precision

Of the cases predicted positive, how many were actually positive?

### Recall

Of the actual positive events, how many did the model find?

For early warning, recall is especially important because missed landslides can be costly.

### F1-score

Balances precision and recall.

### ROC-AUC

Measures ranking/discrimination across thresholds.

### PR-AUC

Useful when positive events are rare.

### Confusion Matrix

Shows:

```text
True Positive
False Positive
True Negative
False Negative
```

### Calibration

Check whether predicted probabilities behave like meaningful probabilities.

### Not primary for Module 1

Do not use mAP as the primary metric. mAP is much more associated with object detection, such as Module 3.

---

# 20. Risk Probability and Risk Levels

The ML model can output:

```text
risk_probability = 0.87
```

Then the application can map probabilities to operational risk categories:

```text
0.00 ─────────────────────── 1.00
       ↓
NORMAL
WATCH
WARNING
DANGER
```

However:

> **The numerical thresholds must not be invented as official thresholds.**

They should be chosen using:

- validation data
- false-negative/false-positive tradeoff
- operational requirements
- domain/expert review
- calibration results

---

# 21. SHAP Explainability

SHAP is an explainability method.

It answers:

> **“Why did the model produce this prediction?”**

Example:

```text
risk_probability = 0.87

Major contributing features:
+ high rainfall_72h
+ high soil_moisture
+ high slope
+ high TWI
```

SHAP is **not another prediction model**.

It explains the trained model's output.

---

# 22. API / Data Source Architecture

| Source | Purpose | Module 1 use | Real-time? | Authentication? | Output |
|---|---|---|---|---|---|
| ISRO Landslide Atlas | Historical inventory | Training labels/history | No | Depends on access route | Events/locations/attributes |
| NASA GPM IMERG | Precipitation | Historical rainfall / backtesting | Early/Late near-real-time; Final higher latency | Access method dependent | Precipitation |
| IMD API | Current/forecast weather | Operational rainfall/weather | Operational/current services | Account/endpoint dependent | Weather/forecast/rainfall |
| NASA SMAP / Earthdata | Soil moisture | Soil feature | Time-based satellite/model observations | Earthdata credentials where required | Soil moisture |
| Copernicus Data Space / Sentinel-2 | Satellite data | NDVI / vegetation change | Periodic observations | Authentication for protected access workflows | Satellite bands/products |
| Copernicus DEM | Terrain | Elevation | No | Access method dependent | DEM raster |
| GSI/NLSM | Geological/historical support | Optional future features / validation | No | Depends on source | GIS/geological data |
| NASA COOLR | Independent historical events | Optional validation/history | No | Depends on access route | Event records |
| OSM/Nominatim | Map/geocoding | Mostly GIS support | Service-dependent | Public service has usage restrictions | Places/roads |
| OSRM | Routing | Mostly impact analysis | Operational service | Depends on deployment | Routes/connectivity |
| Census India | Population | Impact/exposure | No | Public API; higher-volume access may require key/token | Population |

The project architecture distinguishes datasets from APIs and treats DEM-derived variables and NDVI as **derived features**, not separate APIs.

---

# 23. API Credential Setup

## 23.1 IMD

IMD currently provides an official API management portal for real-time weather observations, forecasts, warnings and specialized bulletins.

Official portal:

https://api.imd.gov.in/public/

The current portal exposes account registration/login and API exploration. Authentication requirements depend on the particular service/endpoint being used.

Recommended approach:

```text
Create/use IMD account
        ↓
Obtain required credential/token if the selected endpoint needs it
        ↓
Store securely in Colab Secret
        ↓
Use from Python
```

Official references:

- https://api.imd.gov.in/public/
- https://api.imd.gov.in/public/api_reference.html

---

## 23.2 NASA Earthdata / SMAP

Earthdata Login is used for protected NASA Earth science data workflows.

Current Earthdata Login documentation supports user tokens. As documented by NASA in July 2026, user tokens are valid for 60 days and can be generated/managed in Earthdata Login.

Official:

https://urs.earthdata.nasa.gov/

Documentation:

https://urs.earthdata.nasa.gov/documentation/for_users/user_token

Store the token in Colab Secrets.

---

## 23.3 NASA GPM IMERG

GPM provides precipitation products including IMERG.

Current NASA documentation identifies:

- Early Run
- Late Run
- Final Run

NASA describes Early Run as the lower-latency choice and Final Run as the research-quality product with higher latency.

For the training dataset:

```text
Use a finalized/research-appropriate historical product
```

For near-real-time operations:

```text
Use an appropriate lower-latency product
```

Official:

https://gpm.nasa.gov/data/imerg

---

## 23.4 Copernicus Data Space / Sentinel-2

Copernicus Data Space provides APIs for data access, including Sentinel-2.

The current documentation lists access-token APIs and OAuth/openEO client-credentials authentication.

For machine-to-machine workflows:

```text
client_id
client_secret
        ↓
access token
        ↓
Sentinel-2 data access
```

Official documentation:

https://documentation.dataspace.copernicus.eu/APIs.html

Client credentials documentation:

https://documentation.dataspace.copernicus.eu/APIs/openEO/authentication/client_credentials.html

---

## 23.5 Copernicus DEM

DEM access depends on the chosen Copernicus delivery method.

The architecture should treat:

```text
Copernicus DEM
       ↓
download/access DEM
       ↓
local raster
       ↓
terrain calculations
```

Do not create separate APIs for elevation, slope and TWI.

---

## 23.6 OSM / Nominatim

Nominatim is primarily for geocoding/search.

For the public OSMF Nominatim service, the current policy requires:

- maximum 1 request per second
- a valid identifying User-Agent or Referer
- attribution
- no uncontrolled systematic/bulk queries

Official:

https://operations.osmfoundation.org/policies/nominatim/

For Module 1, if the historical dataset already contains latitude/longitude, do not bulk reverse-geocode every row just to get a place name.

---

## 23.7 Census India

The current Government of India Census API documentation says normal public API use does not require a key, while higher-volume legitimate usage can request a key/token.

Official:

https://censusindia.gov.in/census.website/en/data/api/request-key

Census is primarily an impact/exposure source, not a core V1 Module 1 predictor.

---

# 24. Google Colab Secret Management

Use Colab Secrets or environment variables.

Example:

```python
from google.colab import userdata

EARTHDATA_TOKEN = userdata.get("EARTHDATA_TOKEN")
CDSE_CLIENT_ID = userdata.get("CDSE_CLIENT_ID")
CDSE_CLIENT_SECRET = userdata.get("CDSE_CLIENT_SECRET")
IMD_API_KEY = userdata.get("IMD_API_KEY")
```

### Rules

Never:

```python
SECRET = "my-real-password"
```

Never:

- commit secrets to GitHub
- put credentials inside CSV files
- put credentials in public notebooks
- print secrets into logs

Use:

```text
Colab Secret
    ↓
Python variable
    ↓
API request
```

---

# 25. Batch Data Processing Strategy

Do not design the training pipeline as:

```text
Row 1 → API call
Row 2 → API call
Row 3 → API call
...
Row 100000 → API call
```

This is slow and fragile.

Prefer:

```text
Historical event inventory
        ↓
Determine required spatial/temporal coverage
        ↓
Batch download data
        ↓
Store files locally / Drive / cloud storage
        ↓
Process raster/gridded data
        ↓
Extract values at event/non-event locations
        ↓
Build final dataset
```

This is also more reproducible.

---

# 26. Module 1 Training Flow Diagram

```text
                  START
                    ↓
          Historical inventory
                    ↓
        Positive + negative samples
                    ↓
          Prediction cutoff = T
                    ↓
      ┌─────────────┼─────────────┐
      ↓             ↓             ↓
   Rainfall       SMAP           DEM
      ↓             ↓             ↓
  24h/72h/7d    Soil moisture  Elevation
                                 Slope
                                  TWI
      └─────────────┼─────────────┘
                    ↓
                Sentinel-2
                    ↓
              NDVI / NDVI change
                    ↓
         Historical context
                    ↓
     Spatial + temporal alignment
                    ↓
            Data quality checks
                    ↓
            ML-ready dataset
                    ↓
       Time-aware train/validation/test
                    ↓
       Logistic / RF / XGBoost
                    ↓
             Model evaluation
                    ↓
            Select best model
                    ↓
             Save model artifact
```

---

# 27. Module 1 Prediction Flow Diagram

```text
              New location
                   ↓
          latitude + longitude
                   ↓
           Prediction time T
                   ↓
     ┌─────────────┼─────────────┐
     ↓             ↓             ↓
Current/forecast  Latest      Static terrain
rainfall          soil data
     ↓             ↓             ↓
  24h/72h/7d   soil moisture   elevation
                                slope
                                 TWI
     └─────────────┼─────────────┘
                   ↓
          Latest valid satellite
                   ↓
             NDVI / change
                   ↓
       Historical landslide context
                   ↓
            Feature engineering
                   ↓
              Saved ML model
                   ↓
          Risk probability
                   ↓
             Risk level
                   ↓
                 SHAP
                   ↓
                  GIS
                   ↓
                Alert
```

---

# 28. Complete SANKET Architecture

```text
                 DATA SOURCES
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
     Weather        Satellite      History
     /Rainfall      /DEM           /Events
        │             │             │
        └─────────────┼─────────────┘
                      ↓
             Data Ingestion
                      ↓
             Storage / ETL
                      ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
    Module 1       Module 2       Module 3
    ML Risk        Visual          Road /
    Prediction     Evidence       Obstruction
        │             │             │
        └─────────────┼─────────────┘
                      ↓
                    GIS
                      ↓
                Risk Fusion
                      ↓
               Impact Analysis
                      ↓
                   SHAP
                      ↓
                Final Risk
                      ↓
                 Alerts
                      ↓
        Authorities / Communities
                      ↑
               Field Feedback
```

---

# 29. Module Interaction Architecture

```text
Module 1
"How risky?"
     │
     │ risk probability
     ↓
Risk Fusion ← Module 2
     ↑            "Visual evidence?"
     │
     │
Module 3
"Road affected?"
     │
     ↓
GIS
     │
     ├── Roads
     ├── Villages
     ├── Infrastructure
     └── Connectivity
             ↓
        Impact Analysis
             ↓
          SHAP / Explanation
             ↓
          Final Risk
             ↓
            Alert
```

---

# 30. Recommended Project Folder Structure

```text
SANKET_Module1/
│
├── data/
│   ├── raw/
│   ├── intermediate/
│   └── final/
│
├── notebooks/
│   ├── 01_data_inventory.ipynb
│   ├── 02_rainfall_features.ipynb
│   ├── 03_soil_moisture_features.ipynb
│   ├── 04_dem_features.ipynb
│   ├── 05_ndvi_features.ipynb
│   ├── 06_dataset_builder.ipynb
│   ├── 07_model_training.ipynb
│   ├── 08_evaluation.ipynb
│   ├── 09_shap.ipynb
│   └── 10_save_model.ipynb
│
├── src/
│   ├── rainfall.py
│   ├── soil_moisture.py
│   ├── dem.py
│   ├── satellite.py
│   ├── historical_context.py
│   ├── feature_engineering.py
│   ├── dataset_builder.py
│   └── inference.py
│
├── models/
│   └── module1_model.pkl
│
├── outputs/
│   ├── metrics/
│   ├── plots/
│   └── shap/
│
└── README.md
```

---

# 31. Implementation Roadmap

## Phase 1 — Historical Dataset

- Obtain/prepare historical landslide inventory.
- Standardize latitude/longitude.
- Standardize date/time.
- Define event representation.
- Document source/version/access date.

## Phase 2 — Feature Extraction

- Extract rainfall.
- Extract soil moisture.
- Extract DEM values.
- Calculate slope.
- Calculate TWI.
- Extract Sentinel-2 observations.
- Calculate NDVI and NDVI change.
- Calculate historical landslide count/density.

## Phase 3 — ML Dataset

- Generate negative samples.
- Apply temporal cutoff.
- Align locations and times.
- Handle missing values.
- Run quality checks.
- Save final ML dataset.

## Phase 4 — Model Training

- Create X and y.
- Train Logistic Regression.
- Train Random Forest.
- Train XGBoost.

## Phase 5 — Evaluation

- Use time-aware validation.
- Compare Precision/Recall/F1.
- Check PR-AUC and ROC-AUC.
- Inspect confusion matrix.
- Check probability calibration.

## Phase 6 — SHAP

- Explain test predictions.
- Identify influential features.
- Generate summary and local explanations.

## Phase 7 — Live Inference

- Connect operational weather/soil sources.
- Retrieve latest suitable satellite information.
- Reuse static terrain layers.
- Run feature engineering.
- Run saved model.
- Generate risk probability and risk category.

## Phase 8 — GIS Integration

- Send risk result to GIS.
- Overlay roads/villages/infrastructure.
- Combine with Module 2 and Module 3.
- Run impact analysis.
- Trigger alerts.

---

# 32. Common Mistakes to Avoid

## 1. Data leakage

Do not use future weather or post-event imagery.

## 2. Only-positive training data

A classifier needs both positive and negative examples.

## 3. Random split only

Time-aware validation is more appropriate for a time-dependent early-warning problem.

## 4. Accuracy-only evaluation

Accuracy can hide missed landslides in an imbalanced dataset.

## 5. Manually entering environmental values

Do not manually fill thousands of rainfall/soil/terrain values.

Automate extraction.

## 6. Treating derived variables as APIs

```text
DEM → elevation/slope/TWI
Sentinel-2 → NDVI
```

These are derived calculations.

## 7. Assuming satellite data is true real-time

Satellite observations are periodic and may have latency/cloud limitations.

## 8. Hardcoding credentials

Use Colab Secrets.

## 9. Mixing training-time and inference-time information

The feature-generation rules used during training must match the rules used during prediction.

## 10. Using raw coordinates blindly

Latitude/longitude are useful for spatial processing and GIS, but raw coordinates can encourage location memorization if used directly as ML features.

---

# 33. Final End-to-End Example

Suppose the historical inventory contains:

```text
latitude  = 27.10
longitude = 88.45
date      = 2021-07-15
target    = 1
```

### Step 1 — Rainfall

```text
rainfall_24h = 85
rainfall_72h = 190
rainfall_7d  = 320
```

### Step 2 — Soil

```text
soil_moisture = 0.41
```

### Step 3 — DEM

```text
elevation = 1620
slope     = 34
twi       = 8.3
```

### Step 4 — Satellite

```text
ndvi        = 0.62
ndvi_change = -0.10
```

### Step 5 — Historical context

```text
historical_landslide_count = 5
```

### Final ML row

```text
latitude                  = 27.10
longitude                 = 88.45
prediction_time           = 2021-07-15
rainfall_24h              = 85
rainfall_72h              = 190
rainfall_7d               = 320
soil_moisture             = 0.41
elevation                 = 1620
slope                     = 34
twi                       = 8.3
ndvi                      = 0.62
ndvi_change               = -0.10
historical_landslide_count= 5
target                    = 1
```

The values above are **illustrative examples**, not measured values for a real location.

Then:

```text
ML features
     ↓
XGBoost / Random Forest / Logistic Regression
     ↓
risk_probability = example 0.87
     ↓
risk category
     ↓
SHAP explanation
     ↓
GIS
```

---

# 34. Beginner Summary

Think of Module 1 as a **landslide report card**.

For every location, the computer gets clues:

```text
🌧️ How much did it rain?
💧 How wet is the soil?
⛰️ How high is the place?
⛰️ How steep is the slope?
💧 Does the terrain tend to stay wet?
🌱 What is the vegetation condition?
🌱 Has vegetation changed?
📍 Has this area had landslides before?
```

Then the ML model learns from thousands of historical examples.

```text
Past examples
     ↓
Learn patterns
     ↓
New location
     ↓
New conditions
     ↓
Risk probability
```

The most important mental model is:

> **Raw historical inventory → automatically add environmental features → create ML-ready dataset → train model → use current/forecast information → predict risk.**

---

# 35. Judge Explanation

## 30-second explanation

> “Module 1 is SANKET's landslide risk prediction engine. We take historical landslide events and automatically attach rainfall, soil moisture, terrain and satellite-derived features for the corresponding location and time. We then train a tabular ML model to learn the relationship between these conditions and landslide events. During operation, current or forecast conditions are passed to the trained model to estimate risk probability, which is then explained using SHAP and shown on the GIS dashboard.”

## 1-minute explanation

> “The historical landslide inventory only tells us where and when events occurred. We enrich each historical sample using NASA GPM IMERG rainfall, NASA SMAP soil moisture, Copernicus DEM-derived elevation, slope and TWI, Sentinel-2-derived NDVI and NDVI change, and historical landslide context. We also create carefully defined non-event samples. After temporal and spatial alignment and leakage checks, we train and compare Logistic Regression, Random Forest and XGBoost in Google Colab using time-aware validation. We evaluate recall, precision, F1, PR-AUC, ROC-AUC and calibration. The best validated model is saved and later used with current/forecast information for operational risk prediction.”

## Technical explanation

> “Module 1 is a supervised binary classification problem with a defined forward prediction horizon. The training table contains environmental/geospatial features aligned to a prediction cutoff, with `target=1` for a future landslide event in the defined prediction window and `target=0` for an eligible non-event sample. The pipeline performs temporal and spatial feature extraction, quality control, leakage prevention and time-aware validation. Candidate models include Logistic Regression, Random Forest and XGBoost. The selected model outputs a probability score that is calibrated and thresholded into operational risk classes, while SHAP provides local/global feature attribution.”

---

# References and Official Sources

### Project architecture source

The project specification defines:

- SANKET's NER landslide early-warning objective
- three-module structure
- primary and fallback data sources
- derived terrain/NDVI features
- GIS/impact/alert architecture

### Current official data/service references

- **IMD API Management:** https://api.imd.gov.in/public/
- **IMD API Reference:** https://api.imd.gov.in/public/api_reference.html
- **NASA GPM IMERG:** https://gpm.nasa.gov/data/imerg
- **NASA GPM Data Directory:** https://gpm.nasa.gov/data/directory
- **NASA Earthdata Login:** https://urs.earthdata.nasa.gov/
- **Earthdata User Tokens:** https://urs.earthdata.nasa.gov/documentation/for_users/user_token
- **NASA Worldview / SMAP:** https://worldview.earthdata.nasa.gov/
- **Copernicus Data Space APIs:** https://documentation.dataspace.copernicus.eu/APIs.html
- **Copernicus openEO Client Credentials:** https://documentation.dataspace.copernicus.eu/APIs/openEO/authentication/client_credentials.html
- **OpenStreetMap Nominatim Usage Policy:** https://operations.osmfoundation.org/policies/nominatim/
- **Census India API Key:** https://censusindia.gov.in/census.website/en/data/api/request-key

---

# Final End-to-End Mental Model

```text
          HISTORICAL DATA
                ↓
       lat + lon + date/time
                ↓
    ┌───────────┼────────────┐
    ↓           ↓            ↓
 Rainfall     Soil         DEM
    ↓        Moisture        ↓
 24h/72h/7d                   ├── Elevation
                             ├── Slope
                             └── TWI
                ↓
           Sentinel-2
                ↓
        NDVI / NDVI Change
                ↓
     Historical Landslide
           Context
                ↓
      Positive + Negative
           Samples
                ↓
       ML-READY DATASET
                ↓
       TRAIN / VALIDATE
                ↓
      Logistic / RF / XGBoost
                ↓
          SAVED MODEL
                ↓
       CURRENT / FORECAST
            CONDITIONS
                ↓
        RISK PROBABILITY
                ↓
         RISK LEVEL
                ↓
             SHAP
                ↓
              GIS
                ↓
            ALERT
                ↓
       FIELD FEEDBACK
                ↓
             SANKET
```
