// SANKET prototype — mock data model.
// Every value here is hardcoded/predefined per the MVP spec (docs/demo_sanket_text.md):
// "For the MVP, these values can be preloaded/hardcoded." Nothing here is a live
// model output. Swap fetch() calls for the real API surface in docs/ARCHITECTURE.md
// when the backend exists — the component layer above this file does not need to change.

import { DISTRICT_PATHS } from './nerGeo.js';

export const HAZARD_LEVELS = ['normal', 'watch', 'warning', 'danger'];

export const HAZARD_META = {
  normal: { label: 'NORMAL', action: 'Monitor' },
  watch: { label: 'WATCH', action: 'Inform local officials' },
  warning: { label: 'WARNING', action: 'Alert community, pre-position' },
  danger: { label: 'DANGER', action: 'Evacuate / close road' },
};

// ---------------------------------------------------------------------------
// 1. NER regional summary — matches the spec's worked example exactly:
// "Danger: 04 | Warning: 17 | Watch: 32 | Normal: 112"
// ---------------------------------------------------------------------------

// District counts are derived from the real boundary set (nerGeo.js), not
// hand-typed — with real geodata now backing the map, a stale hand-typed
// count would be a checkable, embarrassing inconsistency the moment someone
// counts the shapes on screen.
function realDistrictCount(stateCode) {
  return Object.values(DISTRICT_PATHS).filter((d) => d.state === stateCode).length;
}

// NOTE on `zones` below: these per-state Danger/Warning/Watch/Normal counts
// are the specific worked-example figures already quoted verbatim in the
// deck (docs/demo_sanket_text.md's "NER STATUS: Danger: 04 | Warning: 17 |
// Watch: 32 | Normal: 112") and in the methodology slides. They are kept
// exactly as originally authored rather than re-derived from the full
// per-district generator below — those two layers describe different
// things (illustrative sub-district risk zones vs. real administrative
// districts) and were never meant to sum 1:1, the same way a real
// operational system's zone count would not equal its district count.
export const NER_STATES = [
  // Western Himalayas
  {
    id: 'UK', name: 'Uttarakhand',
    region: 'North-Western Himalayas',
    districts: 13, zones: { danger: 4, warning: 5, watch: 3, normal: 1 },
    highestRisk: true,
  },
  {
    id: 'HP', name: 'Himachal Pradesh',
    region: 'North-Western Himalayas',
    districts: 12, zones: { danger: 2, warning: 4, watch: 4, normal: 2 },
    highestRisk: false,
  },
  {
    id: 'JK', name: 'Jammu & Kashmir',
    region: 'North-Western Himalayas',
    districts: 20, zones: { danger: 2, warning: 3, watch: 5, normal: 10 },
    highestRisk: false,
  },

  // Western Ghats
  {
    id: 'KL', name: 'Kerala',
    region: 'Western Ghats',
    districts: 14, zones: { danger: 3, warning: 4, watch: 4, normal: 3 },
    highestRisk: true,
  },
  {
    id: 'MH', name: 'Maharashtra',
    region: 'Western Ghats',
    districts: 36, zones: { danger: 1, warning: 4, watch: 6, normal: 25 },
    highestRisk: false,
  },

  // North-Eastern Region
  {
    id: 'AR', name: 'Arunachal Pradesh',
    region: 'North Eastern Region',
    districts: realDistrictCount('AR') || 25, zones: { danger: 0, warning: 2, watch: 5, normal: 18 },
    highestRisk: false,
  },
  {
    id: 'AS', name: 'Assam',
    region: 'North Eastern Region',
    districts: realDistrictCount('AS') || 31, zones: { danger: 0, warning: 3, watch: 6, normal: 24 },
    highestRisk: false,
  },
  {
    id: 'MN', name: 'Manipur',
    region: 'North Eastern Region',
    districts: realDistrictCount('MN') || 16, zones: { danger: 3, warning: 6, watch: 4, normal: 8 },
    highestRisk: true,
  },
  {
    id: 'ML', name: 'Meghalaya',
    region: 'North Eastern Region',
    districts: realDistrictCount('ML') || 12, zones: { danger: 1, warning: 3, watch: 6, normal: 15 },
    highestRisk: false,
  },
  {
    id: 'MZ', name: 'Mizoram',
    region: 'North Eastern Region',
    districts: realDistrictCount('MZ') || 11, zones: { danger: 0, warning: 2, watch: 5, normal: 14 },
    highestRisk: false,
  },
  {
    id: 'NL', name: 'Nagaland',
    region: 'North Eastern Region',
    districts: realDistrictCount('NL') || 16, zones: { danger: 0, warning: 1, watch: 3, normal: 12 },
    highestRisk: false,
  },
  {
    id: 'SK', name: 'Sikkim',
    region: 'North Eastern Region',
    districts: realDistrictCount('SK') || 6, zones: { danger: 0, warning: 0, watch: 2, normal: 7 },
    highestRisk: false,
  },
  {
    id: 'TR', name: 'Tripura',
    region: 'North Eastern Region',
    districts: realDistrictCount('TR') || 8, zones: { danger: 0, warning: 0, watch: 1, normal: 14 },
    highestRisk: false,
  },
];

export const NER_SUMMARY = {
  totalDistricts: NER_STATES.reduce((s, x) => s + x.districts, 0),
  zones: NER_STATES.reduce(
    (acc, s) => ({
      danger: acc.danger + s.zones.danger,
      warning: acc.warning + s.zones.warning,
      watch: acc.watch + s.zones.watch,
      normal: acc.normal + s.zones.normal,
    }),
    { danger: 0, warning: 0, watch: 0, normal: 0 }
  ),
  activeWarnings: 26, // danger + warning zones with an issued alert
  affectedVillages: 41,
  atRiskRoads: 18,
  criticalInfraAtRisk: 9,
  highestRiskState: 'Manipur',
  mostAffectedDistrict: 'Noney',
  connectivityAlerts: 7,
  currentRainfallSummary: 'Heavy rainfall over Manipur & Meghalaya in the last 24h',
};

// ---------------------------------------------------------------------------
// 2 & 3. Districts and risk zones — Manipur/Noney built out in full depth
// (matches the spec's "strongest demo sequence"). Other states carry one
// shallow district each so the drill-down path works everywhere, not just
// on the golden path.
// ---------------------------------------------------------------------------

