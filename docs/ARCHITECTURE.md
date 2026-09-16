# SANKET — Architecture

**v0.1 · 25 Aug 2026**

> 📐 **Diagrams live in the published architecture page:** https://claude.ai/code/artifact/b08fa1df-98e1-4363-9fec-cf07fbe59510
> Four figures — the six-layer system, hazard fusion, the offline field-report path, and the CV learning loop. This document holds the text that the diagrams don't: schema, API surface, decisions, deployment.

---

## 1. Shape of the system

Six layers, data falling downward. Only one thing reaches back up — the retraining loop (§6).

```
1  EXTERNAL SOURCES    Open-Meteo · IMERG · SMAP · Sentinel-2 · DEM · GSI · OSM · virtual motes
2  INGESTION ADAPTERS  WeatherProvider · MoistureProvider · SensorGateway · ImageryProvider · GeoLoader
3  FEATURE STORE       PostGIS · TimescaleDB · object store
4  AI CORE             Stage A · Stage B · Fusion · SHAP  |  CV-1 · CV-2 · CV-3
5  SERVING             Tile service · REST + WebSocket API · Alert engine
6  CLIENTS             Control-room dashboard · Field PWA
```

**The load-bearing idea in layer 2:** every external source enters through an adapter behind a common interface. That is what lets us ship an IMD adapter that is stubbed, and swap a simulated sensor mote for real hardware later, without touching anything downstream.

---

## 2. Data model

Nine core tables. Everything spatial carries an indexed geometry column; everything temporal is a Timescale hypertable.

| Table | Store | Key columns | Written by |
|---|---|---|---|
| `zones` | PostGIS | `geom`, `district_id`, `susceptibility`, `hazard_level`, `updated_at` | F2.1, F2.6 |
| `landslide_inventory` | PostGIS | `geom`, `event_date`, `source`, `confidence`, `fatalities` | F1.2, F3.4 |
| `terrain_features` | PostGIS / COG | `slope`, `aspect`, `curvature`, `twi`, `spi`, `relief` | F1.1 |
| `roads` | PostGIS | `geom`, `osm_id`, `class`, `status`, `obstruction_pct` | F1.7, F3.5 |
| `villages` | PostGIS | `geom`, `name`, `population`, `is_isolated` | F1.7, F4.10 |
| `weather_obs` | TimescaleDB | `time`, `cell_id`, `rain_mm`, `source`, `is_forecast` | F1.3 |
| `moisture_obs` | TimescaleDB | `time`, `cell_id`, `vwc`, `source` | F1.4, F1.5 |
| `field_reports` | PostGIS + blob | `geom`, `photo_uri`, `cv_class`, `severity`, `phash`, `triage_score` | F3.1, F3.2 |
| `alerts` | PostGIS | `zone_id`, `level`, `issued_at`, `cap_xml`, `channels`, `delivery` | F6.1, F6.2 |

**The schema decision worth arguing about:** `zones` stores a *current* hazard level, not a history. BACKTEST and SIM modes therefore write to a **shadow table**, never to live state. A scenario run can never contaminate the real operational picture — and without this, a demo would silently corrupt the LIVE view.

---

## 3. API surface

One FastAPI service. No Node/Express gateway — see §5.

| Endpoint | Purpose |
|---|---|
| `GET /zones` | Hazard levels by bbox / district — the dashboard's primary read |
| `GET /zones/{id}/explain` | SHAP factors + exposure counts (the "why is this red?" panel) |
| `GET /tiles/{layer}/{z}/{x}/{y}` | Pre-baked raster / vector tiles |
| `POST /reports` | Field report ingest (multipart) — triggers CV-1 synchronously |
| `GET /reports` | Triaged report queue, sorted by triage score |
| `GET /connectivity` | Road graph + isolated villages |
| `GET /priority` | Ranked response queue |
| `GET /forecast` | 5-day forward hazard timeline |
| `POST /scenario` | Inject rainfall, run forward (SIM — shadow table) |
| `GET /backtest` | Replay a historical window, return lead time |
| `GET /alerts`, `/alerts/{id}/cap.xml` | Alert log + CAP 1.2 document |
| `POST /ask` | Natural-language query → widget (LangGraph agent, read-only tools) |
| `WS /live` | Level changes, new reports, alerts — push, not poll |

