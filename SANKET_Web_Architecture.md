# SANKET (संकेत) — Complete Web Application Architecture

> **SIH Problem ID 26001** · Ministry of Development of North Eastern Region (MDoNER)  
> **Client Layer Architecture & System Design Document**  
> Scope: `web/` directory (React 18, Vite 5, SVG Geodata Engine, Highland Design System)

---

## 1. High-Level Architecture Diagram

```
=================================================================================================================
                                            OFFLINE GEODATA PIPELINE
=================================================================================================================
  [ udit-001/india-maps-data ]
               │
               ▼
   india.geojson (4 MB)
               │
               ▼  web/geodata_src/build_geo.py
   ┌────────────────────────────────────────────────────────────────────────┐
   │ • Shapely unary_union (Dissolves polygons to 8 states & 118 districts) │
   │ • Equirectangular Cos-Latitude Projection (scale to 1000px viewBox)    │
   │ • Pole of Inaccessibility Algorithm (centers labels in concave shapes) │
   └───────────────────────────────────┬────────────────────────────────────┘
                                       │
                                       ▼ (Emits static SVG path dictionary)
                            web/src/data/nerGeo.js
=================================================================================================================
                                            APPLICATION RUNTIME
=================================================================================================================

                                           index.html (HTML5 Shell)
                                                   │
                                                   ▼
                                           main.jsx (React Root)
                                                   │
                                                   ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                              src/App.jsx                                                    │
 │  Central State Hub:                                                                                         │
 │  • view ('dashboard' | 'gis-map' | 'monitoring' | 'field-reports' | 'alerts' | 'priorities' | ...)          │
 │  • selection: { stateId: 'MN', districtId: 'noney', zoneId: 'noney-a' }                                     │
 │  • role ('district_officer' | 'field_officer')   • theme ('light' | 'dark' -> localStorage)                 │
 │  • language ('en' | 'hi')                        • sidebarOpen (boolean, mobile drawer)                     │
 │  • demoController: { demoActive, demoStep, demoPaused, timer }                                              │
 └──────┬──────────────────────┬────────────────────────┬────────────────────────────────┬─────────────────────┘
        │                      │                        │                                │
        ▼                      ▼                        ▼                                ▼
 ┌──────────────┐      ┌───────────────┐       ┌─────────────────┐             ┌────────────────────┐
 │  Sidebar.jsx │      │  Topbar.jsx   │       │ LiveTicker.jsx  │             │  DemoOverlay.jsx   │
 │──────────────│      │───────────────│       │─────────────────│             │────────────────────│
 │ • Nav Links  │      │ • Breadcrumbs │       │ • Interval (30s)│             │ • 7-Step Tour      │
 │ • RBAC Lock  │      │ • Search Box  │       │ • Toast Alerts  │             │ • Play/Pause/Skip  │
 │ • Drawer UI  │      │ • Role Switch │       │ • Event Jump    │             │ • Step Navigator   │
 │ • Theme Sync │      │ • Dark Toggle │       └─────────────────┘             └────────────────────┘
 └──────────────┘      └───────┬───────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  GlobalSearch.jsx   │
                    │─────────────────────│
                    │ • 118 District Index│
                    │ • Hazard Badging    │
                    └─────────────────────┘
                               │
                               ▼
=================================================================================================================
                                            CORE DOMAIN VIEWS
=================================================================================================================
  ┌─────────────────────────┬─────────────────────────┬─────────────────────────┬─────────────────────────────┐
  │      Dashboard.jsx      │       GisRiskMap.jsx    │    RiskMonitoring.jsx   │      FieldReports.jsx       │
  │─────────────────────────│─────────────────────────│─────────────────────────│─────────────────────────────│
  │ • KPI metric cards      │ • Multi-layer GIS engine│ • Rainfall / sparklines │ • Citizen photo feed        │
  │ • 8-State NER status map│ • Risk / Disaster layers│ • Soil moisture levels  │ • CV-1 damage triage tags   │
  │ • District filter table │ • Village & road markers│ • Explainable AI (SHAP) │ • Triage status & GPS coords│
  │ • Multi-district compare│ • Zone detail drawer    │ • Situation report print│ • Officer verification audit│
  │ • CSV export engine     │ • Infrastructure badges │ • Contextual bulletins  │                             │
  ├─────────────────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────────┤
  │       Alerts.jsx        │  ResponsePriorities.jsx │HistoricalBacktesting.jsx│    FieldOfficerView.jsx     │
  │─────────────────────────│─────────────────────────│─────────────────────────│─────────────────────────────│
  │ • CAP 1.2 XML generator │ • Priority scoring rule │ • Noney 2022 disaster   │ • Mobile PWA layout         │
  │ • Multi-channel selector│ • Exposed population    │ • -30d to Day 0 timeline│ • Offline report queue      │
  │ • Multilingual preview  │ • Isolated villages     │ • Step-by-step risk bar │ • Camera upload & GPS       │
  │ • Active alert audit log│ • Action prioritization │ • Lead-time audit panel │ • Local storage sync        │
  └─────────────────────────┴─────────────────────────┴─────────────────────────┴─────────────────────────────┘
                               │                           │                           │
                               └───────────────────────────┼───────────────────────────┘
                                                           ▼
=================================================================================================================
                                     ATOMIC COMPONENTS & DATA FOUNDATION
=================================================================================================================
  ┌───────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Shared UI Components (src/components/):                                                                   │
  │ • NerMap.jsx          (SVG rendering engine for 8 states, 118 districts, roads, and village markers)      │
  │ • HazardBadge.jsx    (Standardized Normal / Watch / Warning / Danger badge)                               │
  │ • KpiCard.jsx        (Metric counter with title, value, status, and delta)                                │
  │ • Sparkline.jsx      (Pure SVG trendline with gradient fills, min/max points)                             │
  │ • icons.jsx          (Custom SVG icon library: shield, alert, road, village, rain, eye, etc.)             │
  ├───────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Shared Data Stores (src/data/):                                                                           │
  │ • mockData.js        (Centralized data model: 118 districts, deterministic generator, priority scoring,   │
  │                       Noney backtesting event series, CAP language templates, and RBAC rules)             │
  │ • nerGeo.js          (Optimized SVG path dictionary and centroid coordinates for all states and districts)│
  ├───────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Styling & Design Tokens (src/index.css):                                                                  │
  │ • "Highland" Light Palette (Forest green, earth gold, amber, crimson, warm stone backgrounds)             │
  │ • "Highland Night" Dark Palette ([data-theme='dark'] tokens, deep slate surfaces, luminous hazard tones)  │
  │ • Responsive Layout Engine (@media rules: <900px mobile drawer, landscape print report stylesheet)        │
  └───────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Hierarchy Tree

```
index.html
└── main.jsx
    └── <App />
        ├── <Sidebar />
        │   ├── <IconShield />
        │   ├── <IconClose />
        │   └── NavItems (Dashboard, GIS Map, Risk Monitoring, etc.)
        │
        ├── <div className="sidebar-backdrop" />
        │
        ├── <div className="main-col">
        │   ├── <TopBar />
        │   │   ├── Breadcrumb Trail
        │   │   ├── <GlobalSearch />
        │   │   │   └── <HazardBadge />
        │   │   ├── Role Selector Dropdown
        │   │   ├── Language Selector Dropdown
        │   │   ├── Theme Toggle Button (<IconSun /> / <IconMoon />)
        │   │   └── Mobile Menu Button (<IconMenu />)
        │   │
        │   └── <div className="content">
        │       │
        │       ├── [view === 'dashboard'] ────────► <Dashboard />
        │       │                                     ├── <KpiCard /> (x6)
        │       │                                     ├── <NerMap mode="states" />
        │       │                                     ├── <HazardBadge />
        │       │                                     └── District Comparison Table (with CSV Export)
        │       │
        │       ├── [view === 'gis-map'] ──────────► <GisRiskMap />
        │       │                                     ├── Layer Filter Panel (Risk, Geo, Env, Disaster, Infra)
        │       │                                     ├── <NerMap mode="gis-full" />
        │       │                                     │   ├── Road Vectors (<line />)
        │       │                                     │   ├── Village Nodes (<circle />)
        │       │                                     │   └── Incident Markers (<polygon />)
        │       │                                     └── Zone Details Inspection Drawer
        │       │
        │       ├── [view === 'monitoring'] ───────► <RiskMonitoring />
        │       │                                     ├── Environmental Cards (Rainfall, Soil, NDVI, Slope)
        │       │                                     │   └── <Sparkline /> (7-point deterministic SVG)
        │       │                                     ├── AI Explainability Factor Bars
        │       │                                     ├── Exposed Villages & Roads Grid
        │       │                                     ├── Procedural News Bulletins
        │       │                                     └── Print Situation Report Button (window.print)
        │       │
        │       ├── [view === 'field-reports'] ────► <FieldReports />
        │       │                                     ├── Report Cards Queue
        │       │                                     ├── <HazardBadge />
        │       │                                     └── Verification Action Controls
        │       │
        │       ├── [view === 'alerts'] ───────────► <Alerts />
        │       │                                     ├── Target Zone & Severity Picker
        │       │                                     ├── Audience Checklist
        │       │                                     ├── Multilingual Text Preview (EN / HI)
        │       │                                     ├── CAP 1.2 XML Document Viewer
        │       │                                     └── Active Warning Feed
        │       │
        │       ├── [view === 'priorities'] ───────► <ResponsePriorities />
        │       │                                     ├── Ranked Priority Cards (1..N)
        │       │                                     ├── Scoring Inputs (Hazard, Pop, Roads, Isolation)
        │       │                                     └── "Inspect on GIS Map" Deep-Link Action
        │       │
        │       ├── [view === 'backtesting'] ──────► <HistoricalBacktesting />
        │       │                                     ├── Event Selector (Noney 2022)
        │       │                                     ├── Timeline Stepper (-30d to Day 0)
        │       │                                     ├── Environmental Condition Panels
        │       │                                     └── Lead-Time Audit Card ("PENDING CALCULATION")
        │       │
        │       └── [view === 'field-officer'] ────► <FieldOfficerView />
        │                                             ├── Mobile Form (Location, Hazard Type, GPS, Note)
        │                                             ├── Image Attachment Input
        │                                             ├── Offline Status Badge
        │                                             └── Local Queued Submissions Card
        │
        ├── <LiveTicker /> (Floating toast simulator)
        │   └── Click-to-drilldown trigger
        │
        └── <DemoOverlay /> (Conditional: demoActive === true)
            ├── Step Counter (1 of 7)
            ├── Progress Bar
            └── Controls (Previous, Play/Pause, Next, Exit)