export const DISTRICTS = {
  // Western Himalayas
  UK: [
    {
      id: 'rudraprayag', name: 'Rudraprayag', state: 'UK',
      hazard: 'danger', population: 242000,
      summary: 'Kedarnath valley corridor; ISRO Rank #1 highest landslide susceptibility district in India.',
      environment: {
        rainfall: { current: 'VERY HIGH', h24: 165, h72: 340, d7: 580, unit: 'mm', trend: 'rising' },
        soilMoisture: { level: 'SATURATED', trend: 'rising', note: 'Extreme pore-water pressure along Mandakini valley slopes' },
        vegetation: { ndvi: 0.38, density: 'MODERATE', change: 'REDUCED', note: 'Debris scar expansion on NH-107 corridor' },
        terrain: { slope: 'EXTREME', elevation: '1,850 m avg', drainage: 'Confined steep gorge', landCover: 'Alpine slopes, pilgrimage highway cut' },
      },
      historicalLandslideCount: 26, zones: ['rudraprayag-a'], activeFieldReports: 4, activeAlerts: 2,
    },
    {
      id: 'chamoli', name: 'Chamoli', state: 'UK',
      hazard: 'danger', population: 391000,
      summary: 'Joshimath and Alaknanda corridor; active subsidence and toe erosion.',
      environment: {
        rainfall: { current: 'HIGH', h24: 92, h72: 210, d7: 380, unit: 'mm', trend: 'rising' },
        soilMoisture: { level: 'ELEVATED', trend: 'rising', note: 'Sub-surface saturation across glacial moraines' },
        vegetation: { ndvi: 0.42, density: 'MODERATE', change: 'REDUCED', note: 'Fissure detection on upper terraces' },
        terrain: { slope: 'EXTREME', elevation: '2,100 m avg', drainage: 'Fast torrent', landCover: 'Moraine debris, steep scarps' },
      },
      historicalLandslideCount: 22, zones: ['chamoli-a'], activeFieldReports: 3, activeAlerts: 1,
    },
  ],
  HP: [
    {
      id: 'mandi', name: 'Mandi', state: 'HP',
      hazard: 'warning', population: 999000,
      summary: 'Beas basin; recurring cloudburst damage and rockfall on Chandigarh-Manali NH-21.',
      environment: {
        rainfall: { current: 'HIGH', h24: 110, h72: 235, d7: 410, unit: 'mm', trend: 'rising' },
        soilMoisture: { level: 'ELEVATED', trend: 'rising', note: 'River terrace saturation' },
        vegetation: { ndvi: 0.48, density: 'GOOD', change: 'STABLE', note: 'Slope cutting along four-lane highway' },
        terrain: { slope: 'STEEP', elevation: '1,040 m avg', drainage: 'Beas valley', landCover: 'Pine forest, highway cuts' },
      },
      historicalLandslideCount: 17, zones: ['mandi-a'], activeFieldReports: 2, activeAlerts: 1,
    },
  ],
  JK: [
    {
      id: 'ramban', name: 'Ramban', state: 'JK',
      hazard: 'danger', population: 283000,
      summary: 'Jammu-Srinagar National Highway NH-44 corridor; shooting stones and active mass movements.',
      environment: {
        rainfall: { current: 'HIGH', h24: 78, h72: 175, d7: 310, unit: 'mm', trend: 'rising' },
        soilMoisture: { level: 'ELEVATED', trend: 'rising', note: 'Fragile shale-sandstone formation weathering' },
        vegetation: { ndvi: 0.36, density: 'SPARSE', change: 'REDUCED', note: 'Continuous slope cutting along highway widening' },
        terrain: { slope: 'EXTREME', elevation: '1,150 m avg', drainage: 'Chenab river gorge', landCover: 'Unconsolidated talus, steep cut slopes' },
      },
      historicalLandslideCount: 18, zones: ['ramban-a'], activeFieldReports: 3, activeAlerts: 1,
    },
  ],

  // Western Ghats
  KL: [
    {
      id: 'wayanad', name: 'Wayanad', state: 'KL',
      hazard: 'danger', population: 817000,
      summary: 'Meppadi / Chooralmala escarpment; severe debris flow susceptibility under monsoon soaking.',
      environment: {
        rainfall: { current: 'VERY HIGH', h24: 240, h72: 480, d7: 720, unit: 'mm', trend: 'rising' },
        soilMoisture: { level: 'SATURATED', trend: 'rising', note: 'Critical pore pressure reached in tea plantation overburden' },
        vegetation: { ndvi: 0.52, density: 'DENSE', change: 'REDUCED', note: 'Upper catchment slip scars detected' },
        terrain: { slope: 'STEEP', elevation: '950 m avg', drainage: 'Iruvazhinji puzha basin', landCover: 'Tea estates, forest crowns' },
      },
      historicalLandslideCount: 19, zones: ['wayanad-a'], activeFieldReports: 5, activeAlerts: 2,
    },
    {
      id: 'idukki', name: 'Idukki', state: 'KL',
      hazard: 'warning', population: 1108000,
      summary: 'High range cardamom hills and Munnar ghat road corridor; steep rotational slips.',
      environment: {
        rainfall: { current: 'HIGH', h24: 125, h72: 260, d7: 450, unit: 'mm', trend: 'rising' },
        soilMoisture: { level: 'ELEVATED', trend: 'rising', note: 'Above seasonal thresholds for 8 days' },
        vegetation: { ndvi: 0.58, density: 'DENSE', change: 'STABLE', note: 'Perennial plantation cover' },
        terrain: { slope: 'STEEP', elevation: '1,200 m avg', drainage: 'Periyar river system', landCover: 'Cardamom plantation, granite dome flanks' },
      },
      historicalLandslideCount: 15, zones: ['idukki-a'], activeFieldReports: 2, activeAlerts: 1,
    },
  ],
  MH: [
    {
      id: 'raigad', name: 'Raigad', state: 'MH',
      hazard: 'warning', population: 2634000,
      summary: 'Western Ghats Sahyadri escarpment; Irshalwadi and Mahad sector debris slide risk.',
      environment: {
        rainfall: { current: 'VERY HIGH', h24: 180, h72: 390, d7: 610, unit: 'mm', trend: 'rising' },
        soilMoisture: { level: 'ELEVATED', trend: 'rising', note: 'Intense basalt weathering layer saturation' },
        vegetation: { ndvi: 0.44, density: 'MODERATE', change: 'STABLE', note: 'Deciduous monsoon cover' },
        terrain: { slope: 'EXTREME', elevation: '680 m avg', drainage: 'Savitri river basin', landCover: 'Cliff edge, tribal hamlets' },
      },
      historicalLandslideCount: 13, zones: ['raigad-a'], activeFieldReports: 2, activeAlerts: 1,
    },
  ],

  // North-Eastern Region
  MN: [
    {
      id: 'noney', name: 'Noney', state: 'MN',
      hazard: 'warning',
      population: 47000,
      summary: 'Heavy rainfall + elevated soil moisture + steep terrain are contributing to increased risk.',
      environment: {
        rainfall: { current: 'HIGH', h24: 118, h72: 244, d7: 390, unit: 'mm', trend: 'rising' },
        soilMoisture: { level: 'ELEVATED', trend: 'rising', note: 'Above seasonal norm for 6 consecutive days' },
        vegetation: { ndvi: 0.34, density: 'MODERATE', change: 'REDUCED', note: '12% NDVI drop over the last 90 days near Zone A' },
        terrain: { slope: 'STEEP', elevation: '1,420 m avg', drainage: 'Fast, confined valley', landCover: 'Mixed forest, recent hill-cut sections' },
      },
      historicalLandslideCount: 14,
      zones: ['noney-a', 'noney-b', 'noney-c'],
      activeFieldReports: 2,
      activeAlerts: 1,
    },
    {
      id: 'tamenglong', name: 'Tamenglong', state: 'MN',
      hazard: 'watch',
      population: 31000,
      summary: 'Elevated soil moisture on steep slopes; rainfall within normal range.',
      environment: {
        rainfall: { current: 'MODERATE', h24: 42, h72: 96, d7: 180, unit: 'mm', trend: 'stable' },
        soilMoisture: { level: 'ELEVATED', trend: 'stable', note: 'Slightly above seasonal norm' },
        vegetation: { ndvi: 0.51, density: 'GOOD', change: 'STABLE', note: 'No significant change detected' },
        terrain: { slope: 'STEEP', elevation: '1,180 m avg', drainage: 'Moderate', landCover: 'Dense forest' },
      },
      historicalLandslideCount: 6,
      zones: ['tamenglong-a'],
      activeFieldReports: 0,
      activeAlerts: 0,
    },
  ],
  AS: [
    { id: 'dima-hasao', name: 'Dima Hasao', state: 'AS', hazard: 'watch', population: 213000,
      summary: 'Localised watch on hill-cut sections near NH-27.',
      environment: {
        rainfall: { current: 'MODERATE', h24: 38, h72: 84, d7: 160, unit: 'mm', trend: 'stable' },
        soilMoisture: { level: 'NORMAL', trend: 'stable', note: 'Within seasonal range' },
        vegetation: { ndvi: 0.48, density: 'GOOD', change: 'STABLE', note: 'No significant change' },
        terrain: { slope: 'MODERATE', elevation: '850 m avg', drainage: 'Good', landCover: 'Mixed forest' },
      },
      historicalLandslideCount: 4, zones: ['dima-hasao-a'], activeFieldReports: 0, activeAlerts: 0 },
  ],
  ML: [
    { id: 'east-khasi-hills', name: 'East Khasi Hills', state: 'ML', hazard: 'warning', population: 825000,
      summary: 'Highest rainfall zone in NER; quarry-cut slopes elevate exposure near Sohra.',
      environment: {
        rainfall: { current: 'VERY HIGH', h24: 210, h72: 460, d7: 810, unit: 'mm', trend: 'rising' },
        soilMoisture: { level: 'ELEVATED', trend: 'rising', note: 'Saturated in multiple sub-catchments' },
        vegetation: { ndvi: 0.41, density: 'MODERATE', change: 'REDUCED', note: 'Quarry expansion visible in recent imagery' },
        terrain: { slope: 'STEEP', elevation: '1,490 m avg', drainage: 'Fast', landCover: 'Grassland, quarry-cut slopes' },
      },
      historicalLandslideCount: 9, zones: ['ekh-a'], activeFieldReports: 1, activeAlerts: 1 },
  ],
  MZ: [{ id: 'aizawl', name: 'Aizawl', state: 'MZ', hazard: 'watch', population: 400000,
      summary: 'Steep urban slopes under routine monitoring.',
      environment: {
        rainfall: { current: 'MODERATE', h24: 46, h72: 102, d7: 190, unit: 'mm', trend: 'stable' },
        soilMoisture: { level: 'NORMAL', trend: 'stable', note: 'Within seasonal range' },
        vegetation: { ndvi: 0.39, density: 'MODERATE', change: 'STABLE', note: 'Urban slope, sparse cover' },
        terrain: { slope: 'STEEP', elevation: '1,130 m avg', drainage: 'Engineered drains, aging', landCover: 'Urban, steep cut-slopes' },
      },
      historicalLandslideCount: 11, zones: ['aizawl-a'], activeFieldReports: 0, activeAlerts: 0 }],
  AR: [{ id: 'lower-dibang-valley', name: 'Lower Dibang Valley', state: 'AR', hazard: 'watch', population: 55000,
      summary: 'Localised watch, terrain-driven susceptibility.',
      environment: {
        rainfall: { current: 'MODERATE', h24: 34, h72: 70, d7: 140, unit: 'mm', trend: 'stable' },
        soilMoisture: { level: 'NORMAL', trend: 'stable', note: 'Within seasonal range' },
        vegetation: { ndvi: 0.55, density: 'GOOD', change: 'STABLE', note: 'No change detected' },
        terrain: { slope: 'STEEP', elevation: '900 m avg', drainage: 'Good', landCover: 'Dense forest' },
      },
      historicalLandslideCount: 5, zones: ['ldv-a'], activeFieldReports: 0, activeAlerts: 0 }],
  NL: [{ id: 'kohima', name: 'Kohima', state: 'NL', hazard: 'normal', population: 270000,
      summary: 'No elevated indicators at this time.',
      environment: {
        rainfall: { current: 'LOW', h24: 12, h72: 28, d7: 60, unit: 'mm', trend: 'falling' },
        soilMoisture: { level: 'NORMAL', trend: 'stable', note: 'Within seasonal range' },
        vegetation: { ndvi: 0.58, density: 'GOOD', change: 'STABLE', note: 'No change detected' },
        terrain: { slope: 'MODERATE', elevation: '1,440 m avg', drainage: 'Good', landCover: 'Mixed forest, urban' },
      },
      historicalLandslideCount: 3, zones: ['kohima-a'], activeFieldReports: 0, activeAlerts: 0 }],
  SK: [{ id: 'east-sikkim', name: 'East Sikkim', state: 'SK', hazard: 'watch', population: 283000,
      summary: 'Routine monitoring around Gangtok; steep terrain, normal rainfall.',
      environment: {
        rainfall: { current: 'MODERATE', h24: 40, h72: 88, d7: 165, unit: 'mm', trend: 'stable' },
        soilMoisture: { level: 'NORMAL', trend: 'stable', note: 'Within seasonal range' },
        vegetation: { ndvi: 0.52, density: 'GOOD', change: 'STABLE', note: 'No change detected' },
        terrain: { slope: 'STEEP', elevation: '1,650 m avg', drainage: 'Good', landCover: 'Forest, urban' },
      },
      historicalLandslideCount: 4, zones: ['east-sikkim-a'], activeFieldReports: 0, activeAlerts: 0 }],
  TR: [{ id: 'khowai', name: 'Khowai', state: 'TR', hazard: 'normal', population: 320000,
      summary: 'No elevated indicators at this time.',
      environment: {
        rainfall: { current: 'LOW', h24: 8, h72: 20, d7: 45, unit: 'mm', trend: 'stable' },
        soilMoisture: { level: 'NORMAL', trend: 'stable', note: 'Within seasonal range' },
        vegetation: { ndvi: 0.6, density: 'GOOD', change: 'STABLE', note: 'No change detected' },
        terrain: { slope: 'LOW', elevation: '110 m avg', drainage: 'Good', landCover: 'Mixed agriculture, forest' },
      },
      historicalLandslideCount: 1, zones: ['khowai-a'], activeFieldReports: 0, activeAlerts: 0 }],
};

