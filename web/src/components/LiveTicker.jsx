import React, { useState, useEffect, useRef } from 'react';
import { DISTRICTS, NER_STATES } from '../data/mockData.js';
import { IconBell } from './icons.jsx';

const ALL_DISTRICTS = Object.values(DISTRICTS).flat();

function stateName(code) {
  return NER_STATES.find((s) => s.id === code)?.name || code;
}

// Deliberately plain, operational phrasing — no dramatic or specific claims
// (casualties, exact damage) about real places. These are meant to read as
// routine monitoring-system chatter, consistent with everything else in this
// prototype that's flagged 'MOCK' rather than presented as a real feed.
const TEMPLATES = [
  (d) => `Rainfall trending up near ${d.name}, ${stateName(d.state)}`,
  (d) => `New field report logged near ${d.name}`,
  (d) => `Soil moisture rising in ${d.name} — monitoring`,
  (d) => `Satellite pass completed over ${d.name} — no new scars detected`,
  (d) => `${d.name} zone status re-confirmed: ${d.hazard.toUpperCase()}`,
];

function pickDistrict() {
  // Bias toward districts that already carry some risk — a ticker that only
  // ever mentions "normal" districts wouldn't read as a plausible live feed.
  const risky = ALL_DISTRICTS.filter((d) => d.hazard !== 'normal');
  const pool = Math.random() < 0.75 && risky.length ? risky : ALL_DISTRICTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// A lightweight simulated "live" event ticker, mounted once at the app shell
// so it persists across view navigation. Purely a notification-layer effect —
// it does NOT mutate the underlying mock dataset that every view reads from,
// so KPI counts / alert lists / etc. stay internally consistent. Only runs
// for district_officer (see App.jsx) since it opens Risk Monitoring, which
// field_officer doesn't have access to.
export default function LiveTicker({ enabled, onOpenDistrict }) {
  const [toast, setToast] = useState(null);
  const scheduleTimer = useRef(null);
  const dismissTimer = useRef(null);

  useEffect(() => {
    if (!enabled) { setToast(null); return undefined; }
    let cancelled = false;
    function schedule() {
      const delay = 18000 + Math.random() * 20000; // ~18–38s — noticeable during a demo, not spammy
      scheduleTimer.current = setTimeout(() => {
        if (cancelled) return;
        const d = pickDistrict();
        const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
        setToast({ id: Date.now(), districtId: d.id, text: template(d) });
        schedule();
      }, delay);
    }
    schedule();
    return () => { cancelled = true; clearTimeout(scheduleTimer.current); };
  }, [enabled]);

  useEffect(() => {
    if (!toast) return undefined;
    dismissTimer.current = setTimeout(() => {
      setToast((cur) => (cur?.id === toast.id ? null : cur));
    }, 7000);
    return () => clearTimeout(dismissTimer.current);
  }, [toast]);

  if (!enabled || !toast) return null;

  return (
    <div
      className="live-toast"
      role="status"
      onClick={() => { onOpenDistrict(toast.districtId); setToast(null); }}
    >
      <IconBell width={14} height={14} />
      <span>{toast.text}</span>
      <button
        className="live-toast-close"
        onClick={(e) => { e.stopPropagation(); setToast(null); }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
