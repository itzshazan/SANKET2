# SANKET — Complete Project, Module 1, Training Plan, APIs, and Architecture

## 1. SANKET in one paragraph

**SANKET** is an AI-powered early-warning and monitoring platform for landslides in the North Eastern Region (NER). The system combines historical landslide records, rainfall, soil moisture, terrain/DEM information, satellite imagery, GIS road and settlement data, AI/ML, computer vision, and field reports to detect and predict hazardous conditions. **Module 1** predicts how risky a location is using environmental and terrain features; **Module 2** analyzes satellite/remote-sensing imagery for visual evidence of landslide scars; **Module 3** analyzes field/citizen road photographs with GPS to detect road obstructions and classify road status; the GIS layer puts all results on a map and checks nearby roads, villages, and infrastructure; a risk-fusion layer combines the evidence; SHAP explains why Module 1 assigned a high or low risk; and the alert layer converts the result into operational warnings for authorities and communities. The intended high-level flow is **Data → AI/CV → GIS → Risk Fusion → Impact Analysis → Alert → Field Feedback**. The system is designed for real-world use with web/mobile access, low-network/offline considerations, and automated warning delivery.

---

# 2. My assigned module: Module 1 — Landslide Risk Prediction

## 2.1 What Module 1 does

The main question of Module 1 is:

> **“How risky is this location for a landslide?”**

Module 1 is **not** an image detector. It is a **tabular ML risk-prediction model**.

Example:

For a location:

- Latitude = 27.10
- Longitude = 88.45
- Prediction time = 2026-09-05 12:00
- Recent rainfall = high
- 3-day rainfall = very high
- 7-day rainfall = high
- Soil moisture = high
- Slope = steep
- Elevation = high
- TWI = high
- NDVI = decreasing
- Historical landslides nearby = several

The model may output:

```text
Risk probability = 0.87
Risk class       = DANGER
```

The important point is that the model learns this relationship from **historical examples**.

---

# 3. What exactly you have to do for Module 1

Your Module 1 work can be divided into these stages:

```text
1. Collect historical landslide locations/events
                 ↓
2. Build historical ML dataset
                 ↓
3. Attach rainfall to each historical sample
                 ↓
4. Attach soil moisture
                 ↓
5. Attach terrain features from DEM
                 ↓
6. Attach satellite/vegetation features
                 ↓
7. Create positive + negative samples
                 ↓
8. Clean and align the data by location + time
                 ↓
9. Train ML model in Google Colab
                 ↓
10. Validate and tune the model
                 ↓
11. Save trained model
                 ↓
12. Deploy inference pipeline
                 ↓
13. Current/future weather + static terrain
                 ↓
14. Model predicts risk probability
                 ↓
15. SHAP explains the prediction
                 ↓
16. Send risk result to GIS / alert system
```

The existing project specification defines Module 1 as the ML risk-prediction component, while Module 2 is visual landslide evidence and Module 3 is road-impact detection. [Project source]

---

# 4. The most important part: your model training task

## 4.1 You do NOT directly train on latitude, longitude and date alone

Your historical landslide file may look like:

| latitude | longitude | date | landslide |
|---:|---:|---|---:|
| 27.1001 | 88.4502 | 2021-07-15 | 1 |
| 26.9124 | 91.2033 | 2020-08-08 | 1 |
| 25.9802 | 91.7712 | 2022-06-20 | 1 |

This is only your starting point.

From:

```text
latitude + longitude + date
```

your data pipeline obtains the environmental and geospatial features needed by the ML model.

For example:

```text
Latitude
Longitude
Date
     ↓
Feature extraction / feature engineering
     ↓
Rainfall
Soil moisture
Elevation
Slope
Aspect
Curvature
TWI
NDVI
NDVI change
Historical landslide density/count
...
     ↓
Final ML training table
```

---

# 5. What the final training dataset should look like

A practical first version could contain columns such as:

```text
latitude
longitude
date
rainfall_24h
rainfall_72h
rainfall_7d
max_rainfall_1h
soil_moisture
elevation
slope
aspect
curvature
twi
flow_accumulation
ndvi
ndvi_change
historical_landslide_count
distance_to_previous_landslide
target
```

Where:

- `target = 1` → landslide/event condition
- `target = 0` → non-landslide/non-event sample