```

---

## 3. Data & State Flow Architecture

```
                                    STATE ORCHESTRATION IN APP.JSX
  
     ┌────────────────────────────────────────────────────────────────────────────────────────┐
     │                                    App.jsx Core State                                  │
     │  view: 'dashboard'                                                                     │
     │  selection: { stateId: 'MN', districtId: 'noney', zoneId: 'noney-a' }                  │
     │  role: 'district_officer' | 'field_officer'                                            │
     │  theme: 'light' | 'dark'                                                               │
     └──────────────┬───────────────────────────────┬──────────────────────────────┬──────────┘
                    │                               │                              │
                    ▼                               ▼                              ▼
     ┌────────────────────────────┐  ┌────────────────────────────┐  ┌────────────────────────────┐
     │      Sidebar / Topbar      │  │        Domain Views        │  │     Data Store Access      │
     │────────────────────────────│  │────────────────────────────│  │────────────────────────────│
     │ • Navigation Actions       │  │ • Render Active View       │  │ • getState(stateId)        │
     │ • Breadcrumb Derivation    │  │ • Drilldown Callbacks:     │  │ • getDistrict(districtId)  │
     │ • Search Selection Event   │  │   - selectState(id)        │  │ • getZone(zoneId)          │
     │ • Role Filter Evaluation   │  │   - selectDistrict(id)     │  │ • computePriorities()      │
     │ • Theme Toggle Event       │  │   - goTo(view, selection)  │  │ • BACKTEST_EVENTS          │
     └────────────────────────────┘  └────────────────────────────┘  └────────────────────────────┘
