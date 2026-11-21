// SANKET route table: the single source of truth for URLs, page titles, the sidebar and role access.
//
// Every page has one canonical id and one path (/overview, /monitor, ...). Pages that show one district
// keep it in the URL (?district=chamoli), so a refresh, the Back button and a shared link all land on
// the same view. Old ids (previous tab names, bookmarks) are listed in ALIASES and redirect.

export const DISTRICT = 'district_officer';
export const FIELD = 'field_officer';
export const ADMIN = 'admin';
const ALL = [DISTRICT, FIELD];

export const ROUTES = [
  // Public, full screen (no sidebar)
  { id: 'home',    path: '/',              title: 'Home',                 public: true, hidden: true },
  { id: 'login',   path: '/login',         title: 'Sign in',              public: true, hidden: true },
  { id: 'signup',  path: '/signup',        title: 'Create account',       public: true, hidden: true },
  { id: 'pending', path: '/pending',       title: 'Waiting for approval', public: true, hidden: true },
  { id: 'auth-callback', path: '/auth/callback', title: 'Signing in',     public: true, hidden: true },
  // Signed-in app (sidebar + top bar)
  { id: 'overview',      path: '/overview',      label: 'Overview',            title: 'Overview',            roles: [DISTRICT], district: true },
  { id: 'monitor',       path: '/monitor',       label: 'Live Monitor',        title: 'Live Monitor',        roles: [DISTRICT], district: true },
  { id: 'tactical-3d',   path: '/tactical-3d',   label: '3D Tactical Globe',   title: '3D Tactical Globe',   roles: [DISTRICT] },
  { id: 'history',       path: '/history',       label: 'Historical Analysis', title: 'Historical Analysis', roles: [DISTRICT] },
  { id: 'infra',         path: '/infra',         label: 'Infrastructure',      title: 'Infrastructure',      roles: [DISTRICT], district: true },
  { id: 'road-blockage', path: '/road-blockage', label: 'Road Blockage',       title: 'Road Blockage',       roles: ALL },
  { id: 'alerts',        path: '/alerts',        label: 'Alerts',              title: 'Alerts',              roles: ALL },
  { id: 'reports',       path: '/reports',       label: 'Reports',             title: 'Reports',             roles: [DISTRICT], district: true },
  { id: 'data-model',    path: '/data-model',    label: 'Data & Model',        title: 'Data & Model',        roles: ALL },
  // Reached from the bottom of the sidebar, not the main list
  { id: 'field-officer', path: '/field-officer', label: 'Field Officer View',  title: 'Field Officer',       roles: ALL, hidden: true },
  { id: 'admin',         path: '/admin',         label: 'Admin',               title: 'Admin',               roles: [ADMIN], hidden: true },
];

// legacy id -> canonical id (old tab names and bookmarks keep working)
export const ALIASES = {
  dashboard: 'overview',
  monitoring: 'monitor',
  'risk-map': 'overview',
  'gis-map': 'overview',
  analytics: 'monitor',
  backtesting: 'history',
  priorities: 'infra',
  'field-reports': 'alerts',
  settings: 'data-model',
  help: 'data-model',
};

export const APP_ROUTES = ROUTES.filter((r) => !r.public);
export const NAV_ITEMS = ROUTES.filter((r) => !r.hidden);
export const DEFAULT_ROUTE = { [DISTRICT]: 'overview', [FIELD]: 'field-officer', [ADMIN]: 'overview' };

const BY_ID = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
const BY_PATH = Object.fromEntries(ROUTES.map((r) => [r.path, r]));

/** Canonical route id for an id, alias or old "#hash" link, or null. */
export function resolveRoute(id) {
  if (!id) return null;
  const clean = String(id).replace(/^#?\/?/, '').split(/[?#/]/)[0].trim();
  const canonical = ALIASES[clean] || clean;
  return BY_ID[canonical] ? canonical : null;
}

export function getRoute(id) {
  return BY_ID[resolveRoute(id)] || null;
}

/** The route a URL path belongs to (trailing slash ignored), or null for unknown paths. */
export function routeForPath(pathname) {
  const p = (pathname || '/').replace(/\/+$/, '') || '/';
  return BY_PATH[p] || null;
}

/** URL for a page; the district is kept only on pages that show one district. */
export function pathFor(id, { districtId } = {}) {
  const r = getRoute(id);
  if (!r) return '/';
  return r.district && districtId ? `${r.path}?district=${encodeURIComponent(districtId)}` : r.path;
}

export function canAccess(id, role) {
  const r = getRoute(id);
  if (!r) return false;
  if (r.public) return true;
  return role === ADMIN || r.roles.includes(role);
}

export function isPublic(id) {
  return !!getRoute(id)?.public;
}

/** A "return to" path from a URL (?next=...) is used only if it stays on this site. */
export function safeNext(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  return next;
}

/** Where to send someone right after sign-in: back to the page they asked for, if their role allows it. */
export function landingPath(profile, next) {
  if (!profile || profile.status !== 'active') return '/pending';
  const want = safeNext(next);
  const r = want && routeForPath(want.split(/[?#]/)[0]);
  if (r && !r.public && canAccess(r.id, profile.role)) return want;
  return pathFor(DEFAULT_ROUTE[profile.role] || 'overview');
}

export function routeTitle(id) {
  return getRoute(id)?.title || 'SANKET';
}
