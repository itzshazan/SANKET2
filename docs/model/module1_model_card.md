# SANKET Module 1 — Model Card

## Model Details
- **Model Name**: SANKET-M1-XGBoost
- **Model Version**: 1.0.0
- **Model Type**: Gradient Boosted Decision Trees (XGBoost / HistGradientBoosting)
- **Primary Task**: Binary Classification of Landslide Risk Occurrence
- **Release Date**: September 2026
- **Developer**: SANKET Team (SIH 26001)

## Intended Use
- **Primary Use Case**: Continuous spatial landslide hazard evaluation across the 8 North Eastern Region (NER) states.
- **Intended Users**: State and District Disaster Management Authorities (SDMA/DDMA), District Magistrates, Public Works Department (PWD) engineers.
- **Out of Scope**: Real-time micro-sensor rockfall prediction (sub-minute scales). Module 1 does **not** replace on-site geotechnical boreholes or structural monitoring.

## Factors & Training Data
- **Training Samples**: Extracted from verified historical landslide records in the ISRO Landslide Atlas and Geological Survey of India (GSI) combined with spatial negative sampling across stable topographies.
- **Geographic Extent**: Latitude 21.5°N – 29.5°N, Longitude 88.0°E – 97.5°E.
- **Features Used (15)**:
  - Precipitation: `rainfall_24h`, `rainfall_72h`, `rainfall_7d`, `max_rainfall_1h`, `rainfall_exceedance`
  - Hydrology: `soil_moisture` (VWC), `twi` (Topographic Wetness Index), `flow_accumulation`
  - Terrain: `elevation`, `slope`, `aspect`, `curvature`
  - Biosphere: `ndvi`, `ndvi_change`
  - Historical Spatial: `historical_density`

## Quantitative Performance
- **Validation Scheme**: 5-Fold Spatial Block Cross-Validation (GroupKFold by 1° geographical blocks).
- **AUC-ROC (Spatial CV)**: $0.84 \pm 0.04$
- **Precision-Recall AUC**: $0.76 \pm 0.05$
- **F1 Score**: $0.78$
- **Historical Backtesting (Noney 2022)**: Escalated to WARNING at Day -5 (120 hours of operational lead-time).

## Ethical Considerations & Human-in-the-Loop
- **Safety Boundary**: SANKET recommends; humans decide. Predictions serve as early warning intelligence and do not initiate automatic forced evacuations.
- **Explainability**: Every prediction includes local TreeSHAP factor attributions to explain the physical reasoning behind elevated risk levels.
