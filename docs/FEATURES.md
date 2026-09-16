# SANKET — Feature Catalogue

> Every feature we intend to build, with an ID, a priority, an owner lane, a target day, and an acceptance criterion. **If a feature has no acceptance criterion it is not a feature, it is a wish.**
>
> Timeline re-baselined: **D1 = 25 Aug 2026 · Ship = 31 Aug 2026 (7 days).**

## Priority key

| | Meaning |
|---|---|
| **P0** | Demo dies without it. Non-negotiable. |
| **P1** | Judges will notice its absence. Strongly wanted. |
| **P2** | Differentiator. Build if P0+P1 are green. |
| **P3** | Stretch. Cut without regret. |

## Owner lanes

`P1-GEO` geospatial data · `P2-ML` prediction models · `P3-CV` computer vision · `P4-BE` backend/API · `P5-FE` dashboard · `P6-FIELD` field app, i18n, deck

---

## E1 — Data Ingestion & Geospatial Foundation

| ID | Feature | Pri | Lane | Day | Acceptance criterion |
|---|---|---|---|---|---|
| **F1.1** | Terrain derivative pipeline — DEM → slope, aspect, plan/profile curvature, TWI, SPI, relief, flow accumulation | P0 | P1-GEO | D1 | 8 rasters exist for all 8 NER states at 90 m; slope raster opens in QGIS and looks like terrain |
| **F1.2** | Landslide inventory ingestion — faculty dataset + GSI Bhukosh + NASA GLC, normalised to one schema | P0 | P1-GEO | D1 | ≥1 unified table with `geom, date, source, confidence`; count reported per source |
| **F1.3** | Weather ingestion service — `WeatherProvider` interface, Open-Meteo + IMERG adapters, **IMD adapter stubbed** | P0 | P4-BE | D2 | Scheduled job writes hourly rainfall rows for all NER districts; swapping provider needs no caller changes |
| **F1.4** | Soil moisture ingestion — SMAP + bucket water-balance model | P1 | P4-BE | D2 | Moisture value retrievable for any NER coordinate |
| **F1.5** | Virtual sensor network — real MQTT gateway + simulated motes | P1 | P4-BE | D2 | Gateway ingests MQTT messages into Timescale; simulator is a separate process that can be killed without breaking the gateway |
| **F1.6** | Satellite imagery pipeline — bi-temporal Sentinel-2 pair fetcher for an AOI + date range | P1 | P3-CV | D3 | Given AOI + two dates, returns two co-registered, cloud-filtered rasters |
| **F1.7** | Exposure layers — OSM roads, village points, Census population | P0 | P1-GEO | D2 | Roads + villages queryable by bbox; population joined to village points |
| **F1.8** | Feature store schema — PostGIS + TimescaleDB | P0 | P1-GEO | D1 | Migrations run clean from empty DB; spatial index on every geom column |

---

## E2 — AI/ML Prediction Engine

| ID | Feature | Pri | Lane | Day | Acceptance criterion |
|---|---|---|---|---|---|
| **F2.1** | **Stage A — susceptibility model** (XGBoost over terrain + geology + landcover features) | P0 | P2-ML | D2 | Trained model + susceptibility raster covering all NER at 90 m |
| **F2.2** | Spatial cross-validation + honest metrics | P0 | P2-ML | D2 | ROC-AUC reported under **spatial block CV**, not random CV; number written into the deck |
| **F2.3** | SHAP explainability service | P1 | P2-ML | D3 | For any zone, API returns top-5 contributing factors with signed weights |
| **F2.4** | **Stage B — rainfall I–D threshold engine** | P0 | P2-ML | D3 | For any zone, returns observed rainfall vs threshold curve and an exceedance ratio |
| **F2.5** | Antecedent Precipitation Index with decay | P1 | P2-ML | D3 | API value moves correctly across a synthetic dry→wet→dry sequence |
| **F2.6** | **Hazard fusion → 4 levels** (Normal/Watch/Warning/Danger) | P0 | P2-ML | D3 | Every NER zone carries a current level; levels change when inputs change |
| **F2.7** | 5-day forward hazard forecast | P1 | P2-ML | D4 | Forecast rainfall run forward through Stage B → per-day hazard timeline |
| **F2.8** | Nightly retraining pipeline (closed loop with F3.4) | P2 | P2-ML | D6 | New scars appended → retrain job runs → new raster written, old one archived |

