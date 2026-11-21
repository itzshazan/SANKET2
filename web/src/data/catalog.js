// Static configuration only: labels, roles, alert wording. No hazard values, no
// measurements and no district data live here. Those come from the backend API.

export const HAZARD_LEVELS = ['normal', 'watch', 'warning', 'danger'];

export const HAZARD_META = {
  unknown: { label: 'NO DATA', action: 'Check data sources' },
  normal: { label: 'NORMAL', action: 'Monitor' },
  watch: { label: 'WATCH', action: 'Inform local officials' },
  warning: { label: 'WARNING', action: 'Alert community, pre-position' },
  danger: { label: 'DANGER', action: 'Evacuate / close road' },
};

export const HAZARD_COLOR = {
  unknown: '#64726F',
  normal: '#1F9D55',
  watch: '#C9971F',
  warning: '#E5600A',
  danger: '#B42318',
};

export const SEVERITY = { unknown: -1, normal: 0, watch: 1, warning: 2, danger: 3 };

export const REGIONS = ['North-Western Himalayas', 'Western Ghats', 'North-Eastern Region'];

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

export const REPORT_TYPES = ['Crack', 'Slope movement', 'Landslide', 'Debris', 'Road blockage'];

export const ALERT_AUDIENCES = ['District authority', 'Disaster management team', 'Field teams', 'Community'];

// Only languages with a reviewed fixed-slot translation are 'ready'.
export const ALERT_LANGUAGES = [
  { code: 'en', label: 'English', status: 'ready' },
  { code: 'hi', label: 'Hindi', status: 'ready' },
  { code: 'mni', label: 'Manipuri (Meitei)', status: 'planned' },
  { code: 'as', label: 'Assamese', status: 'planned' },
  { code: 'lus', label: 'Mizo', status: 'planned' },
  { code: 'kha', label: 'Khasi', status: 'planned' },
];

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

// Formatting helpers shared by the views
export const fmt = (v, digits = 1, unit = '') =>
  (typeof v === 'number' && Number.isFinite(v) ? `${v.toFixed(digits)}${unit}` : '—');

export const ratioText = (r) => (typeof r === 'number' ? `${r.toFixed(2)}× threshold` : 'no data');

export function ageText(minutes) {
  if (!minutes) return 'just now';
  if (minutes < 60) return `${minutes} min old`;
  return `${Math.round(minutes / 60)} h old`;
}

// "Abraham, M.T., Pothuraju, D. & Satyam, N. (2019). Title…" -> "Abraham et al. 2019"
export function shortCite(c) {
  if (!c) return '';
  const year = (c.match(/\((\d{4})\)/) || [])[1] || '';
  const authors = c.split('(')[0];
  const first = authors.split(',')[0].trim();
  const commas = (authors.match(/,/g) || []).length;
  if (commas > 2) return `${first} et al. ${year}`.trim();
  const second = authors.includes('&') ? authors.split('&')[1].split(',')[0].trim() : '';
  return `${first}${second ? ` & ${second}` : ''} ${year}`.trim();
}

// SANKET colour theme (from doctorrating.in) for charts and inline styles; CSS uses the same values.
export const THEME = {
  forest: '#013126', teal: '#028C74', tealDark: '#03705E', tealLight: '#BFE5D0', mint: '#58EDA2',
  sand: '#E2DBD2', stone: '#CDC5B9', grey: '#64726F', orange: '#FA5D00',
};
