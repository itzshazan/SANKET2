// SANKET Frontend API Client
// Standardized fetch wrapper with timeout, error handling and waiting for a sleeping server.
//
// Free hosting (Render) stops the API after ~15 idle minutes; the next request then waits while it starts
// (about a minute). A request that fails because the server is not answering waits for /health to answer,
// then runs once more. All such requests share one wake-up, and the UI can show it (onServerWake).

import { getAccessToken } from '../auth/token.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 6000;
const WAKE_LIMIT_MS = 180000;          // give up after 3 minutes
const HEALTH_PATH = '/api/v1/module1/health';

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// ---------------------------------------------------------------- server wake-up (shared)
let wakeState = { waking: false, since: 0, failed: false };
const wakeListeners = new Set();
let waking = null;

function setWake(next) {
  wakeState = { ...wakeState, ...next };
  wakeListeners.forEach((fn) => fn(wakeState));
}

/** Subscribe to { waking, since, failed }; returns an unsubscribe function. */
export function onServerWake(fn) {
  wakeListeners.add(fn);
  fn(wakeState);
  return () => wakeListeners.delete(fn);
}

async function healthOk(timeoutMs) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE_URL}${HEALTH_PATH}`, { signal: controller.signal, cache: 'no-store' });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/** Resolves { up, wasDown }: up = the server answers now; wasDown = it did not answer at first. */
export function wakeServer() {
  if (waking) return waking;
  waking = (async () => {
    if (await healthOk(4000)) return { up: true, wasDown: false };     // it was up: the request failed on its own
    const started = Date.now();
    setWake({ waking: true, since: started, failed: false });
    let delay = 1500;
    while (Date.now() - started < WAKE_LIMIT_MS) {
      if (await healthOk(25000)) {
        setWake({ waking: false, failed: false });
        return { up: true, wasDown: true };
      }
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 1.5, 5000);
    }
    setWake({ waking: false, failed: true });
    return { up: false, wasDown: true };
  })().finally(() => { waking = null; });
  return waking;
}

// ---------------------------------------------------------------- requests
async function once(endpoint, options) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorBody = null;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      throw new ApiError(
        errorBody?.detail || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    return await response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out after ' + (options.timeoutMs || DEFAULT_TIMEOUT_MS) + 'ms', 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network error connecting to SANKET API', 0, err);
  }
}

// Worth waiting for the server: no answer at all (0), timed out (408), or the host's gateway errors.
const SERVER_DOWN = new Set([0, 408, 502, 504]);

async function request(endpoint, options = {}) {
  try {
    return await once(endpoint, options);
  } catch (err) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;   // the phone has no network
    if (options.noWake || offline || !(err instanceof ApiError) || !SERVER_DOWN.has(err.status)) throw err;
    const { up, wasDown } = await wakeServer();
    if (!up || !wasDown) throw err;
    // The server was starting. Reads are safe to repeat; a write is repeated only if it never got an answer
    // at all (status 0), so a report that did arrive is not saved twice.
    const method = (options.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD' && err.status !== 0) throw err;
    return once(endpoint, options);
  }
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
  request,
  baseUrl: BASE_URL,
};

export default apiClient;