```

### 3.1 Unidirectional State Management
All operational state lives at the top of the component tree in `src/App.jsx`:
- `view`: Current active screen (e.g. `'dashboard'`, `'gis-map'`, `'monitoring'`).
- `selection`: Active spatial focus object containing `{ stateId, districtId, zoneId }`.
- `role`: Active user persona (`'district_officer'` or `'field_officer'`).
- `theme`: Visual theme state (`'light'` or `'dark'`), synchronized with `document.documentElement.dataset.theme` and `localStorage['sanket-theme']`.
- `demoActive`: Boolean flag activating the presentation overlay.

Child views receive data and dispatch actions through explicit callbacks:
- `selectState(stateId)`
- `selectDistrict(districtId)`
- `selectZone(zoneId)`
- `goTo(nextView, partialSelection)`

### 3.2 Role-Based Access Control (RBAC)
Role restrictions are defined in `src/data/mockData.js` under `NAV_ROLE_ACCESS`:
```javascript
export const NAV_ROLE_ACCESS = {
  dashboard:       ['district_officer'],
  'gis-map':       ['district_officer'],
  monitoring:      ['district_officer'],
  'field-reports': ['district_officer'],
  alerts:          ['district_officer', 'field_officer'],
  priorities:      ['district_officer'],
  backtesting:     ['district_officer'],
  'field-officer': ['district_officer', 'field_officer'],
};
```
- **Field Officer Mode**:
  - Restricts sidebar navigation exclusively to **Field Officer View** and **Alerts**.
  - Renders locked padlocks on restricted navigation links.
  - Automatically hides the global district search bar in `TopBar.jsx`.
  - Hides the "Generate Alert" action panel in `Alerts.jsx` (rendering alerts as view-only).

### 3.3 Automated Guided Demo Controller
- Managed by `src/components/DemoOverlay.jsx`.
- Defines a 7-step sequence navigating through the "golden path":
  1. `Dashboard` (NER Regional Summary)
  2. `Dashboard` (Manipur Selection)
  3. `GisRiskMap` (Noney Drilldown)
  4. `RiskMonitoring` (Environmental Factors & SHAP)
  5. `Alerts` (CAP Warning Preview)
  6. `ResponsePriorities` (Prioritization Queue)
  7. `HistoricalBacktesting` (2022 Tupul Replay)
- Implements a self-clearing timer (`setTimeout`) that pauses when user hits "Pause" and resumes seamlessly.
- Appends `.content--demo-active` to the main viewport, clamping its maximum height (`calc(100vh - 270px)`) to guarantee controls never obscure view content.

---

## 4. Offline Geodata Pipeline

```
[ Raw GeoJSON: india.geojson ]
             │
             ▼