The exact feature list is still a design decision and should be finalized after checking data availability and leakage risk.

---

# 6. Historical landslide data — your label source

The project specification identifies:

- **ISRO Landslide Atlas** → primary historical landslide inventory
- **GSI/NLSM** → additional landslide/geological information
- **NASA COOLR** → independent historical records

These should be treated as **datasets/inventories**, not as “API keys”. [Project source]

Important correction:

> Use **ISRO Landslide Atlas** when referring to the Indian historical landslide inventory. It is not a “NASA Landslide Atlas”.

The ISRO inventory is the source from which you can obtain historical event locations and timing/attributes, depending on the data product/access method.

---

# 7. Positive and negative samples

This is one of the most important ML tasks in your module.

## Positive samples

Historical landslide events:

```text
target = 1
```

Example:

```text
27.10, 88.45, 2021-07-15, target=1
```

## Negative samples

You also need examples of places/times where a landslide did **not** occur:

```text
target = 0
```

For example, you may sample locations in the same region and time windows without a mapped landslide event, using a carefully defined sampling strategy.

This is a critical design step because a dataset containing only landslide points cannot train a normal binary classifier.

---

# 8. Very important: define what the model is predicting

Before training, your team must decide the prediction target.

For example:

### Option A

> Predict whether a landslide will occur in the next 24 hours.

Then:

```text
prediction_time = T
features ≤ T
target = landslide during T → T+24h
```

### Option B

> Predict whether a landslide will occur in the next 72 hours.

Then:

```text
prediction_time = T
features ≤ T
target = landslide during T → T+72h
```

For an **early-warning system**, a future prediction horizon such as 24–72 hours is conceptually stronger than simply predicting whether a historical event already happened.

The project specification does not yet fix this exact horizon, so you should document the chosen horizon as a project decision.

---

# 9. Data leakage — very important

Never give the model information that would only become available **after** the event you are trying to predict.

Wrong:

```text
Landslide happens on 15 July
↓
Use satellite image from 16 July that clearly shows the landslide
↓
Train model to predict the 15 July event
```

That leaks future information.

Correct principle:

```text
Prediction time = T

Use information available at or before T
                    ↓
                predict
                    ↓
future event window
```

This is especially important for rainfall, soil moisture, and satellite features.

---

# 10. Terrain: is it real-time?

Usually, **no**.

Terrain is primarily a spatial/static property derived from a DEM.

For example:

```text
DEM
 ↓
Elevation
Slope
Aspect
Curvature
Flow accumulation
TWI
```

The same location normally does not suddenly have a completely different elevation every hour.

Therefore:

```text
Location → terrain features
```

while:

```text
Location + time → rainfall
Location + time → soil moisture
Location + time/observation → satellite vegetation features
```

The existing project data specification explicitly treats DEM-derived terrain features as derived data and does not require separate APIs for slope/TWI/etc. [Project source]

---

# 11. What is NDVI?

**NDVI = Normalized Difference Vegetation Index**

It is a satellite-derived indicator of vegetation/greenness.

The common formula is:

```text
NDVI = (NIR - Red) / (NIR + Red)
```

where:

- **NIR** = near-infrared reflectance
- **Red** = red-band reflectance

General interpretation:

```text
Higher NDVI → more/healthier vegetation
Lower NDVI  → less vegetation / bare / disturbed surface
```

In SANKET, NDVI can be used as a feature.

More useful than only one NDVI value can be **change in NDVI**:

```text
NDVI_change = current/recent NDVI - historical/baseline NDVI
```

A sudden vegetation change may be useful as a supporting signal, but **NDVI itself is not a landslide detector**.

The project data specification proposes deriving NDVI from Sentinel-2 and vegetation change from Sentinel-2 time information. [Project source]

---

# 12. APIs/services needed for Module 1

## 12.1 Primary data/services

| Requirement | Primary source | Role in Module 1 |
|---|---|---|
| Historical landslides | ISRO Landslide Atlas | Training labels / historical events |
| Historical rainfall | NASA GPM IMERG | Training + backtesting |
| Current rainfall / forecast | IMD APIs | Operational risk inference |
| Soil moisture | NASA SMAP / Earthdata | Moisture/wetness feature |
| Satellite imagery | Copernicus Data Space / Sentinel-2 | NDVI and vegetation change |
| Terrain | Copernicus DEM | Elevation/slope/etc. |
| Historical geological information | GSI/NLSM | Optional supporting feature |
| Independent event records | NASA COOLR | Validation / additional historical evidence |

