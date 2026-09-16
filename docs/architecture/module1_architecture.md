# SANKET Module 1 — System Architecture Document

> **Module 1**: Tabular Machine Learning Landslide Risk Prediction Engine  
> **Target Region**: North Eastern Region (NER) of India  
> **Problem Statement**: SIH 26001 · MDoNER  

---

## 1. Executive Summary

Module 1 is the machine learning backbone of SANKET, designed to predict landslide occurrence probability and assign a 4-tier operational hazard level (**NORMAL**, **WATCH**, **WARNING**, **DANGER**) across the North Eastern Region.

Rather than relying on visual computer vision (which identifies failures after they happen), Module 1 models **pre-failure physical susceptibility and dynamic hydrologic triggers**.

```
  ┌────────────────────────┐      ┌────────────────────────┐
  │   Static Susceptibility│      │    Dynamic Triggers    │
  │ (DEM, Slope, TWI, etc.)│      │ (Rainfall, SMAP, etc.) │
  └───────────┬────────────┘      └───────────┬────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
               [ Feature Engineering Pipeline ]
                              ▼
                 [ XGBoost ML Risk Engine ]
                              ▼
                P(Landslide) in [0.0 - 1.0]
                              ▼
         [ Risk Classification with Hysteresis ]
           (NORMAL, WATCH, WARNING, DANGER)
                              ▼
               [ TreeSHAP Explainability ]
            (Factor attributions for UI)
```

---

## 2. Ingestion and Source Feeds

1. **ISRO Landslide Atlas & GSI Bhukosh**: Primary ground truth labels ($y = 1$) for historical landslide events.
2. **NASA GPM IMERG**: Half-hourly gridded precipitation providing 24h, 72h, and 7d rainfall totals.
3. **NASA SMAP**: Surface Volumetric Water Content (VWC) in $m^3/m^3$ representing antecedent soil moisture.
4. **Copernicus DEM 30m**: Topographic parameters: elevation, slope, aspect, profile/plan curvature, Topographic Wetness Index (TWI), and flow accumulation.
5. **Sentinel-2 L2A**: Optical surface reflectance (B4, B8) for Normalized Difference Vegetation Index (NDVI) and temporal vegetation loss anomalies ($\Delta \text{NDVI}$).

---

## 3. Mathematical Hazard Formulation

The continuous hazard probability $H$ combines static terrain susceptibility $S$ and dynamic trigger exceedance $E$:

$$H = S \times f(E) + w_1 \cdot M + w_2 \cdot C$$

- **$S$**: Static susceptibility score derived from terrain gradient, curvature, lithology, and TWI.
- **$E$**: Intensity-Duration ($I$-$D$) exceedance ratio:
  $$E = \frac{I_{72}}{I_0(72)}$$
  Where the regional North East Himalaya empirical threshold is:
  $$I_0(D) = 5.8294 \cdot D^{-0.4141} \quad (\text{mm/hr})$$
- **$M$**: Soil moisture saturation index $S_r = \theta / \phi$.
- **$C$**: Ground crack / field report proximity density.

---

## 4. Operational Risk Classification & Hysteresis

Risk probabilities map to 4 operational tiers:

| Tier | Probability Range | Action Trigger |
|---|---|---|
| **NORMAL** | $P < 0.35$ | Routine observation and monitoring |
| **WATCH** | $0.35 \le P < 0.60$ | Inform local district officials and field staff |
| **WARNING** | $0.60 \le P < 0.80$ | Pre-position response units, issue public advisory |
| **DANGER** | $P \ge 0.80$ | Road closure advisory, recommend targeted evacuation |

A **downward hysteresis delta of 0.04** is enforced on transition to prevent threshold oscillation ("flapping") during fluctuating weather events.

---

## 5. Spatial Block Cross-Validation

Standard random $k$-fold cross-validation leaks neighboring pixels, leading to artificially inflated AUC scores (e.g. 0.96) that collapse in production. Module 1 implements **Spatial Block GroupKFold Cross-Validation** (1° $\times$ 1° geographic grid blocks) ensuring testing occurs on entirely unobserved spatial sectors.