[ web/geodata_src/build_geo.py ]
   │
   ├── 1. Extraction: Parses features matching the 8 NER states.
   ├── 2. Dissolve: Executes Shapely `unary_union` across administrative multipolygons.
   ├── 3. Coordinate Normalization: Computes geodetic envelope (minx, miny, maxx, maxy).
   ├── 4. Equirectangular Projection:
   │      x = PAD + (lon - minx) * cos(lat0) * scale
   │      y = PAD + (maxy - lat) * scale   (Inverts Y-axis: North = 0)
   ├── 5. Pole of Inaccessibility (Polylabel Algorithm):
   │      Iteratively subdivides polygons into quadtree cells to find the point
   │      deepest inside the boundary, guaranteeing labels sit in visual centers
   │      even for concave shapes (e.g. Arunachal Pradesh arc, Assam wrapper).
   └── 6. Serialization:
          Generates web/src/data/nerGeo.js
             │
             ▼
[ web/src/data/nerGeo.js ]
   ├── NER_VIEWBOX = "0 0 1000 682"
   ├── STATE_PATHS: { "AR": { name, path, labelPoint: [x, y] }, ... }
   └── DISTRICT_PATHS: { "noney": { name, state, path, labelPoint: [x, y] }, ... }
             │
             ▼
[ web/src/components/NerMap.jsx ]
   Zero runtime geometry calculation; renders directly to responsive SVG DOM.