The project specification identifies IMD, GPM IMERG, SMAP, Copernicus Data Space/Sentinel-2 and Copernicus DEM as the main data/services for the architecture. [Project source]

---

# 13. Do all of these require API keys?

## 13.1 Important distinction

Not every data source uses an “API key”.

There are several authentication patterns:

```text
A. No key / public endpoint
B. Username + password
C. Access token
D. Client ID + client secret
E. API key/token issued after registration
```

So your architecture should say:

> **Credentials / authentication**, not “API key for everything”.

---

# 14. Authentication plan for Module 1

## A. IMD

The current IMD API platform provides weather forecast, current weather, nowcast, warnings, rainfall, and AWS/ARG endpoints. [Official IMD API documentation]

For your project, use it mainly for:

```text
Current rainfall/weather
Forecast rainfall/weather
Warnings
```

Official portal:

```text
https://api.imd.gov.in/public/
```

The current API reference lists district rainfall, current weather, station data, forecasts and warning APIs. [Official IMD API documentation]

### Configuration concept in Colab

Keep credentials out of model code:

```python
import os

IMD_API_KEY = os.getenv("IMD_API_KEY")
```

If the IMD service endpoint you use requires a token/key for the selected service, store that token in Colab Secrets or an environment variable rather than hardcoding it.

---

# 15. NASA Earthdata — SMAP and NASA data access

NASA Earthdata uses an Earthdata Login account for protected data access. GES DISC documentation states that downloading data requires Earthdata Login. [NASA Earthdata]

Current Earthdata Login documentation also supports generating user tokens; tokens have a limited validity period and can be managed from the Earthdata account interface. [NASA Earthdata]

### Setup

1. Create an Earthdata Login account.
2. Accept/authorize access if a selected service asks for application authorization.
3. Generate the required token/credential for the workflow you are using.
4. Store it in Colab Secrets.

Example pattern:

```python
from google.colab import userdata

EARTHDATA_TOKEN = userdata.get("EARTHDATA_TOKEN")
```

Do not place the actual token directly in the notebook.

---

# 16. NASA GPM IMERG

For historical rainfall training, your team has selected **NASA GPM IMERG**.

Use it to derive features such as:

```text
rainfall_24h
rainfall_72h
rainfall_7d
maximum rainfall in recent windows
cumulative rainfall
```

The important design idea is:

```text
Landslide sample
(lat, lon, date)
       ↓
Query historical precipitation data
       ↓
Calculate rainfall windows
       ↓
Attach values to the sample
```

For large historical training, it is generally better to download/process the required gridded data in batches rather than making one remote request for every Excel row.

---

# 17. NASA SMAP

SMAP provides soil-moisture-related Earth observation products.

Your pipeline should conceptually do:

```text
historical sample
(lat, lon, date)
       ↓
find matching SMAP observation/product
       ↓
extract soil moisture at/around location
       ↓
append soil_moisture column
```

This is a time-dependent feature, unlike basic DEM terrain.

---

# 18. Copernicus Data Space / Sentinel-2

Sentinel-2 is your satellite source for vegetation features.

The Copernicus Data Space Ecosystem provides catalogue and data-access APIs. Public catalogue discovery is possible without login, while data download/processing requires authentication. [Copernicus Data Space documentation]

For machine-to-machine usage, Copernicus documents OAuth client credentials using:

```text
client_id
client_secret
```

[Copernicus Data Space authentication documentation]

### Recommended setup

Create your Copernicus Data Space account and OAuth client.

Keep:

```python
CDSE_CLIENT_ID
CDSE_CLIENT_SECRET
```

in Colab Secrets.

Then retrieve an access token when needed.

Never hardcode the secret in the notebook.

---

# 19. Copernicus DEM

DEM is used to derive:

```text
elevation
slope
aspect
curvature
TWI
flow accumulation
```

There is a conceptual difference here:

> You do not need a separate “Slope API”.

You get a DEM and calculate terrain variables locally.

