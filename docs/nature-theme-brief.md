# SANKET — Nature-Inspired UI Brief for Claude Design

**Purpose of this document:** paste this into Claude Design to generate a fuller visual exploration of SANKET's nature-inspired direction. It describes what exists today (a working React prototype), what's being asked for, and gives real content to design against — not lorem ipsum.

---

## 1. What SANKET is

A landslide early-warning dashboard for India's North Eastern Region, built for **SIH 2026 (Problem Statement 26001, MDoNER)**. It fuses terrain, rainfall, soil moisture and satellite/field imagery into a live four-level risk surface (Normal / Watch / Warning / Danger) across all 8 NER states, with a working prototype already running.

**Audience:** district disaster-management officers and field officers — people making time-pressured decisions, not a consumer app. The tone should read as capable and calm under pressure, not decorative. Think "instrument a ranger trusts," not "travel app."

**Why "nature-inspired":** the product literally monitors terrain — forest canopy, hillside soil, monsoon rainfall, river drainage. The visual language should come from that subject matter, the same way a clinical dashboard borrows from lab-instrument conventions. This is not a generic "add some green" reskin — it should feel specific to *this* terrain and *this* climate.

---

## 2. What's being asked for right now

The current build ("Highland" theme) moved off a clinical navy/gray palette toward earth tones, but a real problem surfaced in testing: **three of the four hazard levels (Watch, Warning, Danger) all clustered in a narrow orange-brown hue band**, so the UI read as "everything is green or brown" rather than genuinely nature-inspired. That specific bug is already fixed in code (see §4). What's wanted now is a **fuller visual exploration** — more considered typography, layout rhythm, and secondary visual motifs than a quick token swap can deliver.

**Explicitly not wanted:** a return to generic dashboard conventions (accent stripes, drop-shadow cards, gradient heroes). Explicitly wanted: something that could only be this product, not any dashboard with the colors changed.

---

## 3. Current design tokens (starting point, not a constraint)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#F3F1E9` | App background — warm stone, not cool gray |
| `--surface` | `#FCFBF6` | Card background |
| `--surface-2` | `#E9E5D6` | Sunken zones, table headers |
| `--border` | `#D9D2BC` | Structural rules |
| `--accent` | `#2E5E45` | Primary interactive — deep forest green |
| `--accent-2` | `#2E6B72` | Secondary accent — river-stone teal, used for selection state so it doesn't blend with hazard-normal green |
| `--text-primary` | `#1C2620` | Near-black with a green undertone |
| `--text-muted` | `#57604F` | Secondary text |
| `--hazard-normal` | `#3F8B4C` | Grass green (~140° hue) |
| `--hazard-watch` | `#C99A2E` | Golden amber (~42° hue) |
| `--hazard-warning` | `#C1651F` | Terracotta (~25° hue) |
| `--hazard-danger` | `#A32E28` | Saturated rust red (~6° hue) |

**Typography:** IBM Plex Sans (body/UI) + IBM Plex Mono (data, coordinates, technical labels). Fixed-width numerals throughout (`font-variant-numeric: tabular-nums`) since this is a data-dense operational UI.

**Density:** compact — 13px base font, 3-4px border radii, minimal shadow (`--shadow-card: none`). This is read constantly by people who already know the domain, not a first-impression marketing surface.

A full exploration is welcome to propose new tokens rather than being bound to these — but any replacement palette needs the same property that made the fix work: **hazard levels spread across the hue wheel, not clustered.** Four status colors that a district officer can tell apart in a half-second glance, under bad lighting, on a projector.

---

## 4. The palette bug already fixed (context, don't re-solve it)

Original hazard scale had Watch `#A67C2E` / Warning `#C1651F` / Danger `#A93A2E` — all within a 15–35° hue band. Fixed by widening Watch toward true gold (42°) and Danger toward true red (6°), plus adding map-specific fill tokens at higher opacity (`--hazard-*-map`, ~30% vs. the ~11% badge wash) since a large map shape needs more saturation to read than a small text badge does. If proposing a new palette, carry this lesson forward rather than rediscovering it.

---

## 5. Screens to explore (real layouts, real content)

### 5.1 — NER Regional Dashboard (primary landing screen)

