import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import apiClient from '../services/apiClient.js';
import { getAccessToken, setAccessToken } from './token.js';

// Sign-in state for the whole app. Supabase (cloud) handles accounts, passwords and Google sign-in;
// SANKET's backend returns the user's profile (role, districts, approval status) from /me.
// The Supabase URL and public key come from the backend (/auth/config), so they live in one .env.

const API = '/api/v1/module1';
const AuthContext = createContext(null);

let clientPromise = null;
function getSupabase() {
  if (!clientPromise) {
    clientPromise = apiClient.get(`${API}/auth/config`, { timeoutMs: 8000 }).then((cfg) => ({
      config: cfg,
      client: cfg?.configured
        ? createClient(cfg.supabase_url, cfg.anon_key, {
          // PKCE: Google sends the user back with ?code=... (query string), which does not clash with #hash routes
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'sanket-auth' },
        })
        : null,
    })).catch((err) => { clientPromise = null; throw err; });
  }
  return clientPromise;
}

async function fetchProfile() {
  try {
    return { profile: await apiClient.get(`${API}/me`, { timeoutMs: 10000 }), error: null };
  } catch (err) {
    return { profile: null, error: err?.message || 'Could not load your profile' };
  }
}

export function AuthProvider({ children }) {
  const [state, setState] = useState({ ready: false, configured: false, unreachable: false, session: null, profile: null, error: null });
  const [attempt, setAttempt] = useState(0);         // bumped by retry() after the server did not answer
  const clientRef = useRef(null);

  // One /me request per sign-in: Supabase fires several events for one sign-in (SIGNED_IN, INITIAL_SESSION)
  // and the sign-in form asks too; they all share the request that is already running.
  const inflight = useRef({ token: null, promise: null });
  const profileFor = useCallback((session) => {
    const token = session?.access_token || null;
    if (inflight.current.promise && inflight.current.token === token) return inflight.current.promise;
    setAccessToken(token);
    const promise = fetchProfile().finally(() => {
      if (inflight.current.promise === promise) inflight.current = { token: null, promise: null };
    });
    inflight.current = { token, promise };
    return promise;
  }, []);

  useEffect(() => {
    let sub = null;
    let alive = true;
    getSupabase().then(({ client }) => {
      if (!alive) return;
      clientRef.current = client;
      if (!client) { setState({ ready: true, configured: false, session: null, profile: null, error: null }); return; }
      const { data } = client.auth.onAuthStateChange((event, session) => {
        setAccessToken(session?.access_token);
        // Do the work outside the callback (Supabase advises against awaiting inside it).
        setTimeout(async () => {
          if (!alive) return;
          if (!session) { setState({ ready: true, configured: true, session: null, profile: null, error: null }); return; }
          if (event === 'TOKEN_REFRESHED') { setState((s) => ({ ...s, session })); return; }
          const { profile, error } = await profileFor(session);
          if (alive) setState({ ready: true, configured: true, session, profile, error });
        }, 0);
      });
      sub = data.subscription;
    }).catch(() => {
      // apiClient already waited up to 3 minutes for a sleeping server: it is really not answering
      if (alive) setState({ ready: true, configured: false, unreachable: true, session: null, profile: null, error: 'The SANKET server is not answering' });
    });
    return () => { alive = false; sub?.unsubscribe(); };
  }, [profileFor, attempt]);

  const retry = useCallback(() => {
    setState({ ready: false, configured: false, unreachable: false, session: null, profile: null, error: null });
    setAttempt((a) => a + 1);
  }, []);

  // Activity log "signed in": once per session, however many screens report it.
  const recordedFor = useRef(null);
  const recordSignIn = useCallback(() => {
    const token = getAccessToken();
    if (!token || recordedFor.current === token) return;
    recordedFor.current = token;
    apiClient.post(`${API}/me/session`, {}, { timeoutMs: 8000 }).catch(() => {});
  }, []);

  // Called by the sign-in and sign-up forms: resolves once the profile is loaded; the route guards then
  // send the user straight to the right page.
  const completeSignIn = useCallback(async (session) => {
    const { profile, error } = await profileFor(session);
    setState({ ready: true, configured: true, session, profile, error });
    recordSignIn();
    return profile;
  }, [profileFor, recordSignIn]);

  const refreshProfile = useCallback(async () => {
    const { profile, error } = await fetchProfile();
    setState((s) => ({ ...s, profile, error }));
    return profile;
  }, []);

  const signOut = useCallback(async () => {
    await clientRef.current?.auth.signOut();
    setAccessToken(null);
    setState((s) => ({ ...s, session: null, profile: null }));
  }, []);

  const value = useMemo(() => ({
    ...state,
    client: clientRef.current,
    role: state.profile?.status === 'active' ? state.profile.role : null,
    completeSignIn, refreshProfile, recordSignIn, signOut, retry,
  }), [state, completeSignIn, refreshProfile, recordSignIn, signOut, retry]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