Example:

```text
Copernicus DEM
      ↓
Raster processing
      ↓
Elevation / Slope / Aspect / Curvature / TWI
```

The project source explicitly recommends treating these as derived data. [Project source]

---

# 20. Nominatim

Nominatim is mainly useful for:

```text
place name ↔ coordinates
```

It is not necessary if your Module 1 input already contains latitude/longitude.

The public Nominatim service has strict usage rules, including an absolute maximum of 1 request/second, an identifying User-Agent/Referer, caching, and restrictions on systematic/bulk queries. [OpenStreetMap Nominatim Usage Policy]

Therefore:

> Do not use public Nominatim as a high-volume batch geocoder for the training dataset.

For your Module 1 pipeline, prefer existing latitude/longitude from the landslide inventory.

---

# 21. OSRM

OSRM is mostly relevant later for:

```text
road connectivity
alternate routes
```

It is more important for GIS / Module 3 impact analysis than for the core Module 1 training model.

You therefore do **not** need OSRM to train the initial Module 1 classifier.

---

# 22. Census India

Census data is mainly used for population/exposure analysis.

That is not a core Module 1 feature in the first version.

The current Government of India Census API page says the public API can be used without a key within its public limits, while legitimate higher-volume use can request a key/token. [Government of India Census API]

So treat Census authentication as:

```text
No key for normal public usage
↓
key/token only if higher-volume access is required and approved
```

---

# 23. Recommended Module 1 API strategy

## Training phase

Do **not** build your training notebook like this:

```text
Row 1 → API
Row 2 → API
Row 3 → API
...
Row 100,000 → API
```

That can be slow, fragile, and difficult to reproduce.

Instead:

```text
Historical sources
      ↓
Batch download
      ↓
Local/cloud storage
      ↓
Feature extraction
      ↓
Feature dataset
      ↓
Train model
```

Then save:

```text
module1_training_data.parquet
```

or

```text
module1_training_data.csv
```

## Deployment phase

For a live prediction:

```text
Current location
      +
Current/forecast weather
      +
Latest soil-moisture information
      +
Static terrain
      +
Latest valid satellite features
      ↓
Feature engineering
      ↓
Trained model
      ↓
Risk probability
```

---

# 24. Google Colab training architecture

Yes — **Google Colab is a good environment for the Module 1 training stage**.

Your initial work can be:

```text
Google Colab
│
├── 01_setup.ipynb
├── 02_load_landslide_inventory.ipynb
├── 03_extract_rainfall.ipynb
├── 04_extract_soil_moisture.ipynb
├── 05_extract_dem_features.ipynb
├── 06_extract_ndvi.ipynb
├── 07_build_training_dataset.ipynb
├── 08_train_models.ipynb
├── 09_evaluate.ipynb
└── 10_save_model.ipynb
```

You can later combine these into a cleaner Python package.

---

# 25. What libraries you will likely use in Colab

Typical stack:

```python
pandas
numpy
geopandas
rasterio
xarray
rioxarray
shapely
requests
scikit-learn
xgboost
matplotlib
seaborn
shap
joblib
```

Depending on the satellite workflow, you may also use:

```python
openeo
sentinelhub
```

or another Copernicus-supported access approach.

---

# 26. Module 1 model candidates

Start simple.

## Model 1 — Logistic Regression

Good baseline.

```text
Pros:
- simple
- interpretable
- fast
- good baseline
```

## Model 2 — Random Forest

Good first practical tree model.

```text
Pros:
- handles nonlinear relationships
- robust
- easy to train
- useful feature importance
```

## Model 3 — XGBoost / LightGBM

Usually a strong choice for structured/tabular environmental data.

```text
Pros:
- strong performance
- nonlinear relationships
- handles interactions
- efficient on tabular datasets
```

### Recommended first experiment

Train:

```text
Logistic Regression
Random Forest
XGBoost
```

Then compare them using the same validation protocol.

---

# 27. What is your actual ML task?

Conceptually:

```text
INPUT X
---------------------------------
rainfall_24h
rainfall_72h
rainfall_7d
soil_moisture
elevation
slope
aspect
curvature
twi
ndvi
ndvi_change
historical_landslide_context
---------------------------------

TARGET y
---------------------------------
0 = no event
1 = landslide event
---------------------------------
```

