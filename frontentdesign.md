# PAGE DESIGN BLUEPRINTS

IMPORTANT:

Before implementing any page, strictly follow the structural layout diagrams below.

These diagrams define:

- Information hierarchy
- Component placement
- User flow
- Visual priority
- Page architecture

You may improve visual details, but DO NOT fundamentally change the information architecture without a strong UX reason.

==================================================
01. OVERVIEW / COMMAND CENTER
==================================================

DESKTOP LAYOUT:

┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR                                                                     │
│                                                                              │
│ SANKET / Overview       [ Search Location ]        Live • Updated 2m ago   │
├───────────────┬──────────────────────────────────────────────────────────────┤
│               │                                                              │
│               │   SITUATION OVERVIEW                                         │
│   SIDEBAR     │   Real-time environmental intelligence                       │
│               │                                                              │
│   ◉ Overview  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│               │  │ ACTIVE     │ │ AVG        │ │ AREAS      │ │ ALERTS   │ │
│   ◉ Monitor   │  │ RISK ZONES │ │ RAINFALL   │ │ MONITORED  │ │ CRITICAL │ │
│               │  │    12      │ │  42.8 mm   │ │    248     │ │    03    │ │
│   ◉ Risk Map  │  └────────────┘ └────────────┘ └────────────┘ └──────────┘ │
│               │                                                              │
│   ◉ Analytics │  ┌─────────────────────────────────────┐ ┌────────────────┐ │
│               │  │                                     │ │ CURRENT        │ │
│   ◉ History   │  │                                     │ │ CONDITIONS     │ │
│               │  │                                     │ │                │ │
│   ◉ Infra     │  │          LIVE RISK MAP              │ │ Rainfall       │ │
│               │  │                                     │ │ 42.8 mm        │ │
│   ◉ Alerts    │  │                                     │ │                │ │
│               │  │                                     │ │ Soil Moisture  │ │
│   ◉ Reports   │  │                                     │ │ 72%            │ │
│               │  │                                     │ │                │ │
│               │  │                                     │ │ Temperature    │ │
│               │  │                                     │ │ 28.4°C         │ │
│               │  └─────────────────────────────────────┘ └────────────────┘ │
│               │                                                              │
└───────────────┴──────────────────────────────────────────────────────────────┘


VISUAL PRIORITY:

1. Situation overview
2. Critical metrics
3. Interactive map
4. Current environmental conditions

MAP = PRIMARY VISUAL ELEMENT


==================================================
02. LIVE MONITOR PAGE
==================================================

PURPOSE:

Monitor real-time environmental conditions.

┌──────────────────────────────────────────────────────────────────────────────┐
│ LIVE MONITOR                        [Location] [24H] [LIVE ●]               │
├───────────────┬──────────────────────────────────────────────────────────────┤
│               │                                                              │
│   SIDEBAR     │     ENVIRONMENTAL MONITORING                                 │
│               │                                                              │
│               │  ┌──────────────────────────────────────────────────────┐   │
│               │  │                                                      │   │
│               │  │                                                      │   │
│               │  │                    LIVE MAP                          │   │
│               │  │                                                      │   │
│               │  │             Weather / Rainfall Layer                │   │
│               │  │                                                      │   │
│               │  └──────────────────────────────────────────────────────┘   │
│               │                                                              │
│               │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│               │  │ RAINFALL │ │ SOIL     │ │ TEMP     │ │ WIND SPEED   │   │
│               │  │ 42.8 mm  │ │ 72%      │ │ 28.4°C   │ │ 14 km/h      │   │
│               │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│               │                                                              │
│               │  NOW ────── 6H ────── 12H ────── 24H ────── 7D              │
│               │                                                              │
└───────────────┴──────────────────────────────────────────────────────────────┘


INTERACTION:

Time selection updates:

- Map
- Metrics
- Weather data
- Rainfall visualization


==================================================
03. RISK MAP — CORE PRODUCT PAGE
==================================================

THIS IS THE MOST IMPORTANT PAGE.

