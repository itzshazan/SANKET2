// SANKET Selection State Management
// Handles spatial focus (state, district, zone) and breadcrumb derivation.

import { getState, getDistrict, getZone } from '../data/mockData.js';

export const INITIAL_SELECTION = {
  stateId: 'MN',
  districtId: 'noney',
  zoneId: 'noney-a',
};

export function createSelection(stateId, districtId = null, zoneId = null) {
  return { stateId, districtId, zoneId };
}

export function computeBreadcrumbs(selection, view) {
  const crumbs = ['NER'];
  const s = getState(selection.stateId);
  if (s) crumbs.push(s.name);

  if (selection.districtId) {
    const d = getDistrict(selection.districtId);
    if (d) crumbs.push(d.name);
  }

  if (selection.zoneId && view !== 'dashboard') {
    const z = getZone(selection.zoneId);
    if (z) crumbs.push(z.name);
  }

  return crumbs;
}

export function updateSpatialSelection(prev, partial) {
  const next = { ...prev, ...partial };
  if (partial.districtId && !partial.stateId) {
    const d = getDistrict(partial.districtId);
    if (d) next.stateId = d.state;
  }
  if (partial.zoneId && (!partial.districtId || !partial.stateId)) {
    const z = getZone(partial.zoneId);
    if (z) {
      next.districtId = z.district;
      next.stateId = z.state;
    }
  }
  return next;
}