```
┌─────────────────────────────────────────────────────────────────┐
│ [S] SANKET          NER Regional Dashboard   NER › Manipur › Noney │  ← sidebar + topbar
│ LANDSLIDE EARLY WARNING                    LIVE (MOCK)  [role][lang]│
├──────────┬──────────────────────────────────────────────────────┤
│ Dashboard│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐  │
│ GIS Map  │  │Monitored│High-Risk│ Active  │Affected │At-Risk  │  │  ← 6 KPI cards
│ Risk Mon.│  │Districts│  Zones  │Warnings │Villages │ Roads   │  │
│ Field Rpt│  │  118    │   21    │   26    │   41    │   18    │  │
│ Alerts   │  └─────────┴─────────┴─────────┴─────────┴─────────┘  │
│ Priorities│                                                       │
│ Backtest │  ┌────────────────────────────┐  ┌──────────────────┐ │
│          │  │  NER Status                │  │ Regional Summary │ │
│──────────│  │  [All][normal][watch]      │  │ ● DANGER    04    │ │
│ Field    │  │  [warning][danger]         │  │ ● WARNING   17    │ │
│ Officer  │  │                            │  │ ● WATCH     32    │ │
│ View     │  │   [8-state map shape,      │  │ ● NORMAL   112    │ │
│          │  │    real district-derived   │  │ Highest Risk:      │ │
│──────────│  │    boundaries, coloured    │  │   Manipur          │ │
│ Role:    │  │    by hazard level]        │  │ Most Affected:     │ │
│ District │  │                            │  │   Noney District   │ │
│ Officer  │  └────────────────────────────┘  │ Connectivity: 7    │ │
│          │                                  ├──────────────────┤ │
│          │                                  │ Rainfall Summary  │ │
│          │                                  │ Heavy rainfall over│ │
│          │                                  │ Manipur & Meghalaya│ │
│          │                                  ├──────────────────┤ │
│          │                                  │ [Open GIS Map]    │ │
│          │                                  │ [View Warnings]   │ │
│          │  ┌────────────────────────────────────────────────┐ │
│          │  │ Manipur — Districts                              │ │
│          │  │ District | Population | Hazard | Summary | →     │ │
│          │  │ Noney    | 47,000     | WARNING| Heavy rainfall...│ │
│          │  └────────────────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────────┘
```

**Real copy to use:** "Heavy rainfall + elevated soil moisture + steep terrain are contributing to increased risk." / "Highest Risk: Manipur" / "Most Affected: Noney District" / "Connectivity Alerts: 7"

**Design opportunity:** the map is the hero — it currently uses real district boundary shapes (not schematic boxes) coloured by hazard level. A fuller exploration could push how the map *feels* — texture, subtle terrain shading, how selection/hover reads — without sacrificing the real-geometry accuracy.

### 5.2 — Risk Monitoring (district deep-dive)

Two-column layout: left column stacks **Environmental Monitoring** (4 metric tiles: Rainfall / Soil Moisture / Vegetation / Terrain, each with a current value + trend), **AI Risk Assessment** (a factor table — Terrain Susceptibility, Rainfall Trigger, Soil Moisture, Vegetation, Historical Vulnerability — each High/Elevated/Moderate/etc., feeding one final hazard verdict), and **Landslide & Change Detection** (before/after satellite comparison + a field-evidence list with CV confidence scores like "Debris 94% · Trail/road obstruction 93%"). Right column: **"Why Is This Area at Risk?"** — a ranked list of contributing factors, each with a horizontal severity bar (Rainfall █████ HIGH, Soil Moisture ████ ELEVATED, etc.) — this is the single most important explainability moment in the product; a district officer should never see an unexplained red zone.

### 5.3 — Field Officer view (mobile-framed)

A phone-width card (offline-first field reporting): Location → Report Type (Crack / Slope movement / Landslide / Debris / Road blockage, shown as selectable chips) → Photo upload → Description → GPS capture → Submit. Includes a visible offline state: "No network — reports save locally" with a pending-sync queue that syncs when a "Sync" action fires. This is a genuinely offline-capable flow, not a cosmetic toggle — the visual design should make the offline/pending/synced states clearly distinct at a glance (a field officer checking this in bright sun, one-handed, needs the status legible without reading).

### 5.4 — Historical Backtesting

A scrubbable timeline replaying the real 2022 Noney landslide: 8 points from "30 Days Before" (Normal, 8mm rainfall) through escalating Watch → Warning → Danger states to "Event Day" (Danger, 210mm, flagged as the actual recorded event). A "Warning Lead Time" panel deliberately shows **"PENDING CALCULATION"** rather than a fabricated number — this honesty is a core product value, not a placeholder to fill in. The design should make an honest "we don't know yet" state feel considered, not broken.

---

## 6. Components worth designing deliberately

- **Hazard badge** — a colored dot + label (● DANGER), used everywhere from KPI summaries to table cells. Small, but it's the single most-repeated element in the product.
- **Severity bar** — horizontal fill bar for factor explanations (Rainfall █████ HIGH). Currently plain; could carry more of the nature motif (a texture suggesting rainfall intensity or soil saturation, used tastefully).
- **KPI tile** — label + large tabular-numeral value + optional trend/sub-label.
- **Layer toggle panel** — a checklist grouped into Risk / Geographical / Environmental / Disaster / Infrastructure, controlling what's visible on the map. Currently a plain checkbox list; could read more like a field-instrument control panel.
- **Role/permission lock state** — when a Field Officer's nav is restricted, locked items show a lock icon at 40% opacity with a tooltip. Worth a more deliberate "restricted" visual treatment.

---

## 7. Constraints for the exploration

- **Keep hazard-level color-blind safe.** Every hazard state already carries an icon/label alongside color — never color-only.
- **Keep tabular-nums on every numeral column.** This is a data-dense operational tool; misaligned digits read as unpolished.
- **No decorative accent stripes/bars.** Use whitespace, background tint, or the map's own geometry for visual rhythm instead.
- **The map's geometry must stay real** (actual Survey-derived district boundaries) — style it, don't replace it with schematic shapes.
- **This must still work at operational density** — a district officer scans this in seconds during an active event. Don't trade legibility for atmosphere.

---

*Reference implementation: `web/src/index.css` (tokens), `web/src/components/NerMap.jsx` (map rendering), `web/src/views/Dashboard.jsx` and `web/src/views/RiskMonitoring.jsx` (layouts described above).*