┌──────────────────────────────────────────────────────────────────────────────┐
│ RISK INTELLIGENCE             [Search Location] [Satellite] [Export]        │
├──────────────┬───────────────────────────────────────────┬───────────────────┤
│              │                                           │                   │
│ LAYERS       │                                           │ LOCATION          │
│              │                                           │ INTELLIGENCE      │
│ ENVIRONMENT  │                                           │                   │
│              │                                           │ LOCATION          │
│ ☑ Rainfall   │                                           │ Kozhikode         │
│ ☑ Soil       │                                           │                   │
│ ☑ Weather    │                                           │ ┌───────────────┐ │
│              │                                           │ │               │ │
│ TERRAIN      │              INTERACTIVE                  │ │ RISK SCORE    │ │
│              │                 MAP                       │ │               │ │
│ ☑ Elevation  │                                           │ │     82        │ │
│ ☑ Slope      │                                           │ │ HIGH RISK     │ │
│ ☑ Drainage   │                                           │ │               │ │
│              │                                           │ └───────────────┘ │
│ INFRA        │                                           │                   │
│              │                                           │ FACTORS           │
│ ☑ Roads      │                                           │                   │
│ ☑ Buildings  │                                           │ Rainfall   HIGH   │
│ ☑ Hospitals  │                                           │ Soil       HIGH   │
│              │                                           │ Elevation  LOW    │
│ RISK         │                                           │                   │
│              │                                           │ [View Details]    │
│ ☑ Flood Risk │                                           │                   │
│ ☑ Critical   │                                           │                   │
│              │                                           │                   │
├──────────────┴───────────────────────────────────────────┴───────────────────┤
│ MAP TIMELINE       ◀ ───────────────●────────────────────────────── ▶        │
└──────────────────────────────────────────────────────────────────────────────┘


LAYOUT PROPORTIONS:

Left Layer Panel:     240px
Map:                  Flexible / dominant
Right Intelligence:   320–380px

MAP SHOULD OCCUPY 60–70% OF THE SCREEN.


==================================================
04. LOCATION INTELLIGENCE DETAIL
==================================================

Opened when user clicks a location.

┌──────────────────────────────────────────┐
│ ← LOCATION INTELLIGENCE                  │
├──────────────────────────────────────────┤
│                                          │
│ Kozhikode, Kerala                        │
│ 11.2588° N  75.7804° E                   │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │                                      │ │
│ │             RISK SCORE               │ │
│ │                                      │ │
│ │                 82                   │ │
│ │                                      │ │
│ │              HIGH RISK               │ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ CONTRIBUTING FACTORS                     │
│                                          │
│ Rainfall                                │
│ ████████████████████  HIGH              │
│                                          │
│ Soil Saturation                         │
│ ██████████████████    92%               │
│                                          │
│ Terrain Elevation                       │
│ ██████                LOW               │
│                                          │
│ Drainage Capacity                       │
│ ███████               POOR              │
│                                          │
│ ─────────────────────────────────────── │
│                                          │
│ RECOMMENDED ACTION                       │
│                                          │
│ Continuous monitoring recommended.      │
│ Alert emergency response authorities.   │
│                                          │
└──────────────────────────────────────────┘


==================================================
05. ANALYTICS PAGE
==================================================

┌──────────────────────────────────────────────────────────────────────────────┐
│ ANALYTICS                           [Location] [Date Range] [Export]        │
├───────────────┬──────────────────────────────────────────────────────────────┤
│               │                                                              │
│   SIDEBAR     │ ENVIRONMENTAL ANALYTICS                                      │
│               │                                                              │
│               │ ┌───────────────────────────────┐ ┌────────────────────────┐│
│               │ │                               │ │                        ││
│               │ │ RAINFALL TREND                │ │ SOIL MOISTURE          ││
│               │ │                               │ │                        ││
│               │ │       LINE / AREA CHART       │ │    LINE CHART          ││
│               │ │                               │ │                        ││
│               │ └───────────────────────────────┘ └────────────────────────┘│
│               │                                                              │
│               │ ┌───────────────────────────────┐ ┌────────────────────────┐│
│               │ │                               │ │                        ││
│               │ │ WEATHER PATTERNS              │ │ RISK TREND             ││
│               │ │                               │ │                        ││
│               │ │        CHART                  │ │      CHART             ││
│               │ │                               │ │                        ││
│               │ └───────────────────────────────┘ └────────────────────────┘│
│               │                                                              │
│               │ ┌──────────────────────────────────────────────────────────┐ │
│               │ │                                                          │ │
│               │ │                 HISTORICAL RISK ANALYSIS                 │ │
│               │ │                                                          │ │
│               │ │                     LARGE CHART                          │ │
│               │ │                                                          │ │
│               │ └──────────────────────────────────────────────────────────┘ │
│               │                                                              │
└───────────────┴──────────────────────────────────────────────────────────────┘