The model learns:

```text
X → probability of landslide
```

Example:

```text
Model output:
0.08
```

means the model estimates a low probability.

Another location:

```text
Model output:
0.91
```

means a high estimated probability.

The actual risk categories such as:

```text
NORMAL
WATCH
WARNING
DANGER
```

should be created by selecting thresholds based on validation and operational requirements. The project architecture already proposes these four levels, but the exact numerical thresholds are not fixed yet.

---

# 28. Evaluation — what you should report

For Module 1, report at least:

```text
Precision
Recall
F1-score
ROC-AUC
PR-AUC
Confusion Matrix
```

Accuracy alone should not be your main metric because landslide-event datasets can be imbalanced.

For an early-warning system, **recall for actual landslide events is especially important**, but you must also monitor false alarms.

Do not use **mAP** as the main Module 1 metric. mAP is primarily associated with object-detection tasks such as the project's Module 3.

---

# 29. Train/validation/test split

Do not blindly use:

```python
train_test_split(..., random_state=42)
```

and assume the result is reliable.

For this project, a better starting strategy is **time-aware validation**.

Example:

```text
2018–2022 → training
2023      → validation
2024      → test
```

Exact years depend on the available historical data.

Also consider geographical generalization:

```text
Some areas → train
Held-out areas → test
```

This checks whether the model works outside the exact locations it memorized.

---

# 30. Final Module 1 inference

After training:

```text
Current location
      ↓
latitude / longitude
      +
current or forecast rainfall
      +
soil moisture
      +
static terrain
      +
latest suitable satellite feature
      +
historical landslide context
      ↓
Feature engineering
      ↓
Saved ML model
      ↓
Risk probability
      ↓
Risk category
      ↓
SHAP explanation
      ↓
GIS
      ↓
Alert system
```

Example output:

```json
{
  "latitude": 27.1001,
  "longitude": 88.4502,
  "risk_probability": 0.87,
  "risk_level": "DANGER"
}
```

---

# 31. SHAP in Module 1

SHAP answers:

> **“Why did the model say this location is high risk?”**

Example explanation:

```text
Risk probability = 0.87

Main contributors:
+ high 72-hour rainfall
+ steep slope
+ high soil moisture
+ high TWI
- stable vegetation signal
```

This makes the ML result easier for authorities to understand.

---

# 32. Full system architecture

## High-level architecture

```text
                ┌─────────────────────────────┐
                │       DATA SOURCES          │
                │                             │
                │ IMD                         │
                │ NASA GPM IMERG              │
                │ NASA SMAP                   │
                │ Sentinel-2 / Copernicus     │
                │ Copernicus DEM              │
                │ ISRO Landslide Atlas        │
                │ GSI/NLSM / COOLR            │
                │ OSM / Census                │
                └──────────────┬──────────────┘
                               ↓
                ┌─────────────────────────────┐
                │   DATA INGESTION & STORAGE  │
                │                             │
                │ ETL / preprocessing         │
                │ validation                  │
                │ temporal alignment           │
                │ spatial alignment            │
                └──────────────┬──────────────┘
                               ↓
          ┌────────────────────┼────────────────────┐
          ↓                    ↓                    ↓
┌────────────────┐   ┌────────────────┐   ┌────────────────┐
│ MODULE 1       │   │ MODULE 2       │   │ MODULE 3       │
│ ML Risk        │   │ Landslide      │   │ Road/Obstacle  │
│ Prediction     │   │ Visual/Scar    │   │ Detection      │
│                │   │ Detection      │   │                │
└───────┬────────┘   └───────┬────────┘   └───────┬────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ↓
                ┌─────────────────────────────┐
                │        GIS + POSTGIS        │
                │                             │
                │ roads                       │
                │ villages                    │
                │ infrastructure              │
                │ risk layers                 │
                │ reports                     │
                └──────────────┬──────────────┘
                               ↓
                ┌─────────────────────────────┐
                │       RISK FUSION            │
                │                             │
                │ ML risk                    │
                │ visual evidence             │
                │ road impact                  │
                │ field reports                │
                └──────────────┬──────────────┘
                               ↓
                ┌─────────────────────────────┐
                │       IMPACT ANALYSIS       │
                │                             │
                │ affected roads               │
                │ villages / communities       │
                │ infrastructure               │
                │ connectivity                 │
                └──────────────┬──────────────┘
                               ↓
                ┌─────────────────────────────┐
                │     SHAP / EXPLANATION      │
                └──────────────┬──────────────┘
                               ↓
                ┌─────────────────────────────┐
                │        ALERT SYSTEM         │
                │                             │
                │ dashboard                   │
                │ app                         │
                │ SMS / notifications         │
                └──────────────┬──────────────┘
                               ↓
                ┌─────────────────────────────┐
                │ Authorities / Communities   │
                └──────────────┬──────────────┘
                               ↑
                    Field feedback / reports
```

