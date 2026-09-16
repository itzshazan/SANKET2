# SANKET — Project Handoff

**Written 25 Aug 2026 (D1) · Last updated 29 Aug 2026 (§3, fourteenth pass) · Ship 31 Aug 2026 · SIH PS 26001 · MDoNER**

> **Read this first if you are joining the project.** It tells you what state everything is in, what is decided, what is still open, and what will kill us. It is a status document, not a plan — the plan lives in `README.md` §9 and `FEATURES.md`.

---

## 0. The 30-second version

We are building **SANKET**, a landslide early-warning platform for all 8 North Eastern states. Terrain physics + live rainfall + **computer vision** produce a live, explained, four-level risk surface. A district officer sees which slopes are dangerous tonight and *why*; a field officer reports a crack from a phone with no signal; the system backtests against the real Noney 2022 disaster to prove it would have caught it.

**Right now: a working mocked prototype exists at `web/`** (React + Vite, 8 views, real GIS boundaries for all 118 districts, all data hardcoded/honestly-labelled as mock — see §3), **and it is live and deployed**: **https://sanket-sih26001.vercel.app** (see §3, fourteenth pass). **The live backend, trained ML models, and MapLibre production map do not exist yet** — the D1–D7 plan in §5 describes that build and was not followed as written; the days instead went into the prototype. See §3a before demoing or planning further work.

---

## 1. ✅ DONE — decisions locked

These are settled. Do not reopen them without a strong reason; each one closes off an alternative deliberately.

| Decision | Locked to |
|---|---|
| **Name** | SANKET (संकेत, "the signal") |
| **Coverage** | All 8 NER states — **90 m regional tier**, plus **30 m** in 2–3 focus districts |
| **Delivery** | Web app: control-room dashboard + responsive field view. **No hardware.** |
| **Models** | We train our own. Primary dataset supplied by faculty. |
| **Backend** | Single FastAPI service. **Node/Express BFF dropped.** |
| **Map** | MapLibre GL (no token → one less demo failure mode) |
| **Field client** | PWA route in the same app, not a separate native app |
| **Prediction design** | Two-stage: static susceptibility × dynamic rainfall trigger. Not end-to-end deep. |
| **Validation** | Spatial block CV. **We never report random-split AUC.** |
| **Theme** | ~~Inherited "Light Clinical" design system~~ — superseded 29 Aug by the nature-inspired "Highland" theme (forest green/earth tones); see §3 and §8 |
| **Tiles** | Pre-baked nightly, never computed per map pan |
| **Deferred** | SMS dispatch · live IMD feed · physical sensors — all stubbed behind interfaces |
| **Safety boundary** | **SANKET recommends; humans decide.** It never auto-evacuates. |

---

## 2. ✅ DONE — research complete and verified

Three independent audits were run and their key claims spot-checked. **These are tested facts, not assumptions** — that distinction is worth a lot in Q&A.

### Codebase audit — what we can reuse from PharmaBoard (`D:\antigravity\proud-bohr`)

**~4,100 of ~16,400 LOC (≈25 %) is genuinely reusable** — worth **3–4 person-days**.

- **Ports clean:** `notifications.py` (alert engine, best file in the repo) · `db.py` (3-tier DB privilege separation — also a security talking point) · `useDashboard.js` (localStorage-first layout store) · `useWidgetData.js` (batch-fetch coalescer) · `WidgetWrapper.jsx` · design tokens (RAG hexes map onto hazard classes with **zero colour changes**)
- **Ports with work:** `ai_agent.py` (~400 of 1,003 lines are domain-neutral framework) · `App.jsx` (2,334-line monolith — only ~530 lines are the grid shell, **must be split before porting**) · the Recharts widgets

### Data sources — 17 verified

| Fact | Consequence |
|---|---|
| **IMD returns HTTP 401** — both `/api/v1/cityforecast` and `/api/v1/districtrainfall`, tested directly. Needs registration **+ IP whitelisting**. | Write the adapter, don't depend on it. Our Q&A answer is now a tested result. |
| **GEE still free, but a monthly compute quota landed 27 Apr 2026** | Switch to **Contributor tier (1,000 vs 150 EECU-h)** — a self-service dropdown. Do it at registration. |
| **Bhashini almost certainly lacks Mizo and Khasi** | Two of our eight states. See §4. |
| **NASA COOLR moved behind Earthdata auth**; legacy anonymous CSV frozen at **March 2016** | Use Earthdata login, or accept stale data |
| Minutes to set up: Earthdata · Copernicus · GEE · Bhashini · OpenTopography | Do all of these on D1 |

### ML/CV — go/no-go on all four models

| Component | Call | Recipe / target |
|---|---|---|
| **Scar segmentation (CV-2)** | **GO** | U-Net++ / ResNet-50 ImageNet encoder, `0.5·BCE(pos_weight=25) + 0.5·Dice`, bs 8, lr 1e-4, ~30 epochs, 128→256. **Target F1 ≥ 0.72 / IoU ≥ 0.58.** ~2 h per run on a free T4. |
| **Field photos (CV-1)** | **CONDITIONAL** | CLIP frozen features + logistic-regression probe → 80–88 % at 200–300 imgs/class. **Do not fine-tune.** Conditional on having photos. |
| **Susceptibility (Stage A)** | **STRONG GO** | Safest component. WhiteboxTools (only lib with built-in TWI/SPI), 1:1 sampling with 500 m buffer, `verde.BlockKFold`. **Spatial-CV AUC 0.78–0.90.** |
| **Rainfall trigger (Stage B)** | **GO — no training at all** | Rules-based. `I = 5.8294·D^(−0.4141)`, API decay k = 0.9. |
| **Prithvi / Clay / TerraTorch** | **NO-GO** | F1 60.7 vs U-Net's 78.0. Highest prestige, lowest return. Would eat two days. |

**Threshold is corroborated:** an independent Guwahati study gives `I = 5.9·D^(−0.479)` — near-identical coefficients from separate work. Worth a deck line: Stage B is calibrated to published regional science, not fitted to our own sample.

### ✅ Documents written