RULE:

Each chart must answer a specific question.

DO NOT create charts just to fill space.


==================================================
06. HISTORICAL ANALYSIS PAGE
==================================================

┌──────────────────────────────────────────────────────────────────────────────┐
│ HISTORICAL ANALYSIS             [Location] [2020–2026]                       │
├───────────────┬──────────────────────────────────────────────────────────────┤
│               │                                                              │
│               │                                                              │
│               │        INTERACTIVE HISTORICAL MAP                            │
│               │                                                              │
│               │                                                              │
│               │                                                              │
│               │                                                              │
│               │                                                              │
│               │                                                              │
├───────────────┼──────────────────────────────────────────────────────────────┤
│               │                                                              │
│               │ EVENT TIMELINE                                               │
│               │                                                              │
│               │ 2020 ────●──── 2021 ───●──── 2022 ────●──── 2023            │
│               │                                                              │
├───────────────┼──────────────────────────────────────────────────────────────┤
│               │                                                              │
│               │ SELECTED EVENT                                               │
│               │                                                              │
│               │ Heavy Rainfall Event                                         │
│               │ August 2024                                                  │
│               │                                                              │
│               │ Rainfall       240 mm                                        │
│               │ Peak Risk      91                                            │
│               │ Affected Area  42 km²                                        │
│               │                                                              │
└───────────────┴──────────────────────────────────────────────────────────────┘


==================================================
07. INFRASTRUCTURE INTELLIGENCE
==================================================

┌──────────────────────────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE INTELLIGENCE        [Location] [Risk Filter]                  │
├──────────────┬──────────────────────────────────────────┬────────────────────┤
│              │                                          │                    │
│ FILTERS      │                                          │ INFRASTRUCTURE     │
│              │                                          │ IMPACT             │
│ BUILDINGS    │                                          │                    │
│ ROADS        │                                          │ Total Assets       │
│ HOSPITALS    │             INFRASTRUCTURE               │ 12,482             │
│ SCHOOLS      │                  MAP                     │                    │
│ BRIDGES      │                                          │ At Risk            │
│              │                                          │ 1,204              │
│              │                                          │                    │
│              │                                          │ Critical           │
│              │                                          │ 28                 │
│              │                                          │                    │
├──────────────┴──────────────────────────────────────────┴────────────────────┤
│ EXPOSED INFRASTRUCTURE                                                       │
│                                                                              │
│ Hospital ─ Kozhikode Medical Center ─ HIGH RISK                              │
│ Road     ─ NH-66                   ─ MODERATE RISK                           │
│ Bridge   ─ Kallayi Bridge           ─ HIGH RISK                              │
└──────────────────────────────────────────────────────────────────────────────┘


==================================================
08. ALERTS / INCIDENT CENTER
==================================================

┌──────────────────────────────────────────────────────────────────────────────┐
│ ALERT CENTER                           [All] [Critical] [High] [Resolved]   │
├───────────────┬──────────────────────────────────────────────────────────────┤
│               │                                                              │
│ FILTERS       │ ACTIVE ALERTS                                                │
│               │                                                              │
│ Severity      │ ┌──────────────────────────────────────────────────────────┐ │
│               │ │ CRITICAL                              12 MIN AGO        │ │
│ ● Critical    │ │                                                          │ │
│ ● High        │ │ HIGH FLOOD PROBABILITY                                  │ │
│ ● Moderate    │ │ Kozhikode District                                      │ │
│               │ │                                                          │ │
│ Status        │ │ Rainfall + Soil Saturation + Low Elevation              │ │
│               │ │                                                          │ │
│ ● Active      │ │ [View Location]              [Acknowledge]              │ │
│ ● Monitoring  │ └──────────────────────────────────────────────────────────┘ │
│ ● Resolved    │                                                              │
│               │ ┌──────────────────────────────────────────────────────────┐ │
│               │ │ HIGH                                  28 MIN AGO        │ │
│               │ │                                                          │ │
│               │ │ EXTREME RAINFALL DETECTED                               │ │
│               │ │                                                          │ │
│               │ └──────────────────────────────────────────────────────────┘ │
│               │                                                              │
└───────────────┴──────────────────────────────────────────────────────────────┘


