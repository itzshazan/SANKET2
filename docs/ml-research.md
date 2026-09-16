# ML/CV Research — Landslide Early Warning System (SIH, 6 days, 6 people, free compute)

Every quantitative claim is tagged `[VERIFIED-URL]` (I opened the source and read the number) or
`[FROM-MEMORY-UNVERIFIED]` (I believe it but could not confirm it in this session).
Where a number came from a search-engine snippet rather than the primary document, it is tagged
`[VERIFIED-SNIPPET]` — treat as "probably right, re-check before putting it in a slide".

**Bottom line up front:** A/C/D are achievable in 6 days. B is achievable only in a reduced form.
Do not attempt to beat the Landslide4Sense leaderboard. Do not attempt to train a foundation model.

---

# SECTION E — FACULTY DATASET REQUEST CHECKLIST (do this today)

This is the highest-value section. Send this to the faculty member as a structured ask.
The three models have almost disjoint data requirements — if the faculty dataset only satisfies
one of them, you need to know **today** which two you are backfilling from public sources.

## E.0 — The four questions to ask first (30-second version)

Before the detailed checklist, get these four answers, because they determine everything else:

1. **What is the spatial extent and CRS?** (one district? one state? all of India? EPSG code?)
2. **Is there a landslide inventory, and is it points or polygons?** (points → susceptibility only; polygons → susceptibility + you can potentially use it for segmentation labels)
3. **Are there dates attached to each landslide?** (no dates → the rainfall-trigger model D is dead in the water for validation; you can still build it, but you cannot fit or evaluate a threshold)
4. **Are there any ground photographs at all?** (if no → Section B becomes a public-data + demo-only component; decide today)

## E.1 — For LANDSLIDE SUSCEPTIBILITY (tabular ML, Section C)

This is the component most likely to be trainable from a faculty dataset, and the one most
likely to actually work in 6 days. Prioritise it.

### Must-have (blocking — cannot train without these)

| Item | Format / spec | Why |
|---|---|---|
| Landslide inventory | Vector: `.shp` / `.gpkg` / `.geojson`, or CSV with `lat`,`lon` in decimal degrees | Positive samples |
| CRS declared | EPSG code stated explicitly (e.g. EPSG:4326 for lat/lon, EPSG:32644/32645 for UTM 44N/45N in N India) | A `.shp` with a missing `.prj` costs you half a day |
| Geometry type | Point *or* polygon — tell us which | Polygon → use centroid + area; point → use as-is |
| Count | ≥ 300 landslide records inside the study area | Below ~300 positives, spatial CV folds become too small to be meaningful |
| A DEM covering the same extent | GeoTIFF, single band, float or int16, nodata value declared, resolution stated (30 m is fine) | All terrain features derive from this |
| Study-area boundary | Vector polygon | Defines where you sample pseudo-absences |

### Strongly wanted (each one measurably improves the model)

| Item | Format | Notes |
|---|---|---|
| Date of each landslide | `YYYY-MM-DD` column | Unlocks Section D entirely. Ask explicitly — inventories often have it but it gets dropped on export |
| Lithology / geology polygons | `.shp` with a categorical class field | Consistently one of the top-3 features in published models |
| Road network | `.shp` lines | "distance to road" is a standard factor; OSM is an acceptable substitute |
| Drainage / stream network | `.shp` lines | "distance to river"; can also be derived from the DEM |
| LULC raster | GeoTIFF, categorical | Or substitute ESA WorldCover 10 m (free) |
| Rainfall raster/grid | Annual or monsoon mean, GeoTIFF | Or substitute IMD 0.25° gridded (free) |
| Fault lines | `.shp` | "distance to fault" |

### Explicitly ask: does the inventory contain non-landslide / stable-slope points?

Almost no inventory does, but if it does it is worth a lot — it removes the single biggest
methodological weakness of the whole component (see C.2). If not, we generate pseudo-absences.

### Minimum viable version

> **A CSV with `lat, lon` (EPSG:4326) for ≥300 landslide locations, plus the name of the district/state.**

With just that, we download SRTM/Copernicus DEM ourselves, derive all terrain features, sample
pseudo-absences, and train XGBoost. Everything else is upside. If the faculty dataset gives you
nothing but this, **you are still fine.**

### Red flags to check for on receipt

- Inventory clustered in one valley → spatial CV will show the model does not generalise. Report this honestly rather than hiding it behind random CV.
- Polygons with area = 0 or duplicated geometries.
- Coordinates that plot in the Gulf of Guinea (0,0) → lat/lon swapped or missing CRS.
- Dates all identical → it is a single-event inventory (e.g. one cyclone), not a multi-year one. This is *fine* for susceptibility, *fatal* for fitting rainfall thresholds.

## E.2 — For SATELLITE SCAR SEGMENTATION (Section A)

**Be realistic: you almost certainly do NOT need anything from the faculty here.** Landslide4Sense
is public, pre-patched, pre-labelled, and downloadable today. Building a segmentation training set
from raw faculty imagery would consume your entire 6 days on data engineering.

Ask for these only as a *bonus / demo-on-local-area* item:

### If they offer imagery

| Item | Spec |
|---|---|
| Sensor + product level | e.g. "Sentinel-2 L2A" vs "L1C" — changes normalisation |
| Band list and order | Explicit list. `[B1..B12, slope, DEM]` is the L4S convention |
| Bit depth / scaling | Are reflectances 0–1 floats, 0–10000 int16, or 0–255? This is the #1 silent bug |
| Georeferencing | GeoTIFF with CRS + transform, not a bare PNG |
| Nodata / cloud mask | Value used for nodata; any cloud mask band |
| Label rasters | Same grid, same size, uint8, 0 = background, 1 = landslide |
| Pre/post event dating | Which acquisition dates; were labels drawn on the post-event image |

### Minimum viable version

> **Nothing.** Use `ibm-nasa-geospatial/Landslide4sense` from Hugging Face.

### The one genuinely useful bonus ask

> "Do you have any labelled landslide polygons for our study area that we could rasterise onto
> Sentinel-2 tiles to make a small local test set (even 20–50 patches)?"

A tiny *local* test set makes the demo far more compelling than L4S numbers alone, and 20–50
patches is achievable. Do not ask for a local *training* set.

## E.3 — For FIELD PHOTO CLASSIFICATION (Section B)

This is the component most likely to be blocked by data. Decide today.

### Must-have

| Item | Spec |
|---|---|
| The images | JPG/PNG, any resolution ≥ 224 px on the short side |
| A label per image | CSV: `filename, label` |
| The label vocabulary | The exact list of classes, defined in words. e.g. `{no_hazard, crack, debris_on_road, slope_failure}` |
| Count per class | ≥ 100 per class minimum; ≥ 300 per class to be comfortable |
| Duplicate/burst warning | Were multiple photos taken of the same crack seconds apart? If yes we must group them, or the test set leaks |

### Strongly wanted

| Item | Why |
|---|---|
| EXIF GPS + timestamp intact | Lets you link photos to the susceptibility map and rainfall — this is the *entire* "citizen report" story in your demo |
| A severity label | Even a coarse `{low, medium, high}` per image. See B.4 |
| Site/location ID per photo | So you can split train/test **by site**, not by image. Without this your accuracy is inflated |

### Minimum viable version

> **A folder of ≥100 hazard photos + ≥100 non-hazard photos, and a one-line definition of each class.**

### If they have nothing (plan for this — it is the likely case)

Do not fake it. Do one of these, in order of preference:

1. **Reframe as crack/road-damage detection** using a public dataset (SDNET2018, RDD2022 — see B.1). Honest, trainable, demo-able.
2. **CLIP zero-shot / few-shot with a handful of hand-collected photos** (see B.3). Ship it as "no training data required", which is a legitimate and defensible engineering choice for a hackathon.
3. Drop the component. A working A + C + D is a better submission than a broken A + B + C + D.

## E.4 — For RAINFALL TRIGGERING (Section D)

### Must-have (only if you want to *fit* a threshold rather than use a published one)

| Item | Spec |
|---|---|
| Rain gauge or gridded rainfall time series | CSV: `station_id, date, rainfall_mm` — daily is enough, hourly is better |
| Station coordinates | `station_id, lat, lon, elevation` |
| Period of record | Must **overlap** the landslide inventory dates |
| Units | mm, and whether the value is the total *ending* at that timestamp or *starting* |

### Minimum viable version

> **Nothing — use a published threshold (see Section D) plus free IMERG/IMD rainfall.**

Fitting your own I–D threshold requires paired landslide-date + rainfall-at-that-location data
across many events. If the faculty dataset does not have dated landslides *and* co-located
rainfall, **use a published coefficient and say so.** This is normal practice and costs you
nothing with judges.

## E.5 — One-paragraph message you can actually send

> Sir/Ma'am, thank you for the dataset. To plan our 6-day build, could you confirm: (1) the spatial
> extent and the CRS/EPSG code; (2) whether the landslide inventory is points or polygons, and
> roughly how many records; (3) whether each record has a date; (4) whether a DEM for the same area
> is included, and at what resolution; (5) whether there are any ground-level photographs, and if so
> how many and with what labels; (6) whether any rainfall time series is included, and over what
> period. Even a partial answer lets us start today — we have public fallbacks for anything missing.

---