| Doc | Contents |
|---|---|
| `README.md` | Overview, coverage strategy, audited reuse, 7-day plan, demo script, limitations |
| `docs/PRD.md` | 4 user types, 5 journeys, 8 success metrics, non-goals, assumptions, risks |
| `docs/FEATURES.md` | **52 features** with IDs, priority, day, acceptance criteria + ordered cut list |
| `docs/ARCHITECTURE.md` | Schema (9 tables), API surface (13 endpoints), hazard formula, 9 decisions, deployment |
| `docs/dashboard-spec.md` | Widget inventory, information architecture, field view, build order |
| `docs/ml-research.md` | Training recipes, metrics, faculty dataset checklist |
| `docs/data-sources.md` | All 17 sources, access requirements, blockers |
| **Architecture diagrams** | https://claude.ai/code/artifact/b08fa1df-98e1-4363-9fec-cf07fbe59510 |

---

## 3. ❌ NOT DONE — the honest list

**Update (27 Aug):** a mocked prototype now exists at `web/` — React + Vite, 8 views (Dashboard, GIS Risk Map, Risk Monitoring, Field Reports, Alerts, Response Priorities, Historical Backtesting, Field Officer offline view), Manipur/Noney built in real depth per the teammate feature spec, all data hardcoded (`web/src/data/mockData.js`), no backend. **This is not the live system below — see §3a.**

**Update (29 Aug):**
- **Real GIS boundaries.** State + all 118 NER district boundaries (Survey-derived, dissolved with Shapely, projected to static SVG) replace the earlier schematic cartogram — see `web/geodata_src/build_geo.py` and `docs/data-sources.md` §18.
- **Every district now has full Risk Monitoring content**, not just Noney — a deterministically-seeded generator (`web/src/data/mockData.js`) fills in environment/AI-assessment data for the ~109 districts beyond the 9 hand-authored ones. Two id mismatches this surfaced and fixed: Sikkim's district is "East Sikkim," not "Gangtok" (the capital town); Arunachal's is `lower-dibang-valley`, not `lower-dibang`.
- **"Highland" theme** — nature-inspired palette (forest green accent, earth-toned hazard scale) replacing PharmaBoard's clinical navy/gray, fully tokenized in `web/src/index.css`.
- **Role permissions are now real, not cosmetic.** Field Officer's nav is actually restricted (locked items show a lock icon + tooltip) to Field Officer View + Alerts (view-only — Generate is hidden for that role), matching the spec's §14 capability split.
- **Multilingual scope narrowed on purpose.** Only English and Hindi ship a real fixed-slot translation now; Manipuri and Assamese moved from 'ready' to 'planned' because I was not confident enough in safety-critical translation accuracy to ship them unreviewed — same discipline already applied to Mizo/Khasi elsewhere in this project.
- Also fixed: a CSS Grid overflow bug (missing `min-width: 0` on grid children, present in 4 of 8 views) that could silently push content off-screen at any window width, not just narrow ones.

**Update (29 Aug, later same day):**
- **Palette fix.** The hazard scale's Watch/Warning/Danger colours were clustered in a 15–35° hue band, reading as "everything is orange-brown except Normal." Widened Watch toward true gold (42°) and Danger toward true red (6°); added a second accent (`--accent-2`, river-stone teal) so "selected" state doesn't visually blend into hazard-normal's green; added stronger map-specific fill tokens since the badge-wash opacity was too subtle for a large map shape.
- **GIS layer toggles are now functionally wired**, not decorative. Risk-level checkboxes filter which zones render; Villages/Roads/Infrastructure checkboxes show real markers (village positions and road paths were added to the mock data for this); Disaster-type checkboxes filter field-evidence markers by report type; Environmental checkboxes surface the district's actual values as chips. Rivers/drainage and Terrain have no vector geometry in this prototype — toggling them shows an honest caption note rather than fabricated lines.
- **`docs/nature-theme-brief.md`** — a brief written for pasting into Claude Design, describing the current screens/tokens/components and the nature-inspired direction, for a fuller visual exploration than a token-only pass can deliver.

**Update (29 Aug, third pass — "continue with the rest"):**
- **Connectivity Analysis now has real breadth beyond Noney.** The 7 hand-authored shallow districts have real villages/roads/infrastructure where their hazard level actually justifies it (Watch/Warning — e.g. East Khasi Hills: Sohra, Mawsynram, the Shillong–Sohra road, a health centre); Normal-hazard districts (Kohima, Khowai) correctly stay empty, since nothing is genuinely at risk there. The 109 auto-generated districts at Warning/Danger hazard also get generically-named (not fabricated-specific) village/road entries for the same reason.
- **Response Priorities is now computed, not hardcoded.** Was a fixed 3-row list covering only Noney; now ranks all 118+ zones by hazard weight + village count + road count + infrastructure + population + isolation bonus, matching the formula in `deck/demo_sanket_text.md` §10. Verified live: 12-row ranked queue spanning 6 states, Noney correctly still ranks #1.
- **A real bug caught in the process:** the exposure-data edit put `VILLAGES`/`ROADS`/`INFRASTRUCTURE` object writes before their own `const` declarations (temporal dead zone — `ReferenceError: Cannot access 'VILLAGES' before initialization`). Fixed by moving the declarations earlier in the file, right after `ZONES` closes. Caught by checking the console after the edit, not assumed safe.
- Also fixed a leftover pluralization bug in `ResponsePriorities.jsx` ("1 villages").