IMPORTANT:

Alerts should feel like incidents requiring attention.

NOT like social media notifications.


==================================================
09. REPORTS PAGE
==================================================

┌──────────────────────────────────────────────────────────────────────────────┐
│ REPORTS                                                                       │
├───────────────┬──────────────────────────────────────────────────────────────┤
│               │                                                              │
│               │ GENERATE INTELLIGENCE REPORT                                 │
│               │                                                              │
│               │ ┌─────────────────────────────────────────────────────────┐  │
│               │ │                                                         │  │
│               │ │ REPORT TYPE                                             │  │
│               │ │                                                         │  │
│               │ │ ○ Flood Risk Assessment                                 │  │
│               │ │ ○ Environmental Analysis                                │  │
│               │ │ ○ Infrastructure Impact                                 │  │
│               │ │ ○ Historical Analysis                                   │  │
│               │ │                                                         │  │
│               │ ├─────────────────────────────────────────────────────────┤  │
│               │ │                                                         │  │
│               │ │ LOCATION                                                │  │
│               │ │ [ Search location __________________ ]                  │  │
│               │ │                                                         │  │
│               │ │ DATE RANGE                                              │  │
│               │ │ [ Start Date ] → [ End Date ]                           │  │
│               │ │                                                         │  │
│               │ │ DATA LAYERS                                             │  │
│               │ │ ☑ Rainfall                                              │  │
│               │ │ ☑ Soil Moisture                                         │  │
│               │ │ ☑ Terrain                                               │  │
│               │ │ ☑ Infrastructure                                        │  │
│               │ │                                                         │  │
│               │ │                     [ Generate Report ]                 │  │
│               │ │                                                         │  │
│               │ └─────────────────────────────────────────────────────────┘  │
│               │                                                              │
└───────────────┴──────────────────────────────────────────────────────────────┘


==================================================
10. GLOBAL NAVIGATION STRUCTURE
==================================================

┌──────────────────────────────┐
│                              │
│         SANKET               │
│   Disaster Intelligence      │
│                              │
├──────────────────────────────┤
│                              │
│  ◉ Overview                  │
│                              │
│  ◉ Live Monitor              │
│                              │
│  ◉ Risk Intelligence         │
│                              │
│  ◉ Analytics                 │
│                              │
│  ◉ Historical Analysis       │
│                              │
│  ◉ Infrastructure            │
│                              │
│  ◉ Alerts                    │
│                              │
│  ◉ Reports                   │
│                              │
├──────────────────────────────┤
│                              │
│  ⚙ Settings                  │
│                              │
│  ? Help                      │
│                              │
│  ● User Profile              │
│                              │
└──────────────────────────────┘


==================================================
GLOBAL USER FLOW
==================================================


                     ┌───────────────┐
                     │   OVERVIEW    │
                     └───────┬───────┘
                             │
             ┌───────────────┼────────────────┐
             │               │                │
             ▼               ▼                ▼
      LIVE MONITOR       RISK MAP         ANALYTICS
             │               │                │
             │               ▼                │
             │       LOCATION INSPECTOR       │
             │               │                │
             └───────────────┼────────────────┘
                             │
                             ▼
                    DECISION INTELLIGENCE
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
       ALERTS         INFRASTRUCTURE        REPORTS
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                             ▼
                       USER ACTION


==================================================
DESIGN CONSISTENCY RULES
==================================================

ALL PAGES MUST SHARE:

- Same sidebar
- Same top navigation
- Same spacing system
- Same typography
- Same border radius
- Same color system
- Same interaction patterns

MAP-HEAVY PAGES:

- Risk Map
- Live Monitor
- Infrastructure
- Historical Analysis

DATA-HEAVY PAGES:

- Overview
- Analytics
- Alerts

ACTION-HEAVY PAGES:

- Reports
- Alerts
- Location Intelligence


==================================================
FINAL DESIGN PRIORITY
==================================================

PRIORITY ORDER:

1. Risk Map
2. Overview Dashboard
3. Live Monitor
4. Location Intelligence
5. Analytics
6. Alerts
7. Infrastructure
8. Historical Analysis
9. Reports

Spend the highest design effort on:

RISK MAP

because this is the core product experience.

The user should remember SANKET because of its geospatial intelligence interface.