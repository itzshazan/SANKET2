# SANKET — AI Landslide Early Warning & Risk Monitoring for the North East

> **संकेत** *(sanket)* — "the signal". A signal that arrives *before* the slope fails.

| | |
|---|---|
| **SIH Problem ID** | 26001 |
| **Title** | AI-Based Early Warning and Landslide Risk Monitoring System in NER |
| **Organisation** | Ministry of Development of North Eastern Region (MDoNER) |
| **Category / Theme** | Software / Disaster Management |
| **Deadline** | **31 Aug 2026** — D1 is 25 Aug, so **7 days, no buffer** |
| **Team** | 6 people |
| **Delivery** | Web app — control-room dashboard + responsive field view. **No hardware.** |
| **Coverage** | **All 8 NER states** (two-tier resolution — see §2) |
| **Models** | **We train our own.** Primary dataset supplied by faculty (see PRD §7 A1) |
| **Deferred** | SMS dispatch (channel stubbed) · live IMD feed (adapter stubbed) · physical sensors |
| **Hard constraint** | Computer Vision **must** be a first-class component, not a bolt-on |

## Documents

| Doc | What's in it |
|---|---|
| **[HANDOFF.md](docs/HANDOFF.md)** ⭐ | **Team status: what's decided, what's verified, what doesn't exist yet, what will kill us.** Share [this link](https://claude.ai/code/artifact/abf4684f-1c33-4c77-9c63-b57858e5088e). |
| **[PRD.md](docs/PRD.md)** | Users, journeys, success metrics, scope boundaries, risks, open questions |
| **[FEATURES.md](docs/FEATURES.md)** | All 52 features with IDs, priority, owner lane, day, acceptance criteria, and the cut list |
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Schema, API surface, hazard formula, committed decisions, deployment |
| **[Architecture diagrams](https://claude.ai/code/artifact/b08fa1df-98e1-4363-9fec-cf07fbe59510)** | The six-layer system, hazard fusion, offline report path, CV learning loop |
| **[Deck content](https://claude.ai/code/artifact/b3174a6e-7e3d-4b06-9cd6-0b78ac9da206)** ⭐ | **Slide-by-slide copy for all 6 SIH slides + 3 screenshot-ready diagrams.** Source: `deck/` |
| **[Methodology slides](https://claude.ai/code/artifact/795575da-648c-4fc5-b661-ff4d4bcccb17)** | Earlier draft: solution flow, 6-phase implementation methodology, prototype scope |
| **[Knowledge graph](https://claude.ai/code/artifact/5edf88e8-ec29-444e-9322-04c94cedbc33)** | 245 nodes, 44 communities — click to explore. Share this link with the team. Local copy: `graphify-out/graph.html`, kept current via `graphify update .` (see `CLAUDE.md`). |
| **[dashboard-spec.md](docs/dashboard-spec.md)** | Widget inventory, information architecture, field view, build order |
| **[Module 1 Architecture](docs/architecture/module1_architecture.md)** | Full specification for Module 1 Tabular ML risk prediction engine |
| **[Module 1 Model Card](docs/model/module1_model_card.md)** | Performance metrics, intended use, spatial cross-validation results |
| **[Module 1 API Reference](docs/api/module1_api.md)** | OpenAPI REST endpoints for prediction, TreeSHAP, and health check |

---

## Repository Structure

```
SANKET/
├── web/                                      # REACT + VITE CLIENT APPLICATION
│   ├── public/                               # Static assets (favicon, PWA manifest)
│   ├── src/
│   │   ├── components/                       # UI controls (Sidebar, Topbar, NerMap, etc.)
│   │   ├── views/                            # 8 core domain views
│   │   ├── services/                         # Frontend API client & Module 1 integration
│   │   ├── state/                            # AppContext & spatial selection state
│   │   ├── data/                             # Mock datasets & precomputed GIS geometry
│   │   ├── App.jsx, main.jsx, index.css      # Core application shell & Highland tokens
│   ├── geodata_src/                          # Shapely script generating SVG paths from GeoJSON
│   └── package.json, vite.config.js
│
├── module1/                                  # MODULE 1 — ML PREDICTION SYSTEM
│   ├── data/                                 # Raw (ISRO/GPM/SMAP/DEM), processed & final splits
│   ├── ingestion/                            # Data connectors per remote source
│   ├── preprocessing/                        # Cleaning, NER bounds validation, alignment
│   ├── features/                             # Rainfall accumulation, terrain, NDVI, historical
│   ├── dataset/                              # Positive/negative sample extraction & dataset builder
│   ├── training/                             # Logistic Regression, Random Forest, XGBoost
│   ├── evaluation/                           # Spatial block CV, ROC metrics, Noney 2022 backtest
│   ├── inference/                            # Real-time predictor & 4-tier hysteresis classifier
│   ├── explainability/                       # TreeSHAP factor attributions for dashboard
│   ├── models/                               # Serialized model (.pkl) & feature_schema.json
│   ├── api/                                  # FastAPI application (main, routes, schemas)
│   ├── config/config.yaml                    # Hyperparameters & regional bounds
│   └── README.md                             # Module 1 developer guide
│
├── notebooks/                                # GOOGLE COLAB
│   └── module1/
│       ├── 01_data_inventory.ipynb
│       ├── 02_rainfall_features.ipynb
│       ├── 03_soil_moisture_features.ipynb
│       ├── 04_dem_features.ipynb
│       ├── 05_ndvi_features.ipynb
│       ├── 06_dataset_builder.ipynb
│       ├── 07_model_training.ipynb
│       ├── 08_evaluation.ipynb
│       ├── 09_shap.ipynb
│       └── 10_save_model.ipynb
│
├── docs/
│   ├── architecture/module1_architecture.md
│   ├── model/module1_model_card.md
│   └── api/module1_api.md
│
├── .env.example
├── .gitignore
└── README.md
```

> **Running the frontend:** `npm install && npm run dev` from `web/` (port 5180).  
> **Running Module 1 API:** `python -m uvicorn module1.api.main:app --reload --port 8000`.

---

## 1. The 60-second pitch

> Landslide response in the North East is **reactive**. A slope fails, a highway is cut, a village goes dark for four days, and only then does a report climb the chain of command.
>
> SANKET inverts that. It fuses **terrain physics**, **live rainfall**, and — critically — **computer vision on satellite imagery and citizen photographs** into a single time-varying risk surface across all eight NER states. When rainfall crosses the failure threshold for a slope the terrain model already knows is fragile, the district magistrate gets a CAP-standard alert with a ranked list of at-risk villages and roads, and the community gets a notification in their own language.
>
> We backtest it against the **Noney (Manipur) landslide of 29 June 2022**. Using only data that existed before the event, SANKET raises that slope to RED with meaningful lead time. That is the whole product in one slide.

**The differentiator:** most teams will ship a dashboard with a rainfall threshold. We ship a **closed learning loop** — satellite CV detects new landslide scars → scars auto-append to the inventory → the susceptibility model retrains → the map gets smarter every monsoon. Nobody else's map does that.

---

## 2. Coverage: all of NER, at two resolutions

**Decision: cover all 8 states.** The honest way to do that in 8 days is the way real operational systems do it — a coarse national layer with fine-grained district layers on top. GSI's own National Landslide Susceptibility Mapping works this way (1:50,000 macro-scale, with site-specific studies layered in).

| Tier | Extent | Grid | What runs on it |
|---|---|---|---|
| **Regional** | All 8 states, ~130 districts | **90 m** (~32 M cells) | Susceptibility + live hazard + alerts. Renders instantly, covers everything. |
| **Focus** | 2–3 districts | **30 m** | Full feature set, road/village exposure, backtest validation, CV scar detection |

**Why this is a strength, not a compromise:** when a judge asks "does this scale to all of NER?", the answer is not a promise — it is already on the screen. And when they ask "is it actually accurate?", we point at the validated focus districts with a reported AUC.

**Focus district recommendation — Noney / Tamenglong, Manipur.** The 2022 Tupul disaster (~60 deaths, railway construction site) gives us a famous, well-documented backtest event, and the backtest *is* the demo. Second focus district: **Aizawl, Mizoram** — steep urban slopes, dense OSM coverage, and quarry-cut slopes that speak directly to the "unplanned hill cutting" line in the PS.

**Extent:** roughly 21.5°N–29.5°N, 88°E–97.5°E → ~76 one-degree Copernicus DEM tiles, ~2 GB. One person, one day.

---

## 3. Reuse from PharmaBoard / "DoneHai" — audited, not assumed

`D:\antigravity\proud-bohr` is a working React + Vite + FastAPI + PostGIS dashboard. A full file-by-file audit was run against it. **Headline: ~4,100 of ~16,400 LOC (≈25 %) is genuinely reusable**, concentrated in the widget shell, the batch-fetch hook, the layout store, the agent framework and the notifier.

### Ports cleanly

| Asset | LOC | Becomes |
|---|---|---|
| `notifications.py` | 163 | **Alert engine.** Best single file in the repo for us — dedup via `notification_log` with a cooldown, Slack/email channels, cancel-safe background loop. ⚠️ Its 15-min poll is far too slow for rainfall triggering; shorten and add an event trigger. |
| `db.py` | 119 | **Three-tier DB privilege separation** (full / read-only / write-scoped roles). Port verbatim — it is also a strong security talking point. |
| `useDashboard.js` | 300 | Layout store — localStorage-first with background sync *(claim verified)* |
| `useWidgetData.js` | 258 | **Batch-fetch coalescer** — collapses N widget polls into one `POST /batch` on a shared 30 s timer, with retry/backoff and stale-data preservation |
| `WidgetWrapper.jsx` | ~366 of 416 | Card shell, inline rename, dropdown — only the icon map is domain-specific |
| `main.py`, `rate_limit.py`, `lineIcons.jsx`, `LiveIndicator.jsx` | ~290 | FastAPI app factory, limiter, icons |
| Design tokens (`index.css` L14–43) | — | **"Light Clinical" system ports with zero hex changes.** `--rag-red #B3261E` / `--rag-amber #9A6400` / `--rag-green #1E7A34` map onto hazard classes by relabelling alone. IBM Plex Sans + Mono, 2–4 px radii, `tabular-nums` global, no-emoji rule. *(Superseded in the actual prototype — it ships a nature-inspired "Highland" palette instead, not this one; see `docs/HANDOFF.md` §3.)* |
| Batch registry + per-widget failure isolation | ~50 | One bad widget cannot fail the whole dashboard load |

### Ports with real work

| Asset | Reality check |
|---|---|
| `ai_agent.py` | **~400 of 1,003 lines are domain-neutral framework** (tool-result serialisation, retry, timeout, recursion cap, chart mapping). The 7 tools are entirely pharma and get rewritten. Repointing the agent layer is realistically **2–3 weeks of polish**, but a *narrow* "Ask SANKET" with 3–4 tools is a 1–2 day job on top of the framework. ⚠️ `gpt-4o-mini` is hardcoded and the codebase documents repeated reliability failures with it — re-evaluate the model rather than inheriting the workarounds. |
| `App.jsx` | **2,334 lines — a monolith.** Only ~530 lines are the grid shell. Split it before porting; the other ~1,800 are pharma drill-downs and modals. |
| `RAGDonut` · `TopPOIs` · `RCPAPipeline` · `TrendLine` · `RCPAWeeklyLine` | ~950 LOC of Recharts widgets. `RCPAPipeline`'s fixed-stage funnel maps almost 1:1 onto our CV photo pipeline (`uploaded → queued → classified → verified → failed`) — an underrated port. |
| `ops_agent.py` | ~200 of 494 lines is domain-neutral fuzzy-resolution + ambiguity handling using pg_trgm. Genuinely good; the four `draft_*` functions are pharma. |

### ⚠️ Two corrections to earlier assumptions

**1. PostGIS is installed but unused.** The image is `postgis/postgis:15-3.3` and `pois` has a geography column — but **no `ST_*` call exists anywhere** in the Python, JS or SQL. The expected `h3` extensions aren't even installed. **Our entire spatial layer is net-new work, not a port.** This is the single biggest correction to the earlier estimate.

**2. `ConnectivityGraph.jsx` is weaker than it looked.** ~400 of 708 lines survive (picker, side panel, palette, selection, drag-drop), but the graph *semantics* are a rewrite:
- **Edges carry no data at all** — just `{id, source, target}`. No length, status, class or **direction**.
- `edgeKey` sorts its endpoints, so two distinct roads between the same villages **collapse into one edge**.
- **No routing primitives are called.** Cytoscape ships `dijkstra`/`aStar`, but nothing in this file uses them. "Which villages are cut off if segment X fails" is net-new.
- `cose` is force-directed and geographically meaningless; a road network wants `preset` layout with projected coordinates.

**Recommendation:** if our connectivity view is geographic — and it is — **render road status as a MapLibre line layer** and treat `ConnectivityGraph.jsx` as a reference rather than a base. Keep Cytoscape only if we want a genuinely abstract topology view alongside the map.

### Revised saving

**≈3–4 person-days, not 5–7.** Still decisive for a 7-day build, but the spatial layer, the road graph analysis and the MapLibre integration are all net-new. Frontend deps confirm it: **no MapLibre, no router, no state library, no TypeScript, no tests, no linter** — six runtime dependencies total.

**Theme:** keep **"Light Clinical"** — audited as internally consistent and well-documented, and the RAG triad transfers to hazard classes with no colour changes. Note the existing codebase has *drift* from its own spec (surviving emoji, pill radii, leftover dark-theme hexes in `AiCustomWidget.jsx`). **Port the documented system, not the drift.** *(This recommendation was not followed in practice — the prototype built instead moved to a nature-inspired "Highland" palette and, later, added a real light/dark toggle. See `docs/HANDOFF.md` §3.)*

**Simplification:** drop the Node/Express BFF. It adds a hop, a JSON-file persistence layer, an id-rewriting rule that must stay in sync with the frontend, and a second rate limiter that defeats the first — all documented in the codebase's own comments. Removing it deletes ~880 LOC and one container.

---

## 4. Where Computer Vision actually lives

CV is mandatory for us — so it has to carry real weight. Four modules, in build order:

### CV-1 · Field-report triage *(highest value / lowest risk — build first)*

Citizens and field officers upload geo-tagged photos of cracks, slumping, or blocked roads. During an active event a control room can receive hundreds of these with no way to triage them.

- **Model:** fine-tuned vision backbone (EfficientNet-B0 / ViT-small, or a CLIP few-shot head if labels are thin)
- **Classes:** tension crack · fresh scarp / slide scar · debris on road · retaining-wall failure · water seepage / piping · irrelevant or spam
- **Severity head:** minor / moderate / severe → drives queue priority
- **Anti-noise:** EXIF timestamp + GPS validation, perceptual hash for duplicate/recycled photos, blur detection
- **Why it matters:** turns an unusable flood of reports into a ranked, deduplicated work queue — a real operational pain point, and the demo a judge can touch.

### CV-2 · Satellite landslide-scar segmentation *(the "wow" + the learning loop)*

Bi-temporal Sentinel-2 imagery → semantic segmentation of new landslide scars.

- **Dataset — verified:** **Landslide4Sense**, via the **Hugging Face mirror `ibm-nasa-geospatial/Landslide4sense`**, *not* the original IARAI release. 128×128 patches, **14 bands** (12 Sentinel-2 + slope + DEM), **6,500 train / 490 val / 1,600 test**, `.h5` format. The HF copy **includes test masks**; IARAI withholds them. *(My earlier "~3,800 patches" figure was the original IARAI train split — superseded.)*
- **Model:** **U-Net++ with a ResNet-50 ImageNet encoder**, loss `0.5·BCE(pos_weight=25) + 0.5·Dice`, bs 8, lr 1e-4, ~30 epochs, 128→256 resize. ≈2 h per run on a free Colab T4.
- **Target: F1 ≥ 0.72 / IoU ≥ 0.58**, stretch 0.78. **Above 0.80 on the official test split means suspect a leak.**
- ⚠️ **Do NOT use Prithvi / Clay / TerraTorch.** Prithvi-EO-2.0-300M scores F1 60.7 here; a plain ResNet-50 U-Net++ scores 78.0. Highest-prestige, lowest-return option available — it would eat two days for a worse result.
- **Day-1 risk check:** print per-band min/max from our actual `.h5` copy before trusting any published normalisation constants. Mismatched normalisation is the top silent-failure mode.
- **Input stack:** the 14 provided bands; add NDVI-difference (pre vs post) for live inference
- **Output:** scar polygons with area, centroid, confidence
- **The loop:** detected scars → auto-append to inventory → nightly susceptibility retrain. **Our signature feature.**

### CV-3 · Road-blockage & connectivity assessment

Field/CCTV/dashcam frames of a highway.

- **Model:** segmentation (road surface vs debris/mud) → **% carriageway obstructed**
- **Output:** link status `OPEN` / `PARTIAL` / `BLOCKED` → straight into the Cytoscape connectivity graph
- **Why:** satisfies "road connectivity status" with a *measured* value instead of a manual dropdown, and drives cut-off-village detection.

### CV-4 · Crack-progression / slope-creep monitoring *(stretch — only if D6 is calm)*

Repeat photographs from a fixed vantage over days.

- **Method:** ORB/SIFT matching + homography registration → residual displacement field → creep rate
- **Signal:** accelerating creep is the classic precursor to failure. A widening crack plotted over 5 photos is *prediction from vision*.
- Needs controlled repeat imagery — demo with a sequence we stage ourselves.

**If we land only CV-1 and CV-2, the CV requirement is already convincingly met.** Treat 3 and 4 as upside.

---

## 5. The predictive engine (non-CV AI/ML)

Deliberately **two-stage**, because that is how the science works — and because it is explainable to a government user, which matters more than a fancy black box.

### Stage A — Static susceptibility *(where can it fail?)*

Gradient-boosted trees (XGBoost / LightGBM).

| Feature family | Specifics |
|---|---|
| Terrain (DEM-derived) | slope, aspect, plan & profile curvature, TWI, SPI, relief, flow accumulation |
| Geology | lithology, distance to lineament / fault (GSI) |
| Land cover | forest loss, built-up, quarry / cut-slope proximity |
| Anthropogenic | distance to road cut, distance to stream |
| Climatology | mean monsoon rainfall |

- **Training:** inventory points = positives; pseudo-absences sampled from low-slope stable terrain = negatives
- **Output:** susceptibility 0–1 raster → COG → map tiles
- **Report honestly:** ROC-AUC under **spatial** cross-validation (published models land ~0.85–0.92; if we see 0.99 we have leaked, and we say so)
- **Explainability:** SHAP per cell → the dashboard answers *"why is this zone red?"* in plain language. Government users will not act on an unexplained red blob.

### Stage B — Dynamic trigger *(will it fail now?)*

- **Rainfall Intensity–Duration threshold:** `I = α · D^(−β)` — standard empirical form, calibrated to NER from historical event rainfall
- **Antecedent Precipitation Index** with exponential decay (soil does not forget last week's rain)
- **Soil moisture** from SMAP + the virtual sensor network (§6)
- **Sequence model (stretch):** LSTM / temporal CNN over 72 h rainfall + moisture → P(failure in next 24 h)

**Final hazard** = `f(susceptibility, rainfall-vs-threshold ratio, antecedent moisture, recent CV-detected activity nearby)` → **Normal / Watch / Warning / Danger**

> ⚠️ **We do not claim to "predict landslides."** We claim to *elevate risk with lead time and explain why*. Overclaiming is how teams get taken apart in Q&A. Our language is "early warning", and we address false-alarm cost head-on — a warning system nobody trusts is worse than none.

---

## 6. Sensors without hardware

No physical sensors — so requirement (a) "soil moisture sensors" is satisfied three ways, all honest:

1. **NASA SMAP** L3/L4 satellite soil moisture (~9 km) — *real measured data, no hardware needed.* This is the primary source and it is genuinely what regional systems use.
2. **A virtual sensor network** — N simulated IoT motes at plausible NER locations publishing over **MQTT to a real gateway**. The gateway, ingestion, time-series storage, calibration and alerting are all production code; only the motes are simulated.
3. **Derived soil-water balance** — a simple bucket model driven by rainfall + evapotranspiration, giving a continuous moisture proxy everywhere.

**The line to use in Q&A:** *"The sensor gateway is real and speaks MQTT. Swap the simulator for field hardware and not one line of our code changes. Deploying motes is a procurement programme, not an engineering problem — and meanwhile SMAP gives us real satellite-measured moisture across all of NER today."*

That is a stronger answer than a pot of soil on the table.

---

## 7. Data sources — all real, all free, all citable

Naming specific Indian government sources matters a lot to an MDoNER panel.

| Need | Source | Notes |
|---|---|---|
| **Landslide inventory** | **GSI Bhukosh** + GSI National Landslide Susceptibility Mapping (NLSM) | Authoritative Indian source — *lead with this* |
| | NASA **Global Landslide Catalog** / COOLR | Global, includes NER events, easy CSV |
| **DEM / terrain** | **CartoDEM (ISRO Bhuvan)**, Copernicus DEM GLO-30, SRTM 30 m | Prefer the ISRO source for optics and accuracy |
| **Rainfall (live + forecast)** | **Open-Meteo** (no key, free, incl. ERA5 archive) | Primary working source + the backtest archive |
| | **NASA GPM IMERG** | Satellite precipitation, ~30 min, 0.1° |
| | **IMD** | See caveat below ⬇ |
| **Soil moisture** | **NASA SMAP** L3/L4 + virtual MQTT sensor network | See §6 |
| **Satellite imagery** | **Sentinel-2 L2A** via Copernicus Data Space or Google Earth Engine | Free; GEE is fastest for change detection |
| **CV training data** | **Landslide4Sense 2022** (Sentinel-2 + DEM, pixel masks) | The unlock for CV-2. ⚠️ Official IARAI source is dead — use the [Kaggle mirror](https://www.kaggle.com/datasets/tekbahadurkshetri/landslide4sense) (8.97 GB, clearly IARAI-licensed) or an HF mirror. See `docs/data-sources.md` §3. |
| **Roads / villages / buildings** | **OpenStreetMap** (Geofabrik NE-India extract), Census 2011 village points | Feeds the connectivity graph |
| **Translation / TTS** | **Bhashini** (Govt of India) | Registration is minutes. ⚠️ **Almost certainly lacks Mizo and Khasi** — see §7a |
| **Alert standard** | **CAP 1.2** (as used by NDMA SACHET) | See §8 |

> **⚠️ IMD — tested, not assumed.** `GET /api/v1/cityforecast` and `/api/v1/districtrainfall` both return **HTTP 401**. The docs page and portal on the same host load fine, so this is a real auth gate. Access requires registration **plus IP whitelisting**, which binds the deployment to a static egress IP; approval time is published nowhere.
>
> **So: build the `WeatherProvider` interface with Open-Meteo and IMERG as working adapters plus a written, ready-to-key IMD adapter.** The Q&A answer becomes: *"We tested the IMD endpoints — they 401. Access needs registration and IP whitelisting, which is procurement, not engineering. The adapter is written and swaps in behind one interface."* That is a far stronger answer than either a bluff or a shrug, and it is now a tested fact rather than our assumption.

### §7a — Languages: a real gap to decide on

**Bhashini almost certainly does not cover Mizo or Khasi** — neither is in the 8th Schedule, and both are absent from its model listings. That is **two of our eight states** (Mizoram, Meghalaya).

Three honest options, pick one on D1:

1. **Hand-write the alert templates for Mizo and Khasi.** Our alerts are short fixed-slot strings (`{district} {level} {action}`) — perhaps 15 phrases. A native speaker can do it in an hour. **Recommended.**
2. **Ship 6 languages via Bhashini and say so plainly**, with Mizo/Khasi named as the next integration.
3. Fall back to English/Hindi in those states — weakest, and undercuts the whole multilingual claim.

Either way, **do not machine-translate free-form safety-critical text.** A mistranslated evacuation instruction is a real harm, and it is exactly the question a sharp judge asks.

### Setup that takes minutes (do it on D1)

Earthdata · Copernicus Data Space · Google Earth Engine · Bhashini · OpenTopography — all self-service.

⚠️ **GEE changed on 27 Apr 2026:** still free for non-commercial use, but there is now a monthly compute quota. **Switch to the Contributor tier — 1,000 EECU-hours vs 150 — it is a self-service dropdown**, not an application. Do it at registration, not when you hit the cap on D5.

⚠️ **NASA COOLR moved behind Earthdata auth** (endpoints return `499 Token Required`). The legacy anonymous CSV still works but is **frozen at March 2016**.

---

## 8. Requirement traceability — every line of the PS, mapped

Put this table in the deck. Judges score against the problem statement text.

| PS requirement | Our implementation | Day |
|---|---|---|
| (a) Rainfall patterns | Open-Meteo + GPM IMERG, 72 h history + 5-day forecast | D2 |
| (a) Soil moisture sensors | SMAP + virtual MQTT sensor network + bucket model (§6) | D2 |
| (a) Satellite imagery | Sentinel-2 L2A pipeline feeding **CV-2** | D3 |
| (a) Terrain / slope data | Copernicus/CartoDEM → 8 terrain derivatives, all NER | D1 |
| (a) Historical landslide records | GSI Bhukosh + NASA GLC | D1 |
| (b) AI/ML high-risk zones + prediction | Stage A susceptibility + Stage B trigger | D2–D3 |
| (c) Real-time alerts to admin + community | Alert engine → CAP 1.2, SMS, push, Telegram | D5 |
| (d) GIS mapping of roads / villages / infra | MapLibre + OSM + Census exposure layers | D4 |
| (e) Citizen geo-tagged photo/video upload | Field view (responsive PWA) + **CV-1** triage | D3–D4 |
| (f) Risk severity levels | 4-level hazard + `RAGDonut` + colour-coded heatmap | D4 |
| (f) Road connectivity status | **CV-3** + `ConnectivityGraph` + cut-off village detection | D4 |
| (f) Weather-linked risk forecasts | 5-day forecast → forward-run hazard timeline | D4 |
| (f) Emergency response prioritisation | Ranked queue: hazard × population × isolation × road criticality | D5 |
| Multilingual notifications | i18next + Bhashini; EN / HI / Assamese / Manipuri / Mizo / Khasi / Bengali / Nepali | D5 |
| Low-network / offline | localStorage+IndexedDB queue (extends `useDashboard`), cached tiles, SMS fallback | D5 |
| Cloud + offline sync | Containerised; conflict-safe server-authoritative merge | D5 |

**Bonus credibility:** emitting **CAP 1.2** means SANKET plugs into India's existing NDMA alert infrastructure instead of being another island. Cheap to build, disproportionately impressive.

---

## 9. Seven-day plan · 6 people

**Roles** (each person owns a lane end-to-end; names to be filled in on D1):

| # | Lane | Owns |
|---|---|---|
| **P1** | Geospatial data | DEM for all NER, terrain derivatives, inventory, OSM, PostGIS schema, tiling |
| **P2** | ML — prediction | Stage A susceptibility, Stage B trigger, SHAP, backtest harness |
| **P3** | ML — computer vision | CV-1, CV-2, then CV-3 |
| **P4** | Backend | FastAPI, ingestion schedulers, alert engine, CAP/SMS, "Ask SANKET" agent port |
| **P5** | Frontend | Dashboard shell port, MapLibre, widgets |
| **P6** | Field view + comms | Responsive field/report view, i18n, **deck + demo script (owns from D1)** |

| Day | Date | Focus | Definition of done |
|---|---|---|---|
| **D1** | Aug 25 | Lock focus districts + lanes. Split & port the PharmaBoard grid shell. Stand up docker-compose. Pull DEM/inventory/OSM for all NER. **Start CV-2 training today** (see below). | Dashboard shell renders with dummy widgets. A slope raster exists. |
| **D2** | Aug 26 | Stage A trained + spatially cross-validated. Weather + SMAP ingestion on a schedule. MQTT gateway live. **Faculty dataset in hand.** | AUC reported. Susceptibility raster for all NER at 90 m. Rainfall rows landing. |
| **D3** | Aug 27 | **CV day.** CV-1 triage fine-tuned. CV-2 converged. Stage B trigger logic. | Upload a crack photo → class + severity. Bi-temporal pair → scar mask. |
| **D4** | Aug 28 | MapLibre + risk tiles + KPI row + severity donut + report queue + SHAP "why". Road status as a map line layer. | A DM could read this screen and make a call. |
| **D5** | Aug 29 | Field view (offline capture + IndexedDB queue + sync). Alert engine → CAP + Push + Telegram. i18n. Prioritisation. | Airplane-mode a phone, file 2 reports, reconnect, both sync. Push lands on a real phone. |
| **D6** | Aug 30 | **Backtest + Scenario Mode + integration.** Wire the Noney 2022 replay. Seed demo data. Bug bash. | Time-travel demo runs start to finish untouched. |
| **D7** | Aug 31 | **Freeze, rehearse ×3, contingency build, submit.** No new features. | Every team member can run the demo solo. Submitted. |

**Rules that keep this on track:**
- **We lost the buffer day.** The original plan had D7 polish + D8 spare; at 7 days those merge. That means **D6 evening is the real freeze**, and the cut list in `FEATURES.md` gets used decisively rather than debated.
- **CV-2 training starts D1, not D3.** It is the highest-variance task on the board and the only one that can silently fail to converge. Give it three days of wall-clock, not one.
- **P6 owns the deck from D1.** A great build with a scrambled 11 p.m. deck loses to a decent build with a sharp one.
- **Integrate daily from D2.** Six people on separate branches merging on D6 kills more hackathon teams than any technical problem.

---

## 10. The demo (this is what actually wins)

Three acts, eight minutes. All software, no props.

### Act 1 — The backtest (the money shot) 🎯

A time slider over **Noney, Manipur, late June 2022**. Real archived rainfall. Scrub forward:

- **27 Jun** — antecedent index climbing, zone amber
- **28 Jun** — rainfall crosses the I–D threshold for that slope → **RED**, alert fires
- **29 Jun** — the actual disaster

> *"Using only data that existed beforehand, SANKET flags this slope with meaningful lead time — and tells you it was slope angle, saturated soil, and the road cut that did it."*

A backtest, honestly labelled as a backtest. Verifiable. Devastating.

### Act 2 — Live computer vision 📷

Hand a judge a phone. They photograph a crack (a printed card, or a real wall). Upload → CV-1 classifies it, EXIF geo-tags it, it lands on the map, the local risk score nudges up, it enters the priority queue. **Judges remember what they touched.**

### Act 3 — Scenario Mode 🌧️ *(replaces the hardware prop — and it is better)*

A **tabletop-exercise panel**: pick a district, inject a rainfall scenario ("IMD forecast: 250 mm / 24 h over Noney"), hit Run. Watch, live:

- the hazard surface cascade Watch → Warning → Danger
- villages and road links flip to at-risk; the connectivity graph shows who gets cut off
- the response priority queue populate itself
- CAP 1.2 XML generate
- **a real SMS / push land on the judge's own phone, in their language**

This is not a demo trick — **state DMAs actually run tabletop exercises**, and this is a legitimate product feature for training district officials. It shows decision-support value, which a soil-moisture prop never could. Pitch it as a feature, demo it as the finale.

**Contingency:** pre-recorded video of the full flow + a fully local offline build. Venue wifi *will* betray you.

---

## 11. Honest limitations (say these before you are asked)

Owning the limits reads as competence. Getting caught hiding them reads as the opposite.

1. **Not deterministic prediction.** Landslide timing is genuinely hard science. We elevate risk with lead time; we do not promise an hour and a minute.
2. **False alarms have real cost.** Evacuating a village needlessly burns trust. We use hysteresis, multi-signal confirmation and tiered escalation — and we would tune thresholds with district administrations, not in a lab.
3. **IMD is integration-ready, not integrated.** (§7)
4. **Sensors are satellite + simulated,** not deployed hardware. (§6)
5. **Sparse ground truth.** NER inventories are incomplete, biasing susceptibility toward well-surveyed areas. CV-2 is partly a *fix* — it grows the inventory automatically.
6. **Regional tier is 90 m and unvalidated outside the focus districts.** We report AUC where we validated and say so plainly everywhere else.

---

## 12. Scaling story

- **Config-per-district:** a new district is a YAML file + a DEM tile + an inventory extract. No code changes.
- **Cost:** the NER deployment runs on modest cloud — the heavy lifting is nightly batch, not real-time inference.
- **Integration path:** CAP output → NDMA SACHET; dashboards → State DMAs; road status → PWD / BRO / NHIDCL.
- **The compounding asset:** every monsoon, CV-2 adds scars to the inventory and the model improves. Year 3 is materially better than year 1 with no extra human labelling.

---

## 13. Still open

| # | Question | Needed by |
|---|---|---|
| 1 | **What is actually in the faculty dataset?** Format, coverage, date range, label type. Everything in E2/E3 depends on it. | **Today** |
| 2 | **Does anyone have PyTorch segmentation experience?** Decides whether CV-2 is a fine-tune or a from-scratch gamble. | **Today** |
| 3 | **Focus districts** — recommending Noney/Tamenglong + Aizawl | End of D1 |
| 4 | **Who takes which of the six lanes** (§9) | End of D1 |
| 5 | **Any GPU beyond Colab free tier?** | D1 |

**Settled:** name is SANKET · we train our own models · SMS deferred (channel stubbed) · no hardware · all-NER coverage at two resolutions.

---

## 14. Repo layout

```
SANKET-SIH26001/
├── README.md
├── docs/
│   ├── dashboard-spec.md      # widget inventory + information architecture
│   ├── data-sources.md
│   └── demo-script.md
├── ingestion/                 # weather, soil moisture, imagery, MQTT sensors
├── ml/
│   ├── susceptibility/        # Stage A
│   ├── trigger/               # Stage B
│   └── cv/                    # CV-1..CV-4
├── api/                       # FastAPI (no Node BFF)
├── web/                       # React dashboard + responsive field view
├── alerts/                    # CAP, SMS, push, i18n
└── infra/                     # docker-compose, migrations
```

---

*This document is the production-build plan, argued out before building the real system — most of it (the backend, the trained models, MapLibre, PostGIS) is not built yet. A working mocked frontend prototype exists at `web/` and is documented in [HANDOFF.md](docs/HANDOFF.md), which this plan is the intended migration target for.*