---

## E3 — Computer Vision *(mandatory pillar)*

| ID | Feature | Pri | Lane | Day | Acceptance criterion |
|---|---|---|---|---|---|
| **F3.1** | **CV-1 · Field-report classifier** — 6 classes + severity head | P0 | P3-CV | D3 | Upload a crack photo via API → correct class + severity + confidence in <3 s |
| **F3.2** | CV-1b · Report integrity — EXIF/GPS validation, perceptual-hash dedup, blur detection | P1 | P3-CV | D4 | Re-uploading the same photo is flagged duplicate; a photo with no GPS is flagged |
| **F3.3** | **CV-2 · Satellite scar segmentation** — U-Net/SegFormer on bi-temporal Sentinel-2 | P0 | P3-CV | D3 | Bi-temporal pair in → binary scar mask out; IoU reported on held-out test set |
| **F3.4** | **CV-2b · Scar → inventory auto-append** *(the learning loop — our signature)* | P2 | P3-CV | D6 | Detected scar above confidence τ writes a new inventory row tagged `source=cv2` |
| **F3.5** | CV-3 · Road blockage → % carriageway obstructed | P2 | P3-CV | D4 | Road photo in → obstruction % out → link status OPEN/PARTIAL/BLOCKED |
| **F3.6** | CV-4 · Crack progression / slope creep via feature matching | P3 | P3-CV | D6 | Photo sequence in → displacement plot out |

---

## E4 — Control-Room Dashboard

| ID | Feature | Pri | Lane | Day | Acceptance criterion |
|---|---|---|---|---|---|
| **F4.1** | Widget canvas shell — react-grid-layout, drag/resize/add/remove, persisted layout | P0 | P5-FE | D4 | Layout survives a page reload |
| **F4.2** | **MapLibre hazard map** + layer control | P0 | P5-FE | D4 | Risk heatmap renders over NER; layers toggle; pan/zoom smooth |
| **F4.3** | Risk tile service — COG → map tiles | P0 | P4-BE | D4 | Tiles served; no per-pan model computation |
| **F4.4** | Zone selection + context panel with SHAP "why" | P0 | P5-FE | D5 | Click a zone → level, score, top-5 factors, exposure counts |
| **F4.5** | KPI row — districts at Danger, villages at risk, roads blocked, open reports, model AUC | P0 | P5-FE | D4 | Five live numbers, each traceable to a query |
| **F4.6** | Severity donut (zone count by level) | P1 | P5-FE | D4 | Segments sum to total zone count |
| **F4.7** | Rainfall vs I–D threshold chart | P0 | P5-FE | D4 | Observed curve plotted against threshold curve for selected zone |
| **F4.8** | Soil moisture trend | P1 | P5-FE | D4 | 7-day trend for selected zone |
| **F4.9** | 5-day risk forecast timeline | P1 | P5-FE | D5 | Per-day hazard bars for selected district |
| **F4.10** | **Road connectivity graph + cut-off village detection** | P1 | P5-FE | D5 | Blocking a link visibly isolates the correct downstream villages |
| **F4.11** | Response priority queue — hazard × population × isolation × road criticality | P0 | P5-FE | D5 | Ranked list; ranking recomputes when hazard changes |
| **F4.12** | Field report stream with CV-1 classification | P0 | P5-FE | D5 | New report appears within 5 s, showing photo + class + severity |
| **F4.13** | Scar detection before/after viewer | P2 | P5-FE | D6 | Slider wipes between pre/post imagery with mask overlay |
| **F4.14** | Alert log / CAP feed | P1 | P5-FE | D5 | Every issued alert listed with channel + status + CAP XML link |
| **F4.15** | **Mode switch — LIVE / BACKTEST / SIM** | P0 | P5-FE | D5 | Switching mode re-binds every widget to the new context |
| **F4.16** | Time-travel scrubber | P0 | P5-FE | D5 | Dragging the slider moves map + all widgets together |
| **F4.17** | **Ask SANKET** — natural-language query → widget | P2 | P4-BE | D6 | "Which villages in Manipur are cut off right now?" returns a correct answer |

