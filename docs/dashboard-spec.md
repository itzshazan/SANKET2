# SANKET — Dashboard Specification

> The control-room surface. Audience: **district disaster management officers and state DMA staff** — people making real decisions under time pressure, not first-time users.
>
> Design register inherited from PharmaBoard's **"Light Clinical"** system: instrument-grade, dense, legible. Not consumer SaaS. See `D:\antigravity\proud-bohr\design\DESIGN_SYSTEM.md`.

---

## 1. Two views, one codebase

| View | Route | User | Device |
|---|---|---|---|
| **Control Room** | `/` | District/State DMA officer | Desktop, large screen |
| **Field** | `/field` | Field officer, citizen reporter | Phone, offline-capable |

Same React app, same build, same tokens. The field view is a responsive route with a service worker — not a second project. This is what makes "mobile/web application" in the PS true without doubling the work.

---

## 2. Control Room — information architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  SANKET   [State ▾][District ▾]   ◀ TIME ────●──── ▶  LIVE │ BACKTEST │ SIM  │
│                          🔴 3 DANGER  🟠 11 WARNING  🟡 24 WATCH    [EN ▾] ● │
├────────┬─────────────────────────────────────────────────┬───────────────────┤
│        │                                                 │  SELECTED ZONE    │
│ LAYERS │                                                 │  ───────────────  │
│        │                                                 │  Noney · Zone 47  │
│ ☑ Haz  │              MAPLIBRE HAZARD MAP                │  DANGER  0.87     │
│ ☑ Susc │              (risk heatmap + roads              │                   │
│ ☐ Rain │               + villages + reports              │  WHY? (SHAP)      │
│ ☐ Soil │               + CV scar polygons)               │  slope 62°  +0.31 │
│ ☑ Road │                                                 │  soil sat.  +0.24 │
│ ☑ Vill │                                                 │  road cut   +0.18 │
│ ☑ Rept │                                                 │  72h rain   +0.14 │
│ ☑ Scar │                                                 │                   │
│        │                                                 │  EXPOSURE         │
│        │                                                 │  4 villages 2,140 │
│        │                                                 │  NH-37  1.2 km    │
├────────┴─────────────────────────────────────────────────┴───────────────────┤
│  ▲ drag to resize · react-grid-layout widget canvas below                    │
│  ┌─────────┬─────────┬─────────┬─────────┐  ┌──────────────────────────────┐ │
│  │ KPI     │ KPI     │ KPI     │ KPI     │  │  RAINFALL vs I-D THRESHOLD   │ │
│  └─────────┴─────────┴─────────┴─────────┘  └──────────────────────────────┘ │
│  ┌───────────────────┐ ┌────────────────┐  ┌──────────────────────────────┐ │
│  │ RESPONSE PRIORITY │ │ SEVERITY DONUT │  │  ROAD CONNECTIVITY GRAPH     │ │
│  └───────────────────┘ └────────────────┘  └──────────────────────────────┘ │
│  ┌───────────────────┐ ┌────────────────┐  ┌──────────────────────────────┐ │
│  │ FIELD REPORTS     │ │ SCAR DETECTION │  │  5-DAY RISK FORECAST         │ │
│  └───────────────────┘ └────────────────┘  └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Three fixed regions + one flexible canvas:**

1. **Command bar** (fixed) — scope selectors, the **mode switch**, alert-count summary, language, live indicator
2. **Map** (fixed, dominant) — this is a GIS product; the map is not a widget
3. **Context panel** (fixed, right) — everything about the currently selected zone
4. **Widget canvas** (`react-grid-layout`) — drag/resize/add/remove, layout persisted. Straight port of PharmaBoard's `useDashboard` + `WidgetWrapper` + `WidgetSidebar`.

---

## 3. The mode switch — the single most important control

One three-way toggle changes what the whole dashboard means. This is what makes the demo flow cleanly and what makes the product genuinely useful.

| Mode | Time slider | Data | Purpose |
|---|---|---|---|
| **LIVE** | Locked to now | Real ingested data | Daily operations |
| **BACKTEST** | Any past date | Archived rainfall replayed through the model | Validation — *"would we have caught Noney 2022?"* |
| **SIM** | Scenario-driven | Synthetic rainfall injected by the user | Tabletop exercise / what-if planning |

Every widget on the page is bound to the same `(scope, mode, timestamp)` context. Change the slider and the entire dashboard moves together — map, KPIs, charts, queue, graph.

---

## 4. Widget inventory

Ordered by build priority. **"From"** = what it ports from PharmaBoard.