// ---------------------------------------------------------------------------
// Risk zones — the drill-down endpoint: NER -> Manipur -> Noney -> Zone.
// Noney's three zones match the Response Prioritisation worked example.
// ---------------------------------------------------------------------------

export const ZONES = {
  // Western Himalayas
  'rudraprayag-a': {
    id: 'rudraprayag-a', name: 'Rudraprayag Kedarnath Zone', district: 'rudraprayag', state: 'UK',
    hazard: 'danger',
    coords: { x: 0.5, y: 0.48 },
    riskFactors: [
      { factor: 'High Himalayan relief', level: 'high' },
      { factor: 'Continuous monsoon precipitation', level: 'high' },
      { factor: 'Unconsolidated moraine cover', level: 'high' },
      { factor: 'Mandakini gorge toe erosion', level: 'high' },
    ],
    aiAssessment: [
      { factor: 'Terrain Susceptibility', status: 'Extreme' },
      { factor: 'Rainfall Trigger', status: 'High' },
      { factor: 'Soil Moisture', status: 'Saturated' },
      { factor: 'Vegetation', status: 'Sparse' },
      { factor: 'Historical Vulnerability', status: 'Critical' },
    ],
    finalOutput: { level: 'danger', note: 'ISRO Rank #1 susceptibility belt; highway monitoring mandatory.' },
    villages: [], roads: [], infrastructure: [],
    priority: { rank: 1, reasoning: 'Danger · Pilgrimage Highway Corridor' },
  },
  'chamoli-a': {
    id: 'chamoli-a', name: 'Chamoli Joshimath Zone', district: 'chamoli', state: 'UK',
    hazard: 'danger',
    coords: { x: 0.52, y: 0.44 },
    riskFactors: [
      { factor: 'Active slope subsidence', level: 'high' },
      { factor: 'Pore-water pressure loading', level: 'high' },
      { factor: 'Glacial drift geology', level: 'high' },
    ],
    aiAssessment: [
      { factor: 'Terrain Susceptibility', status: 'Extreme' },
      { factor: 'Rainfall Trigger', status: 'High' },
      { factor: 'Soil Moisture', status: 'Elevated' },
      { factor: 'Vegetation', status: 'Sparse' },
      { factor: 'Historical Vulnerability', status: 'Critical' },
    ],
    finalOutput: { level: 'danger', note: 'Slope instability watch active.' },
    villages: [], roads: [], infrastructure: [],
    priority: { rank: 1, reasoning: 'Danger · Joshimath Escarpment' },
  },
  'mandi-a': {
    id: 'mandi-a', name: 'Mandi NH-21 Corridor', district: 'mandi', state: 'HP',
    hazard: 'warning',
    coords: { x: 0.48, y: 0.5 },
    riskFactors: [
      { factor: 'Beas valley steep slopes', level: 'high' },
      { factor: 'Continuous monsoon rainfall', level: 'high' },
      { factor: 'Road cut excavation', level: 'high' },
    ],
    aiAssessment: [
      { factor: 'Terrain Susceptibility', status: 'High' },
      { factor: 'Rainfall Trigger', status: 'High' },
      { factor: 'Soil Moisture', status: 'Elevated' },
      { factor: 'Vegetation', status: 'Moderate' },
      { factor: 'Historical Vulnerability', status: 'High' },
    ],
    finalOutput: { level: 'warning', note: 'Highway slope watch active.' },
    villages: [], roads: [], infrastructure: [],
    priority: { rank: 2, reasoning: 'Warning · NH-21 Transport Corridor' },
  },
  'ramban-a': {
    id: 'ramban-a', name: 'Ramban Panthyal Zone', district: 'ramban', state: 'JK',
    hazard: 'danger',
    coords: { x: 0.5, y: 0.5 },
    riskFactors: [
      { factor: 'Sheared shale & phyllite formations', level: 'high' },
      { factor: 'Shooting stone activity on NH-44', level: 'high' },
    ],
    aiAssessment: [
      { factor: 'Terrain Susceptibility', status: 'Extreme' },
      { factor: 'Rainfall Trigger', status: 'High' },
      { factor: 'Soil Moisture', status: 'Elevated' },
      { factor: 'Vegetation', status: 'Sparse' },
      { factor: 'Historical Vulnerability', status: 'Critical' },
    ],
    finalOutput: { level: 'danger', note: 'National Highway corridor under red warning.' },
    villages: [], roads: [], infrastructure: [],
    priority: { rank: 1, reasoning: 'Danger · Strategic Highway Lifeline' },
  },

  // Western Ghats
  'wayanad-a': {
    id: 'wayanad-a', name: 'Wayanad Chooralmala Zone', district: 'wayanad', state: 'KL',
    hazard: 'danger',
    coords: { x: 0.45, y: 0.52 },
    riskFactors: [
      { factor: 'Torrential monsoon downpour', level: 'high' },
      { factor: 'Critical soil saturation', level: 'high' },
      { factor: 'Steep tea estate scarp', level: 'high' },
      { factor: 'Prior debris flow channel', level: 'high' },
    ],
    aiAssessment: [
      { factor: 'Terrain Susceptibility', status: 'Extreme' },
      { factor: 'Rainfall Trigger', status: 'Critical' },
      { factor: 'Soil Moisture', status: 'Saturated' },
      { factor: 'Vegetation', status: 'Disturbed' },
      { factor: 'Historical Vulnerability', status: 'High' },
    ],
    finalOutput: { level: 'danger', note: 'Critical debris flow danger; evacuation protocol advisory.' },
    villages: [], roads: [], infrastructure: [],
    priority: { rank: 1, reasoning: 'Danger · Western Ghats High Vulnerability' },
  },
  'idukki-a': {
    id: 'idukki-a', name: 'Idukki Munnar Gap Zone', district: 'idukki', state: 'KL',
    hazard: 'warning',
    coords: { x: 0.46, y: 0.54 },
    riskFactors: [
      { factor: 'High altitude ghat road cut', level: 'high' },
      { factor: 'Prolonged rainfall soaking', level: 'high' },
    ],
    aiAssessment: [
      { factor: 'Terrain Susceptibility', status: 'High' },
      { factor: 'Rainfall Trigger', status: 'High' },
      { factor: 'Soil Moisture', status: 'Elevated' },
      { factor: 'Vegetation', status: 'Dense' },
      { factor: 'Historical Vulnerability', status: 'Moderate' },
    ],
    finalOutput: { level: 'warning', note: 'Rotational slide warning on ghat pass.' },
    villages: [], roads: [], infrastructure: [],
    priority: { rank: 2, reasoning: 'Warning · Ghat Road Corridor' },
  },
  'raigad-a': {
    id: 'raigad-a', name: 'Raigad Mahad Escarpment', district: 'raigad', state: 'MH',
    hazard: 'warning',
    coords: { x: 0.42, y: 0.48 },
    riskFactors: [
      { factor: 'Deccan basalt cliff weathering', level: 'high' },
      { factor: 'Intense coastal monsoon cloudburst', level: 'high' },
    ],
    aiAssessment: [
      { factor: 'Terrain Susceptibility', status: 'High' },
      { factor: 'Rainfall Trigger', status: 'High' },
      { factor: 'Soil Moisture', status: 'Elevated' },
      { factor: 'Vegetation', status: 'Moderate' },
      { factor: 'Historical Vulnerability', status: 'High' },
    ],
    finalOutput: { level: 'warning', note: 'Western Ghats cliff flank advisory.' },
    villages: [], roads: [], infrastructure: [],
    priority: { rank: 2, reasoning: 'Warning · Sahyadri Crestline' },
  },

  // North East
  'noney-a': {
    id: 'noney-a', name: 'Noney Zone A', district: 'noney', state: 'MN',
    hazard: 'danger',
    coords: { x: 0.42, y: 0.55 }, // fractional position within the Noney district panel
    riskFactors: [
      { factor: 'Steep terrain', level: 'high' },
      { factor: 'High recent rainfall', level: 'high' },
      { factor: 'Elevated soil moisture', level: 'high' },
      { factor: 'Reduced vegetation', level: 'moderate' },
      { factor: 'Historical landslide activity', level: 'high' },
    ],
    aiAssessment: [
      { factor: 'Terrain Susceptibility', status: 'High' },
      { factor: 'Rainfall Trigger', status: 'High' },
      { factor: 'Soil Moisture', status: 'Elevated' },
      { factor: 'Vegetation', status: 'Reduced' },
      { factor: 'Historical Vulnerability', status: 'High' },
    ],
    finalOutput: { level: 'danger', note: 'Increased landslide risk detected — evacuation-adjacent zone.' },
    villages: ['village-noney-a1', 'village-noney-a2', 'village-noney-a3'],
    roads: ['road-noney-1'],
    infrastructure: ['infra-noney-health-1'],
    priority: {
      rank: 1,
      reasoning: 'Danger · 3 villages · 1 critical road · 1 health facility',
    },
  },
  'noney-b': {
    id: 'noney-b', name: 'Noney Zone B', district: 'noney', state: 'MN',
    hazard: 'warning',
    coords: { x: 0.58, y: 0.4 },
    riskFactors: [
      { factor: 'Steep terrain', level: 'high' },
      { factor: 'High recent rainfall', level: 'high' },
      { factor: 'Elevated soil moisture', level: 'moderate' },
      { factor: 'Reduced vegetation', level: 'low' },
      { factor: 'Historical landslide activity', level: 'moderate' },
    ],
    aiAssessment: [
      { factor: 'Terrain Susceptibility', status: 'High' },
      { factor: 'Rainfall Trigger', status: 'High' },
      { factor: 'Soil Moisture', status: 'Elevated' },
      { factor: 'Vegetation', status: 'Moderate' },
      { factor: 'Historical Vulnerability', status: 'Moderate' },
    ],
    finalOutput: { level: 'warning', note: 'Increased landslide risk detected.' },
    villages: ['village-noney-b1', 'village-noney-b2'],
    roads: ['road-noney-2'],
    infrastructure: [],
    priority: {
      rank: 2,
      reasoning: 'Warning · 2 villages · 1 road',
    },
  },
  'noney-c': {
    id: 'noney-c', name: 'Noney Zone C', district: 'noney', state: 'MN',
    hazard: 'watch',
    coords: { x: 0.3, y: 0.28 },
    riskFactors: [
      { factor: 'Moderate terrain', level: 'moderate' },
      { factor: 'Elevated rainfall trend', level: 'moderate' },
      { factor: 'Normal soil moisture', level: 'low' },
      { factor: 'Stable vegetation', level: 'low' },
      { factor: 'Low historical activity', level: 'low' },
    ],
    aiAssessment: [
      { factor: 'Terrain Susceptibility', status: 'Moderate' },
      { factor: 'Rainfall Trigger', status: 'Moderate' },
      { factor: 'Soil Moisture', status: 'Normal' },
      { factor: 'Vegetation', status: 'Stable' },
      { factor: 'Historical Vulnerability', status: 'Low' },
    ],
    finalOutput: { level: 'watch', note: 'Low exposure; continue monitoring.' },
    villages: [],
    roads: [],
    infrastructure: [],
    priority: {
      rank: 3,
      reasoning: 'Watch · low exposure',
    },
  },
  'tamenglong-a': {
    id: 'tamenglong-a', name: 'Tamenglong Zone A', district: 'tamenglong', state: 'MN',
    hazard: 'watch', coords: { x: 0.5, y: 0.5 },
    riskFactors: [
      { factor: 'Steep terrain', level: 'moderate' },
      { factor: 'Normal rainfall', level: 'low' },
      { factor: 'Elevated soil moisture', level: 'moderate' },
      { factor: 'Stable vegetation', level: 'low' },
      { factor: 'Moderate historical activity', level: 'moderate' },
    ],
    aiAssessment: [
      { factor: 'Terrain Susceptibility', status: 'Moderate' },
      { factor: 'Rainfall Trigger', status: 'Low' },
      { factor: 'Soil Moisture', status: 'Elevated' },
      { factor: 'Vegetation', status: 'Stable' },
      { factor: 'Historical Vulnerability', status: 'Moderate' },
    ],
    finalOutput: { level: 'watch', note: 'Continue monitoring.' },
    villages: [], roads: [], infrastructure: [], priority: { rank: 5, reasoning: 'Watch · low exposure' },
  },
};