**Update (29 Aug, fourth pass — full visual QA sweep, all 8 views):**
- **Topbar title overlap fixed.** `.topbar-title` had no overflow clipping, so long view titles visually bled into the role/language dropdowns at narrow widths. Now truncates with an ellipsis; confirmed the full title still shows with zero truncation at normal desktop width.
- **Dashboard's risk-level filter row fixed.** The All/normal/watch/warning/danger button row (and the global `.card-head` rule) lacked `flex-wrap`, so "danger" was clipped off-screen entirely instead of wrapping to a second line.
- **A systemic overflow bug found in 2 more places, same root cause as the earlier Grid fix.** `RiskMonitoring.jsx`'s Environmental Monitoring panel and `HistoricalBacktesting.jsx`'s Risk Progression panel both forced a fixed `repeat(N, 1fr)` grid; at normal content widths that squeezed each cell to ~50px, well under what labels like "Soil Moisture" or values like "ELEVATED"/"Saturated" need, so text was visibly cut off mid-word. Both converted to `repeat(auto-fit, minmax(110px, 1fr))` so cells wrap to fewer columns instead of over-shrinking. Swept the rest of `views/`/`components/` for the same `repeat(N, 1fr)` pattern — none left.
- **Response Priorities' "reasoning" line was pure duplication.** `computePriorities()` built the explanatory line from the same villages/roads/infra counts already shown as icons directly above it, so every card visibly repeated itself. Rewrote it to state the actual scoring inputs the card's own subtitle claims (hazard level, population exposed, isolation) instead — genuinely new information, not a restatement.
- **Field officer report descriptions were captured but never shown anywhere.** The Field Officer submission form collects a free-text description, but neither the officer's own submitted-report card nor the district officer's Field Reports view ever rendered `r.description` — the officer's field notes vanished from view immediately after submit. Added the description line to both cards, and backfilled realistic descriptions on the 3 seeded `FIELD_REPORTS` entries so the fix has real content to show.
- **Field Officer View's location dropdown had duplicate React keys (real console error, caught during this sweep).** `LOCATIONS` was built from every district's `VILLAGES`, but the ~109 auto-generated Warning/Danger districts reuse generic names ("Village A", "Village B", ...) — React logged "two children with the same key" and, worse, the dropdown showed a field officer locations from every state, not just their own. Scoped `LOCATIONS` to Noney's own villages (`village-noney-*`), matching the rest of this view, which is Noney-only by design.
- Confirmed (not a bug): a sidebar nav item briefly appearing highlighted after a programmatic click is a stale `:hover` artifact from the last real cursor position, not a React state bug — verified via `classList.contains('active')` on every nav item.

**Update (29 Aug, fifth pass — map label centering):**
- **State/district name labels weren't visually centered in their shapes** (user-reported, with a screenshot of the NER map). Root cause: `build_geo.py` placed each label at Shapely's `representative_point()`, which only guarantees a point *somewhere inside* the polygon — for elongated or concave shapes (Arunachal's arc across the top of the map, Assam wrapping around Meghalaya, Mizoram's narrow N–S sliver) that lands near an edge or corner, not the visual middle. Replaced it with the **pole of inaccessibility** algorithm (what Mapbox itself uses for label placement) — the point deepest inside the shape, farthest from any boundary — reimplemented directly in `build_geo.py` (no new dependency) since Shapely doesn't ship one. Regenerated `nerGeo.js` for all 8 states + 118 districts. Verified numerically, not just by eye: every state's label point now sits 0.3–0.7° inland from its nearest edge, and is confirmed `contains()`-inside its own polygon for all 8 states.

**Update (29 Aug, sixth pass — district-table risk filter):**
- **`Dashboard.jsx`'s "{State} — Districts" table now has a risk-level filter with live counts** (All/normal/watch/warning/danger), matching the pattern already used for the NER Status state map above it. Counts are computed per state from `DISTRICTS[stateId]`, not hardcoded. Switching states resets the filter (otherwise a "danger" filter carried over into a state with none would silently show an empty table with no explanation); an explicit "No districts at this risk level in {State}" message covers that case too. Verified live: filtering Manipur to "danger" correctly narrows 16 districts down to the 1 (Bishnupur) that matches.
- **Now fixed too (user asked as a follow-up).** Root cause: default table auto-layout gave `District`/`Population`/`Hazard`/`View` whatever width their content needed and starved `Summary` — by far the longest column — down to ~84px, wrapping it one word per line. Switched the table to `table-layout: fixed` with an explicit `<colgroup>`: fixed pixel widths on the four short columns, sized to their real worst case (`Population` at 78px fits the largest real population in the mock data, 825,000 → "8,25,000"; `Hazard` at 92px fits "WARNING", the longest hazard label), and no fixed width on `Summary` so it absorbs whatever's left (~120–140px depending on state — Summary now reads as normal wrapped sentences). First attempt used top-down percentages and was too aggressive on the short columns — it fixed Summary but then silently clipped population numbers and hazard badges instead (worse: a clipped number can misread as a smaller real value). Re-verified against East Khasi Hills specifically since it holds the largest population in the dataset — confirmed zero overflowing cells.

**Update (29 Aug, seventh pass — multi-district comparison):**
- **The "{State} — Districts" table can now compare multiple districts at once** (user-requested, from a screenshot of the Assam table). Added a checkbox column — a per-row tick plus a header "select all in current view" checkbox that respects whatever risk-level filter is active — and a "Comparing N Districts" card that appears once 2+ are selected, showing District/Hazard/Population/Historical Landslides/Field Reports/Active Alerts side by side, with a per-row remove (`×`) and a "Clear all". Selection is per-state: switching states clears it, the same way the risk-level filter already did, so a stale selection from one state can't silently apply to another. Checkbox clicks `stopPropagation()` so they don't also trigger the row's own click-to-drill-into-Risk-Monitoring behaviour. The comparison table has no single flexible column to absorb overflow (every field is short/numeric, unlike Summary above it), so rather than force-fit it into the card width it gets a fixed natural width and a scrolling wrapper instead — verified this doesn't clip anything by selecting all 33 Assam districts at once and confirming the card still renders correctly (just a longer scroll, not broken).