# SECTION A — LANDSLIDE SCAR SEGMENTATION (Landslide4Sense)

## A.1 Dataset facts (all verified)

| Property | Value | Source |
|---|---|---|
| Splits | **3,799 train / 245 val / 800 test** patches | [VERIFIED-URL](https://github.com/iarai/Landslide4Sense-2022) |
| Patch size | **128 × 128** px | [VERIFIED-URL](https://github.com/iarai/Landslide4Sense-2022) |
| Bands | **14**: Sentinel-2 B1–B12, **B13 = slope (ALOS PALSAR)**, **B14 = DEM (ALOS PALSAR)** | [VERIFIED-URL](https://github.com/iarai/Landslide4Sense-2022) |
| Resolution | all bands resampled to **~10 m/px** | [VERIFIED-URL](https://github.com/iarai/Landslide4Sense-2022) |
| File format | **HDF5** (`.h5`), key `img` for images, `mask` for labels | [VERIFIED-URL](https://raw.githubusercontent.com/iarai/Landslide4Sense-2022/main/dataset/landslide_dataset.py) |
| Classes | 0 = non-landslide, 1 = landslide (binary) | [VERIFIED-URL](https://github.com/iarai/Landslide4Sense-2022) |
| Class imbalance | **~2% landslide pixels; background ≈ 49× landslide** | [VERIFIED-URL](https://ar5iv.labs.arxiv.org/html/2209.02556) |
| Alt. figure | ~2.5% positive pixels; **58.4% of patches contain any landslide** (so ~42% are all-background) | [VERIFIED-SNIPPET](https://arxiv.org/html/2605.09746) |
| Geography | 4 regions: Iburi-Tobu (Hokkaido), Kodagu (Karnataka), Rasuwa (Bagmati), Western Taitung | [VERIFIED-SNIPPET](https://github.com/iarai/Landslide4Sense-2022) |
| License | MIT (baseline repo) | [VERIFIED-URL](https://github.com/iarai/Landslide4Sense-2022) |
| Total size | ~**8.99 GB** | [VERIFIED-URL](https://huggingface.co/datasets/ibm-nasa-geospatial/Landslide4sense) |

### CRITICAL PRACTICAL POINT — where to download from

The original IARAI competition release **withholds val and test masks** — labels ship only with the
training split. [VERIFIED-SNIPPET]

**Three working sources, checked 25 Aug 2026:**

| Source | Has test masks? | License | Notes |
|---|---|---|---|
| HF `ibm-nasa-geospatial/Landslide4sense` | **Yes** — `annotations/test/mask_1.h5`…`mask_800.h5` confirmed [VERIFIED-URL] | Not stated on the mirror | **Preferred** — institutional org, matches spec exactly |
| HF `harshinde/LandSlide4Sense` | **Yes** — same 800-file structure confirmed [VERIFIED-URL] | Not stated | Backup if the above is slow/unavailable |
| **Kaggle `tekbahadurkshetri/landslide4sense`** | **No** — `TestData/img` only, no mask subfolder [VERIFIED — inspected the Data Explorer directly] | **"Licensed by IARAI GmbH"** — clearer attribution than either HF mirror | 8.97 GB, `TestData/img` = exactly 800 files (matches spec), 3 years stable, 7,063 downloads, `kaggle datasets download` one-liner |

**→ For training, any of the three works identically** — train/val splits are the same 3,799 + 245
patches everywhere. **For reporting a number against the official test split, use one of the HF
mirrors** (test masks present). The Kaggle copy is genuinely the easiest to pull (`kaggle datasets
download -d tekbahadurkshetri/landslide4sense`, no HF auth dance) and has the least ambiguous
licence of the three — use it for train/val, and only reach for HF if you specifically want
official-test-split numbers rather than your own held-out split.

**Practical recommendation: don't bother with the official test split at all.** You are reporting
your own honestly-validated metrics, not submitting to the IARAI leaderboard — carve your own
held-out set from the 3,799 training patches (spatially/geographically separated, same discipline
as the susceptibility model's spatial-block CV in Section C) and report that. It is more
methodologically defensible than the official split anyway, and it means the Kaggle copy alone is
sufficient.

Structure: `images/{train,validation,test}/image_N.h5`, `annotations/{train,validation,test}/mask_N.h5`
(HF); `TrainData/`, `ValidData/`, `TestData/img/` (Kaggle).

**Action item day 1:** verify `annotations/test/` is actually populated before building your eval
pipeline around it. Budget 15 minutes. Fallback if it is empty: split the 3,799 training patches
yourself (see A.5).

## A.2 Competition results — what "good" looks like

Final test-phase F1 (%), from the competition outcome paper:

| Rank | Team | Test F1 | Approach |
|---|---|---|---|
| Baseline | IARAI U-Net | **59.92** | plain U-Net |
| 1 | Kingdrone (Wuhan Univ.) | **74.54** | Swin Transformer encoder + U-decoder, EfficientNetV2 encoder, SegFormer, **model ensemble** |
| 2 | Seek (Xidian Univ.) | ~**76.1** (see caveat) | Swin Transformer encoder + U-Net-like decoder, self-training |
| 3 | Tanmlh (TUM/DLR) | **73.5** | teacher–student self-training, CE + Jaccard loss, DenseCRF post-processing |
| Special | Sklgp | **71.29** | dual-branch multi-spectral U-Net, MobileNetV2-inspired |

[VERIFIED-URL](https://ar5iv.labs.arxiv.org/html/2209.02556)

**CAVEAT on the "76.1" for 2nd place:** it is higher than 1st place, which is internally
inconsistent. The extraction annotated it as "self-training with λ=100%", which reads like a number
from the Seek team's own ablation table (probably validation phase), not the final test leaderboard.
**Treat rank-2's official test F1 as "≈73–74, below Kingdrone" and do not quote 76.1 in a slide.**
[FLAGGED — see COULD NOT VERIFY]

The baseline U-Net's *validation*-set score is separately reported as **F1 57.82, Precision 51.75,
Recall 65.50** [VERIFIED-URL](https://github.com/iarai/Landslide4Sense-2022) — note the baseline is
recall-biased, which is the expected behaviour of an under-tuned model on a 2%-positive problem.

### Post-competition literature (this is the number that matters to you)

| Work | Model | F1 | mIoU | Notes |
|---|---|---|---|---|
| SFFS paper (2026) | **U-Net++ / ResNet-50, 8 selected channels** | **78.02 ± 0.32** | 61.2 | P 78.0 / R 74.0. **Trained on a Colab T4.** |
| SFFS paper | U-Net++ / ResNet-50, all 14 channels | 77.72 ± 0.35 | — | 8 channels ≈ 14 channels |
| Deep-NN paper (2312.16717) | best U-Net + residual + attention | 84.07 | 76.07 | 24.8M params, 5-fold CV, Titan RTX |
| Deep-NN paper | their reported "L4S baseline" | 77.19 | 68.64 | 29.8M params |
| Clay-CNN paper (2026) | U-Net baseline | 59.9 | — | matches IARAI baseline |
| Clay-CNN paper | U-Net + Clay v1.5 GFM features at bottleneck | 64.5 ± 1.8 | — | +4.6 pp over baseline |
| Clay-CNN paper | Clay v1.5 as sole encoder | 55.2 ± 3.6 | — | **worse than plain U-Net** |
| Prithvi-EO-2.0 300M | ViT + UPerNet, full data | 60.7 | 71.3 | |
| Prithvi-EO-2.0 600M | 50-image few-shot | 49.7 | 67.0 | |

Sources: [VERIFIED-URL](https://arxiv.org/html/2605.09746),
[VERIFIED-URL](https://arxiv.org/html/2312.16717v1),
[VERIFIED-URL](https://arxiv.org/html/2606.14081),
[VERIFIED-SNIPPET](https://github.com/NASA-IMPACT/Prithvi-EO-2.0)

> **⚠️ Note the metric-comparability trap.** The 84.07 figure is 5-fold CV on an 80/20 split of the
> *training* partition, not the held-out 800-patch test set. The 74.54 figure is the official test
> set. **These are not comparable.** Always state which split your number is on. Judges will not
> catch this, but a domain-expert judge will, and it is a cheap way to look rigorous.

### The single most important takeaway from this table

**Geospatial foundation models (Prithvi, Clay) LOSE to a well-tuned U-Net++ on this task.**
Prithvi-EO-2.0-300M gets F1 60.7; a ResNet-50 U-Net++ on a free Colab T4 gets 78.0.
**Do not spend any of your 6 days on Prithvi/Clay/TerraTorch.** It is the highest-prestige,
lowest-return option available to you.

## A.3 Realistic target for YOUR team

| Scenario | Realistic F1 (test split) | Realistic mIoU |
|---|---|---|
| You misconfigure normalisation or loss | 20–45 | — |
| Plain U-Net, CE loss, ~1 h on T4 | **55–62** | ~45–52 |
| **U-Net / U-Net++ with ImageNet encoder + BCE·Dice combo loss, 3–5 h on T4** | **72–78** | **58–62** |
| + light TTA (hflip/vflip) | +1–2 pp | |
| Competition-winning ensemble + self-training + CRF | 74–76 (official test) | — |

**Set your target at F1 ≥ 0.72 / IoU ≥ 0.58 and treat 0.78 as the stretch goal.** That is
defensibly "competitive with the 2022 winners" and is reachable in an afternoon.
The evidence that 78 is reachable on a free T4 is direct: the SFFS paper did exactly that.
[VERIFIED-URL](https://arxiv.org/html/2605.09746)

**Anything above 0.80 on the official test split should make you suspect a leak** (e.g. you
evaluated on patches that overlap your training patches, or you used the val split for both
early stopping and reporting).

## A.4 Concrete training recipe (copy this)

```
Data
  source          HuggingFace ibm-nasa-geospatial/Landslide4sense  (has test masks)
  format          h5py; hf['img'][:] -> (128,128,14) ; hf['mask'][:] -> (128,128)
  transpose       (H,W,C) -> (C,H,W)
  nan handling    np.nan_to_num(image, nan=1e-6)   # the official baseline replaces NaN
  normalisation   per-band (x - mean) / std, using the OFFICIAL baseline constants below
  resize          128 -> 256 bilinear (images) / nearest (masks)
                  # +0.3 pp in the SFFS paper and lets ImageNet encoders use all 5 stages

Model
  arch            smp.UnetPlusPlus  (segmentation_models_pytorch)
  encoder         resnet50, encoder_weights="imagenet"
  in_channels     14   (smp inflates the 3-ch stem automatically; verify it did)
  classes         1    (single logit, binary)

Loss  (THE most important choice — see A.6)
  0.5 * BCEWithLogitsLoss(pos_weight=torch.tensor([25.0]))  +  0.5 * DiceLoss(mode='binary')

Optimiser
  Adam, lr = 1e-4, PyTorch defaults for betas/eps
  scheduler: CosineAnnealingLR(T_max=n_epochs, eta_min=1e-6)

Training
  batch_size      8      (fits comfortably on a 16 GB T4 at 256x256 with resnet50)
  epochs          30-40  (SFFS used 20 per search round and was already at ~78 F1)
  AMP             torch.cuda.amp — roughly 1.6-2x speedup on T4, use it
  early stopping  monitor val F1 (not val loss), patience 8

Augmentation  (albumentations)
  A.HorizontalFlip(p=0.5)
  A.VerticalFlip(p=0.5)
  A.RandomRotate90(p=0.5)
  # that's it for the proven set. Optional, lower confidence:
  # A.ShiftScaleRotate(p=0.3), mild band-wise multiplicative jitter

Threshold
  DO NOT use 0.5. Sweep the sigmoid threshold on the validation split for best F1;
  optimum is typically 0.3-0.45 on a 2%-positive problem. This alone is often +2-4 pp F1
  and costs zero training time.

Inference
  TTA: average logits over {identity, hflip, vflip, hflip+vflip}. +1-2 pp, 4x inference cost.
```

### Official per-band normalisation constants (use these verbatim)

From `iarai/Landslide4Sense-2022/dataset/landslide_dataset.py`
[VERIFIED-URL](https://raw.githubusercontent.com/iarai/Landslide4Sense-2022/main/dataset/landslide_dataset.py):

```python
mean = [-0.4914, -0.3074, -0.1277, -0.0625,  0.0439,  0.0803,  0.0644,
         0.0802,  0.3000,  0.4082,  0.0823,  0.0516,  0.3338,  0.7819]
std  = [ 0.9325,  0.8775,  0.8860,  0.8869,  0.8857,  0.8418,  0.8354,
         0.8491,  0.9061,  1.6072,  0.8848,  0.9232,  0.9018,  1.2913]
# applied as: image[i] = (image[i] - mean[i]) / std[i]
```

> ⚠️ These means are negative and O(1), which is **not** what raw Sentinel-2 reflectance looks like.
> The repo's own `__main__` block recomputes channel-wise statistics over the dataset and the values
> are hardcoded back in. Most likely the `.h5` values are already scaled. **Sanity-check on day 1:**
> load one `image_*.h5`, print `arr.min()`, `arr.max()`, `arr.mean()` per band. If the raw values are
> in [0, 10000] these constants are wrong for your copy and you must recompute them yourself over the
> training split (a 3-minute job). This is the single most likely silent failure in the whole pipeline.

### Band selection (free speedup, no accuracy cost)

The SFFS paper found an **8-channel subset matches or slightly beats all 14 channels**
(78.02 vs 77.72 F1), at 119.8 FPS vs 80.4 FPS and 57.8 vs 61.0 GFLOPs.
Permutation importance ranked **B4 (Red) as the single most important channel, then B13 (slope),
then a grayscale composite**; B5, B8, B11 moderate; **DEM (B14) and B3 contributed little**.
[VERIFIED-URL](https://arxiv.org/html/2605.09746)

**Practical read:** keep all 14 for your main run (it is not the bottleneck), but if you are short
on time, a red + NIR + SWIR + slope subset is a defensible ablation slide and trains faster.
Note that **slope being the #2 feature** is a nice narrative hook — it directly connects your CV
model to your susceptibility model.

## A.5 Expected wall-clock on a Colab free T4

**No paper I found reports per-epoch runtime**, so these are engineering estimates, not citations.
[FROM-MEMORY-UNVERIFIED — but the shape is reliable]

| Stage | Estimate |
|---|---|
| Download 8.99 GB from HF | 10–25 min (do it to Google Drive once, not per-session) |
| Preprocess `.h5` → cached `.npy`/tensor | 10–15 min, one-off |
| U-Net++/ResNet-50, 256×256, bs=8, AMP, 3,799 patches | **~1.5–3 min/epoch** |
| 30 epochs | **~45–90 min** |
| 40 epochs + val each epoch | **~1.5–2.5 h** |
| Threshold sweep + TTA eval on 800 test patches | ~5 min |

**Total for one good run: comfortably under 3 hours.** You can afford 3–4 full runs.

### Colab free-tier constraints you must plan around

- Max session ~**12 h**, but can be cut earlier for inactivity or resource pressure. [VERIFIED-SNIPPET]
- Free T4 access is a **dynamic weekly budget, roughly 15–30 GPU-hours**, not a fixed daily quota, and Google does not publish a guaranteed number. [VERIFIED-SNIPPET](https://joshthompson.co.uk/ai/google-colab-2026-guide-free-compute-automations-pro-tips/)
- **Practical consequences — do these:**
  - Checkpoint every epoch to Google Drive. Assume you will be disconnected mid-run.
  - Use **separate Google accounts across your 6 team members** so you have 6 independent quotas. This is the single biggest free-compute multiplier available to you.
  - Cache the preprocessed tensors to Drive so a reconnect costs 2 min, not 40.
  - Do not leave a notebook idle with the GPU attached — it burns quota.
  - The laptop GPU should run the *long* job (segmentation); Colab should run the *many short* jobs (susceptibility CV, photo classifier sweeps).

## A.6 Loss function — why BCE(pos_weight) + Dice

The question was dice vs focal vs combo. The literature answer:

- **Dice** directly optimises overlap and is **insensitive to the number of true negatives**, which is exactly the pathology of a 2%-positive problem. [VERIFIED-SNIPPET]
- **Focal** down-weights well-classified pixels so gradients are dominated by hard pixels near the boundary. [VERIFIED-SNIPPET]
- **Tversky** generalises Dice with separate FP/FN weights, letting you bias toward recall. [VERIFIED-SNIPPET]
- **Combo (Dice + weighted CE)** was designed specifically to handle *both* input and output imbalance. Combinations of Dice + focal "have been shown to outperform either component alone" in medical segmentation. [VERIFIED-SNIPPET](https://arxiv.org/html/2312.05391v1)

What actually worked on *this dataset*:

| Source | Loss | Result |
|---|---|---|
| SFFS (T4, Colab) | **weighted BCE + Dice** | F1 78.02 |
| Clay-CNN | **0.9 × BCE(pos_weight=25) + 0.1 × Lovász hinge** | F1 59.9 (their U-Net baseline) |
| Deep-NN paper | **Focal + IoU, equal weight** | F1 84.07 (on their own CV split) |
| Tanmlh (3rd place) | CE + Jaccard | F1 73.5 |
| Kingdrone / Seek | Lovász, soft-CE, weighted-CE + Lovász, OHEM | F1 ~74.5 |

[VERIFIED-URL](https://arxiv.org/html/2605.09746), [VERIFIED-URL](https://arxiv.org/html/2606.14081), [VERIFIED-URL](https://arxiv.org/html/2312.16717v1), [VERIFIED-URL](https://ar5iv.labs.arxiv.org/html/2209.02556)

**Recommendation: `0.5 * BCE(pos_weight=25) + 0.5 * Dice`.** It is the option with direct evidence on
this exact dataset on this exact hardware, it is two lines in `segmentation_models_pytorch`, and
`pos_weight=25` is close to the true 1:49 background ratio without being so extreme that training
destabilises. **Do not use plain cross-entropy** — that is what gets you the 59.9 baseline.

If you have spare time, the one ablation worth running is swapping Dice → **Focal Tversky (α=0.7,
β=0.3)** to bias toward recall, which is arguably the right operating point for an *early warning*
system where a missed landslide costs more than a false alarm. That framing is worth a slide.

## A.7 Pretrained checkpoints you can fine-tune instead of training from scratch

| Checkpoint | What it is | Where | Verdict |
|---|---|---|---|
| **ImageNet encoder weights** via `segmentation_models_pytorch` | ResNet-50/EfficientNet encoder, ImageNet-pretrained | `pip install segmentation-models-pytorch`, `encoder_weights="imagenet"` | **★ USE THIS.** Zero friction, this is what the 78-F1 result used. |
| **TransLandSeg** `Landslide4Sense.pth.tar` | SAM ViT-L adapted for landslide segmentation, trained on L4S | [github.com/JunchuanYu/TransLandSeg](https://github.com/JunchuanYu/TransLandSeg) — Google Drive + Baidu links [VERIFIED-URL] | Genuinely a L4S-trained checkpoint. But SAM ViT-L is heavy for a T4 and the repo does not publish IoU/F1 or hardware requirements. **Backup only.** |
| **SAM-CFFNet** | SAM-based cross-depth feature fusion, has L4S checkpoints | [github.com/JunchuanYu/SAM-CFFNet](https://github.com/JunchuanYu/SAM-CFFNet) [VERIFIED-SNIPPET] | Same caveat as above |
| **IARAI baseline pretrained U-Net** | The 57.82-F1 baseline | [github.com/iarai/Landslide4Sense-2022](https://github.com/iarai/Landslide4Sense-2022) [VERIFIED-URL] | Useful as a *sanity check* that your data pipeline is correct — if you load it and reproduce ~58 F1, your normalisation is right. **High value for debugging, low value as a starting point.** |
| **Prithvi-EO-2.0 / Clay v1.5** | Geospatial foundation models | HuggingFace `ibm-nasa-geospatial/*` | **AVOID.** Underperform plain U-Net on this task (60.7 vs 78.0). |
| `harshinde/DeepSlide_Models` | HF repo, trained on L4S | [huggingface.co/harshinde/DeepSlide_Models](https://huggingface.co/harshinde/DeepSlide_Models) | Model card is empty — no metrics, no input spec. Unverifiable. Skip. |

**Recommendation: do not hunt for a landslide-specific checkpoint. An ImageNet-pretrained ResNet-50
encoder inside U-Net++ is both the easiest and the best-evidenced option.** The "pretrained weights"
you need are ImageNet ones, and `smp` gives them to you for free.

Use the IARAI baseline checkpoint purely as a pipeline sanity test on day 1.

## A.8 What NOT to do (6-day reality check)

| Idea | Verdict |
|---|---|
| Swin Transformer / SegFormer-B5 ensemble like the winners | ❌ Winners used multi-model ensembles + self-training + CRF. That is weeks of work for +2 pp over what you'll get. |
| Fine-tuning Prithvi / Clay / TerraTorch | ❌ Worse results, much higher setup cost. |
| Self-training / pseudo-labelling | ❌ Doubles your training loop complexity for maybe +1–2 pp. |
| DenseCRF post-processing | ❌ Fiddly, CPU-bound, marginal. |
| Training from scratch (no ImageNet init) | ❌ Costs you ~15 pp F1 for no reason. |
| **SegFormer-B0** | ⚠️ Fine as a *second* model if U-Net++ is already working. `transformers.SegformerForSemanticSegmentation` with `num_channels=14` needs manual stem surgery. Budget 2 h of debugging. Only if you're ahead of schedule. |
| Building your own patches from raw Sentinel-2 | ❌ This is a 3-day data-engineering task. Use L4S. |

---

# SECTION B — FIELD PHOTO CLASSIFICATION (ground-level cracks / debris / slope failure)

## B.1 Public datasets that actually exist

### Crack / surface-damage (plentiful, high quality, NOT landslide-specific)

| Dataset | Size | Format | Notes | Source |
|---|---|---|---|---|
| **SDNET2018** | **56,000+** images | 256×256 RGB JPG | Cracked/non-cracked concrete. 3 subdirs: `D` bridge decks, `W` walls, `P` pavements. Cracks 0.06 mm–25 mm | [VERIFIED-URL](https://www.sciencedirect.com/science/article/pii/S2352340918314082) — free at `doi.org/10.15142/T3TD19` |
| **Concrete Crack Images for Classification** (Özgenel) | **40,000** (20k crack / 20k no-crack) | 227×227 RGB | Perfectly balanced and trivially easy — models hit >98%. Good smoke test, bad headline result | [VERIFIED-SNIPPET] |
| **RDD2022** | **47,420** images, **55,000+** damage instances | bbox, YOLO-convertible | **6 countries INCLUDING INDIA.** Classes: D00 longitudinal crack, D10 transverse crack, D20 alligator crack, D40 pothole | [VERIFIED-URL](https://arxiv.org/pdf/2209.08538) |
| **CrackForest (CFD)** | ~118 images | pixel masks | Very small, road surface, segmentation | [FROM-MEMORY-UNVERIFIED — count not confirmed] |

**RDD2022 is the most relevant to you** — it has an Indian subset and is road-oriented, matching
"debris/damage on road". [VERIFIED-URL](https://arxiv.org/pdf/2209.08538)

### Landslide-specific ground-level imagery (scarce)

| Resource | Size | Reality check |
|---|---|---|
| Social-media landslide classification (Ofli/Imran et al., arXiv 2110.04080 / 2202.07475) | A related study had **11,737 photographs independently triple-labelled by 3 landslide specialists** | Papers state a dataset was created for community release, but **I could not confirm a working public download URL.** [VERIFIED-SNIPPET for the 11,737 figure] |
| Non-nadiral / crowdsourced optical landslide images (2020) | — | Reports **87–90% average accuracy** for CNNs calibrated on validated landform image datasets, "consistently higher than general-purpose SOTA CNNs". [VERIFIED-SNIPPET] **This is your realistic accuracy anchor.** |
| **CAS Landslide Dataset** | **20,865** patches, 512×512, 0.2–5 m, 9 regions, satellite + UAV | [VERIFIED-URL](https://zenodo.org/records/10294997) — **aerial/UAV, NOT ground-level.** Do not mistake it for a field-photo dataset. Useful as a *second* high-resolution segmentation dataset. |
| Roboflow Universe landslide projects | "Landslides extraction" ~1.3k imgs (CC BY 4.0); USP "Landslides" 322 imgs; "landslide-vuseg" 196 imgs | [VERIFIED-SNIPPET](https://universe.roboflow.com/) — unvetted quality, mixed licences, many aerial. **Worth 30 min of browsing, not more.** |

### Honest summary

**There is no large, clean, public, ground-level landslide photo classification dataset.**
Your options: (a) faculty photos, (b) reframe to crack/road-damage using SDNET2018 + RDD2022,
(c) CLIP zero/few-shot on a hand-assembled set.

## B.2 The three approaches compared

| Approach | Data needed | Train time | Expected acc. (4-class, few hundred imgs) | Overfit risk |
|---|---|---|---|---|
| Full fine-tune EfficientNet-B0 / ViT-B | 300+/class | 10–30 min on T4 | 80–90% | **High** |
| **Linear probe on frozen features** (CLIP ViT-B/32 or DINOv2) | 20–200/class | **< 2 min, CPU-viable** | **75–88%** | **Low** |
| CLIP zero-shot (text prompts only) | **0** | 0 | 55–75% | None |
| CLIP few-shot (LP++ / CLIP-Adapter / CoOp) | 4–16/class | minutes | 70–85% | Low |

Evidence:
- Linear-probe CLIP **needs >4 shots on average just to match zero-shot CLIP**; at 1–2 shots it barely reaches zero-shot. [VERIFIED-SNIPPET](https://arxiv.org/pdf/2109.01134)
- Zero-shot CLIP **matches a 4-shot linear classifier** on the same feature space and nearly matches a 16-shot one. [VERIFIED-SNIPPET]
- Full fine-tuning on small data overfits badly: a fully fine-tuned probe hit **60.86%** on EuroSAT where a better-regularised approach hit **95.61%**. [VERIFIED-SNIPPET](https://arxiv.org/html/2407.04003v1)
- CLIP-Adapter and DAPT beat linear-probe CLIP by large margins in low-shot (DAPT **+14.87%** avg at 1-shot). [VERIFIED-SNIPPET](https://arxiv.org/pdf/2110.04544), [VERIFIED-SNIPPET](https://arxiv.org/pdf/2309.03406)
- Frozen-feature transfer is "standard practice when labelled data or compute budgets are limited", and the linear probe can often be **solved in closed form**, eliminating LR/init/schedule tuning. [VERIFIED-SNIPPET](https://arxiv.org/html/2604.03928v1)
- Rule-of-thumb for fine-tuning in specialised domains: **150–500 original images per class** before augmentation. [VERIFIED-SNIPPET]

## B.3 ⭐ CONCRETE RECOMMENDATION

> **Do BOTH, in this order. Total cost: under one person-day.**
>
> **Step 1 (30 min) — CLIP zero-shot as baseline AND fallback.**
> `open_clip` ViT-B/32 (or ViT-L/14 if quota allows). Hand-write prompts:
> `"a photo of a cracked road surface"`, `"a photo of rocks and debris blocking a road"`,
> `"a photo of a collapsed hillside with exposed soil"`, `"a photo of a normal intact road"`.
> Expect **~60–75%** 4-class accuracy with **zero training data**.
> This guarantees a working component even if faculty photos never arrive.
>
> **Step 2 (2 h) — Logistic-regression linear probe on frozen CLIP features.**
> Extract 512-d (ViT-B/32) or 768-d (ViT-L/14) embeddings once, cache to disk, then
> `LogisticRegression(C=..., max_iter=1000, class_weight='balanced')`.
> Sweep `C ∈ [0.01, 0.1, 1, 10, 100]` under grouped CV — the whole sweep runs in seconds on CPU.
> Expect **~80–88%** with 200–300 images/class; **~75–82%** with 50–100/class.
>
> **Only if you have ≥300 images/class AND spare time (you won't):** fine-tune EfficientNet-B0 with
> heavy augmentation, 3 epochs of frozen-backbone warmup, early stopping. Expect 85–90%. The
> marginal gain over the linear probe does not justify the risk.

### Why linear probe over fine-tuning, specifically for this team

1. **It cannot blow up.** No LR schedule, no divergence, no 3 a.m. debugging.
2. **Feature extraction is a one-time cost.** After that every experiment takes seconds, so all 6 people can iterate simultaneously without touching the GPU.
3. **It is honest about small data.** With 200 images you should not be tuning 5M+ parameters.
4. **It composes with the demo.** The same frozen embeddings feed the severity head (B.4) and a nearest-neighbour "similar past incidents" lookup — a strong demo moment for near-zero extra work.
5. **CPU-viable** → does not compete with segmentation for your T4 quota.

### Two details that matter more than model choice

- **Split by site/incident, not by image.** If 8 photos of the same crack straddle train and test, your accuracy is fiction. Use `GroupKFold` with a site ID. No site ID? Cluster by EXIF timestamp (photos within ~5 min = same site) or by embedding similarity.
- **Report macro-F1 + confusion matrix, not accuracy.** Field-photo classes are always imbalanced; "97% accuracy" on a 90%-negative set is meaningless. Use `class_weight='balanced'`.

## B.4 Severity estimation with weak labels

**Option 1 — Ordinal classification (recommended).**
Treat severity as ordered `{none < minor < major < severe}` — the xBD convention (0 no damage,
1 minor, 2 major, 3 destroyed). [VERIFIED-SNIPPET](https://www.emergentmind.com/topics/xbd-dataset)
Three techniques transfer directly from the xBD literature:
- **Ordinal cross-entropy** — penalise by *distance* from the true label, so predicting "none" when truth is "severe" costs far more than predicting "major". [VERIFIED-SNIPPET]
- **Report ordinal MAE alongside macro-F1** — it "penalises large severity confusions more strongly than adjacent ones", the operationally meaningful metric. [VERIFIED-SNIPPET](https://arxiv.org/pdf/2606.21819)
- **Class weights inversely proportional to class frequency.** [VERIFIED-SNIPPET]

Cheapest implementation: logistic regression on frozen CLIP features with K−1 cumulative binary
heads ("severity ≥ 1?", "≥ 2?", "≥ 3?"), then decode. ~20 lines.

**Option 2 — Regression on a weak proxy (no severity labels at all).**
Derive a continuous proxy from what you *can* measure automatically: fraction of pixels classified
as debris/crack, crack width in pixels, whether the road centreline is occluded. Bin into 3 levels.
Defensible, explainable, zero annotation cost.

**Option 3 — Rank-based weak supervision.** Have one person sort ~100 photos worst-to-best
(pairwise comparison is far faster and more consistent than absolute labelling — ~15 min), fit a
ranking model on frozen features, threshold into 3 bands.

**Option 4 — VLM as weak labeller.** Prompt a VLM for a severity rating, use as noisy labels.
Caveat: generic VLMs "achieve moderate accuracy on damage-level classification, though macro-F1
remains low under class imbalance and severity confusion."
[VERIFIED-SNIPPET](https://arxiv.org/pdf/2606.21819) Use to *bootstrap* labels, then hand-correct
disagreements — never as the final model.

**Recommendation: Option 1 if you get any severity labels; Option 2 if you don't.**
Present severity as a 3-band advisory, never as a calibrated probability.

## B.5 Reality check on Section B

- ✅ Achievable: CLIP zero-shot + linear probe on a few hundred images, grouped CV, confusion matrix. **~1 person-day.**
- ⚠️ Risky: fine-tuning EfficientNet/ViT. Only if data lands early and you have ≥300/class.
- ❌ NOT achievable: collecting and labelling your own ground-photo dataset from scratch.
- ❌ NOT achievable: matching the published 87–90% landform-CNN accuracy without their data.
- ❌ NOT achievable: reliable *quantitative* severity ("this crack is 12 mm wide") from uncalibrated phone photos with no reference object in frame. **Do not promise this.**

---

# SECTION C — LANDSLIDE SUSCEPTIBILITY MODELING (tabular ML)

**This is your safest component.** Fast, CPU-only, produces a map (great visual), published AUCs
are high. Assign 2 people and expect it to work.

## C.1 Standard feature set and which library computes each

Consensus conditioning-factor set (12–14 factors) across the literature:

- **Topographic (from DEM):** elevation, slope, aspect, plan curvature, profile curvature, total curvature, terrain roughness index (TRI)
- **Hydrological (from DEM):** flow accumulation, TWI, SPI, STI
- **Geological:** lithology, distance to faults
- **Anthropogenic/environmental:** distance to roads, distance to rivers, LULC, NDVI
- **Climatic:** rainfall

[VERIFIED-SNIPPET — multiple independent studies converge on this list]

Definitions:
- `TWI = ln(A / tan(slope))`, A = upslope contributing area per unit contour length. [VERIFIED-URL](https://www.whiteboxgeo.com/manuals/qgis/terrain-analysis.html)
- `SPI = A · tan(slope)` [FROM-MEMORY-UNVERIFIED]
- `STI = (A/22.13)^0.6 · (sin(slope)/0.0896)^1.3` [FROM-MEMORY-UNVERIFIED]
- **Plan curvature** = flow convergence/divergence; **profile curvature** = flow acceleration/deceleration. [VERIFIED-URL](https://www.whiteboxgeo.com/manuals/qgis/terrain-analysis.html)

### Library capability matrix

| Feature | richdem | WhiteboxTools | pysheds | xarray-spatial | GDAL |
|---|---|---|---|---|---|
| Slope | ✅ `slope_riserun` / `slope_percentage` / `slope_degrees` / `slope_radians` | ✅ `Slope` | ➖ | ✅ `xrspatial.slope` | ✅ `gdaldem slope` |
| Aspect | ✅ `aspect` | ✅ `Aspect` | ➖ | ✅ `xrspatial.aspect` | ✅ `gdaldem aspect` |
| Plan/planform curvature | ✅ `planform_curvature` | ✅ `PlanCurvature` | ➖ | ➖ (generic only) | ➖ |
| Profile curvature | ✅ `profile_curvature` | ✅ `ProfileCurvature` | ➖ | ➖ | ➖ |
| Total/tangential curvature | ✅ `curvature` | ✅ `TotalCurvature`, `TangentialCurvature` | ➖ | ✅ `xrspatial.curvature` | ➖ |
| Depression filling | ✅ (its speciality) | ✅ `FillDepressions` | ✅ | ➖ | ➖ |
| Flow accumulation | ✅ | ✅ `D8FlowAccumulation` | ✅ (its speciality, D8/D∞) | ✅ (D8/D∞/MFD) | ➖ |
| **TWI** | ➖ | ✅ **`WetnessIndex`** | ➖ (manual) | ➖ (manual) | ➖ |
| **SPI** | ➖ | ✅ | ➖ | ➖ | ➖ |
| **STI** | ➖ | ✅ **`SedimentTransportIndex`** | ➖ | ➖ | ➖ |
| Hillshade | ✅ | ✅ | ➖ | ✅ | ✅ |

Sources:
[VERIFIED-URL richdem](https://richdem.readthedocs.io/en/latest/terrain_attributes.html) — page explicitly lists the slope variants, `aspect`, `profile_curvature`, `planform_curvature`, `curvature`; **it does NOT document flow accumulation or TWI on that page**.
[VERIFIED-URL Whitebox](https://www.whiteboxgeo.com/manuals/qgis/terrain-analysis.html) — 700+ tools; `WetnessIndex` = Ln(A/tan(slope)); `SedimentTransportIndex`; `TangentialCurvature`; `TotalCurvature`.
[VERIFIED-URL xarray-spatial](https://xarray-spatial.readthedocs.io/en/latest/user_guide/surface.html) — numba-backed; slope/aspect/curvature/hillshade; 150+ functions incl. D8/D∞/MFD hydrology; optional GPU.

### ⭐ Recommendation: **WhiteboxTools (`pip install whitebox`)** as primary

**Why:** it is the only one of the five with **TWI, SPI and STI as single built-in calls**, plus
every curvature variant, plus depression filling and flow accumulation. Everything else forces you
to hand-roll TWI/SPI/STI from flow accumulation + slope — where sign errors, log-of-zero and unit
mistakes will eat an afternoon.

- **Easiest:** WhiteboxTools. One `pip install`, no compiler, GeoTIFF in / GeoTIFF out.
- **Fastest for pure hydrology on huge DEMs:** pysheds (numba) or richdem (C++ core). **But at SIH scale (one district, 30 m DEM) every one of these runs in seconds to a couple of minutes. Speed is genuinely not your bottleneck — do not optimise it.**
- **richdem** — good second opinion for plan/profile curvature (cleanest direct API).
- **xarray-spatial** — only if you are already in an xarray/dask workflow.
- **GDAL `gdaldem`** — quick command-line sanity check on slope/aspect.

**Practical warnings:**
- WhiteboxTools writes files rather than returning arrays, and is picky about paths. On Windows pass fully-qualified paths with forward slashes.
- **Order matters:** `FillDepressions` (or `BreachDepressions`) → `D8FlowAccumulation` → `WetnessIndex`. Skipping depression filling gives you a TWI raster full of holes.

## C.2 Pseudo-absence / negative sampling — what the literature actually recommends

There is **no single consensus**; this is a genuine open problem. What is established:

### Ratio

**1:1 is the dominant convention.** Spiti Valley (Himachal Pradesh) used **1,500 landslide points
and 1,500 non-landslide points**, 70/30 train/test.
[VERIFIED-URL](https://pmc.ncbi.nlm.nih.gov/articles/PMC11985504/)
Most published LSM papers balance by construction — which is why imbalance handling is rarely
discussed in this literature (see C.5).

### Buffer distance from positives

- Buffer-controlled sampling (BCS) places a buffer around known landslides and samples only outside it, to break spatial-proximity leakage. [VERIFIED-SNIPPET](https://www.tandfonline.com/doi/full/10.1080/19475705.2024.2392778)
- **Spiti Valley: 300 m** minimum distance from past landslides. [VERIFIED-URL](https://pmc.ncbi.nlm.nih.gov/articles/PMC11985504/)
- Dou et al. (2023): **600–1,500 m**. [VERIFIED-SNIPPET]
- Gameiro et al. (2021): accuracy correlates with distance; one study found a **40 km** buffer gave the best models. [VERIFIED-SNIPPET]
- Explicit caveat in the literature: *"the selection of the buffer distance is subjective because it depends on expert knowledge"* and *"must be tailored to the specific characteristics of landslides in the study area."* [VERIFIED-SNIPPET]

### Slope masking — the Spiti Valley comparison

| Strategy | Definition | XGBoost AUC | RF AUC | KNN AUC |
|---|---|---|---|---|
| **Category-I (BZSP)** | random points with **slope < 10°** AND ≥ 300 m from landslides | 0.91 | 0.89 | 0.87 |
| **Category-II (SBSP)** | ≥ 300 m from landslides, **no slope constraint** | **0.97** | **0.97** | **0.94** |

[VERIFIED-URL](https://pmc.ncbi.nlm.nih.gov/articles/PMC11985504/)

> **⚠️ READ CAREFULLY — the paper's framing is the opposite of the right lesson.**
> It presents Category-II as "better" because AUC is higher. But Category-I is the one that
> restricts negatives to slope < 10°, which should make the task *easier* (flat = obviously stable),
> yet it scored *lower*. That is counter-intuitive and suggests either the labels are swapped in the
> source, or Cat-II's unconstrained negatives happen to include many trivially-flat points anyway.
>
> **The robust methodological point:** a higher AUC from a negative-sampling change is usually the
> model learning *"steep vs flat"*, not *"will fail vs won't fail"*. **If you slope-mask your
> negatives you are training a slope detector and your AUC is inflated.** Report it, don't celebrate it.

### ⭐ Recommendation

```
ratio       1:1  (n_negatives = n_positives)
buffer      exclude everything within 500 m of any known landslide
            (mid-range of the published 300 m / 600-1500 m values)
slope mask  DO NOT hard-mask by slope for your headline model.
            Sample negatives from within the study-area polygon.
ablation    Run BOTH (with and without slope<10 masking) and show the AUC gap as an
            honest "how sampling choice inflates your metric" slide. 20-minute
            experiment; exactly the methodological self-awareness that wins judging.
seeds       Repeat sampling with >=5 random seeds; report mean +/- sd AUC. Sampling
            randomness is a documented source of LSM uncertainty. [VERIFIED-SNIPPET]
```

**State the known limitation out loud:** some selected non-landslide samples may be pseudo-absences
— "appearing stable but still having considerable probability of sliding" — and it is "generally
more challenging to obtain truly reliable non-landslide samples than landslide samples."
[VERIFIED-SNIPPET](https://www.nature.com/articles/s41598-024-57964-5) Saying this in your
presentation makes you look like you read the field.

## C.3 Spatial cross-validation — do not skip this

### Why

Random CV ignores spatial autocorrelation. Test points can come from **the same slope, or even the
same landslide**, as training points, giving "over-optimistic estimates of the model's ability to
predict susceptibility to *new* landslides." Non-spatial AUC can be **substantially higher** than
spatial AUC. [VERIFIED-SNIPPET](https://www.acsu.buffalo.edu/~yhu42/papers/2023_GeoAIHandbook_SpatialCV.pdf)

A figure of **5–15% AUC inflation for random splits** appeared in search results but I **could not
verify it against the primary source** (MDPI returned 403). Treat the *direction* as certain and the
*magnitude* as indicative. [COULD NOT VERIFY]

### How, in Python

| Tool | What it does | Verdict |
|---|---|---|
| **`verde.BlockKFold`** | sklearn-compatible k-fold that splits into **spatial blocks first**, then assigns blocks to folds; balances folds to ~equal point counts by default | **★ USE THIS.** [VERIFIED-URL](https://www.fatiando.org/verde/latest/gallery/blockkfold.html) Drop-in for `cross_val_score(cv=...)` |
| **`spacv`** | dedicated spatial k-fold CV package, incl. geo-attribute-based CV | Good alternative [VERIFIED-SNIPPET] |
| **`sklearn.GroupKFold`** | packs whole regions into folds without splitting a region across the boundary; caps fold count | ★ Simplest if you can assign a region/watershed/grid-cell ID [VERIFIED-SNIPPET] |
| `sklearn.LeaveOneGroupOut` | one fold per region | For few, large regions |
| R: `blockCV`, `sperrorest`, `mlr3spatiotempcv`, `spatialsample` | mature; `blockCV` also has buffered-LOO and NNDM-LOO | [VERIFIED-SNIPPET](https://arxiv.org/pdf/2110.12674) — don't switch to R for a hackathon |

### ⭐ Recommendation

> Assign every sample a grid-cell ID by snapping coordinates to a **5 km × 5 km grid**
> (`np.floor(x/5000)`, `np.floor(y/5000)` in a **projected** CRS — UTM, not lat/lon degrees).
> Then `GroupKFold(n_splits=5)` on that ID. Two lines, no new dependency.
> To look more rigorous, swap in `verde.BlockKFold(spacing=5000, n_splits=5)`.
>
> **Report BOTH random-CV AUC and spatial-CV AUC side by side. The gap IS a result.**
> Presenting only the random-CV number is the most common flaw in this literature, and a judge who
> knows the field will ask about it.

**Block-size guidance:** the block should exceed the range of spatial autocorrelation in your
features. 5 km is a reasonable default for 30 m DEM features at district scale; if your inventory is
clustered in one valley, go larger. [FROM-MEMORY-UNVERIFIED]

## C.4 Published ROC-AUC ranges — sanity-check against these

| Study / region | Model | AUC | Source |
|---|---|---|---|
| Spiti Valley, HP (Cat-I sampling) | XGBoost | 0.91 | [VERIFIED-URL](https://pmc.ncbi.nlm.nih.gov/articles/PMC11985504/) |
| Spiti Valley, HP (Cat-I) | Random Forest | 0.89 | same |
| Spiti Valley, HP (Cat-I) | KNN | 0.87 | same |
| Spiti Valley, HP (Cat-II) | XGBoost / RF | 0.97 / 0.97 | same |
| Uttarakhand | XGBoost | 0.96 | [VERIFIED-SNIPPET] |
| Sub-Himalayan West Bengal | meta-learning ensemble | 0.987 | [VERIFIED-SNIPPET](https://www.nature.com/articles/s41598-025-87587-3) |
| Northern Thailand | Random Forest | 0.942 | [VERIFIED-SNIPPET] |
| Himalayan comparison study | XGBoost | 0.91–0.93 | [VERIFIED-SNIPPET](https://onlinelibrary.wiley.com/doi/10.1002/gj.5175) |
| Himalayan comparison study | Random Forest | often < 0.85 | [VERIFIED-SNIPPET] |

### How to read this

- **Published range ≈ 0.85–0.99, clustering 0.90–0.97**, XGBoost typically edging out RF. [VERIFIED-SNIPPET]
- **Your expected number with random CV: 0.90–0.96.** That is normal, not impressive.
- **Your expected number with spatial CV: 0.78–0.90.** This is the honest one — lead with it.
- **AUC > 0.98 under random CV → suspect a leak.** Most likely you sampled negatives without a buffer (near-duplicate points across folds), or a feature encodes the label.
- **AUC ≈ 0.5–0.65 → a real bug, not a hard problem.** #1 cause: CRS mismatch — sampling a UTM raster at lat/lon coordinates, so every sample reads nodata.

## C.5 Class imbalance handling (tabular)

**Framing:** in landslide susceptibility, imbalance is usually **eliminated by construction** — you
choose how many negatives to generate, and the field convention is 1:1
[VERIFIED-URL](https://pmc.ncbi.nlm.nih.gov/articles/PMC11985504/). This is a far smaller problem
here than in Section A.

If you do end up imbalanced (e.g. scoring every pixel in the study area):

| Technique | When | Note |
|---|---|---|
| **1:1 sampling** | default | What the literature does. Start here. |
| `scale_pos_weight = n_neg/n_pos` (XGBoost) | worse than ~1:5 | One parameter, no resampling |
| `class_weight='balanced'` (sklearn RF/LogReg) | same | |
| **Report PR-AUC alongside ROC-AUC** | always, if imbalanced | ROC-AUC is optimistic under imbalance; PR-AUC is the honest companion |
| SMOTE / ADASYN | ⚠️ | Synthesises geographically meaningless points in feature space. Common in the literature but hard to defend. **Skip it** — you control the sampling ratio directly. |
| Calibration (`CalibratedClassifierCV`, isotonic/Platt) | if you present probabilities | If the map is labelled "probability of landslide" it should be calibrated. Cheap, and upgrades your deliverable from a score map to a probability map. |

**Do not use accuracy** once you move to full-area scoring.

## C.6 Reality check on Section C

- ✅ **Very achievable.** DEM features + XGBoost + spatial CV + susceptibility raster ≈ 1–2 person-days for two people. This should be your most polished component.
- ✅ Runs entirely on CPU — does not compete for GPU quota.
- ⚠️ The real bottleneck is **CRS and raster-alignment plumbing**, not modelling. Budget a full day for "all rasters on one grid, one CRS, one resolution". Use `rasterio` + `rioxarray.reproject_match()`.
- ❌ NOT achievable: physically-based modelling (TRIGRS, infinite-slope with real geotechnical parameters). Requires soil depth, cohesion, friction angle, hydraulic conductivity — you will not have these.

---

# SECTION D — RAINFALL TRIGGERING

## D.1 Published I = α·D^(−β) thresholds for India

**Units are the trap.** Some are mm/h vs hours, some mm/day vs days. They are NOT interchangeable
and α changes by orders of magnitude between them. Always state units.

| Region | Threshold | Units (I, D) | Source |
|---|---|---|---|
| **NW Himalaya** | **I = 2.9993 · D^(−0.4152)** | not stated in snippet — likely mm/h, h | [VERIFIED-SNIPPET] — **TRMM**-derived, "frequentist" method, landslides **2007–2016** |
| **NE Himalaya** | **I = 5.8294 · D^(−0.4141)** | same | same source; corroborated across two independent search results |
| Lanta Khola, N. Sikkim | I = 73.90 · D^(−0.79) | **mm/h, hours** | [VERIFIED-SNIPPET](https://www.academia.edu/87924020/) |
| Sikkim region (regional) | I = 43.26 · D^(−0.78) | **mm/day, days** | [VERIFIED-SNIPPET] |
| Gangtok (local) | I = 100 · D^(−0.92) | mm/day, days (implied) | [VERIFIED-SNIPPET] |
| Kalimpong, Darjeeling | **48-hour rainfall of 36.7 mm** can trigger landslides | cumulative mm | [VERIFIED-SNIPPET] (Dikshit & Satyam 2018) |
| Darjeeling Himalaya | rainfall of **0.95 mm/h** → high risk of initiation | mm/h | [VERIFIED-SNIPPET] |

### What to actually use

> **For NE India / Indian Himalaya use `I = 5.8294 · D^(−0.4141)` (NE) and
> `I = 2.9993 · D^(−0.4152)` (NW)**, cited as TRMM-derived frequentist thresholds over 2007–2016.
>
> **⚠️ Confirm units before coding.** I saw these coefficients in two independent results but never
> the unit statement in primary text (both the IAS/JESS full text and the MDPI review returned
> HTTP 403). **Cross-check that suggests mm/h and hours is correct:** at D = 24 h,
> 5.83 × 24^(−0.414) ≈ **1.6 mm/h ≈ 39 mm/day** — physically sensible for NE India monsoon and
> consistent with the Kalimpong 48 h / 36.7 mm figure. Verify before publishing a number.

**Note the very low β (~0.41)** for the regional Indian thresholds vs ~0.78–0.92 for the local
Sikkim/Gangtok ones. Low β = threshold decays slowly with duration = long-duration rainfall matters
relatively more. Regional thresholds fitted over large areas typically have flatter slopes than
local ones. **Do not mix a regional α with a local β.**

## D.2 Antecedent Precipitation Index

Standard recursive form:

```
API_t = k · API_{t-1} + P_t          equivalently   API_t = Σ_{i=1..N} k^i · P_{t-i}
```

`P_t` = daily precipitation (mm) at day t; `k ∈ (0,1)` = recession constant representing drainage of
the regolith. [VERIFIED-SNIPPET]

| k | Rationale | Source |
|---|---|---|
| **0.85** | "based on extensive simulations on time-series data and informed by the geological characteristics of the study area"; 85% of yesterday's contribution retained, 15% lost | [VERIFIED-SNIPPET](https://doi.org/10.3390/w18121393) |
| **0.90** | "adopted to best reflect the persistence of antecedent wetness in **humid, monsoonal mountain regions**" | [VERIFIED-SNIPPET](https://www.tandfonline.com/doi/full/10.1080/01431161.2026.2618661) |

### ⭐ Recommendation

> **Use k = 0.90**, citing the humid-monsoonal-mountain justification — exactly the Indian Himalaya /
> NE India setting. Run k = 0.85 as a one-line sensitivity check.
> With k = 0.9, rainfall from 14 days ago still contributes 0.9^14 ≈ 23%; with k = 0.85 it is 10%.
> Accumulate over a **30-day window** (0.9^30 ≈ 4%, effectively converged).

### The alternative worth knowing: LHASA's ARI

```
ARI = Σ_{t=0..6} p_t · w_t / Σ_{t=0..6} w_t        where  w_t = (t+1)^(−2)
```

A **7-day window with inverse-square weights** (today 1, yesterday 1/4, 2 days ago 1/9, … 6 days ago
1/49). Exponent and window length were **calibrated on 949 landslides (2007–2013)**.
[VERIFIED-URL](https://pmc.ncbi.nlm.nih.gov/articles/PMC6839699/)

**Either is defensible. ARI is easier to justify (calibrated + operational); API is more standard in
the Indian literature.** Compute both and show they correlate — a cheap robustness slide.

## D.3 How operational systems combine static susceptibility + dynamic rainfall

### NASA LHASA v1 — the canonical recipe (copy this architecture)

A **binary decision tree**:

1. Compute **ARI** (7-day inverse-square-weighted rainfall) from satellite precipitation (IMERG).
2. Compare ARI to a **per-pixel 95th-percentile threshold** from that pixel's historical ARI distribution — the threshold is **regionally distributed, not global**. A **minimum floor of 6.6 mm** (≈10 mm daily rainfall) applies in arid areas. Thresholds were built on TMPA and transferred to IMERG by **quantile mapping**.
3. ARI does **not** exceed threshold → **no nowcast**.
4. ARI exceeds → consult the static susceptibility map (5 classes from slope, geology, faults, roads, forest loss; "Very Low" ≈ 50% of land surface, "Very High" ≈ 3%):
   - Low / Very Low → **no nowcast**
   - Moderate / High → **moderate-hazard nowcast**
   - Very High → **high-hazard nowcast**
5. Output: pixel-by-pixel nowcast at **30 arcsec**, near-real-time.

[VERIFIED-URL](https://pmc.ncbi.nlm.nih.gov/articles/PMC6839699/)

### Its performance — calibrate your expectations with this

| Metric | Moderate hazard | High hazard |
|---|---|---|
| True positive rate, 1-day window | **27%** | 10% |
| TPR, 3-day window | 39% | 14% |
| TPR, 7-day window | 47% | 18% |
| **False positive rate** | **1%** | 0.2% |

Nepal validation (Petley database): TPR 32–47% (moderate), 22–33% (high).
[VERIFIED-URL](https://pmc.ncbi.nlm.nih.gov/articles/PMC6839699/)

> **This is the single most important context in the whole report. A flagship NASA operational
> system catches roughly 27–47% of landslides.** If your system reports 95% recall on real events,
> you have a leak. **Quote these numbers in your presentation** — it shows you understand the
> problem's actual difficulty and pre-empts "why is your recall so low?"

**LHASA 2.0** replaced the decision tree with **XGBoost**, adding dynamic plus additional static
variables (and is exploring seismicity and burned areas as preconditioning factors).
[VERIFIED-SNIPPET](https://ntrs.nasa.gov/citations/20205001695)
Source: [github.com/nasa/LHASA](https://github.com/nasa/lhasa) [VERIFIED-SNIPPET]

### India's operational system — cite this, it is directly on-point for SIH

- **GSI is the nodal agency** for landslide studies in India. [VERIFIED-SNIPPET]
- **National Landslide Forecasting Centre (NLFC)** launched **July 2024** at GSI Kolkata, with the **Bhusanket** web portal and **Bhooskhalan** mobile app. [VERIFIED-SNIPPET](https://bhusanket.gsi.gov.in/)
- Built on **probabilistic rainfall thresholds + Numerical Weather Prediction (NWP) + observed rainfall**, with **IMD, NCMRWF, ISRO** and state DMAs. [VERIFIED-SNIPPET](https://bhusanket.gsi.gov.in/about.html)
- Operational in **Kalimpong & Darjeeling (WB)** and **Nilgiris (TN)**; since the **2025 monsoon**, bulletins for **21 districts across 8 states** (Darjeeling, Kalimpong, Nilgiris, Wayanad, Idukki, Rudraprayag, Chamoli, Shimla, Kohima). Nationwide by **2030**. [VERIFIED-SNIPPET]
- **NLSM**: susceptibility mapping complete at **1:50,000** for ~**4.3 lakh km²** across **19 states/UTs**; the database holds **52,146 landslide polygons and 25,184 landslide points** with field-validated attributes, free to download from **Bhukosh**. [VERIFIED-SNIPPET](https://bhukosh.gsi.gov.in/)

> **⭐ ACTION: `bhukosh.gsi.gov.in` is a free, official, 52k-polygon Indian landslide inventory.**
> This is a viable **backup for the entire susceptibility component** if the faculty dataset
> disappoints. Check its download/export path on day 1 — it is worth an hour of someone's time.

### ⭐ Recommended fusion design for your system

Keep it simple and explainable. **Do not train an end-to-end model for this.**

```
S = susceptibility score in [0,1]    (calibrated XGBoost output from Section C)
T = trigger score in [0,1]           (from rainfall)

T from exceedance ratio against the I-D threshold:
    T_raw = I_observed(D) / (alpha * D^(-beta))     for the best-matching duration D
    T     = clip(T_raw, 0, 2) / 2                   (at threshold -> T = 0.5)

Optional wetness modulation:
    T' = T * (1 + 0.5 * min(API_norm, 1))           API_norm = API / API_95th_pctile

Hazard = a 3x3 LOOKUP MATRIX of S-band x T-band -> {None, Watch, Warning, Alert}

              T low     T moderate   T high
S low         None      None         Watch
S moderate    None      Watch        Warning
S high        Watch     Warning      Alert
```

**Why a lookup matrix, not a product or a learned model:**
1. It is exactly what LHASA does — defensible by precedent. [VERIFIED-URL](https://pmc.ncbi.nlm.nih.gov/articles/PMC6839699/)
2. It is auditable. A district officer can read the matrix; nobody can interpret the product of two uncalibrated scores.
3. You have **no labelled hazard-level data** to train a fusion model on. Any learned fusion would be fitted on tens of events and would not generalise.
4. It degrades gracefully — if the rainfall feed dies you still show the static susceptibility layer.

**Use per-pixel percentile thresholds, not one national number** (following LHASA) — a 40 mm day is
routine in Cherrapunji and extreme in Leh. With ≥5 years of gridded rainfall, a per-pixel 95th
percentile is a one-liner in xarray.

**Free rainfall sources:** GPM **IMERG** (global, ~0.1°, half-hourly, near-real-time — what LHASA
uses); **IMD gridded rainfall** (~0.25°, daily, India-specific). [FROM-MEMORY-UNVERIFIED for exact
resolutions]

## D.4 Reality check on Section D

- ✅ Achievable: implement API/ARI, apply a published I–D threshold, build the fusion matrix, render a hazard map. **~1 person-day, no ML training.**
- ✅ Achievable and high-value: a demo that **replays a historical rainfall sequence** and shows hazard levels evolving day by day. **This is your best demo moment** — the only part of the system that moves.
- ⚠️ Risky: fitting your own I–D threshold. Needs many dated landslides paired with co-located rainfall. Only attempt if the faculty data has both.
- ❌ NOT achievable: validating your EWS against real events with meaningful statistics. You will have at most a handful of events. **Do not present a TPR/FPR computed on 5 events as a validated skill score** — show the LHASA numbers as the benchmark instead.
- ❌ NOT achievable: live IMERG ingestion with authentication, latency handling and operational reliability in 6 days. **Pre-download a historical rainfall window and replay it**, and state clearly that live ingestion is the productionisation step.

---

# SUGGESTED 6-DAY ALLOCATION (6 people)

| Day | Segmentation (2p) | Susceptibility (2p) | Photos + Rainfall (1p) | Integration/UI (1p) |
|---|---|---|---|---|
| 1 | Download L4S from HF; verify test masks exist; **sanity-check band value ranges vs the baseline mean/std**; load IARAI checkpoint and reproduce ~58 F1 | Triage faculty data; get DEM; establish one CRS/grid; check Bhukosh as backup | CLIP zero-shot baseline running; download SDNET2018/RDD2022 as fallback | Skeleton app + map tiles |
| 2 | First U-Net++ run, 30 epochs | WhiteboxTools features (slope→fill→flowacc→TWI/SPI/STI) | Feature extraction + linear probe | Wire susceptibility raster into map |
| 3 | Loss ablation, threshold sweep | Pseudo-absence sampling + XGBoost + spatial CV | API/ARI implementation | Hazard fusion matrix |
| 4 | TTA + final model; freeze it | Sampling ablation, 5-seed AUC, calibration | I–D threshold + rainfall replay | End-to-end wiring |
| 5 | Figures, qualitative examples | SHAP feature importance, final map | Severity head | Polish, mobile view |
| 6 | **Freeze all models.** Slides, rehearsal, buffer for what broke. | | | |

**Hard rule: nothing new gets trained on day 6.**

---

# COULD NOT VERIFY

Things I could not confirm this session, in rough order of how much they'd matter:

1. **Landslide4Sense 2nd-place official test F1.** Extracted as "76.1% (self-training with λ=100%)", which is *higher than 1st place* and therefore internally inconsistent — almost certainly an ablation number, not the leaderboard. **Do not quote 76.1.** Say "2nd place ≈ 73–74, below Kingdrone's 74.54". Fix by reading Table 1 of arXiv:2209.02556 directly (the PDF is at `C:\Users\eshaa\.claude\projects\D--Coding-PROJECTS\5f3eb7ec-1422-49e2-8b33-40bccd78aa24\tool-results\webfetch-1787632820125-6ud1c5.pdf` — WebFetch could not parse it, but a PDF reader can).
2. **Units on the NW/NE Himalaya I–D coefficients (2.9993 / 5.8294).** Coefficients corroborated twice; units never seen in primary text (IAS/JESS and MDPI both 403'd). My mm/h + hours inference is a physical cross-check, not a citation.
3. **Whether the Landslide4Sense baseline mean/std constants apply to raw or pre-scaled `.h5` values.** The negative O(1) means are not raw Sentinel-2 reflectance. **This is the highest-risk item for your day 1** — verify empirically by printing per-band min/max/mean.
4. **Whether `annotations/test/` on the HF mirror is genuinely fully populated.** Strongly implied by search results (an individual `annotations/validation/mask_129.h5` file URL resolves), but I did not enumerate all 800 test masks.
5. **"5–15% AUC inflation from random splits"** — MDPI rs17020213 returned 403. Direction certain, magnitude indicative only.
6. **Spiti Valley Category-I/II labelling.** As written, the slope-masked strategy scored *lower*, which is counter-intuitive. Numbers are verified; the interpretation may be inverted in the source.
7. **A working public download URL for any expert-labelled ground-level landslide photo dataset.** The papers describe one; I found no live link. Assume you will not get one.
8. **Per-epoch wall-clock on a T4 for L4S.** No paper reports it. My 1.5–3 min/epoch figure is an engineering estimate.
9. **Colab free-tier quota (~15–30 GPU-hours/week).** Third-party blog sources only; Google publishes no fixed number and it varies with demand and account history.
10. **`gj.5175` (Badola et al.) exact AUC values**, `CrackForest` image count, exact IMERG/IMD grid resolutions, `SPI`/`STI` formulae — all from memory or snippets, none load-bearing.
11. **Springer/Nature/ScienceDirect/MDPI/ResearchGate paywalls** blocked direct verification of: s41598-024-57964-5 (non-landslide sampling), s41062-018-0132-9 (Kalimpong thresholds), GeoNeXt, and the non-nadiral crowdsourced-images paper. Everything sourced from those is tagged `[VERIFIED-SNIPPET]`.

---

# ONE-LINE VERDICTS

| Component | Verdict |
|---|---|
| **A — Scar segmentation** | ✅ **GO.** Target F1 0.72–0.78. U-Net++/ResNet-50-ImageNet, BCE(pos_weight=25)+Dice, ~2 h/run on a free T4. |
| **B — Field photos** | ⚠️ **CONDITIONAL GO.** CLIP zero-shot + frozen-feature linear probe only. Blocked on faculty photos; have the crack-dataset fallback ready today. |
| **C — Susceptibility** | ✅ **STRONG GO.** Your safest and most polished component. WhiteboxTools + XGBoost + spatial block CV. Report spatial-CV AUC (0.78–0.90), not random-CV. |
| **D — Rainfall trigger** | ✅ **GO, rules-based.** Published I–D threshold + API (k=0.9) + LHASA-style lookup matrix. No training. Best demo moment. |
| **Foundation models (Prithvi/Clay)** | ❌ **NO-GO.** Measurably worse than U-Net here (F1 60.7 vs 78.0). |
| **Competition-grade ensembles / self-training / CRF** | ❌ **NO-GO.** Weeks of work for ~+2 pp. |
| **Live data ingestion** | ❌ **NO-GO in 6 days.** Replay historical data. |