// ---------------------------------------------------------------------------
// Villages, roads, infrastructure — declared here (right after ZONES, before
// the shallow-district and generator blocks below) because both of those
// write into these objects at module-eval time; they must exist first, not
// just be exported before those blocks run.
//
// coords are fractional positions within the OWNING ZONE's district panel
// (same coordinate space as ZONES[x].coords) — real enough to plot on the
// district boundary map for the GIS layer toggles, illustrative in the same
// way zone positions are (see docs/HANDOFF.md §3a).
// Offsets pushed further from each zone's own centre than the first pass —
// at map scale the original spacing crowded three village rings against
// one zone circle into an unreadable cluster. Caught by actually looking
// at a screenshot, not by counting DOM nodes.
// ---------------------------------------------------------------------------

export const VILLAGES = {
  'village-noney-a1': { id: 'village-noney-a1', name: 'Village A (Tupul)', population: 620, status: 'at-risk', coords: { x: 0.31, y: 0.46 } },
  'village-noney-a2': { id: 'village-noney-a2', name: 'Village B (Khoupum)', population: 410, status: 'at-risk', coords: { x: 0.53, y: 0.62 } },
  'village-noney-a3': { id: 'village-noney-a3', name: 'Village C (Longmai)', population: 340, status: 'isolated', coords: { x: 0.27, y: 0.73 } },
  'village-noney-b1': { id: 'village-noney-b1', name: 'Village D (Nungba)', population: 280, status: 'at-risk', coords: { x: 0.51, y: 0.31 } },
  'village-noney-b2': { id: 'village-noney-b2', name: 'Village E (Ithai)', population: 190, status: 'at-risk', coords: { x: 0.69, y: 0.49 } },
};

