import React, { useEffect, useState } from 'react';
import { onServerWake } from '../services/apiClient.js';

// What the user sees while the API is starting after a quiet period (see services/apiClient.js).
// Full-screen waits (sign-in check) show <WakeNote/>; every other page gets the small <WakeBanner/>.

let fullScreenWaits = 0;
const waitListeners = new Set();
const notifyWaits = () => waitListeners.forEach((fn) => fn(fullScreenWaits));

export function useServerWake() {
  const [state, setState] = useState({ waking: false, since: 0, failed: false });
  useEffect(() => onServerWake(setState), []);
  return state;
}

function useSeconds(since, active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return active ? Math.max(0, Math.round((now - since) / 1000)) : 0;
}

/** Inside a full-screen loading view: explains the wait while the server starts. */
export function WakeNote() {
  const s = useServerWake();
  const secs = useSeconds(s.since, s.waking);
  useEffect(() => {
    fullScreenWaits += 1; notifyWaits();
    return () => { fullScreenWaits -= 1; notifyWaits(); };
  }, []);
  if (!s.waking) return null;
  return (
    <div className="wake-note" role="status" aria-live="polite">
      <b>Starting the server{secs ? ` · ${secs} s` : '…'}</b>
      <span>It pauses when nobody has used it for a while. Starting again takes about a minute; this page continues by itself.</span>
    </div>
  );
}

/** On any other page: a small notice at the bottom while the server starts, or if it does not answer. */
export function WakeBanner() {
  const s = useServerWake();
  const secs = useSeconds(s.since, s.waking);
  const [waits, setWaits] = useState(fullScreenWaits);
  useEffect(() => { waitListeners.add(setWaits); return () => { waitListeners.delete(setWaits); }; }, []);
  if (waits > 0) return null;
  if (s.failed) {
    return (
      <div className="wake-banner failed" role="alert">
        The server is not answering.
        <button onClick={() => window.location.reload()}>Try again</button>
      </div>
    );
  }
  if (!s.waking || secs < 2) return null;
  return <div className="wake-banner" role="status" aria-live="polite"><i />Starting the server · {secs} s</div>;
}
