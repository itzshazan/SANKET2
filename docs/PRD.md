# SANKET — Product Requirements Document

**SIH 2026 · Problem Statement 26001 · MDoNER · Disaster Management**
**Version 0.1 · 25 Aug 2026 · Ship date 31 Aug 2026**

---

## 1. Problem

Landslide response in the North Eastern Region is **reactive and manual**. Monitoring depends on people reporting damage after it happens. By the time a report climbs from a village to a district office to a state authority, the road is already gone and the village is already isolated — sometimes for days.

Three specific failures:

1. **No forward-looking risk signal.** Authorities know which districts are broadly landslide-prone, but not which slopes are dangerous *tonight*, given this week's rain.
2. **No triage of incoming information.** During an event, reports arrive faster than anyone can assess them, unranked and unverified.
3. **No connectivity picture.** Nobody can answer "which villages are cut off right now, and what is the detour" without phone calls.

**Consequence:** delayed evacuation, delayed relief, avoidable loss of life and infrastructure.

---

## 2. What SANKET is

A web platform that turns terrain, weather, satellite imagery and citizen photographs into a **live, explained, four-level landslide risk surface** across all eight NER states — and pushes actionable warnings to the people who can act on them.

**What it is not:** a landslide oracle. It does not name the hour a slope will fail. It raises risk with lead time, explains why, and ranks what to do first.

---

## 3. Goals & non-goals

### Goals

| # | Goal | How we know we hit it |
|---|---|---|
| G1 | Predict elevated landslide risk with useful lead time | Backtest on a real historical event shows escalation to Danger **before** the event |
| G2 | Make every risk score explainable | Any zone on the map answers "why?" with ranked contributing factors |
| G3 | Turn citizen photos into triaged intelligence | CV classifies, scores severity, deduplicates, and ranks incoming reports |
| G4 | Show connectivity impact, not just hazard | Cut-off villages are computed, not phoned in |
| G5 | Work where the network doesn't | Reports queue offline and sync on reconnect |
| G6 | Cover all of NER credibly | Every one of the 8 states has a live risk layer |

### Non-goals *(explicitly out of scope — say so when asked)*

- Real-time seismic / earthquake-triggered landslide modelling
- Structural engineering assessment or slope-stabilisation design
- Physical sensor hardware deployment *(software gateway only — see §7)*
- Automated evacuation orders — **SANKET recommends, humans decide.** This is a deliberate safety boundary, not a limitation.
- Flood inundation modelling (adjacent problem; we surface flash-flood risk signals only insofar as rainfall drives them)

---

## 4. Users

*(Personas are composites, not real individuals.)*

### U1 · District Disaster Management Officer — the primary user
Sits in a district control room. Owns the decision to close a road or move a village. Under time pressure, often at night, during heavy rain.

**They need:** which zones in *my* district are dangerous right now · who is exposed · what do I do first · why should I believe this.
**They will not tolerate:** an unexplained red blob, a system that cries wolf, or anything that takes more than a glance to read.

### U2 · State DMA control-room operator
Watches all districts in a state. Allocates scarce resources — NDRF teams, machinery, relief.

**They need:** statewide comparison, ranked priorities across districts, connectivity status on state highways.

### U3 · Field officer / village volunteer — the reporter
On a hillside, on a phone, in the rain, on 2G or no signal at all.

**They need:** to report a crack in under four taps and to know if *their* area is safe. Everything else is noise to them.

### U4 · Geologist / technical validator (GSI, state geology dept)
Decides whether the institution trusts this system.

**They need:** the inventory, the model's metrics under honest validation, and the ability to inspect what the CV detected and disagree with it.

---

## 5. Core user journeys

### J1 — "Is tonight dangerous?" *(U1, daily)*
Open dashboard → district pre-selected → KPI row shows counts by level → map shows where → click the worst zone → read the SHAP explanation and exposure → check the priority queue → act.
**Success:** under 60 seconds from load to decision.

### J2 — "Something is happening" *(U3 → U1, during an event)*
Field officer photographs a crack → app auto-geotags → submits (queues if offline) → CV classifies and scores severity → report lands on the DDMO's map and enters the priority queue ranked by severity × local hazard × exposure.
**Success:** report visible to the DDMO within seconds of connectivity, already triaged.

### J3 — "Would we have caught it?" *(U4, validation)*
Switch to BACKTEST → select Noney, June 2022 → scrub the timeline → watch the zone escalate Watch → Warning → Danger before 29 June → read the lead time.
**Success:** a geologist believes the model without taking our word for it.

### J4 — "What if it rains 250mm tomorrow?" *(U1/U2, planning)*
Switch to SIM → select district → inject a rainfall scenario → Run → watch the hazard surface, connectivity graph and priority queue respond → export the resulting plan.
**Success:** usable as a genuine tabletop exercise for district staff.

### J5 — "Am I safe?" *(U3, ambient)*
Open field view → risk banner in own language → advisory → optionally view nearby risk.
**Success:** legible in one glance, works with no network.

---

## 6. Success metrics