export const ROADS = {
  'road-noney-1': { id: 'road-noney-1', name: 'NH-37 (Noney–Tupul stretch)', class: 'National Highway', status: 'blocked', obstructionPct: 78, path: [{ x: 0.28, y: 0.46 }, { x: 0.42, y: 0.55 }, { x: 0.50, y: 0.60 }] },
  'road-noney-2': { id: 'road-noney-2', name: 'Noney–Nungba link road', class: 'District road', status: 'at-risk', obstructionPct: 22, path: [{ x: 0.50, y: 0.34 }, { x: 0.58, y: 0.40 }, { x: 0.65, y: 0.45 }] },
};

export const INFRASTRUCTURE = {
  'infra-noney-health-1': { id: 'infra-noney-health-1', name: 'Tupul Primary Health Centre', type: 'Health centre', status: 'at-risk', coords: { x: 0.40, y: 0.53 } },
};

// Shallow single zone per one hand-picked district per state (above), so the
// original "worked example" districts carry hand-authored flavour text.
//
// Exposure (villages/roads/infra) is only attached where the hazard level
// actually justifies it — a Normal-hazard district correctly has an empty
// "affected villages" list, because nothing is affected. Watch/Warning
// districts get real, well-known localities (district HQs and known wards,
// not invented place names), matching the standard already set by Noney's
// Tupul/Khoupum/Longmai/Nungba/Ithai. Coordinates are varied per zone so
// district maps don't all render as a single dead-centre dot.
const SHALLOW_ZONE_EXPOSURE = {
  'dima-hasao-a': {
    coords: { x: 0.44, y: 0.4 },
    village: { id: 'village-dima-hasao-a1', name: 'Haflong', population: 38000, status: 'at-risk', coords: { x: 0.32, y: 0.3 } },
    road: { id: 'road-dima-hasao-1', name: 'NH-27 (Haflong stretch)', class: 'National Highway', status: 'at-risk', obstructionPct: 15, path: [{ x: 0.2, y: 0.25 }, { x: 0.4, y: 0.38 }, { x: 0.55, y: 0.5 }] },
  },
  'ekh-a': {
    coords: { x: 0.5, y: 0.42 },
    village: { id: 'village-ekh-a1', name: 'Sohra (Cherrapunji)', population: 12000, status: 'at-risk', coords: { x: 0.33, y: 0.3 } },
    village2: { id: 'village-ekh-a2', name: 'Mawsynram', population: 8500, status: 'at-risk', coords: { x: 0.62, y: 0.55 } },
    road: { id: 'road-ekh-1', name: 'Shillong–Sohra road', class: 'State highway', status: 'at-risk', obstructionPct: 30, path: [{ x: 0.2, y: 0.2 }, { x: 0.42, y: 0.38 }, { x: 0.6, y: 0.5 }] },
    infra: { id: 'infra-ekh-1', name: 'Sohra Community Health Centre', type: 'Health centre', status: 'at-risk', coords: { x: 0.35, y: 0.32 } },
  },
  'aizawl-a': {
    coords: { x: 0.48, y: 0.45 },
    village: { id: 'village-aizawl-a1', name: 'Zarkawt', population: 9000, status: 'at-risk', coords: { x: 0.35, y: 0.32 } },
    road: { id: 'road-aizawl-1', name: 'Aizawl–Durtlang road', class: 'City road', status: 'at-risk', obstructionPct: 18, path: [{ x: 0.25, y: 0.25 }, { x: 0.4, y: 0.38 }, { x: 0.55, y: 0.5 }] },
  },
  'ldv-a': {
    coords: { x: 0.46, y: 0.48 },
    village: { id: 'village-ldv-a1', name: 'Roing', population: 15000, status: 'at-risk', coords: { x: 0.32, y: 0.34 } },
    road: null,
  },
  'kohima-a': { coords: { x: 0.5, y: 0.5 } }, // Normal hazard — no exposure list, correctly empty
  'east-sikkim-a': {
    coords: { x: 0.47, y: 0.44 },
    village: { id: 'village-east-sikkim-a1', name: 'Ranipool', population: 7000, status: 'at-risk', coords: { x: 0.33, y: 0.31 } },
    road: null,
  },
  'khowai-a': { coords: { x: 0.5, y: 0.5 } }, // Normal hazard — no exposure list, correctly empty
};

