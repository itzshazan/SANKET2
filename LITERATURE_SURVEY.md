# Literature Survey — Technical Papers on Landslide Hazard Modelling (2020 and later)

**Scope:** eight method / system / tool papers (no reviews), all published 2020 or later, covering machine-learning landslide hazard prediction, detection and explanation.

## Contents

1. [Overview and paper map](#1-overview-and-paper-map)
2. [Cross-paper comparison](#2-cross-paper-comparison)
3. [Paper summaries](#3-paper-summaries)
   - **A. Hazard nowcasting and forecasting:** [1](#paper-1) · [2](#paper-2) · [3](#paper-3)
   - **B. Susceptibility mapping:** [4](#paper-4) · [5](#paper-5) · [6](#paper-6)
   - **C. Remote-sensing detection:** [7](#paper-7)
   - **D. Explainability for tree models:** [8](#paper-8)
4. [Verification status and flagged items](#4-verification-status-and-flagged-items)
5. [References](#5-references)

---

## 1. Overview and paper map

The papers fall into four groups. Group A predicts *when* landslides are likely (time-varying probability from rainfall and soil state); group B predicts *where* (static susceptibility maps); group C finds landslides that already happened in satellite imagery; group D explains tree-based predictions.

| # | Group | Paper (short name) | Year | Task | Model | Headline result | Link |
|---|-------|--------------------|------|------|-------|-----------------|------|
| 1 | A | Stanley et al. — landslide hazard indicator | 2020 | Daily hazard probability, Pacific NW (1979–2016) | XGBoost, monotone constraints | 55% (GLC) / 69% (Washington) of landslides caught at 6% FPR, vs 37% / 31% for a rainfall threshold | [DOI](https://doi.org/10.1016/j.envsoft.2020.104692) · [NASA PDF](https://ntrs.nasa.gov/api/citations/20210012011/downloads/28317.pdf) |
| 2 | A | Stanley et al. — LHASA v2 | 2021 | Global daily nowcast, 1 km | XGBoost, depth 2, 300 trees | ~2× more landslides detected than LHASA v1 at equal global FPR | [DOI](https://doi.org/10.3389/feart.2021.640043) |
| 3 | A | Khan et al. — LHASA-Forecast | 2022 | 1–3 day landslide forecast, 1 km | LHASA v2 model with GEOS-FP inputs | Correlation with nowcast ≈0.47 (2-day), ≈0.3 (3-day) at landslide points | [DOI](https://doi.org/10.3389/feart.2022.878996) · [PDF](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2022.878996/pdf) |
| 4 | B | Chauhan et al. — Uttarakhand susceptibility | 2025 | Susceptibility map, 16 factors | RF, XGBoost, Fuzzy-AHP, bivariate | AUC 91.36% (XGBoost), 90.94% (RF) | [DOI](https://doi.org/10.1186/s40677-024-00307-3) |
| 5 | B | Youssef et al. — interpretable neural network | 2023 | Susceptibility map, eastern Himalaya | Superposable (additive) neural network | AUROC 0.890 vs 0.848 for logistic regression | [DOI](https://doi.org/10.1038/s43247-023-00806-5) · [arXiv](https://arxiv.org/abs/2201.06837) |
| 6 | B | Inan & Rahman — TreeSHAP feature selection | 2023 | Susceptibility + feature selection, Bangladesh | XGBoost + TreeSHAP | Weighted F1 94.62% → 95.01% with 9 of 15 factors; AUC 97% | [arXiv](https://arxiv.org/abs/2201.03225) |
| 7 | C | Ghorbanzadeh et al. — Landslide4Sense | 2022 | Landslide detection in satellite imagery | 11 segmentation networks | Best F1 71.65% (ResU-Net) | [arXiv](https://arxiv.org/abs/2206.00515) |
| 8 | D | Lundberg et al. — TreeSHAP | 2020 | Exact Shapley explanations for trees | Tree SHAP algorithm | $O(TLD^2)$ time vs $O(TLM2^M)$ exact | [DOI](https://doi.org/10.1038/s42256-019-0138-9) · [arXiv](https://arxiv.org/abs/1905.04610) |

**Suggested reading order:** 8 → 1 → 2 → 3 (explainability basics, then the nowcasting line of work, which builds on itself), then 4 → 5 → 6 (susceptibility), then 7 (detection).

---

## 2. Cross-paper comparison

### 2.1 Modelling choices

| # | Prediction target | Unit of prediction | Key inputs | Constraints / regularisation |
|---|-------------------|--------------------|------------|------------------------------|
| 1 | Landslide reported in cell-day (0/1) | 0.125° daily grid | NCA-LDAS rainfall, soil moisture (4 layers), snow, runoff, wind, canopy water, relief | Monotone constraints on every predictor; $\eta=0.01$, $\gamma=0.01$, subsample 0.8 |
| 2 | Landslide presence/absence | 30-arcsecond (~1 km) daily cell | 7 predictors: slope, fault distance, lithology rank, soil wetness, snow mass, 2-day antecedent rain, daily rain | Monotone + interaction constraints (all variables interact only with rainfall); depth 2 |
| 3 | Same as 2, 1–3 days ahead | 1 km | Same model; GEOS-FP forecast rainfall, soil moisture, snow mass | Reuses paper 2's trained model; rainfall rescaled by $p_{99}$ |
| 4 | Susceptibility class | Map pixel | 16 factors incl. geomorphons | — |
| 5 | Landslide vs non-landslide pixel | 30 m pixel | DEM, precipitation-derived features, geology distances; 15 base features | Additive structure; positives up-weighted |
| 6 | Landslide vs non-landslide | Sample | 15 causal factors → 9 after selection | Grid search, 10-fold stratified CV |
| 7 | Landslide vs background pixel | 128 × 128 patch, 10 m | Sentinel-2 bands 1–12, slope, DEM | Trained from scratch |
| 8 | (method) feature attribution | Any tree ensemble | — | Exact, polynomial-time |

### 2.2 Evaluation design

| # | Train / test split | Headline metric | Comparator |
|---|--------------------|-----------------|------------|
| 1 | Temporal: train water years 2011–2015; withhold 1996–2010; 2016 untouched | % of landslides captured at fixed false-positive rate (6%) | Fitted recent–antecedent rainfall threshold |
| 2 | Temporal: train 2015–2018; evaluate on 2019–2020 event inventories | True-positive rate at a threshold (0.12) that matches LHASA v1's global FPR | LHASA v1 decision tree |
| 3 | Jan 2020 – Jan 2021, seven event inventories | MAD / MD vs nowcast; point-wise correlation | LHASA nowcast (LHASA-NRT) |
| 4 | Test set (details not read) | AUC, accuracy, sensitivity | Logistic regression, Fuzzy-AHP, stacked ensemble |
| 5 | Spatial tiling (~70/30); 10-fold CV for confidence intervals | AUROC | Logistic regression, likelihood ratios, SHALSTAB, single features |
| 6 | 10-fold stratified CV + 67:33 hold-out | Weighted F1, AUC | SVM, LR, KNN, AdaBoost |
| 7 | 959 training patches (first quarter of each area) / 2,840 test | Precision, recall, F1 | 10 other segmentation networks |
| 8 | n/a (algorithm paper) | Speed and consistency | Other attribution methods (21 metrics) |

### 2.3 Common technical patterns

- **Gradient-boosted trees dominate** the prediction papers: XGBoost is the model in papers 1, 2, 3 (inherited), 4 and 6; paper 8 is the tool for explaining such models.
- **Monotone constraints are used to prevent overfitting** in the two dynamic-hazard papers (1, 2). Paper 1 reports that regularisation alone failed and that a feature (sediment thickness) memorised individual events until constraints were added.
- **Rainfall is localised per grid cell** rather than used raw: min–max rescaling per cell (paper 1) and division by a per-cell 99th-percentile from a log-normal fit (papers 2, 3).
- **Evaluation is split in time or space**, not randomly, in the stronger designs (papers 1, 2, 5, 7); paper 2 argues explicitly that random splits and cross-validation leak same-event data.
- **Imbalance is handled differently:** random negative sampling of >1 million non-landslide cells against 9,700 landslide cells (paper 2); up-weighting positives (paper 5); balanced 196/196 classes (paper 6).
- **Probabilistic outputs are compared at matched false-positive rate** (papers 1, 2), which makes a binary threshold baseline and a probability model comparable.
- **Interpretability approaches differ:** post-hoc exact Shapley values (papers 6, 8) versus a model that is additive by construction (paper 5).

### 2.4 Caveat on comparing numbers

The headline metrics are **not comparable across papers**: the tasks, labels (event cell-days vs mapped pixels vs patches), class balance and splits all differ. Compare designs, not scores.

---

## 3. Paper summaries

Each summary follows the same template: *In brief → Problem → Data → Method → Training and evaluation → Results → Notes.*

---

### A. Hazard nowcasting and forecasting

<a id="paper-1"></a>
#### Paper 1 — Building a Landslide Hazard Indicator with Machine Learning and Land Surface Models

**Stanley, T.A., Kirschbaum, D.B., Sobieszczyk, S., Jasinski, M.F., Borak, J.S. & Slaughter, S.L. (2020).** *Environmental Modelling & Software*, 129, 104692. [DOI](https://doi.org/10.1016/j.envsoft.2020.104692)

**In brief.** An XGBoost model turns a short, biased landslide inventory plus a 36-year land-surface reanalysis into a daily hazard record, and monotone constraints are what make it generalise.

**Problem.** Build a **daily, gridded landslide hazard indicator (LHI)** for the Pacific Northwest, 1979–2016. LHI is the **mean daily predicted probability** over an area or time span, so for a well-calibrated model it equals the observed frequency of a Boolean landslide variable and can be compared across space and time.

**Data.**
- NCA-LDAS Noah-3.3 land-surface output at 0.125° daily: precipitation, runoff, soil moisture by layer, snow, wind, canopy water.
- Pacific Northwest Landslide Inventory (PNLI), built mostly from the Global Landslide Catalog and state inventories; rock falls removed.
- Relief from 3DEP elevations.
- Every predictor is **rescaled per grid cell**:

$$x' = \frac{x-x_{\min}}{x_{\max}-x_{\min}+10^{-20}}$$

  This is not required by trees but gives a localisation effect that respects both rainfall frequency and maximum intensity.

**Method.**
- XGBoost binary classifier (`binary:logistic`); per cell-day the leaf values of all trees are summed and passed through a sigmoid. Target = 1 if a landslide was recorded in the cell that day.
- **Monotone constraints (Table 1).** Increasing: relief, canopy interception, snow depth, four soil-moisture layers (0–10, 10–40, 40–100, 100–200 cm), rainfall, snowfall, wind speed, storm surface runoff, baseflow, snowmelt. Decreasing: a *frozen-ground* indicator (any soil layer below 0 °C), which replaces four soil-temperature variables.
- **Why constraints.** Even conservative shrinkage and regularisation failed to stop overfitting: a preliminary model with sediment thickness learned individual historical landslides (a spike for one event near Mukilteo, WA) rather than a general rule, and the variable was dropped. Constraints on every predictor with a confidently known direction were "especially effective", trading some training fit for reliability on new conditions.
- **Settings (Table 2).** `tree_method=hist`, `binary:logistic`, 500 rounds, $\eta=0.01$, $\gamma=0.01$, max delta step 10, subsample 0.8, constraints per Table 1.

**Training and evaluation.**
- Trained on water years 2011–2015 only (most consistently reported period); 1996–2010 withheld; 2016 never touched during development.
- Benchmarked on two small dated inventories (NASA GLC; Recent Landslides in Washington State; rock falls and locations worse than 10 km removed) against a recent–antecedent (RA) rainfall threshold fitted to the area.

**Results.**
- RA threshold: 37% of GLC and 31% of Washington landslides at 6% FPR.
- XGBoost at probability threshold 0.00033126 (same FPR): **55% of GLC** and **69% of Washington** landslides.
- Rainfall has the highest "gain" importance, snowfall the lowest; soil moisture and temperature modulate the output.
- Model–observation divergence over 1999–2005 is attributed to missing reports before 2007 rather than model failure.

**Notes.** Not validated outside the Pacific Northwest or with inputs other than NCA-LDAS; a lagging indicator emphasising extent and timing of triggering events, not counts or types; not for site-specific hazard calculation.

---

<a id="paper-2"></a>
#### Paper 2 — Data-Driven Landslide Nowcasting at the Global Scale (LHASA v2)

**Stanley, T.A., Kirschbaum, D.B., Benz, G., Emberson, R.A., Amatya, P.M., Medwedeff, W. & Clark, M.K. (2021).** *Frontiers in Earth Science*, 9:640043. [DOI](https://doi.org/10.3389/feart.2021.640043)

**In brief.** A depth-2 XGBoost model with monotone and interaction constraints replaces the LHASA v1 decision tree and outputs a probability instead of three categories.

**Problem.** LHASA v1 is a single decision tree (high / moderate / low) that first tests whether the last seven days of rainfall were intense, then checks susceptibility; it runs 3-hourly from 60°N to 60°S. v2 aims for a **probabilistic**, data-driven nowcast trained to predict landslide presence or absence.

**Data.**
- **Predictors (7):** maximum slope; distance to active faults; lithologic strength (rank from the GLiM map, using maximum slope as a proxy for material strength); SMAP L4 **total profile soil wetness** (0 = dry, 1 = saturated; ≈3-day latency); SMAP L4 snow mass; **antecedent rainfall** (summed over the most recent 2 days, filling the SMAP latency gap); **current daily rainfall**.
- **Rainfall:** IMERG v06B **Early** product (0.1°, 30-min, ~4 h latency), liquid-phase fraction only, daily totals.
- **Climatic correction:** daily rainfall at each pixel is divided by that pixel's **99th-percentile** daily rainfall, from a **log-normal** fit (SciPy) to IMERG Final daily totals for 2000–2018 per 0.1° cell.
- **Labels:** global gridded inventory (GLC plus many event inventories), daily at **30-arcsecond** resolution; predictors regridded by nearest neighbour.

**Method.**
- XGBoost with `tree_method=exact`, `binary:logistic`, 300 rounds, **max depth 2**, shrinkage 0.05, max delta step 1, subsample 0.5, 10 threads.
- **Monotone constraints:** positive for all variables except distance to faults and lithologic strength (negative).
- **Interaction constraints:** every variable may interact only with rainfall (depth 2 enables this), representing how preconditions modulate the rainfall response.

**Training and evaluation.**
- Training period 3 Apr 2015 – 31 Dec 2018: **9,700 landslide cells** and **>1 million** randomly sampled non-landslide cells; 80/20 split per class. 1,000 trees trained; test performance declined after 300, so **300 were kept**.
- Evaluation is temporally independent: 2019–2020 event inventories held out (random splits and cross-validation would leak same-event data).
- A probability threshold of **0.12** gives the same global false-positive rate as LHASA v1.

**Results.**
- At matched FPR, v2 is **about twice as likely** to predict historical landslides as v1.
- Probabilities at individual validation landslides range from 0 to 93%; v2 stayed below 0.12 for most landslides in several inventories (GLC, LRC, USLI, Australia, Burundi, Rio de Janeiro).
- Nowcasts exceed 10% of the time in small hotspots (Colombia, Indonesia, Papua New Guinea) but give <1% false-alarm rate across most large mountain regions.
- Current daily rainfall has the highest gain and coverage.

**Notes.** ≈8 min to produce one global daily nowcast (I/O-dominated); model inference <1 min.

---

<a id="paper-3"></a>
#### Paper 3 — Global Landslide Forecasting System for Hazard Assessment and Situational Awareness (LHASA-Forecast)

**Khan, S., Kirschbaum, D.B., Stanley, T.A., Amatya, P.M. & Emberson, R.A. (2022).** *Frontiers in Earth Science*, 10. [DOI](https://doi.org/10.3389/feart.2022.878996) · [PDF](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2022.878996/pdf)

**In brief.** Swap the satellite rainfall input of paper 2's model for a weather-model forecast, and rescale so the model cannot tell the difference.

**Problem.** Extend LHASA v2 to **forecast** landslide probability up to **three days ahead** at 1 km.

**Data.**
- Forecast rainfall from **GEOS-FP** replaces IMERG Early.
- Soil moisture and snow mass come from the **GEOS-FP assimilated** product instead of SMAP.
- Antecedent rainfall for the 2- and 3-day forecasts is built from earlier forecast days (paper's Tables 3–4).
- Validation: study period Jan 2020 – Jan 2021, seven rainfall-triggered event inventories mapped from PlanetScope / Sentinel-2 imagery with the SALaD semi-automatic system (e.g. tropical storm Linfa, typhoon Molave, Medicane Ianos, hurricanes Eta/Iota).

**Method.**
- The trained model from paper 2 is reused **unchanged**; only inputs are substituted.
- **Rescaling is the critical step.** Rainfall is divided by the historical 99th percentile $p_{99}$ per 0.1° cell (log-normal fit). For IMERG, $p_{99}$ comes from IMERG v06B 2000–2018; for GEOS-FP forecasts, from GEOS-FP forecast data 2018–2021, putting both streams on a common scale. Global inventories were too short to train a forecast-only model.

**Evaluation.** Agreement with the LHASA nowcast (LHASA-NRT):

$$\mathrm{MAD}=\tfrac1N\sum\lvert N_{cast}-F_{cast}\rvert,\qquad \mathrm{MD}=\tfrac1N\sum (N_{cast}-F_{cast})$$

($N_{cast}$ = LHASA-NRT probability, $F_{cast}$ = LHASA-F probability), plus point-wise comparison at landslide locations.

**Results.**
- MAD between NRT and 1-day forecast is <0.001 over large regions; in Colombia/Central America and High Mountain Asia the mean difference is 0.05–0.35 with NRT higher, so LHASA-F gives generally lower probabilities.
- At landslide points (n = 5,395) the correlation with NRT falls with lead time: ≈0.47 (2-day), ≈0.3 (3-day). Performance is comparable where NRT probability is >0.70.
- Major cyclone-triggered events are resolved best at 1- and 2-day lead.

**Notes.** Both products underestimate hazard when the precipitation estimate itself is low (e.g. Eta in Guatemala).

---

### B. Susceptibility mapping

<a id="paper-4"></a>
#### Paper 4 — Landslide Susceptibility Assessment for Uttarakhand, India, Using Multi-Criteria Decision Making, Bivariate, and Machine Learning Models

**Chauhan, V., Gupta, L. & Dixit, J. (2025).** *Geoenvironmental Disasters*, 12(1). [DOI](https://doi.org/10.1186/s40677-024-00307-3)

**In brief.** Tree ensembles beat knowledge-driven and bivariate methods for susceptibility mapping in the Indian Himalaya. *(Verified at abstract and results-table level only.)*

**Problem.** Map landslide susceptibility for Uttarakhand state.

**Data.** **16 landslide-influencing factors**, including geomorphons for terrain classification.

**Method.** Bivariate statistical analysis; multi-criteria decision making (Fuzzy-AHP); **Random Forest**; **XGBoost**; logistic regression and a stacked ensemble also appear in the results table.

**Results (test set, Table 7 as retrieved).**

| Model | AUC |
|-------|-----|
| XGBoost | 91.36% |
| Random Forest | 90.94% |
| Logistic regression | 85.34% |
| Stacked ensemble | 58.87% |
| Fuzzy-AHP | 55.49% |

Random Forest and XGBoost both reached accuracy 0.84 and sensitivity 0.85.

**Map.** ≈18.47% of the state is high to very high susceptibility and ≈21% moderate; highest in Uttarkashi, Chamoli and Pithoragarh (Lesser and Higher Himalaya), lowest in Tarai-Bhabar and Sub-Himalayan districts (Haridwar, Udham Singh Nagar).

**Notes.** Check the full text for the train/test split, hyperparameters and the stacked-ensemble row before quoting it.

---

<a id="paper-5"></a>
#### Paper 5 — Landslide Susceptibility Modeling by Interpretable Neural Network (Superposable Neural Network)

**Youssef, K., Shao, K., Moon, S. & Bouchard, L.-S. (2023).** *Communications Earth & Environment*, 4. [DOI](https://doi.org/10.1038/s43247-023-00806-5) · [arXiv:2201.06837](https://arxiv.org/abs/2201.06837)

**In brief.** A neural network built as a sum of per-feature sub-networks, so every feature's contribution is directly readable, reaches 98–99% of a black-box deep network's performance.

**Problem.** Susceptibility modelling that is accurate, generalisable and fully interpretable, evaluated in the easternmost Himalaya.

**Data.**
- Three regions (N–S Dibang, NW–SE range front, E–W Lohit): 4.19 × 10⁹ m², ≈ 4.66 × 10⁶ pixels at 30 m.
- Inputs: 90 m SRTM DEM, TRMM-derived precipitation features resampled to 30 m, geologic distance layers; 15 base features, standardised.
- Inventory stated as 2,289 mapped landslides (areas 900 m² – 1.96 × 10⁶ m²).

**Method.**
- **Additive model.** Each (possibly composite) feature $\chi_j$ feeds its own small network and contributions are summed:

$$S_t(\{\chi_j\})=\sum_j\Big(\sum_k w_{j,k}\,e^{-(a_{j,k}\chi_j+b_{j,k})^2}+c_j\Big)$$

- Two hidden layers: **Gaussian radial-basis** activations then linear; each input connects only to its own neurons.
- **Composite features** are products of originals; Level-2 SNNs use single and pairwise products (15 features → 120 composite features).
- **Training pipeline:** polynomial expansion → **tournament ranking** (backward elimination + forward selection scored by AUROC) → multistage training of a larger **teacher** network → fractional and parallel **knowledge distillation** → **network superposition** (sum of sub-networks, output weights fixed to one). Second-order Levenberg–Marquardt optimisation; positive samples weighted more heavily.

**Training and evaluation.** Split by **Pythagorean tiling**, ≈70% train / 30% test; 10-fold cross-validation for confidence intervals.

**Results (average AUROC over the three regions).**

| Model | AUROC |
|---|---|
| Level-1 SNN | 0.856 |
| **Level-2 SNN** | **0.890** |
| Logistic regression | 0.848 |
| Likelihood ratios | 0.823 |
| Best single feature (precipitation or slope) | 0.737 |
| SHALSTAB (physics-based) | 0.727 |

Level-2 reaches >98% (Level-3 >99%) of the teacher deep network's performance.

**Interpretation.** Importance via $\Delta\bar S_j$ (difference in mean contribution between landslide and non-landslide pixels). Slope × precipitation terms rise steeply then saturate, similarly across regions; aspect peaks around 145°–180°; climate features contribute more than slope in about 74% (N–S), 54% (NW–SE) and 54% (E–W) of localities. The authors relate these terms to a simplified SHALSTAB failure index $FI=(S/S_0)\,k(W)$, with $k(W)$ from 1 (unsaturated) to 2 (saturated).

**Notes.** The text read gives 2,289 landslides but a figure caption lists 959 + 1,536 + 386 = 2,881; confirm in the published version. Non-landslide sample counts were not reported in the text read.

---

<a id="paper-6"></a>
#### Paper 6 — Explainable AI Integrated Feature Selection for Landslide Susceptibility Mapping using TreeSHAP

**Inan, M.S.K. & Rahman, I. (2023).** *SN Computer Science*, 4, 48. [arXiv:2201.03225](https://arxiv.org/abs/2201.03225)

**In brief.** Use mean |SHAP| from a tuned XGBoost to drop six of fifteen factors and slightly improve the model.

**Problem.** Reduce the number of causal factors without losing accuracy, using explanations rather than ad hoc selection.

**Data.** Three upazilas of Rangamati Hill District, Bangladesh (dataset from Rabby et al., 2021): **196 instances per class** (392 total), **15 causal factors**: profile and plan curvature, change, land use, elevation, slope, aspect, TWI, SPI, drainage, NDVI, rainfall, fault lines, road, geology.

**Method.** Tune several classifiers → explain the best (XGBoost) with **TreeSHAP** → rank features by mean absolute SHAP value → drop the least influential → retrain and compare.
- Models: SVM, logistic regression, KNN, AdaBoost, XGBoost. GridSearchCV with **10-fold stratified CV** optimising weighted F1, plus a 67:33 hold-out.
- Tuned XGBoost (15 features): `max_depth=3`, `n_estimators=3000`, `learning_rate=0.1`, `gamma=0`, `subsample=0.7`.
- Removed (six lowest): **aspect, fault lines, SPI, plan curvature, NDVI, land use**. Kept (nine, a 40% reduction): profile curvature, change, elevation, slope, TWI, drainage, rainfall, road, geology.
- Retrained: `gamma=0`, `learning_rate=0.1`, `max_depth=3`, `n_estimators=1500`, `subsample=1`.

**Results.**
- Before selection: XGBoost 10-fold CV weighted F1 = **94.62%**; hold-out accuracy 91.54% (landslide class: precision 92.19%, recall 90.77%, F1 91.47%). On the hold-out, logistic regression is reported slightly higher (92.31%); KNN 90%, AdaBoost 90%, SVM 87.69%.
- After selection: weighted F1 **95.01%**, **AUC 97%**; post-reduction accuracy, precision and recall are not reported in the text read.

**Notes.** The two tuning tables give different XGBoost `n_estimators` and `subsample`, and the prose is inconsistent about whether road is a high- or low-impact feature; check the published version. Only 392 samples, so the gain from 94.62% to 95.01% is small.

---

### C. Remote-sensing detection

<a id="paper-7"></a>
#### Paper 7 — Landslide4Sense: Reference Benchmark Data and Deep Learning Models for Landslide Detection

**Ghorbanzadeh, O., Xu, Y., Ghamisi, P., Kopp, M. & Kreil, D. (2022).** *IEEE Transactions on Geoscience and Remote Sensing*, 60, 1–17. [arXiv:2206.00515](https://arxiv.org/abs/2206.00515)

**In brief.** A public benchmark of labelled satellite patches and a head-to-head comparison of 11 segmentation networks.

**Problem.** Detect landslide pixels in multi-source satellite imagery.

**Data.** **3,799** non-overlapping 128 × 128 px patches at 10 m, labelled pixel-wise by manual annotation. **14 bands:** Sentinel-2 bands 1–12, slope (band 13) and DEM (band 14) from ALOS PALSAR. Four events: Iburi-Tobu (Hokkaido, Japan, Sep 2018), **Kodagu (Karnataka, India, Aug 2018)**, Rasuwa (Nepal, 2015), Western Taitung (Taiwan, Aug 2009).

**Method.** Eleven semantic-segmentation networks trained from scratch: PSPNet, ContextNet, DeepLab-v2, DeepLab-v3+, FCN-8s, LinkNet, FRRN-A, FRRN-B, SQNet, U-Net, ResU-Net.

**Training and evaluation.** 959 training patches (first quarter of each study area), 2,840 test patches. Adam, learning rate $10^{-3}$, batch size 32, 5,000 iterations, four NVIDIA V100 GPUs. Metrics: precision, recall, F1.

**Results (test set, %).**

| Model | Recall | Precision | F1 |
|---|---|---|---|
| PSPNet | 52.03 | 61.55 | 56.39 |
| ContextNet | 49.29 | 70.77 | 58.11 |
| DeepLab-v2 | 63.68 | 60.80 | 62.21 |
| DeepLab-v3+ | 62.11 | 69.91 | 65.78 |
| FCN-8s | 63.05 | 68.66 | 65.73 |
| LinkNet | 67.02 | 66.76 | 66.89 |
| FRRN-A | 64.40 | 76.57 | 69.96 |
| FRRN-B | 76.16 | 64.93 | 70.10 |
| SQNet | 66.69 | 74.20 | 70.24 |
| U-Net | 62.17 | 79.91 | 69.94 |
| **ResU-Net** | 67.71 | 76.08 | **71.65** |

ResU-Net has the best F1; U-Net the highest precision.

---

### D. Explainability for tree models

<a id="paper-8"></a>
#### Paper 8 — From Local Explanations to Global Understanding with Explainable AI for Trees (TreeSHAP)

**Lundberg, S.M., Erion, G., Chen, H., DeGrave, A., Prutkin, J.M., Nair, B., Katz, R., Himmelfarb, J., Bansal, N. & Lee, S.-I. (2020).** *Nature Machine Intelligence*, 2(1), 56–67. [DOI](https://doi.org/10.1038/s42256-019-0138-9) · [arXiv:1905.04610](https://arxiv.org/abs/1905.04610)

**In brief.** An exact, polynomial-time algorithm for Shapley values of tree ensembles, plus interaction values and tools that turn many local explanations into global understanding.

**Problem.** Explain individual predictions of random forests, decision trees and gradient-boosted trees with attributions that are theoretically sound (not heuristic) and fast enough to use.

**Definitions.** The value of a feature subset $S$ is the conditional expectation $f_x(S)\approx E[f(x)\mid x_S]$. The Shapley attribution:

$$\phi_i(f,x)=\sum_{R\in\mathcal R}\frac1{M!}\big[f_x(P_i^R\cup i)-f_x(P_i^R)\big]$$

($\mathcal R$ = all feature orderings, $P_i^R$ = features preceding $i$ in ordering $R$.) Properties: **local accuracy** $f(x)=\phi_0+\sum_{i=1}^{M}\phi_i$ with $\phi_0=E[f(z)]$; **missingness** (no effect → zero attribution); **consistency** (if a feature's contribution rises, its attribution cannot fall). Theorem 1: Shapley values are the only attribution satisfying all three. The Saabas heuristic violates consistency (it under-credits splits near the root).

**Algorithm.** Exact Shapley computation is NP-hard in general and $O(TLM2^M)$ for trees ($T$ trees, $L$ leaves, $M$ features). Tree SHAP is exact in

$$O(TLD^2)\ \text{time and}\ O(D^2+M)\ \text{memory}\quad(D=\text{max tree depth}).$$

Key idea: recursively track, for every path, the **proportion of all feature subsets that flow down it**, keeping a separate tally per subset size (the Shapley weight depends on $|S|$); features are added with EXTEND while descending and removed with UNWIND.

**Interaction values** (Shapley interaction index):

$$\Phi_{i,j}=\sum_{S\subseteq M\setminus\{i,j\}}\frac{|S|!\,(M-|S|-2)!}{2(M-1)!}\nabla_{ij}(f,x,S),\quad \nabla_{ij}=f_x(S\cup\{i,j\})-f_x(S\cup\{i\})-f_x(S\cup\{j\})+f_x(S)$$

Main effect $\Phi_{i,i}=\phi_i-\sum_{j\ne i}\Phi_{i,j}$, so each row sums exactly to $\phi_i$.

**Global tools built from local explanations.** SHAP summary (beeswarm) plot; SHAP dependence plot (vertical spread indicates interactions); supervised clustering / embedding in "explanation space"; monitoring by explaining the model's **loss** over time to attribute performance drift to features.

**Experiments.** NHANES I mortality (14,407 people, 79 features, Cox loss); chronic kidney disease, CRIC (3,939 patients, 333 features, 4-year ESRD prediction); hospital procedure duration (147,000 procedures, 2,185 features). Gradient-boosted trees outperformed lasso and a neural network in most comparisons. TreeExplainer outperformed alternatives over 21 metrics, 8 explanation methods and 3 model types; model-agnostic estimates would take ~2 CPU-days (basic) and >3 CPU-years (interaction values) for the kidney experiments.

---

## 4. Verification status and flagged items

| # | Paper | How it was read | Flags |
|---|-------|-----------------|-------|
| 1 | Stanley et al. 2020 | Full text | — |
| 2 | Stanley et al. 2021 | Full text | — |
| 3 | Khan et al. 2022 | Full text | 1-day correlation value not captured; only 2-day and 3-day values reported |
| 4 | Chauhan et al. 2025 | Abstract + one results table | Verify split, hyperparameters, and the 58.87% stacked-ensemble row |
| 5 | Youssef et al. 2023 | Main text (HTML preprint) | Landslide count 2,289 vs 2,881 in a caption; supplementary tables not read |
| 6 | Inan & Rahman 2023 | Main text (HTML preprint) | Inconsistent tuning tables and feature-impact prose; arXiv version, check the published one |
| 7 | Ghorbanzadeh et al. 2022 | Main text (HTML preprint) | Per-region patch counts and loss function not stated; DOI not confirmed |
| 8 | Lundberg et al. 2020 | Preprint text | — |

Equations and numbers are reproduced as written in the sources.

---

## 5. References

1. Stanley, T. A., Kirschbaum, D. B., Sobieszczyk, S., Jasinski, M. F., Borak, J. S., & Slaughter, S. L. (2020). Building a landslide hazard indicator with machine learning and land surface models. *Environmental Modelling & Software, 129*, 104692. https://doi.org/10.1016/j.envsoft.2020.104692
2. Stanley, T. A., Kirschbaum, D. B., Benz, G., Emberson, R. A., Amatya, P. M., Medwedeff, W., & Clark, M. K. (2021). Data-driven landslide nowcasting at the global scale. *Frontiers in Earth Science, 9*, 640043. https://doi.org/10.3389/feart.2021.640043
3. Khan, S., Kirschbaum, D. B., Stanley, T. A., Amatya, P. M., & Emberson, R. A. (2022). Global landslide forecasting system for hazard assessment and situational awareness. *Frontiers in Earth Science, 10*. https://doi.org/10.3389/feart.2022.878996
4. Chauhan, V., Gupta, L., & Dixit, J. (2025). Landslide susceptibility assessment for Uttarakhand, a Himalayan state of India, using multi-criteria decision making, bivariate, and machine learning models. *Geoenvironmental Disasters, 12*(1). https://doi.org/10.1186/s40677-024-00307-3
5. Youssef, K., Shao, K., Moon, S., & Bouchard, L.-S. (2023). Landslide susceptibility modeling by interpretable neural network. *Communications Earth & Environment, 4*. https://doi.org/10.1038/s43247-023-00806-5
6. Inan, M. S. K., & Rahman, I. (2023). Explainable AI integrated feature selection for landslide susceptibility mapping using TreeSHAP. *SN Computer Science, 4*, 48. https://arxiv.org/abs/2201.03225
7. Ghorbanzadeh, O., Xu, Y., Ghamisi, P., Kopp, M., & Kreil, D. (2022). Landslide4Sense: Reference benchmark data and deep learning models for landslide detection. *IEEE Transactions on Geoscience and Remote Sensing, 60*, 1–17. https://arxiv.org/abs/2206.00515
8. Lundberg, S. M., Erion, G., Chen, H., DeGrave, A., Prutkin, J. M., Nair, B., Katz, R., Himmelfarb, J., Bansal, N., & Lee, S.-I. (2020). From local explanations to global understanding with explainable AI for trees. *Nature Machine Intelligence, 2*(1), 56–67. https://doi.org/10.1038/s42256-019-0138-9