```

---

## 5. Technical Directory & File Registry

| File Path | Role & Architectural Purpose | Key Dependencies |
|---|---|---|
| **`web/index.html`** | Single-page HTML5 entry shell; loads Google Fonts (`Outfit`, `IBM Plex Sans`, `IBM Plex Mono`). | None |
| **`web/vite.config.js`** | Bundler configuration; mounts `@vitejs/plugin-react` and binds to port `5180`. | `vite`, `@vitejs/plugin-react` |
| **`web/package.json`** | Dependencies declaration (`react`, `react-dom`, `recharts`). | NPM registry |
| **`web/geodata_src/build_geo.py`** | Offline Python build script transforming `india.geojson` into projected SVG paths. | `shapely`, `json`, `math` |
| **`web/geodata_src/india.geojson`** | Source vector boundary dataset for Indian states and districts. | Survey-derived geodata |
| **`web/src/main.jsx`** | React DOM root bootstrap mounting `<App />`. | `react-dom/client`, `App.jsx` |
| **`web/src/App.jsx`** | Top-level application orchestrator (state, routing, theme, RBAC, demo tour). | Components & Views |
| **`web/src/index.css`** | 22KB design token system ("Highland" light & dark themes, print styles, responsive breakpoints). | Pure CSS Custom Properties |
| **`web/src/components/Sidebar.jsx`** | Navigation menu with role capability checks and mobile drawer support. | `icons.jsx`, `mockData.js` |
| **`web/src/components/Topbar.jsx`** | Top utility header (breadcrumbs, role dropdown, language switcher, dark mode toggle). | `GlobalSearch.jsx`, `icons.jsx` |
| **`web/src/components/NerMap.jsx`** | GPU-accelerated SVG GIS map rendering states, 118 districts, roads, villages, and hazards. | `nerGeo.js`, `mockData.js` |
| **`web/src/components/GlobalSearch.jsx`** | Instant search index covering all 118 districts with live hazard status. | `mockData.js`, `HazardBadge.jsx` |
| **`web/src/components/LiveTicker.jsx`** | Telemetry simulator emitting periodic toast notifications with direct view drilldown. | `mockData.js`, `icons.jsx` |
| **`web/src/components/DemoOverlay.jsx`** | Interactive presentation HUD with progress bar, step navigation, and play/pause controls. | `icons.jsx` |
| **`web/src/components/HazardBadge.jsx`** | Standardized status pill for Normal, Watch, Warning, and Danger. | `mockData.js` |
| **`web/src/components/KpiCard.jsx`** | Operational KPI metric card with title, numeric count, and status badge. | Pure presentation |
| **`web/src/components/Sparkline.jsx`** | Pure SVG 7-point trend sparkline with gradient fill and min/max markers. | Pure SVG |
| **`web/src/components/icons.jsx`** | Curated SVG icon collection (Shield, Alert, Rain, Road, Village, Map, Moon, Sun, etc.). | Pure SVG |
| **`web/src/views/Dashboard.jsx`** | High-level regional overview: NER map, KPI cards, district table, multi-district comparison matrix, CSV export. | `NerMap`, `KpiCard`, `mockData` |
| **`web/src/views/GisRiskMap.jsx`** | Interactive GIS layer browser (Risk, Geo, Env, Disaster, Infra) and zone inspection panel. | `NerMap`, `mockData` |
| **`web/src/views/RiskMonitoring.jsx`** | Detailed district monitoring: rainfall, soil moisture, NDVI, slope, SHAP factor attribution, print situation report. | `Sparkline`, `mockData` |
| **`web/src/views/FieldReports.jsx`** | Triage work queue for field submissions: photo inspection, CV classification, and verification. | `HazardBadge`, `mockData` |
| **`web/src/views/Alerts.jsx`** | Early warning management: CAP 1.2 XML generator, target audience selection, bilingual translation preview. | `mockData` |
| **`web/src/views/ResponsePriorities.jsx`** | Algorithmic intervention queue ranking response zones based on population, infrastructure, and cut-off risks. | `mockData` |
| **`web/src/views/HistoricalBacktesting.jsx`** | Simulation engine replaying the 2022 Tupul disaster with an interactive temporal stepper and lead-time audit. | `mockData` |
| **`web/src/views/FieldOfficerView.jsx`** | Mobile-first offline PWA view for geo-tagged report submission and local queue inspection. | `mockData` |
| **`web/src/data/mockData.js`** | 44KB deterministic data model: state and district models, priority algorithms, backtest event data, CAP templates. | `nerGeo.js` |
| **`web/src/data/nerGeo.js`** | 60KB precomputed SVG path dictionary and label centroid coordinates for all 8 states and 118 districts. | Compiled by `build_geo.py` |

---

## 6. Design System & Theming Architecture

The visual styling is built on CSS Custom Properties in `src/index.css`:

```
                  THEME & DESIGN SYSTEM TOKENS (src/index.css)
  
  [ Default :root (Highland Light) ]              [ [data-theme='dark'] (Highland Night) ]
  ├── --color-bg: #f4f6f0 (Warm Stone)           ├── --color-bg: #0e1311 (Deep Slate Forest)
  ├── --color-surface: #ffffff (Pure White)       ├── --color-surface: #151c18 (Dark Mineral)
  ├── --color-text: #1a221c (Deep Charcoal)       ├── --color-text: #e1e9e3 (Clean Chalk)
  ├── --accent-forest: #1e4530 (Pinewood Green)   ├── --accent-forest: #3dd68c (Luminous Mint)
  │                                               │
  └───────────────────────────────┬───────────────┘
                                  │
                                  ▼
                    [ Unified Hazard Color Scale ]
                    ├── Normal:  hsl(140°, 45%, 45%)  [Monitoring Green]
                    ├── Watch:   hsl(42°, 90%, 48%)   [Caution Gold]
                    ├── Warning: hsl(25°, 92%, 50%)   [Alert Orange]
                    └── Danger:  hsl(6°, 88%, 52%)    [Emergency Crimson]
```

### 6.1 Multi-Theme Engine
- The theme toggle in `TopBar.jsx` switches `document.documentElement.dataset.theme` between `'light'` and `'dark'`.
- The selection is persisted to browser `localStorage` under `'sanket-theme'`.
- The hazard color scale maintains consistent hue angles (140° green, 42° gold, 25° amber, 6° red) across both themes to ensure semantic consistency.

### 6.2 Responsive Mobile Layout (<900px Breakpoint)
- The fixed desktop sidebar transitions into a `position: fixed` slide-over drawer toggled via the hamburger button in `TopBar.jsx`.
- A darkened backdrop element (`.sidebar-backdrop`) dismisses the drawer on tap-outside.
- Grid containers across all 8 views utilize `repeat(auto-fit, minmax(N, 1fr))` and `overflow-x: auto` wrappers, preventing horizontal clipping down to 375px phone widths.

### 6.3 Landscape Print Report Engine (`@media print`)
- Integrated in `RiskMonitoring.jsx` via `window.print()`.
- Media queries hide application chrome (navigation bars, buttons, live toasts, theme toggles).
- Displays a dedicated situation report header and forces landscape page orientation:
  ```css
  @page {
    size: landscape;
    margin: 14mm;
  }
  ```