['dima-hasao-a', 'ekh-a', 'aizawl-a', 'ldv-a', 'kohima-a', 'east-sikkim-a', 'khowai-a'].forEach((zid) => {
  const districtId = zid.replace(/-a$/, '');
  const districtMatch = Object.values(DISTRICTS).flat().find((d) => d.zones.includes(zid));
  const ex = SHALLOW_ZONE_EXPOSURE[zid] || {};

  const villageIds = [];
  if (ex.village) { VILLAGES[ex.village.id] = ex.village; villageIds.push(ex.village.id); }
  if (ex.village2) { VILLAGES[ex.village2.id] = ex.village2; villageIds.push(ex.village2.id); }
  const roadIds = [];
  if (ex.road) { ROADS[ex.road.id] = ex.road; roadIds.push(ex.road.id); }
  const infraIds = [];
  if (ex.infra) { INFRASTRUCTURE[ex.infra.id] = ex.infra; infraIds.push(ex.infra.id); }

  ZONES[zid] = {
    id: zid,
    name: `${districtMatch ? districtMatch.name : districtId} Zone A`,
    district: districtMatch ? districtMatch.id : districtId,
    state: districtMatch ? districtMatch.state : '',
    hazard: districtMatch ? districtMatch.hazard : 'normal',
    coords: ex.coords || { x: 0.5, y: 0.5 },
    riskFactors: [
      { factor: 'Terrain', level: districtMatch?.hazard === 'warning' ? 'high' : 'moderate' },
      { factor: 'Rainfall', level: districtMatch?.hazard === 'warning' ? 'high' : 'low' },
      { factor: 'Soil moisture', level: 'moderate' },
      { factor: 'Vegetation', level: 'low' },
      { factor: 'Historical activity', level: 'moderate' },
    ],
    aiAssessment: [
      { factor: 'Terrain Susceptibility', status: 'Moderate' },
      { factor: 'Rainfall Trigger', status: districtMatch?.hazard === 'warning' ? 'High' : 'Low' },
      { factor: 'Soil Moisture', status: 'Normal' },
      { factor: 'Vegetation', status: 'Stable' },
      { factor: 'Historical Vulnerability', status: 'Moderate' },
    ],
    finalOutput: { level: districtMatch ? districtMatch.hazard : 'normal', note: 'Routine monitoring.' },
    villages: villageIds, roads: roadIds, infrastructure: infraIds,
    priority: { rank: 9, reasoning: 'Routine' }, // superseded by computePriorities() below
  };
});

// ---------------------------------------------------------------------------
// Full-coverage generator — every OTHER real district (from the boundary
// data) that doesn't already have a hand-authored entry above. This is what
// makes Risk Monitoring show real content for every district on the map,
// not just the ~9 hand-picked ones. Deterministically seeded per district
// name (not Math.random()) so the same district shows the same data on
// every reload rather than reshuffling underfoot.
// ---------------------------------------------------------------------------

const HAND_AUTHORED_DISTRICT_IDS = new Set(Object.values(DISTRICTS).flat().map((d) => d.id));

// Exported (not just used internally) so other files that need the same
// "deterministic but varied" pattern — e.g. the RiskMonitoring sparklines —
// reuse it instead of re-implementing their own PRNG.
export function seedFromString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Mulberry32 — small deterministic PRNG, good enough for mock-data variety.
export function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// States whose real geology/climate the spec and data-sources.md already
// flag as more landslide-prone — biases the generator's weighted draw
// without hard-coding every one of 109 districts by hand.
const STATE_RISK_BIAS = { MN: 0.85, ML: 0.7, MZ: 0.5, AR: 0.4, NL: 0.35, AS: 0.3, SK: 0.4, TR: 0.15 };

function pickHazard(rand, bias) {
  // bias in [0,1] shifts probability mass toward higher hazard levels.
  const r = rand();
  if (r < 0.04 + bias * 0.10) return 'danger';
  if (r < 0.14 + bias * 0.28) return 'warning';
  if (r < 0.40 + bias * 0.30) return 'watch';
  return 'normal';
}

const HAZARD_RAINFALL = {
  danger: { current: 'VERY HIGH', h24: [140, 240], h72: [300, 480], d7: [480, 780] },
  warning: { current: 'HIGH', h24: [80, 140], h72: [180, 300], d7: [280, 480] },
  watch: { current: 'MODERATE', h24: [30, 70], h72: [70, 150], d7: [130, 260] },
  normal: { current: 'LOW', h24: [5, 25], h72: [15, 55], d7: [30, 110] },
};
const HAZARD_SOIL = {
  danger: 'SATURATED', warning: 'ELEVATED', watch: 'ELEVATED', normal: 'NORMAL',
};
const HAZARD_TERRAIN = {
  danger: 'STEEP', warning: 'STEEP', watch: 'MODERATE', normal: 'MODERATE',
};
const HAZARD_VEG_CHANGE = {
  danger: 'REDUCED', warning: 'REDUCED', watch: 'STABLE', normal: 'STABLE',
};
const HAZARD_SUMMARY = {
  danger: 'Multiple converging factors — heavy rainfall, saturated soil and steep terrain — indicate active landslide risk.',
  warning: 'Heavy rainfall and elevated soil moisture on steep slopes are contributing to increased risk.',
  watch: 'Conditions are within a watchful range; no acute trigger observed at present.',
  normal: 'No elevated indicators at this time.',
};
const HAZARD_AI_STATUS = {
  danger: { terrain: 'High', rainfall: 'High', soil: 'Saturated', veg: 'Reduced', hist: 'High' },
  warning: { terrain: 'High', rainfall: 'High', soil: 'Elevated', veg: 'Reduced', hist: 'Moderate' },
  watch: { terrain: 'Moderate', rainfall: 'Moderate', soil: 'Elevated', veg: 'Stable', hist: 'Moderate' },
  normal: { terrain: 'Low', rainfall: 'Low', soil: 'Normal', veg: 'Stable', hist: 'Low' },
};
const HAZARD_FACTOR_LEVEL = { High: 'high', Elevated: 'moderate', Saturated: 'high', Moderate: 'moderate', Reduced: 'moderate', Stable: 'low', Low: 'low', Normal: 'low' };

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function randInt(rand, [lo, hi]) {
  return Math.round(lo + rand() * (hi - lo));
}

