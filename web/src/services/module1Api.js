// SANKET Module 1 API client.
// No mock fallbacks: when the backend is unreachable every method resolves to null and the
// views show "data unavailable". Real-data fallbacks (last real reading, flagged stale) are
// handled by the backend, which marks every value live / stale / unavailable.

import apiClient, { wakeServer } from './apiClient.js';
import { getAccessToken } from '../auth/token.js';

const API = '/api/v1/module1';

async function safe(promise) {
  try {
    return await promise;
  } catch (err) {
    console.warn('SANKET API:', err?.message || err);
    return null;
  }
}

export const module1Api = {
  checkHealth: () => safe(apiClient.get(`${API}/health`, { timeoutMs: 4000 })),
  getDataSources: () => safe(apiClient.get(`${API}/data-sources`, { timeoutMs: 6000 })),
  getModelCard: () => safe(apiClient.get(`${API}/model`, { timeoutMs: 8000 })),
  getThresholds: () => safe(apiClient.get(`${API}/thresholds`, { timeoutMs: 6000 })),

  getDistricts: () => safe(apiClient.get(`${API}/districts`, { timeoutMs: 8000 })),
  getDistrictsLive: (force = false) =>
    safe(apiClient.get(`${API}/districts-live${force ? '?force_refresh=true' : ''}`, { timeoutMs: 90000 })),
  getDistrictDetail: (id) => safe(apiClient.get(`${API}/districts/${encodeURIComponent(id)}`, { timeoutMs: 120000 })),
  getDashboardSummary: () => safe(apiClient.get(`${API}/dashboard-summary`, { timeoutMs: 90000 })),

  /** Full telemetry for any point (rain, soil, terrain from GLO-30, NDVI, threshold evaluation). */
  getEnvironment: (lat, lon) => safe(apiClient.get(`${API}/environment?lat=${lat}&lon=${lon}`, { timeoutMs: 120000 })),
  /** Faster point evaluation for map clicks (no NDVI). */
  predictPoint: (lat, lon, zoneId) =>
    safe(apiClient.post(`${API}/predict`, { latitude: lat, longitude: lon, zone_id: zoneId || null }, { timeoutMs: 90000 })),

  getTimeseries: (lat, lon, days = 14, state = null) =>
    safe(apiClient.get(`${API}/timeseries?lat=${lat}&lon=${lon}&days=${days}${state ? `&state=${encodeURIComponent(state)}` : ''}`, { timeoutMs: 30000 })),
  getHistoryEvents: ({ throwOnError = false } = {}) => {
    const request = apiClient.get(`${API}/history/events`, { timeoutMs: 8000 });
    return throwOnError ? request : safe(request);
  },
  getHistoryEvent: (id) => safe(apiClient.get(`${API}/history/events/${encodeURIComponent(id)}`, { timeoutMs: 60000 })),

  getInfrastructure(lat, lon, district = null, radiusKm = 6.0, forceRefresh = false) {
    const p = new URLSearchParams({ lat: String(lat), lon: String(lon), radius_km: String(radiusKm), force_refresh: forceRefresh ? 'true' : 'false' });
    if (district) p.append('district', district);
    return safe(apiClient.get(`${API}/infrastructure?${p.toString()}`, { timeoutMs: 90000 }));
  },

  // Persistent field reports and incidents (SQLite)
  listFieldReports: () => safe(apiClient.get(`${API}/field-reports`, { timeoutMs: 5000 })),
  submitFieldReport: (report) => safe(apiClient.post(`${API}/field-reports`, report, { timeoutMs: 8000 })),
  listIncidents: () => safe(apiClient.get(`${API}/incidents`, { timeoutMs: 5000 })),
  saveIncident: (incident) => safe(apiClient.post(`${API}/incidents`, incident, { timeoutMs: 5000 })),
  patchIncident: (id, changes) =>
    safe(apiClient.request(`${API}/incidents/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(changes), timeoutMs: 5000 })),

  // Admin
  adminOverview: () => safe(apiClient.get(`${API}/admin/overview`, { timeoutMs: 90000 })),
  adminUsers: () => safe(apiClient.get(`${API}/admin/users`, { timeoutMs: 15000 })),
  adminAudit: (limit = 100) => safe(apiClient.get(`${API}/admin/audit?limit=${limit}`, { timeoutMs: 15000 })),
  adminUpdateUser: (id, change) =>
    apiClient.request(`${API}/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(change), timeoutMs: 15000 }),

  // Module 3 (experimental): road blockage from a photo
  getRoadBlockageModel: () => safe(apiClient.get(`${API}/road-blockage/model`, { timeoutMs: 60000 })),
  // multipart upload; resolves to the result, or { error } with the server's reason
  analyzeRoadBlockage: async (file, retried = false) => {
    const form = new FormData();
    form.append('file', file, file.name || 'photo.jpg');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 120000);
    try {
      const token = getAccessToken();
      const res = await fetch(`${apiClient.baseUrl}${API}/road-blockage`, {
        method: 'POST', body: form, signal: ctrl.signal, headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json().catch(() => ({}));
      return res.ok ? body : { error: body?.detail || `HTTP ${res.status}` };
    } catch (err) {
      if (err?.name === 'AbortError') return { error: 'Timed out' };
      // no answer at all: the server may be asleep; wait for it and send the photo once more
      if (!retried && navigator.onLine !== false) {
        const { up, wasDown } = await wakeServer();
        if (up && wasDown) return module1Api.analyzeRoadBlockage(file, true);
      }
      return { error: 'Backend unreachable' };
    } finally {
      clearTimeout(t);
    }
  },
};

export default module1Api;