| # | Widget | Shows | PS req | From | Data |
|---|---|---|---|---|---|
| **1** | **Hazard Map** | Risk heatmap, roads, villages, report pins, CV scar polygons | (d)(f) | *new* — MapLibre | Risk COG → tiles |
| **2** | **KPI Row** ×4–5 | Districts at Danger · villages at risk · roads blocked · open reports · model AUC | (f) | `KPICard.jsx` | Aggregates |
| **3** | **Severity Donut** | Zone count by Normal/Watch/Warning/Danger | (f) | `RAGDonut.jsx` — R/A/G maps 1:1 | `hazard` table |
| **4** | **Zone Context + SHAP** | Why this zone is red, in ranked plain language | (b)(f) | *new* panel | SHAP values |
| **5** | **Rainfall vs I–D Threshold** | Observed rainfall against the failure curve for the selected slope | (a)(f) | `TrendLine.jsx` | Timescale |
| **6** | **Response Priority Queue** | Ranked: hazard × population × isolation × road criticality | (f) | *new* table | Computed |
| **7** | **Road Connectivity Graph** | Villages + road links as nodes; cut-off detection | (f) | **`ConnectivityGraph.jsx`** — already RAG-coloured | PostGIS + CV-3 |
| **8** | **Field Report Stream** | Photo cards + CV-1 class + severity + geo | (e) | `AiCustomWidget` patterns | `reports` table |
| **9** | **Scar Detection** | Before/after Sentinel-2 slider + segmentation mask overlay | (a)(b) | *new* | CV-2 |
| **10** | **5-Day Risk Forecast** | Forward-run hazard timeline per district | (f) | `AnomalyBar.jsx` | Forecast run |
| **11** | **Soil Moisture Trend** | SMAP + virtual sensors + bucket model | (a) | `TrendLine.jsx` | Timescale |
| **12** | **Alert Log / CAP Feed** | Issued alerts, channel, delivery status, CAP XML link | (c) | *new* table | `alerts` table |
| **13** | **Ask SANKET** | Natural-language query → generated widget | — | **`ai_agent.py` + `AiCustomWidget.jsx`** | LangGraph agent |
| **14** | **Scenario Panel** | Inject rainfall, run, watch cascade | — | *new* | SIM mode |

**Minimum viable dashboard for the demo: 1, 2, 3, 4, 5, 6, 7, 8.** Everything else is upside.

---

## 5. Hazard colour scale — lock this on D1

Reuse PharmaBoard's RAG hues so the design system stays coherent, extended to four levels:

| Level | Hex | Meaning | Action |
|---|---|---|---|
| **Normal** | `#1E7A34` (existing green) | Below threshold | Monitor |
| **Watch** | `#9A6400` (existing amber) | Susceptible + rain building | Inform local officials |
| **Warning** | `#D97706` | Threshold approached | Alert community, pre-position |
| **Danger** | `#B3261E` (existing red) | Threshold exceeded | Evacuate / close road |

Accessibility: never colour-only. Every level carries an icon and a text label — colour-blind judges exist, and so do colour-blind district officers.

---

## 6. Field view (`/field`)

Deliberately minimal. Assume one hand, bright sun, 2G or no signal.

```
┌─────────────────────────┐
│  ⚠ YOUR AREA: WARNING   │   ← big, translated, above the fold
│  Heavy rain expected.   │
│  Avoid NH-37 km 42-48.  │
├─────────────────────────┤
│   [ 📷  REPORT HAZARD ] │   ← one primary action
├─────────────────────────┤
│  ⏳ 2 reports queued    │   ← honest offline state
│     will send when      │
│     network returns     │
├─────────────────────────┤
│  Nearby risk  ▸         │
│  Safe routes  ▸         │
└─────────────────────────┘
```

**Offline mechanics** — extends the pattern already in `useDashboard.js` (localStorage-first, background sync):

- Service worker caches the app shell + basemap tiles for the user's district
- Photos + metadata queue in **IndexedDB** (not localStorage — blobs)
- Background Sync API flushes the queue on reconnect
- Server-authoritative merge on conflict; the queue shows honest pending state
- **SMS fallback:** text a district code to a shortcode, get the current risk level back. Works on a feature phone with no data at all — worth one slide on its own.

**Report capture:** photo → auto EXIF GPS + timestamp → optional voice note → severity dropdown → queue. Four taps maximum.

---

## 7. Language

`i18next` + **Bhashini** for translation and TTS. Priority order:

1. English, Hindi *(D5 — hand-written)*
2. Assamese, Bengali, Manipuri (Meitei), Mizo, Khasi, Nepali *(D5 — Bhashini)*
3. Nagamese, Bodo *(stretch)*

Alert templates are short and fixed-slot (`{district} {level} {action}`) so machine translation stays reliable. **Do not** machine-translate free-form text into a safety-critical alert — mistranslated evacuation instructions are a real harm, and a judge may well ask about exactly that.

---

## 8. Performance notes

- **Pre-bake tiles.** Do not compute risk per map pan. Nightly batch → COG → tiles. Demo-day wifi is the enemy.
- **Regional tier at 90 m** renders the whole of NER instantly; switch to the 30 m layer only inside focus districts.
- **WebSocket** for live alert pushes; plain REST polling for everything else.
- **`POST /batch`** widget-data pattern already exists in PharmaBoard's `widgets.js` — port it. One request per dashboard load, not fourteen.

---

## 9. Build order (D4–D5)

**D4 morning** — shell port: `useDashboard`, `WidgetWrapper`, `WidgetSidebar`, `FilterBar`, tokens. Dummy data.
**D4 afternoon** — MapLibre + risk tiles + zone selection + context panel.
**D4 evening** — widgets 2, 3, 5, 7 (all ports — should be fast).
**D5 morning** — widgets 4, 6, 8 (the new ones).
**D5 afternoon** — field view + offline queue.
**D5 evening** — alert log, i18n, mode switch wiring.
**D6** — Scenario panel, Ask SANKET, backtest wiring.

---

*Spec, not code. Argue with it before D4.*