---

## E5 — Field App *(responsive route of the same web app)*

| ID | Feature | Pri | Lane | Day | Acceptance criterion |
|---|---|---|---|---|---|
| **F5.1** | Risk banner — my area's current level, translated, above the fold | P0 | P6-FIELD | D5 | Loads on a phone in <2 s and states the level in the selected language |
| **F5.2** | Photo report capture — EXIF geotag, ≤4 taps | P0 | P6-FIELD | D5 | Photo → submitted in four taps; GPS attached automatically |
| **F5.3** | **Offline queue — IndexedDB + Background Sync** | P0 | P6-FIELD | D5 | Airplane mode → submit 2 reports → reconnect → both sync without user action |
| **F5.4** | Cached basemap tiles for the user's district | P1 | P6-FIELD | D6 | Map still renders with network disabled |
| **F5.5** | Nearby risk + safe routes | P2 | P6-FIELD | D6 | Lists nearest at-risk zones and open road links |
| **F5.6** | Report status tracking | P2 | P6-FIELD | D6 | Reporter sees queued → sent → triaged |

---

## E6 — Alerting & Dissemination

| ID | Feature | Pri | Lane | Day | Acceptance criterion |
|---|---|---|---|---|---|
| **F6.1** | Alert decision engine — hysteresis, dedup, escalation tiers | P0 | P4-BE | D5 | A zone oscillating around a threshold does **not** emit repeated alerts |
| **F6.2** | **CAP 1.2 XML generation** | P1 | P4-BE | D5 | Emitted XML validates against the CAP 1.2 schema |
| **F6.3** | Multi-channel dispatch — Web Push + Telegram *(SMS deferred, adapter stubbed)* | P0 | P4-BE | D5 | Push notification arrives on a real phone during the demo |
| **F6.4** | Multilingual alert templates — i18next + Bhashini, **+ hand-written Mizo & Khasi** | P1 | P6-FIELD | D5 | Same alert renders correctly in ≥6 languages incl. 3 NE Indian ones. ⚠️ Bhashini lacks Mizo/Khasi — those ~15 fixed-slot phrases are hand-translated (README §7a) |
| **F6.5** | Delivery tracking | P2 | P4-BE | D6 | Alert log shows per-channel delivery state |

> **SMS is deferred by decision.** Build `NotificationChannel` with Push and Telegram implemented and an `SMSChannel` stub. Q&A line: *"SMS is a provider contract and a sender-ID approval, not an engineering problem — the channel interface is already there."*

---

## E7 — Scenario, Validation & Trust

| ID | Feature | Pri | Lane | Day | Acceptance criterion |
|---|---|---|---|---|---|
| **F7.1** | **Backtest harness** — replay a historical event through the live model | P0 | P2-ML | D6 | Noney, June 2022 replays end-to-end; lead time computed and displayed |
| **F7.2** | **Scenario simulator** — inject rainfall, run forward, watch cascade | P0 | P4-BE + P5-FE | D6 | Injecting 250 mm/24 h over a district visibly escalates hazard, queue, graph and fires an alert |
| **F7.3** | Model metrics panel — AUC, lead time, false-alarm rate | P1 | P2-ML | D6 | Numbers shown in-app, matching what the deck claims |

---

## Cut list — in the order we cut

If D6 evening is not green, cut in this exact order. Decide fast, do not rescue.

1. F3.6 · CV-4 crack progression
2. F5.5 · safe routes
3. F5.6 · report status
4. F4.17 · Ask SANKET
5. F2.8 · nightly retrain *(keep F3.4 as a manual trigger — the loop can be demoed by hand)*
6. F4.13 · scar before/after viewer
7. F3.5 · CV-3 road blockage *(fall back to manual road status)*
8. F6.5 · delivery tracking

**Never cut:** anything P0, and never CV-1 or CV-2 — computer vision is a hard requirement for us.

---

## Feature count

| Priority | Count |
|---|---|
| P0 | 24 |
| P1 | 16 |
| P2 | 11 |
| P3 | 1 |
| **Total** | **52** |

24 P0 features across 6 people in 7 days is roughly **4 P0 features per person** — tight but real, and only because §3 of the README says a large slice of E4 is a port rather than a build.