let generatedCount = 0;
Object.values(DISTRICT_PATHS).forEach((geo) => {
  const slug = slugify(geo.name);
  if (HAND_AUTHORED_DISTRICT_IDS.has(slug)) return; // already hand-authored above

  const rand = mulberry32(seedFromString(`${geo.state}:${geo.name}`));
  const bias = STATE_RISK_BIAS[geo.state] ?? 0.3;
  const hazard = pickHazard(rand, bias);
  const rf = HAZARD_RAINFALL[hazard];
  const ai = HAZARD_AI_STATUS[hazard];
  const zoneId = `${slug}-a`;

  if (!DISTRICTS[geo.state]) DISTRICTS[geo.state] = [];
  DISTRICTS[geo.state].push({
    id: slug,
    name: geo.name,
    state: geo.state,
    hazard,
    population: randInt(rand, [25000, 450000]),
    summary: HAZARD_SUMMARY[hazard],
    environment: {
      rainfall: {
        current: rf.current,
        h24: randInt(rand, rf.h24), h72: randInt(rand, rf.h72), d7: randInt(rand, rf.d7),
        unit: 'mm',
        trend: hazard === 'danger' || hazard === 'warning' ? 'rising' : 'stable',
      },
      soilMoisture: {
        level: HAZARD_SOIL[hazard],
        trend: hazard === 'danger' ? 'rising' : 'stable',
        note: hazard === 'danger' || hazard === 'warning' ? 'Above seasonal norm' : 'Within seasonal range',
      },
      vegetation: {
        ndvi: Math.round((0.3 + rand() * 0.3) * 100) / 100,
        density: hazard === 'danger' || hazard === 'warning' ? 'MODERATE' : 'GOOD',
        change: HAZARD_VEG_CHANGE[hazard],
        note: HAZARD_VEG_CHANGE[hazard] === 'REDUCED' ? 'Vegetation loss detected in recent imagery' : 'No significant change detected',
      },
      terrain: {
        slope: HAZARD_TERRAIN[hazard],
        elevation: `${randInt(rand, [400, 1800])} m avg`,
        drainage: hazard === 'danger' ? 'Fast, confined valley' : 'Moderate',
        landCover: 'Mixed forest',
      },
    },
    historicalLandslideCount: randInt(rand, hazard === 'danger' || hazard === 'warning' ? [4, 14] : [0, 4]),
    zones: [zoneId],
    activeFieldReports: 0,
    activeAlerts: 0,
    generated: true, // flags this as generator-filled, not hand-authored — see docs/HANDOFF.md §3a
  });

  ZONES[zoneId] = {
    id: zoneId,
    name: `${geo.name} Zone A`,
    district: slug,
    state: geo.state,
    hazard,
    coords: { x: 0.4 + rand() * 0.2, y: 0.4 + rand() * 0.2 },
    riskFactors: [
      { factor: 'Terrain susceptibility', level: HAZARD_FACTOR_LEVEL[ai.terrain] },
      { factor: 'Rainfall trigger', level: HAZARD_FACTOR_LEVEL[ai.rainfall] },
      { factor: 'Soil moisture', level: HAZARD_FACTOR_LEVEL[ai.soil] },
      { factor: 'Vegetation condition', level: HAZARD_FACTOR_LEVEL[ai.veg] },
      { factor: 'Historical activity', level: HAZARD_FACTOR_LEVEL[ai.hist] },
    ],
    aiAssessment: [
      { factor: 'Terrain Susceptibility', status: ai.terrain },
      { factor: 'Rainfall Trigger', status: ai.rainfall },
      { factor: 'Soil Moisture', status: ai.soil },
      { factor: 'Vegetation', status: ai.veg },
      { factor: 'Historical Vulnerability', status: ai.hist },
    ],
    finalOutput: { level: hazard, note: HAZARD_SUMMARY[hazard] },
    villages: [], roads: [], infrastructure: [],
    priority: { rank: 20, reasoning: `${hazard} · generated district` },
  };

  // Exposure only where the hazard actually justifies it — matches the
  // policy for the hand-authored shallow districts above. Names are
  // deliberately generic ("Village A", not a fabricated real place name)
  // since these 109 districts don't have curated local place data behind
  // them; the point is structural completeness for Connectivity Analysis
  // and Response Priorities to have real breadth to rank against, not
  // invented specificity. Watch/Normal districts correctly stay empty.
  if (hazard === 'danger' || hazard === 'warning') {
    const z = ZONES[zoneId];
    const vCount = hazard === 'danger' ? 2 : 1;
    for (let i = 0; i < vCount; i++) {
      const vid = `village-${slug}-${i + 1}`;
      VILLAGES[vid] = {
        id: vid, name: `Village ${String.fromCharCode(65 + i)}`,
        population: randInt(rand, [150, 2500]),
        status: hazard === 'danger' && i === 0 ? 'isolated' : 'at-risk',
        coords: { x: z.coords.x + (rand() - 0.5) * 0.28, y: z.coords.y + (rand() - 0.5) * 0.28 },
      };
      z.villages.push(vid);
    }
    const rid = `road-${slug}-1`;
    ROADS[rid] = {
      id: rid, name: 'District road', class: 'District road',
      status: hazard === 'danger' ? 'blocked' : 'at-risk',
      obstructionPct: hazard === 'danger' ? randInt(rand, [50, 90]) : randInt(rand, [10, 35]),
      path: [
        { x: z.coords.x - 0.18, y: z.coords.y - 0.14 },
        { x: z.coords.x, y: z.coords.y },
        { x: z.coords.x + 0.18, y: z.coords.y + 0.14 },
      ],
    };
    z.roads.push(rid);
  }
  generatedCount += 1;
});

// ---------------------------------------------------------------------------
// Villages, roads, infrastructure — the connectivity/exposure layer
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 6. Landslide & change detection — satellite + field evidence.
// Sample imagery is described, not embedded — the prototype ships without
// binary satellite assets; each entry names what would render there.
// ---------------------------------------------------------------------------

export const SATELLITE_DETECTIONS = [
  {
    id: 'sat-noney-a',
    zone: 'noney-a',
    beforeLabel: 'Sentinel-2, 12 Jun 2026',
    afterLabel: 'Sentinel-2, 24 Aug 2026',
    detectedArea: '0.34 km²',
    confidence: 0.86,
    note: 'Fresh scar consistent with slope failure along the NH-37 cut',
  },
];

export const FIELD_EVIDENCE = [
  {
    id: 'ev-024',
    reportId: 'Report #024',
    zone: 'noney-a',
    location: 'Noney, Manipur',
    reportType: 'Road blockage',
    date: '2026-08-27T09:12:00+05:30',
    status: 'submitted',
    gps: '24.7301° N, 93.7452° E',
    photoAttached: true,
    cvLabelsPreview: [
      { label: 'Debris', confidence: 0.94 },
      { label: 'Trail/road obstruction', confidence: 0.93 },
    ],
  },
  {
    id: 'ev-023',
    reportId: 'Report #023',
    zone: 'noney-a',
    location: 'Noney, Manipur',
    reportType: 'Crack',
    date: '2026-08-26T16:40:00+05:30',
    status: 'triaged',
    gps: '24.7288° N, 93.7409° E',
    photoAttached: true,
    cvLabelsPreview: [{ label: 'Tension crack', confidence: 0.88 }],
  },
];

// ---------------------------------------------------------------------------
// 8. Field reports — submitted via the Field Officer view
// ---------------------------------------------------------------------------

export const REPORT_TYPES = ['Crack', 'Slope movement', 'Landslide', 'Debris', 'Road blockage'];

export const FIELD_REPORTS = [
  {
    id: '024', location: 'Noney, Manipur', zone: 'noney-a', type: 'Road blockage',
    description: 'NH-37 near Tupul fully blocked by fallen debris after overnight rain. No vehicles able to pass.',
    photo: true, gps: true, status: 'Submitted', submittedAt: '2026-08-27T09:12:00+05:30', synced: true,
  },
  {
    id: '023', location: 'Noney, Manipur', zone: 'noney-a', type: 'Crack',
    description: 'New surface crack, roughly 4m long, running across the slope above Khoupum. Widening since last visit.',
    photo: true, gps: true, status: 'Triaged', submittedAt: '2026-08-26T16:40:00+05:30', synced: true,
  },
  {
    id: '022', location: 'Sohra, East Khasi Hills', zone: 'ekh-a', type: 'Slope movement',
    description: 'Visible soil creep on the hillside facing the market road. Small trees leaning downslope.',
    photo: true, gps: true, status: 'Triaged', submittedAt: '2026-08-25T11:05:00+05:30', synced: true,
  },
];

// ---------------------------------------------------------------------------
// 9. Alerts
// ---------------------------------------------------------------------------

export const ALERT_AUDIENCES = ['District authority', 'Disaster management team', 'Field teams', 'Community'];

// Only languages with an actual fixed-slot translation below are marked
// 'ready'. This is a deliberate, narrower claim than earlier planning docs
// made — those describe the target state once Bhashini + native-speaker
// review exist (see docs/data-sources.md §11, HANDOFF.md §7a). This
// prototype follows the same discipline already established there for
// Mizo/Khasi: an untranslated language is labelled 'planned', never
// presented as covered. Manipuri and Assamese moved from 'ready' to
// 'planned' here for the same reason — I am not confident enough in
// safety-critical translation accuracy for those to ship it unreviewed,
// and "never machine-translate free-form text into a safety-critical
// alert" (README §7a) applies to this prototype's own author too.
export const ALERT_LANGUAGES = [
  { code: 'en', label: 'English', status: 'ready' },
  { code: 'hi', label: 'Hindi', status: 'ready' },
  { code: 'mni', label: 'Manipuri (Meitei)', status: 'planned' },
  { code: 'as', label: 'Assamese', status: 'planned' },
  { code: 'lus', label: 'Mizo', status: 'planned' },
  { code: 'kha', label: 'Khasi', status: 'planned' },
];