| Metric | Target | Measured by |
|---|---|---|
| **Backtest lead time** on the reference event | > 12 h before occurrence | F7.1 harness |
| **Susceptibility ROC-AUC** under **spatial block CV** | **0.78–0.90** *(random CV would show 0.90–0.96 — we do not report that number)* | F2.2 |
| **CV-1 classification accuracy** on held-out photos | 80–88 % *(CLIP frozen features + logistic-regression probe, at 200–300 imgs/class)* | F3.1 |
| **CV-2 scar segmentation F1 / IoU** on the L4S test split | **F1 ≥ 0.72 / IoU ≥ 0.58**, stretch 0.78 | F3.3 |
| **Threshold-crossing → alert dispatched** | < 60 s | F6.1 |
| **Offline report round-trip** | 100 % of queued reports sync on reconnect | F5.3 |
| **PS requirement coverage** | 16 / 16 demonstrable | README §8 traceability |
| **Regional coverage** | 8 / 8 states with a live layer | F2.1 |

> **On the AUC target:** if spatial CV gives us 0.78, we report 0.78. A defensible 0.78 beats an unexplained 0.99 that turns out to be spatial leakage — and a technical judge *will* ask which CV scheme we used.
>
> **The benchmark that sets expectations for the whole room:** NASA's **LHASA**, the operational global landslide hazard system, catches only **27–47 % of landslides at a 1 % false-positive rate**. Put that on a slide. It reframes every accuracy question in the session, pre-empts "why isn't this 95 % accurate?", and demonstrates we know the actual state of the art rather than the state of Kaggle.

---

## 7. Assumptions & dependencies

| # | Assumption | If wrong |
|---|---|---|
| A1 | **Faculty dataset arrives by D2 (26 Aug)** and contains a usable landslide inventory | Fall back to NASA GLC + GSI Bhukosh; quality drops but nothing blocks. **Ask today.** |
| A2 | Open-Meteo serves forecast + ERA5 archive without a key | Fall back to GPM IMERG; backtest gets harder |
| A3 | Landslide4Sense (or equivalent) is downloadable for CV-2 training | Use a smaller scar dataset or NDVI-difference thresholding as a classical CV fallback |
| A4 | Free-tier Colab is enough to train CV-2 | Reduce to U-Net on downsampled patches; accept lower IoU |
| A5 | PharmaBoard components port with modest rework | E4 becomes a build rather than a port; cut P2 features immediately |
| A6 | Sentinel-2 imagery is retrievable for our AOIs and dates | Demo CV-2 on the Landslide4Sense test set instead of live imagery |

**Hard external dependency:** none that blocks the demo. **This is deliberate** — SMS was deferred precisely because it introduced a provider-approval dependency we cannot control.

---

## 8. Constraints

- **7 days, 6 people, student team.** Scope is bounded by this, not by ambition.
- **Web only. No hardware.** Soil-moisture sensing is satellite (SMAP) + a simulated MQTT mote network behind a real gateway.
- **No paid APIs on the critical path.**
- **Demo must survive bad venue wifi** — pre-baked tiles, seeded data, and a fully local fallback build.
- **Computer vision is non-negotiable** — CV-1 and CV-2 ship no matter what else is cut.

---

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Faculty dataset late or unusable** | Medium | High | Request today with a precise spec (see `docs/dataset-request.md` once agent research lands). Public-data fallback ready. |
| **CV-2 training doesn't converge in time** | Medium | High | Start D2 not D3. Fall back to fine-tuning a pretrained checkpoint; classical NDVI-difference as last resort. |
| **All-NER data volume overwhelms the pipeline** | Medium | Medium | 90 m regional tier, tiled processing, pre-baked COGs. Focus districts only at 30 m. |
| **Six people, six branches, merge chaos on D6** | **High** | **High** | Integrate daily from D2. Trunk-based, small PRs. This kills more hackathon teams than any technical problem. |
| **Overclaiming in the pitch** | Medium | High | §2 non-goals and README §11 limitations are rehearsed, not improvised. |
| **Spatial leakage inflating AUC** | Medium | Medium | Spatial block CV from the start (F2.2), never random split |
| **Demo depends on live internet** | Medium | High | Local fallback build + recorded video. Rehearse the fallback. |

---

## 10. Release scope

**v1.0 — SIH submission, 31 Aug:** all P0 + as much P1 as lands. See `FEATURES.md`.

**Explicitly deferred, with a clear story for each:**

| Deferred | The Q&A answer |
|---|---|
| SMS dispatch | "Channel interface is built; SMS is a provider contract and sender-ID approval — procurement, not engineering." |
| Live IMD feed | "Adapter is written and stubbed; it needs an MoU/API key." |
| Physical sensor motes | "Gateway is real and speaks MQTT. Swap the simulator for hardware, zero code changes. Meanwhile SMAP gives real satellite-measured moisture NER-wide today." |
| Native mobile app | "The field view is an installable PWA — same offline capability, one codebase, works on any phone without a store." |

---

## 11. Open questions

| # | Question | Owner | Needed by |
|---|---|---|---|
| Q1 | What exactly is in the faculty dataset? Format, coverage, dates, labels? | Whoever has faculty contact | **Today** |
| Q2 | Which 2 focus districts? *(recommending Noney/Tamenglong + Aizawl)* | Team | End of D1 |
| Q3 | Who owns which of the 6 lanes? | Team | End of D1 |
| Q4 | Does anyone have prior PyTorch segmentation experience? | Team | **Today** — determines whether CV-2 starts D2 or D3 |
| Q5 | Is there a GPU beyond Colab free tier available? | Team | D1 |

---

*Requirements, not implementation. Architecture lives in `ARCHITECTURE.md`; the build list lives in `FEATURES.md`.*