---

## 4. Hazard computation

```
H = S × f(E) + w₁·M + w₂·C
```

| Term | Meaning | Source |
|---|---|---|
| `S` | Static susceptibility ∈ [0,1] | Stage A — XGBoost over terrain/geology/landcover |
| `E` | Rainfall exceedance ratio `I / I₀(D)` | Stage B — intensity-duration threshold |
| `M` | Antecedent moisture | SMAP + decaying API index |
| `C` | Nearby CV activity | Fresh scars, triaged reports |

`H` maps to four levels — **Normal / Watch / Warning / Danger** — each bound to a defined action, not just a colour.

**Hysteresis on transitions is mandatory.** A zone oscillating around a threshold must not emit an alert every cycle. This is the single most common way an early-warning system loses the trust of its users, and it is a two-line fix that teams routinely forget.

**SANKET never auto-evacuates.** It recommends; humans decide. This is a deliberate safety boundary — state it explicitly when asked.

### Calibrated threshold — two independent sources agree

The NE Himalaya intensity–duration threshold we use:

```
I = 5.8294 · D^(−0.4141)          I in mm/h, D in hours
```

Independently corroborated by a Guwahati-region study giving `I = 5.9 · D^(−0.479)` — near-identical coefficients from separate work. **Two independent studies converging is worth a line in the deck**: it means the trigger is calibrated to published regional science, not fitted to our own small sample.

⚠️ The *units* on the published coefficients could not be confirmed (paywalled sources). Sanity-check against a known event before trusting the absolute values.

---

## 5. Decisions

Recorded so nobody relitigates them on day five.

| Decision | Chosen | Rejected | Because |
|---|---|---|---|
| Backend tiers | Single FastAPI service | React → Node BFF → FastAPI | The ML is Python; a gateway adds a hop and a container for nothing at this scale |
| Prediction design | Two-stage, static × dynamic | End-to-end deep model | Explainability is a hard requirement for government users |
| Coverage | 90 m NER-wide + 30 m focus districts | 30 m everywhere | ~291 M cells at 30 m isn't processable in 7 days; 90 m still covers all 8 states honestly |
| Map library | MapLibre GL | Mapbox GL | No API token — removes a demo-day failure mode entirely |
| Field client | PWA route in the same app | Separate React Native app | One codebase; installs from a URL onto a judge's phone |
| Tiles | Pre-baked nightly | On-demand rendering | Venue wifi + a live model call per pan is how demos die |
| Alert channels | Push + Telegram now, SMS stubbed | SMS on the critical path | Sender-ID approval is an external dependency we can't control in 7 days |
| Validation | Spatial block CV | Random train/test split | Random splits leak neighbouring pixels and inflate AUC |
| Theme | Inherited "Light Clinical" | Dark operations theme | Already built; hazard hues read better on light ground and project better |

---

## 6. The learning loop

```
inventory → nightly retrain → susceptibility raster → prioritises AOIs
    ↑                                                        ↓
confidence gate (τ ≥ 0.8) ← CV-2 segmentation ← Sentinel-2 bi-temporal fetch
```

**The confidence gate matters more than it looks.** Without it, a CV-2 false positive becomes a permanent training label and the model teaches itself its own mistake. Anything below τ goes to a human review queue, not into the inventory.

---

## 7. Deployment

Four containers, one `docker-compose.yml` — trimmed from PharmaBoard's.

- `postgres` — PostGIS 15-3.3 + TimescaleDB extension
- `api` — FastAPI + model artefacts + scheduler process
- `mqtt` — broker for the sensor gateway
- `web` — nginx serving the built React app, reverse-proxying `/api`

Training happens offline (Colab / laptop GPU); only inference artefacts ship in the image. Tiles are baked into a volume.

**Demo-day contingency is part of the architecture.** The whole stack must run with no outbound internet: seeded DB, pre-baked tiles, cached imagery, model artefacts on disk. Rehearse that build specifically.

---

*Companion documents: [PRD.md](PRD.md) · [FEATURES.md](FEATURES.md) · [dashboard-spec.md](dashboard-spec.md)*