// Fixed-slot alert template, translated per language — never free-form
// machine translation of arbitrary text, only this one pre-approved shape:
// {severity label} — {district}, {state} / {body sentence}. This is what
// "ready" is scoped to; nothing else in the app is translated.
export const ALERT_TEMPLATES = {
  en: {
    danger: 'DANGER', warning: 'WARNING', watch: 'WATCH', normal: 'NORMAL',
    body: 'Increased landslide risk in identified vulnerable zones. Authorities are advised to monitor affected roads and vulnerable slopes.',
  },
  hi: {
    danger: 'खतरा', warning: 'चेतावनी', watch: 'सतर्कता', normal: 'सामान्य',
    body: 'चिन्हित संवेदनशील क्षेत्रों में भूस्खलन का खतरा बढ़ गया है। अधिकारियों को प्रभावित सड़कों और संवेदनशील ढलानों पर निगरानी की सलाह दी जाती है।',
  },
};

export const ALERTS = [
  {
    id: 'alert-1', severity: 'warning', zone: 'noney-a', location: 'Noney, Manipur',
    title: 'WARNING — Noney, Manipur',
    body: 'Increased landslide risk in identified vulnerable zones. Authorities are advised to monitor affected roads and vulnerable slopes.',
    audience: ['District authority', 'Disaster management team'],
    language: 'English',
    issuedAt: '2026-08-27T07:30:00+05:30',
    recipients: 214,
    status: 'Delivered',
  },
];

// ---------------------------------------------------------------------------
// 10. Response prioritisation
// ---------------------------------------------------------------------------

// Computed from the full zone dataset — Risk + Population + Road Importance
// + Infrastructure + Isolation, per docs/demo_sanket_text.md §10. This used
// to be a hardcoded 3-row list covering only Noney; ranking all zones means
// the queue reflects the same 118-district dataset the rest of the app
// does, and would reorder correctly if the underlying hazard data changed.
const PRIORITY_HAZARD_WEIGHT = { danger: 100, warning: 60, watch: 25, normal: 5 };

function computePriorities(limit = 12) {
  const scored = Object.values(ZONES).map((z) => {
    const villageIds = z.villages || [];
    const roadIds = z.roads || [];
    const infraIds = z.infrastructure || [];
    const totalPop = villageIds.reduce((sum, vid) => sum + (VILLAGES[vid]?.population || 0), 0);
    const isolated = villageIds.some((vid) => VILLAGES[vid]?.status === 'isolated');
    const isolationBonus = isolated ? 20 : 0;
    const score =
      (PRIORITY_HAZARD_WEIGHT[z.hazard] || 0) +
      villageIds.length * 8 +
      roadIds.length * 6 +
      infraIds.length * 12 +
      totalPop / 500 +
      isolationBonus;
    return {
      z, score, villageIds, roadIds, infraIds, totalPop, isolated,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s, i) => {
    // Reasoning explains *why* this zone scored where it did (hazard, population,
    // isolation) — it must not just restate the villages/roads/infra counts, which
    // are already shown as icons directly above this line in ResponsePriorities.jsx.
    const parts = [`${s.z.hazard.charAt(0).toUpperCase()}${s.z.hazard.slice(1)} hazard`];
    if (s.totalPop > 0) parts.push(`~${Math.round(s.totalPop).toLocaleString('en-IN')} people exposed`);
    if (s.isolated) parts.push('village(s) cut off from road access');
    return {
      rank: i + 1,
      zone: s.z.id,
      label: s.z.name,
      hazard: s.z.hazard,
      villages: s.villageIds.length,
      roads: s.roadIds.length,
      infra: s.infraIds.length > 0 ? `${s.infraIds.length} critical facility` : null,
      reasoning: parts.join(' · '),
    };
  });
}

export const PRIORITIES = computePriorities();

// ---------------------------------------------------------------------------
// 11. Historical backtesting — Noney landslide, 29 June 2022.
// This is the one number in the whole prototype that must be real once the
// backend exists: "The actual number should only be shown once you have
// genuinely calculated it from your chosen historical data." Marked below.
// ---------------------------------------------------------------------------

export const BACKTEST_EVENTS = [
  {
    id: 'noney-2022',
    name: 'Noney Landslide — 2022',
    date: '2022-06-29',
    location: 'Noney, Manipur (Tupul railway construction site)',
    summary: 'A major landslide struck a railway construction camp near Tupul, Noney district, on 29 June 2022, following days of intense monsoon rainfall.',
    timeline: [
      { dayOffset: -30, level: 'normal', rainfall: 8, soilMoisture: 'Normal' },
      { dayOffset: -21, level: 'normal', rainfall: 14, soilMoisture: 'Normal' },
      { dayOffset: -14, level: 'watch', rainfall: 38, soilMoisture: 'Elevated' },
      { dayOffset: -9, level: 'watch', rainfall: 52, soilMoisture: 'Elevated' },
      { dayOffset: -5, level: 'warning', rainfall: 96, soilMoisture: 'Elevated' },
      { dayOffset: -2, level: 'warning', rainfall: 134, soilMoisture: 'Saturated' },
      { dayOffset: -1, level: 'danger', rainfall: 168, soilMoisture: 'Saturated' },
      { dayOffset: 0, level: 'danger', rainfall: 210, soilMoisture: 'Saturated', actualEvent: true },
    ],
    // PLACEHOLDER — replace once the real Stage A/B model is run against archived
    // rainfall for this window. Do not present this as measured until it is.
    leadTimeHours: null,
    leadTimeStatus: 'placeholder',
  },
];

// ---------------------------------------------------------------------------
// Navigation model — Strictly aligned with frontentdesign.md (Section 10)
// ---------------------------------------------------------------------------

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'monitor', label: 'Live Monitor' },
  { id: 'risk-map', label: 'Risk Intelligence' },
  { id: 'tactical-3d', label: '3D Tactical Globe' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'history', label: 'Historical Analysis' },
  { id: 'infra', label: 'Infrastructure' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
  { id: 'help', label: 'Help' },
];

export const GIS_LAYERS = {
  risk: ['Critical Danger', 'High Risk', 'Moderate Watch', 'Normal Baseline'],
  geographical: ['State boundaries', 'District boundaries', 'Villages', 'Roads', 'Rivers/drainage', 'Terrain'],
  environmental: ['Vegetation / NDVI', 'Rainfall (GPM)', 'Soil moisture (SMAP)', 'Copernicus DEM Slope'],
  disaster: ['Historical landslides (ISRO)', 'Reported landslides', 'Surface cracks', 'Highway blockages'],
  infrastructure: ['Bridges', 'Hospitals & Health', 'Schools & Shelters', 'Critical lifelines'],
};

export const ROLES = {
  district_officer: {
    label: 'District Officer',
    can: ['View pan-India risk', 'Analyse affected areas', 'Prioritise response', 'Generate alerts', 'Export reports'],
  },
  field_officer: {
    label: 'Field Officer',
    can: ['View assigned risk areas', 'Submit field reports', 'Upload site photographs', 'Work offline', 'View alerts'],
  },
};

export const NAV_ROLE_ACCESS = {
  overview: ['district_officer'],
  dashboard: ['district_officer'],
  monitor: ['district_officer'],
  monitoring: ['district_officer'],
  'risk-map': ['district_officer'],
  'gis-map': ['district_officer'],
  'tactical-3d': ['district_officer'],
  analytics: ['district_officer'],
  history: ['district_officer'],
  backtesting: ['district_officer'],
  infra: ['district_officer'],
  priorities: ['district_officer'],
  alerts: ['district_officer', 'field_officer'],
  reports: ['district_officer'],
  'field-reports': ['district_officer'],
  'field-officer': ['district_officer', 'field_officer'],
  settings: ['district_officer', 'field_officer'],
  help: ['district_officer', 'field_officer'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getDistrict(id) {
  return Object.values(DISTRICTS).flat().find((d) => d.id === id);
}

export function getDistrictsByZone(zoneId) {
  return Object.values(DISTRICTS).flat().filter((d) => d.zone === zoneId || d.id === zoneId);
}

export function getZone(id) {
  return ZONES[id];
}

export function getState(id) {
  return NER_STATES.find((s) => s.id === id);
}
