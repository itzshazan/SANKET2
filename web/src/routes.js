// SANKET route table — the single source of truth for navigation.
//
// Every view has exactly ONE canonical id. Old/alternate ids that were used in
// different places (demo steps, goTo() calls, bookmarks) are listed in ALIASES
// and resolved in one place, so the sidebar, page title, role access and URL
// hash can never disagree with each other.

export const DISTRICT = 'district_officer';
export const FIELD = 'field_officer';

export const ROUTES = [
  { id: 'overview',    label: 'Overview',            title: 'Overview / Command Center',               roles: [DISTRICT] },
  { id: 'monitor',     label: 'Live Monitor',        title: 'Live Environmental Monitor',              roles: [DISTRICT] },
  { id: 'risk-map',    label: 'Risk Intelligence',   title: 'Risk Intelligence Map',                   roles: [DISTRICT] },
  { id: 'tactical-3d', label: '3D Tactical Globe',   title: "3D Tactical Globe (God's Eye View)",      roles: [DISTRICT] },
  { id: 'analytics',   label: 'Analytics',           title: 'Environmental Analytics',                 roles: [DISTRICT] },
  { id: 'history',     label: 'Historical Analysis', title: 'Historical Analysis & Backtesting',       roles: [DISTRICT] },
  { id: 'infra',       label: 'Infrastructure',      title: 'Infrastructure Intelligence',             roles: [DISTRICT] },
  { id: 'alerts',      label: 'Alerts',              title: 'Alerts & Incident Center',                roles: [DISTRICT, FIELD] },
  { id: 'reports',     label: 'Reports',             title: 'Intelligence Reports & Dossiers',         roles: [DISTRICT] },
  { id: 'settings',    label: 'Settings',            title: 'System Settings & Integrations',          roles: [DISTRICT, FIELD] },
  { id: 'help',        label: 'Help',                title: 'Help & Operational User Guide',           roles: [DISTRICT, FIELD] },
  // Not listed in the main nav list — reached through the "Field Officer View" button.
  { id: 'field-officer', label: 'Field Officer View', title: 'Field Officer — Report Submission',     roles: [DISTRICT, FIELD], hidden: true },
];

// legacy id -> canonical id
export const ALIASES = {
  dashboard: 'overview',
  monitoring: 'monitor',
  'gis-map': 'risk-map',
  backtesting: 'history',
  priorities: 'infra',
  'field-reports': 'reports',
};

export const NAV_ITEMS = ROUTES.filter((r) => !r.hidden);

const BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r]));

export const DEFAULT_ROUTE = { [DISTRICT]: 'overview', [FIELD]: 'field-officer' };

/** Returns the canonical route id for any id/alias, or null if unknown. */
export function resolveRoute(id) {
  if (!id) return null;
  const clean = String(id).replace(/^#\/?/, '').split(/[?/]/)[0].trim();
  const canonical = ALIASES[clean] || clean;
  return BY_ID[canonical] ? canonical : null;
}

export function getRoute(id) {
  return BY_ID[resolveRoute(id)] || null;
}

export function canAccess(id, role) {
  const r = getRoute(id);
  return !!r && r.roles.includes(role);
}

export function routeTitle(id) {
  return getRoute(id)?.title || 'SANKET Early Warning';
}
