// Shared live district state: one request feeds every view, refreshed every 5 minutes.
import { useEffect, useState } from 'react';
import { module1Api } from '../services/module1Api.js';

const REFRESH_MS = 5 * 60 * 1000;
let state = { data: null, loading: false, error: null, fetchedAt: 0 };
const listeners = new Set();
let inflight = null;

function publish(next) {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn(state));
}

export function refreshLiveDistricts(force = false) {
  if (inflight) return inflight;
  publish({ loading: true });
  inflight = module1Api.getDistrictsLive(force).then((res) => {
    inflight = null;
    if (res && res.districts) publish({ data: res, loading: false, error: null, fetchedAt: Date.now() });
    else publish({ loading: false, error: 'Backend unreachable: live district data unavailable' });
    return res;
  });
  return inflight;
}

export function useLiveDistricts() {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    listeners.add(setSnap);
    if (!state.data || Date.now() - state.fetchedAt > REFRESH_MS) refreshLiveDistricts();
    const t = setInterval(() => refreshLiveDistricts(), REFRESH_MS);
    return () => { listeners.delete(setSnap); clearInterval(t); };
  }, []);
  const list = snap.data ? Object.values(snap.data.districts) : [];
  return { ...snap, list, byId: snap.data?.districts || {}, refresh: refreshLiveDistricts };
}