The project source defines the core architecture as **Data → AI/CV → GIS → Risk → Impact → Alert → Field Feedback**. [Project source]

---

# 33. Module architecture

This is how the modules fit together.

```text
                         SANKET
                            │
           ┌────────────────┼────────────────┐
           │                │                │
           ↓                ↓                ↓
      Module 1          Module 2          Module 3
      ML Risk           Landslide         Road/
      Prediction        Visual Detection  Obstruction
           │                │                │
           │                │                ↓
           │                │           Road status
           │                │           OPEN /
           │                │           PARTIAL /
           │                │           BLOCKED
           │                │
           └────────────────┼────────────────┘
                            ↓
                        GIS Layer
                            ↓
                     Risk Fusion Engine
                            ↓
                       Impact Analysis
                            ↓
                       Final Risk
                            ↓
                          Alerts
```

The project source describes the modules as:

- M1: “How risky is this location?”
- M2: “Is there visual evidence of a landslide?”
- M3: “Has the road been affected?”
- GIS: “Where is it and what is affected?”
- SHAP: “Why is the location considered risky?” [Project source]

---

# 34. Module 3 relationship to the system

Module 3 receives:

```text
field photo + GPS
        ↓
CV detection
        ↓
obstruction type
        ↓
road status
        ↓
GIS
        ↓
connectivity analysis
```

The source specification lists classes such as debris/rocks, fallen tree, mud/water, road damage and vehicle obstruction, followed by road-status classification and GIS/OSRM analysis. [Project source]

This module does not replace Module 1. It provides another evidence/impact channel.

---

# 35. Module 2 relationship to Module 1

A useful architecture is:

```text
Module 1:
Risk before / around an event

Module 2:
Visual evidence from satellite/imagery

Module 3:
On-ground road impact
```

So SANKET can combine:

```text
Predicted risk
+
Visual evidence
+
Field evidence
+
GIS impact
```

instead of trusting only one model.

---

# 36. Suggested Google Colab project structure

```text
SANKET_Module1/
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── final/
│
├── notebooks/
│   ├── 01_data_inventory.ipynb
│   ├── 02_rainfall_features.ipynb
│   ├── 03_soil_features.ipynb
│   ├── 04_dem_features.ipynb
│   ├── 05_ndvi_features.ipynb
│   ├── 06_dataset_builder.ipynb
│   ├── 07_training.ipynb
│   └── 08_evaluation.ipynb
│
├── src/
│   ├── rainfall.py
│   ├── soil_moisture.py
│   ├── dem.py
│   ├── satellite.py
│   ├── feature_engineering.py
│   ├── dataset_builder.py
│   └── inference.py
│
├── models/
│   └── module1_model.pkl
│
└── outputs/
    ├── metrics/
    ├── plots/
    └── shap/
```

---

# 37. Colab secret management

Use Colab's secret mechanism for credentials.

Conceptually:

```python
from google.colab import userdata

IMD_API_KEY = userdata.get("IMD_API_KEY")
EARTHDATA_TOKEN = userdata.get("EARTHDATA_TOKEN")
CDSE_CLIENT_ID = userdata.get("CDSE_CLIENT_ID")
CDSE_CLIENT_SECRET = userdata.get("CDSE_CLIENT_SECRET")
```

Then your request code reads these variables.

Never do:

```python
IMD_API_KEY = "real-secret-here"
```

and upload that notebook to GitHub.

Also never place passwords/tokens into CSV files.

---

# 38. Practical API setup checklist

## IMD