**Update (29 Aug, eighth pass — five requested enhancements):** User asked for "any more ideas or enhancements," was given a menu, picked all four offered plus added a fifth. All five built and verified live:
- **Global district search** (`components/GlobalSearch.jsx`) — a jump-to-district box in the topbar, searchable across all 118 districts by name, showing state + hazard badge per match, Enter picks the top result. Only rendered for `district_officer` (checked against `NAV_ROLE_ACCESS.monitoring`, not a hand-carved role check) since it navigates straight to Risk Monitoring, which `field_officer` doesn't have access to — the search shouldn't offer a shortcut around a restriction the rest of the UI enforces. Verified: typing "khasi" surfaces all 3 Khasi Hills districts; role-switching to Field Officer hides it entirely.
- **Simulated live-update toast** (`components/LiveTicker.jsx`) — fires a mock event (rainfall trending up, a new field report, a re-confirmed zone status, etc.) every ~18–38s, biased toward districts that already carry some risk so it reads as plausible rather than random. Purely a notification-layer effect — it does not mutate the shared mock dataset, so nothing else in the app can drift out of sync with it. Click-through opens that district's Risk Monitoring; only runs for `district_officer`. Verified live by waiting out a full cycle and confirming the toast fired, then clicking through.
- **Trend sparklines** (`components/Sparkline.jsx`) in Risk Monitoring's Environmental Monitoring cards, for Rainfall and Soil Moisture. The mock data only ever had 3 rainfall aggregates (24h/72h/7d) and a qualitative soil-moisture level — no real daily timeseries — so rather than invent one from nothing, `buildSeries()` in `RiskMonitoring.jsx` derives a deterministic 7-point shape seeded by district id, anchored so its **last point equals the real current figure** and its direction matches the real `trend` field. It's an illustration of a real trend, not a fabricated one. Verified: renders inside the existing 110px-min kpi-cards with zero overflow.
- **Export Situation Report** — a "browser Print dialog → Save as PDF" flow (no new dependency, works offline): a button on Risk Monitoring calls `window.print()`; new `@media print` rules in `index.css` hide the sidebar/topbar/buttons/toast and show a print-only report header (title, district, generated timestamp) that stands in for the hidden chrome. Verified the click handler and the print stylesheet rules both exist and target the right selectors (didn't actually trigger a real OS print dialog from automation, for obvious reasons).
- **Related News & Bulletins** (in `RiskMonitoring.jsx`, zone-scoped) — the one enhancement needing real care: this prototype has no live news integration, and inventing headlines attributed to real outlets (or dramatic specific claims) about real Indian districts would misrepresent both the prototype and, worse, could read as a real report about a real place out of context. So: mundane procedural phrasing only ("District administration issues advisory...", "PWD flags [road] for monitoring..."), a generic "sample bulletin" framing rather than any invented outlet name, relative timestamps ("3 days ago") rather than fabricated real dates, an explicit `SAMPLE DATA — MVP` flag matching the convention already used for satellite detection / field evidence elsewhere in this file, and a caption stating plainly that a real build would call a news/GDELT API filtered by district name + keywords. Verified both the populated case (uses a real village name from the zone's `VILLAGES` when one exists) and the fallback case (a district with no named villages correctly falls back to the district name, not "undefined").
- **A real bug caught mid-way, not from this session's own edits:** cycling through all 8 views showed a `ReferenceError: IconUpload is not defined` — looked alarming, but a hard reload (`navigate` with `force: true`) fixed it instantly and a brand-new tab showed zero console errors across the same cycle. Root cause was Vite's dependency-optimization cache going stale after a new named import was added to an already-running dev session — the same class of stale-HMR artifact noted earlier in this file, not a real code defect. Confirmed via a from-scratch tab before concluding that, not assumed.

**Update (29 Aug, ninth pass — two real regressions from adding the search box, caught by user-requested visual check):** User asked to visually verify the previous round; the topbar was badly broken — title and breadcrumb invisible, search box appearing to float alone. Root-caused two separate, compounding bugs rather than papering over the symptom:
- **`.app-shell` used `min-height: 100vh`, not `height: 100vh`.** That let the whole shell grow taller than the viewport instead of being capped, which meant `.content`'s `overflow-y: auto` never actually became a real constrained scroll region — the *document* scrolled instead, dragging the sidebar and topbar (never `position:sticky`; they'd only ever looked pinned because nothing had triggered window-level scroll before) off the top of the screen. Triggered live by a `scrollIntoView()` call, which is how it was first caught — reproduced deliberately afterward to confirm the fix, not just cleared and hoped. Fixed: `height: 100vh`.
- **Adding the search box to `.topbar-right` pushed its natural width past the topbar's available space**, and `.topbar-right` (`flex: none`) doesn't shrink — so instead of wrapping, it overflowed straight out past `.topbar`'s right edge, which collapsed `.topbar-left` (title + breadcrumb) to 0 width and pushed the whole page into horizontal scroll. Exact same "flex/grid child with no room to shrink and nowhere to go" shape as every other overflow bug fixed earlier in this file — just in the topbar this time, first exposed by this session's own new search feature rather than pre-existing content. Fixed the same way: `.topbar` and `.topbar-right` both now `flex-wrap: wrap` (topbar height changed from a fixed `56px` to `min-height: 56px` with `14px 24px` padding to preserve the original single-line height when everything fits); `.topbar-right` also needed an explicit `max-width: 100%` — a wrapped flex item doesn't automatically clamp to its line's width just because it's alone on that line, so the first wrap-only attempt visibly did nothing on its own.
- Verified at both ends: at this session's ~750px test width, the topbar now cleanly wraps to 3 lines (title+breadcrumb / search+live+role / language) with zero horizontal overflow (`body.scrollWidth === window.innerWidth`, confirmed); at 1400px it collapses back to the original single 56.8px-tall line. Re-tested against Field Officer role too. All confirmed via a from-scratch tab, not the same one the bug was found in.

**Update (29 Aug, tenth pass — real mobile support, all 8 views):** Asked "now next?"; while doing the responsible follow-up (re-verifying the topbar fix across every view, not just the one it was found in), checked Field Officer View — the one screen actually meant for a phone in the field — at a genuine 375px width and found it completely unusable: the always-visible fixed-232px sidebar ate the whole screen and pushed the form off into horizontal scroll. Asked the user how far to take it; answered "the whole app, all 8 views." Built:
- **A real mobile nav pattern**, not a per-view patch: the sidebar (`components/Sidebar.jsx`) becomes a `position: fixed` overlay drawer below a 900px breakpoint (chosen deliberately — it also covers this session's usual ~750–800px test width, so the mobile layout gets exercised by ordinary testing, not just deliberate phone-width checks), closed by default, toggled by a hamburger button now in `TopBar.jsx` (hidden entirely above the breakpoint via CSS, not JS — nothing to open on desktop). A dimmed backdrop closes it on tap-outside; picking a nav item both navigates and closes the drawer. Wired through `App.jsx` (`sidebarOpen` state) — desktop behaviour is untouched: verified sidebar width, hamburger visibility, and zero overflow at 1400px after the change.
- **A real bug in getting there, not just theory:** the first attempt added `flex-wrap: wrap` to `.topbar-right` alone and *visibly did nothing* — a flex item with `flex: none` keeps its full natural content width even when it's alone on a wrapped line; wrapping the outer container doesn't cap an inner one's width just because it's solo on that line. Needed an explicit `max-width: 100%` on `.topbar-right` too before its own children actually started wrapping. Caught by re-measuring after the first fix instead of assuming flex-wrap alone would be enough.
- **The main district table on Dashboard broke at 375px** for the exact reason `table-layout: fixed` was introduced to solve in an earlier pass: its fixed columns (checkbox + District + Population + Hazard + View ≈ 326px) left Summary 0px on a real phone, squeezing it back into one-word-per-line wrapping. Same fix as the district-comparison table below it: a `min-width: 520px` + `overflow-x: auto` wrapper, so it scrolls horizontally within its own card on a narrow screen instead of squeezing Summary to nothing or blowing out the page. Verified this stays card-contained, not page-level, at 375px (`body.scrollWidth === window.innerWidth`, confirmed) — same check applied to the comparison table itself.
- Swept all 8 views (all 7 District Officer views + Field Officer View) at a real 375px width after the fixes: zero horizontal overflow anywhere, zero console errors on a from-scratch tab. Live toasts (from the LiveTicker built two passes ago) were also confirmed to render correctly at mobile width, unprompted, during this sweep.

**Update (29 Aug, eleventh pass — tech-stack slide reviewed against this project's own docs, not built):** User shared a "Technology Stack" pitch-deck slide (React/Vite/Tailwind/MapLibre/Recharts, FastAPI/PostgreSQL/PostGIS/SQLAlchemy, Scikit-learn/XGBoost/LightGBM/PyTorch/OpenCV/SHAP, a Data Sources box, Docker/SMS+Push/Git, GeoPandas/Rasterio/Shapely) and asked for a review. Checked it against `package.json`, `src/`, `ARCHITECTURE.md`, `ml-research.md`, and `data-sources.md` rather than eyeballing it — findings, so the next person doesn't have to re-derive them:
- **The headline problem: the slide doesn't distinguish built from planned.** Everything in Backend & Database and Communication & Deployment, and most of AI/ML, doesn't exist yet (no `.git`, no `docker-compose.yml`, no trained models — all consistent with what §3/§"Not started at all" already say). The slide as-is reads as "our stack" when it's actually the target production architecture from `ARCHITECTURE.md`.
- **Real errors, not just "unbuilt":**
  - **Tailwind CSS** — not used anywhere (`src/` grep: zero hits), not in `package.json`, never mentioned in `ARCHITECTURE.md`. Not planned-but-missing — just not part of this project. Actual styling is the hand-rolled CSS custom-property token system in `index.css`.
  - **Recharts** — *is* in `package.json` but has zero imports anywhere in `src/`. Dead dependency; the sparklines (`components/Sparkline.jsx`) are hand-built raw SVG instead.
  - **MapLibre GL JS** — real documented target (`ARCHITECTURE.md` §5, chosen over Mapbox GL specifically to avoid an API-token demo-day failure mode) but the prototype's map is static precomputed SVG (`nerGeo.js` / `NerMap.jsx`), not MapLibre. Correct as "planned," wrong as "current."
  - **"SMS / Push Notifications"** — `ARCHITECTURE.md`'s own decision table already rejected this: *"Push + Telegram now, SMS stubbed... Sender-ID approval is an external dependency we can't control in 7 days."* Slide presents SMS as live and drops Telegram, the channel actually chosen.
  - **"IMD API"** listed with no caveat — `data-sources.md` §1 says in bold: *"Do not build on it and do not claim it in the pitch as an open data source"* (tested, HTTP 401, needs registration + IP whitelisting). This is the exact overclaim that doc exists to prevent.
  - **Missing: Open-Meteo** — the source `data-sources.md` §2 actually recommends the prototype run on (*"Our prototype runs on Open-Meteo + GPM IMERG"*) isn't on the slide at all.
  - **"NASA GPM" and "IMERG" are the same dataset** (§10, GPM IMERG) listed as two separate bullets.
  - **LightGBM and GeoPandas** — neither appears anywhere in `ml-research.md`, `ARCHITECTURE.md`, or `data-sources.md`. XGBoost is the model named consistently everywhere; `build_geo.py` deliberately uses raw Shapely, not GeoPandas. Not necessarily wrong, just unsourced against this project's own research — worth tracing before it goes in front of judges.
- **Recommendation given, not yet acted on:** either retitle the slide "Target Production Architecture" with a visible built/planned split, or build a second slide of what's actually running (React + Vite + hand-rolled CSS + static SVG GIS + mock data, honestly). This was a review only (the slide image itself, not a file on disk) — a `deck/` folder does exist (`DEMO_SANKET.docx`, `demo_sanket_text.md`, `SANKET_Market_and_Research.docx`, `sih_ppt_template.pptx`) but wasn't opened or audited in this pass; whether the reviewed slide lives in one of those files is unconfirmed.

**Update (29 Aug, twelfth pass — remaining QA, four features, docs sync):** User picked all four items from the earlier "what's next" menu, asking for the docs item last-but-actually-third and the "stop building" advice last. In order:
- **Tablet width (768px):** swept all 8 views — zero horizontal overflow anywhere, hamburger drawer correctly active (below the 900px breakpoint). Clean, no fixes needed.
- **Print preview, actually rendered, not just rule-checked:** injected the `@media print` rules live (unwrapped from the media query) to see the real output rather than trusting that the rules exist. It looked good, with one real improvement found: no `@page` rule existed, so the two-column report layout would print in the browser's default portrait orientation — cramped for a wide dashboard-style report. Added `@page { size: landscape; margin: 14mm; }`.
- **Dark mode** — a full second palette ("Highland Night") in `index.css` under `[data-theme='dark']`, preserving the light palette's hazard hue relationships (140°/42°/25°/6°) so the colour-meaning mapping doesn't change between themes, just re-lit for a dark surface. Toggled via a sun/moon button in the topbar, persisted to `localStorage` (explicit choice, not `prefers-color-scheme`), applied as a `data-theme` attribute on `<html>`. Verified: toggle works both directions, survives a full reload, and checked against Dashboard + Risk Monitoring (sparklines, risk bars) specifically since those have the most colour-dependent content.
- **Sortable columns** on both Dashboard tables (main district table: District/Population/Hazard; comparison table: adds Landslides/Reports/Alerts) — click a header to sort, click again to reverse, with a ▲/▼/↕ indicator. Verified sorting by Population correctly reorders rows both directions. Caught and fixed a genuine (if trivial) 2px header overflow the new sort-arrow glyph introduced on the Population column — widened it 78px → 82px.
- **CSV export** on the district-comparison table — client-side `Blob` + temporary anchor download, no new dependency. Verified by intercepting `URL.createObjectURL`/`anchor.click()` in-page and reading the actual Blob content back out, not just confirming the button doesn't throw: correct headers, correct rows, correct filename.
- **Guided demo walkthrough** (`components/DemoOverlay.jsx`) — a scripted 7-step tour of the Manipur → Noney "golden path" across Dashboard → GIS Risk Map → Risk Monitoring → Alerts → Response Priorities → Historical Backtesting, each step a real `{view, selection}` navigation (the same shape `goTo()` already produces, not a second fake navigation path). Auto-advances on a per-step timer with Pause/Resume/Next/Prev/Exit controls. Verified all five controls individually, including a controlled 10-second wait to confirm Pause genuinely stops the timer rather than just looking paused.
- **Docs sync** — read `PRD.md` and `FEATURES.md` in full looking for the same class of false claims just fixed in this file. Found none: both are consistently and correctly framed as forward plans throughout ("every feature we *intend* to build," "requirements, not implementation") and never claim anything is currently built — no edits needed. `README.md` had the same two problems this file had: its closing line claimed "No code written yet," and it recommended porting PharmaBoard's "Light Clinical" theme "with zero hex changes" — both flatly contradicted by the actual prototype (which exists, and ships "Highland," not "Light Clinical"). Fixed both, and added a pointer near the top of the doc (`web/` prototype exists, how to run it, point to HANDOFF.md §3/§3a) since README previously never mentioned the prototype at all despite being the designated "start here" document.
- Full regression sweep after all of the above: dark mode + all 7 District Officer views cycled on a from-scratch tab — zero console errors, zero horizontal overflow.

**Update (29 Aug, thirteenth pass — actually rehearsed the demo):** User: "go rehearse the demo." Ran the real Guided Demo end to end, at presentation width (1440×900, not the ~750px width most of this session's QA used), the way a presenter actually would — clicking through, reading each caption, watching for anything that only shows up in live use rather than a DOM check. Found one real bug in the process, on the very first step:
- **`.demo-overlay` (`position: fixed`, bottom of viewport) visually covered the "NER Status" map card and the "Manipur — Districts" table underneath it** on any view whose content is taller than one screen — Dashboard's very first step, immediately on hitting Play. Two wrong fixes before the real one, kept as comments in `index.css` since neither failure was obvious in advance: `padding-bottom` on the scroll container did nothing (it only extends how far you *can* scroll, doesn't move already-visible content); `margin-bottom` shrank the flex item's *allocation* but not its rendered size, so the 586px-tall map card still overflowed past it regardless. `max-height: calc(100vh - 270px)` on a `.content--demo-active` class (applied only while `demoActive`) is what actually works — a hard cap that forces `overflow-y: auto` to engage instead of letting content spill past the box. Also had to catch that my own overlap-detection *test* was wrong the same way — `getBoundingClientRect()` ignores ancestor clipping, so it kept reporting "overlap" against a card that was no longer actually visible; confirmed the real fix with an actual screenshot, not the flawed check, at both 1440px and this session's usual ~800px.
- Stepped through all 7 steps individually with real screenshots. Six landed well — GIS Risk Map, Risk Monitoring, and the Historical Backtesting finale in particular are strong, visually distinct moments that match their captions. Response Priorities' step reinforces the story nicely (Noney Zone A independently ranks #1). Two things worth knowing, not fixed (judgment calls, not defects): step 2 ("Drilling into Manipur → Noney") doesn't correspond to a strong visual change on Dashboard itself — only the breadcrumb updates — so a presenter reading that line aloud should know the screen won't visibly react much; and the Alerts and Backtesting steps are deliberately left as static setup, not auto-played, which is correct restraint (a scripted tour shouldn't fake interactivity) but means the presenter needs to remember to click "Generate Alert" / "Play" themselves at those two moments for the demo to land fully.
- Confirmed the core honesty commitment established throughout this project holds at the single most-watched moment of the demo: the Backtesting finale's "Warning Lead Time" panel still shows "PENDING CALCULATION," not a fabricated number, even after 13 rounds of changes.
- Confirmed graceful coexistence with the LiveTicker toast (fired twice during rehearsal, no visual collision with the demo overlay) and clean entry/exit (the `content--demo-active` class is correctly removed on Exit/Finish — checked `max-height` reverts to `none`, not left stuck).

**Update (29 Aug, fourteenth pass — pre-deploy bug check + deployed to Vercel):** User: "done? check for any bugs? then we will deploy this to vercel."
- **Pre-deploy audit found one real, deploy-blocking bug**: `App.jsx` imported `./components/TopBar.jsx` (capital B) but the actual file is `Topbar.jsx` (lowercase b). Windows (the dev machine) has a case-insensitive filesystem, so this silently worked in `npm run dev` the entire project — it would have hard-failed on Vercel's Linux build servers, which are case-sensitive. Found by checking every relative import against real on-disk filenames, not by trusting the working dev server. Fixed the import; re-verified with a real production build (`npm run build`) served locally via `vite preview` — renders correctly, zero console errors. No other case mismatches found (`GlobalSearch.jsx` had one string match on "topbar" but it was a code comment, harmless).
- **Deployed via GitHub, not a direct file upload.** Original plan was `deploy_to_vercel`'s direct file-tree upload (no git needed), but one generated file (`nerGeo.js`, the 118-district SVG path data) is a single 49,277-character line that exceeds the file-read tool's per-call token cap, so its content couldn't be reliably inlined into a deploy payload. Asked the user, who confirmed: initialise git, push to a new **private** GitHub repo, then link Vercel to it via git — this also gets auto-deploy-on-push for free going forward, which the direct-upload path wouldn't have.
- `git init` at the project root (`.gitignore` already correctly excluded `node_modules/`, `web/dist/`, etc.), one commit, pushed to **https://github.com/eshaan-eshaan/sanket-sih26001** (private). Commit author corrected mid-flight from the wrong email to the one actually tied to the user's GitHub account, `eshaan1311@gmail.com`, after the user caught it.
- Linked via Vercel's `create_git_project` with `rootDirectory: web` (monorepo-style root — the repo root also holds `docs/`, `deck/`, etc., not just the app). Vercel auto-detected the framework (`vite`) correctly with no manual build-command override needed. First deployment (`dpl_3AMdco1MHMMcUWBft8FTFnBccKt2`) built clean and went to `target: production` automatically since it was the production branch's first deploy.
- **Verified the live deployment itself**, not just the build's exit status: loaded `https://sanket-sih26001.vercel.app` in a fresh browser tab, confirmed the Dashboard renders its real content (118 monitored districts, KPI cards, NER map, district table), navigated to GIS Risk Map and confirmed the layer panel and client-side routing work, checked the network tab (all requests 200), and checked the console (zero errors) on both views.
- Live URL: **https://sanket-sih26001.vercel.app** · Vercel project: `sanket-sih26001` (team `eshaan1311-2715's projects`) · Inspector: `https://vercel.com/eshaan1311-2715s-projects/sanket-sih26001`.

### Not started at all
- No `docker-compose.yml` · no database schema · no migrations · no CI beyond Vercel's own git-push auto-deploy
- **The entire spatial layer.** PharmaBoard has PostGIS installed but **zero `ST_*` calls anywhere** — this is net-new work, not a port, and it is the biggest hidden cost in the plan.
- **The live backend, the real ML models, and MapLibre.** The prototype's map now uses **real state and district boundaries** (dissolved from Survey-derived district polygons, see `web/geodata_src/`) rendered as static SVG — genuine geodata, just not the live MapLibre tile stack `ARCHITECTURE.md` specifies, and its risk scores are hand-authored, not model output. All 52 features in `FEATURES.md`
- Road connectivity analysis (which villages are cut off) — no routing primitives exist to inherit; the prototype's "at-risk villages" list is hardcoded per zone, not computed

### 3a. What the prototype actually is — read this before demoing it

The teammate's feature spec (`deck/demo_sanket_text.md`) explicitly calls for hardcoded/predefined values throughout — this was built to that spec, not as a shortcut. Two things matter for how you talk about it:

1. **The Historical Backtesting lead-time number is deliberately absent**, showing "PENDING CALCULATION" instead of a fabricated figure — the spec itself says not to show that number until it's genuinely computed. Do not let anyone paste in a placeholder number before the real model exists.
2. **This codebase is the intended starting point for the real build**, not a throwaway. Swapping `web/src/data/mockData.js` reads for real `fetch()` calls against the API surface in `ARCHITECTURE.md` is the migration path — the component layer doesn't need a rewrite.

Run it: `npm install && npm run dev` from `web/` (port 5180).

### Blocked on inputs we don't have
| Missing | Blocks |
|---|---|
| **Faculty dataset** (coming) | Stage A training, CV model training |
| **Focus districts not locked** *(recommending Noney/Tamenglong + Aizawl)* | 30 m tier, backtest target |
| **Lane ownership not assigned** | Everything — needed by end of D1 |
| **No account registrations done** (GEE, Earthdata, Copernicus, Bhashini) | D2 onward. All are minutes. **Do today.** |
| **Mizo & Khasi translations** | F6.4 multilingual |
| **Unknown: does anyone have PyTorch segmentation experience?** | Decides whether CV-2 is a fine-tune or a gamble |
| **Unknown: any GPU beyond Colab free tier?** | CV training wall-clock |

---

## 4. ⚠️ Open questions that need an answer today

1. **Does the faculty dataset include ground-level photographs?** If no, CV-1 becomes demo-only with SDNET2018/RDD2022 as the honest reframe — **there is no clean public dataset of ground-level landslide photos.** This changes scope, so ask now.
2. **Do the inventory records have dates?** No dates means Stage B can be *built* but not *validated* against real events — which changes how we present it.
3. **Mizo and Khasi — which option?** Our alerts are ~15 short fixed-slot strings (`{district} {level} {action}`). **Recommended: get a native speaker to hand-translate them — about an hour of someone's time.** Alternatives: ship 6 languages and name Mizo/Khasi as next, or fall back to English/Hindi in those states (weakest, undercuts the whole multilingual claim). **Never machine-translate free-form safety-critical text.**

---

## 5. 🔜 NEXT — what happens, in order

**Timeline: D1 = 25 Aug · Ship = 31 Aug. Seven days, and the buffer day is gone.**

| Day | Focus |
|---|---|
| **D1** Aug 25 | Lock districts + lanes. Register all accounts. Split & port the grid shell. Stand up docker-compose. Pull DEM/OSM for all NER. **Start CV-2 training today.** |
| **D2** Aug 26 | Stage A trained + spatially cross-validated. Weather + SMAP ingestion scheduled. MQTT gateway live. |
| **D3** Aug 27 | **CV day.** CV-1 fine-tuned, CV-2 converged, Stage B trigger logic. |
| **D4** Aug 28 | MapLibre + risk tiles + KPI row + severity donut + report queue + SHAP panel. |
| **D5** Aug 29 | Field view with offline queue. Alert engine → CAP + Push + Telegram. i18n. Prioritisation. |
| **D6** Aug 30 | **Backtest + Scenario Mode + integration.** Seed demo data. Bug bash. **Real freeze is tonight.** |
| **D7** Aug 31 | Rehearse ×3, contingency build, submit. No new features. |

### Immediate — before anything else today
1. Ask faculty the six dataset questions (`ml-research.md` §E.5 has a send-ready message)
2. Register: Earthdata · Copernicus Data Space · GEE (**Contributor tier**) · Bhashini · OpenTopography
3. Lock the two focus districts
4. Assign the six lanes
5. **Kick off CV-2 training** — it is the only task that can silently fail to converge

### The critical path
`terrain features → Stage A → hazard values → API → dashboard`

Whoever owns geospatial is on the critical path from hour one. **Ship a stub schema and dummy zones by midday D1** so nobody downstream idles waiting for real data.

CV is *off* the critical path but is the **highest-variance** work — which is why it starts first, not third.

---

## 6. 🔥 What will actually kill us

Ranked by likelihood × damage.

1. **Merge chaos on D6.** Six people on separate branches integrating at the end kills more hackathon teams than any technical problem. **Integrate daily from D2.** Trunk-based, small commits.
2. **The buffer day is gone.** Original plan had polish + spare; at 7 days those merged. **D6 evening is the real freeze.** Use the ordered cut list in `FEATURES.md` decisively — decide fast, don't rescue.
3. **CV-2 normalisation mismatch.** Published constants may not match our actual `.h5` data. **Print per-band min/max before trusting anything.** This turns F1 78 into F1 30 with no error message — a silent failure, the worst kind.
4. **Spatial leakage inflating AUC.** Random splits leak neighbouring pixels. Use spatial block CV from the start. If we report 0.96 and a judge asks which CV scheme, we lose the room.
5. **Overclaiming in the pitch.** See §7.
6. **Demo depends on live internet.** Venue wifi will betray us. The whole stack must run offline: seeded DB, pre-baked tiles, cached imagery, models on disk. **Rehearse that build specifically.**

---

## 7. 🎤 Things to say before we're asked

Owning limits reads as competence; getting caught hiding them reads as the opposite.

- **"We do not predict landslides. We elevate risk with lead time and explain why."** Our language is early warning, always.
- **The benchmark that reframes the room:** NASA's **LHASA** — the operational *global* system — catches only **27–47 % of landslides at a 1 % false-positive rate.** Put it on a slide. It pre-empts "why isn't this 95 % accurate?" and shows we know the real state of the art, not the state of Kaggle.
- **False alarms cost trust.** Hysteresis, multi-signal confirmation, tiered escalation. A warning system nobody believes is worse than none.
- **IMD:** *"We tested the endpoints — they 401. Access needs registration and IP whitelisting: procurement, not engineering. The adapter is written and swaps in behind one interface."*
- **Sensors:** *"The gateway is real and speaks MQTT. Swap the simulator for hardware, zero code changes. Meanwhile SMAP gives real satellite-measured moisture NER-wide today."*
- **Accessibility:** never colour-only. Every hazard level carries an icon and a text label.

---

## 8. 📌 Corrections already made — don't re-derive these

Things we believed earlier that turned out to be wrong. Recorded so nobody rediscovers them the hard way.

| We thought | Actually |
|---|---|
| PharmaBoard reuse saves 5–7 person-days | **3–4 days.** The spatial layer is entirely net-new. |
| PostGIS experience carries over | **Zero `ST_*` calls exist** in that codebase. Verified. |
| `ConnectivityGraph.jsx` mostly solves road connectivity | Shell only. **Edges carry no data, no direction; `edgeKey` collapses parallel roads into one; no routing primitives are called.** |
| Use Cytoscape for the connectivity view | **Use a MapLibre line layer.** The view is geographic; a force-directed layout fights that. Keep Cytoscape only for an abstract topology view. |
| SMS is a D1 critical-path item | **Deferred.** Sender-ID approval is an external dependency we can't control in 7 days. Push + Telegram instead. |
| The theme is "Light Clinical," inherited as-is from PharmaBoard | **Replaced 29 Aug** with "Highland," a nature-inspired palette (forest green accent, earth-toned hazard scale) — see §3. |

---

## 9. Where everything lives

```
D:\Coding\PROJECTS\SANKET-SIH26001\
├── README.md               ← start here: overview, plan, demo, limitations
├── web\                    ← the actual working prototype — see §3 before reading further
│   ├── src\                ← React app: 8 views, components, mock data (mockData.js)
│   └── geodata_src\        ← build_geo.py: real GIS boundaries → nerGeo.js (see §3, fifth pass)
├── deck\                   ← pitch deck assets (not audited in this file — see §3, eleventh pass)
│   ├── demo_sanket_text.md ← the teammate's feature spec this prototype was built against
│   ├── DEMO_SANKET.docx
│   ├── SANKET_Market_and_Research.docx
│   └── sih_ppt_template.pptx
└── docs\
    ├── HANDOFF.md          ← this file
    ├── PRD.md              ← users, journeys, metrics, scope, risks
    ├── FEATURES.md         ← 52 features + acceptance criteria + cut list
    ├── ARCHITECTURE.md     ← schema, API, decisions, deployment (target production system, not the prototype)
    ├── dashboard-spec.md   ← widget inventory + information architecture
    ├── ml-research.md      ← training recipes + faculty dataset checklist
    ├── data-sources.md     ← 18 sources, access, blockers (17 original + §18 GIS boundaries)
    └── nature-theme-brief.md ← the "Highland" theme's design brief (see §3, §8)
```

**Reference codebase:** `D:\antigravity\proud-bohr` (PharmaBoard / "DoneHai")
**Architecture diagrams:** https://claude.ai/code/artifact/b08fa1df-98e1-4363-9fec-cf07fbe59510
**Repo (private):** https://github.com/eshaan-eshaan/sanket-sih26001
**Live prototype:** https://sanket-sih26001.vercel.app (auto-deploys on push to `master`, see §3, fourteenth pass)

---

*Planning complete and verified. A mocked frontend prototype is built and deployed live (`web/`, see §3, fourteenth pass) — the live backend, trained models, and real GIS/tile stack are not. See §0 and §3a.*