```text
Create/use IMD API account if the selected endpoint requires authenticated access
↓
Obtain required credential/token
↓
Store in Colab Secret
↓
Use requests session
↓
Call forecast/current/rainfall endpoints
```

Official API reference:
https://api.imd.gov.in/public/api_reference.html

## NASA Earthdata

```text
Create Earthdata account
↓
Authorize required service
↓
Generate/use token or supported authentication
↓
Store in Colab Secret
↓
Download/query protected data
```

## Copernicus Data Space

```text
Register account
↓
Verify email
↓
Create OAuth client
↓
Get client_id + client_secret
↓
Store in Colab Secrets
↓
Request access token
↓
Query/download Sentinel-2 products
```

## OSM/Nominatim

```text
No normal API-key flow
↓
Respect usage policy
↓
Set User-Agent
↓
Cache responses
↓
Do not make uncontrolled bulk/systematic requests
```

## Census

```text
Public API → normal public usage
Higher volume → request key/token if approved
```

---

# 39. First implementation milestone

Do not try to build the entire SANKET system at once.

Your first milestone should be:

```text
Historical Landslide Dataset
          +
Historical Rainfall
          +
DEM Terrain Features
          +
Soil Moisture
          +
NDVI
          ↓
Final Module 1 Dataset
          ↓
XGBoost / Random Forest
          ↓
Evaluation
```

Only after this works should you integrate:

```text
GIS
SHAP
live API inference
alerts
```

This keeps the work manageable and makes debugging much easier.

---

# 40. Recommended first ML experiment

Start with approximately:

```text
Features:
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

Then:

```text
Baseline 1 → Logistic Regression
Baseline 2 → Random Forest
Main model → XGBoost
```

Evaluate:

```text
Recall
Precision
F1
PR-AUC
ROC-AUC
Confusion Matrix
```

Then use SHAP on the best model.

---

# 41. One-line explanation you can give to a judge

> **“Module 1 learns from historical landslides and their corresponding rainfall, soil moisture, terrain and satellite-derived conditions, and then uses current/forecast conditions for a new location to estimate landslide probability and produce an explainable risk level.”**

---

# 42. One-line full SANKET explanation for judges

> **“SANKET is an AI-powered landslide early-warning platform that combines historical risk prediction, satellite-based visual evidence, field-photo road obstruction detection, GIS impact analysis and explainable risk fusion to identify hazardous locations, affected connectivity and communities, and deliver actionable alerts.”**

---

# 43. Important source notes

### Project-provided source
The project's uploaded specification defines the NER problem, the three-module structure, the data/API shortlist, derived features, GIS flow, risk/impact/alert flow and field-feedback architecture. [Project source]

### Current official API/service references checked

- IMD API Reference:
  https://api.imd.gov.in/public/api_reference.html
- IMD API Management:
  https://api.imd.gov.in/public/
- NASA Earthdata Login:
  https://urs.earthdata.nasa.gov/
- Copernicus Data Space APIs:
  https://documentation.dataspace.copernicus.eu/APIs.html
- Copernicus registration/authentication:
  https://documentation.dataspace.copernicus.eu/Registration.html
- OpenStreetMap Nominatim usage policy:
  https://operations.osmfoundation.org/policies/nominatim/
- Census India API key page:
  https://censusindia.gov.in/census.website/en/data/api/request-key

---

# 44. Final mental model

Remember this:

```text
                  MODULE 1
       "How risky is this location?"

Historical Landslide
        + 
Historical Rainfall
        +
Historical Soil Moisture
        +
Terrain
        +
Satellite Vegetation
        +
Historical Context
        ↓
   TRAINING DATASET
        ↓
    ML TRAINING
        ↓
    SAVED MODEL
        ↓
Current / Forecast Data
        +
Static Terrain
        +
Latest valid satellite features
        ↓
 FEATURE ENGINEERING
        ↓
  RISK PROBABILITY
        ↓
  RISK LEVEL
        ↓
     SHAP
        ↓
      GIS
        ↓
    ALERT SYSTEM
```

And the whole SANKET system is:

```text
DATA
 ↓
AI / CV
 ↓
GIS
 ↓
RISK FUSION
 ↓
IMPACT ANALYSIS
 ↓
ALERT
 ↓
FIELD FEEDBACK
 ↓
SANKET
```
