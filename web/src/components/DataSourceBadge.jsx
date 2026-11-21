import React from 'react';
import { ageText } from '../data/catalog.js';

// status: 'live' | 'stale' | 'unavailable'  (comes from the backend, never assumed)
const STYLE = {
  live: { fg: '#028C74', bg: 'rgba(2,140,116,0.1)', label: 'LIVE' },
  stale: { fg: '#B7860F', bg: 'rgba(201,151,31,0.13)', label: 'LAST REAL READING' },
  unavailable: { fg: '#64726F', bg: 'rgba(100,114,111,0.12)', label: 'NO DATA' },
};

export default function DataSourceBadge({ status = 'unavailable', source, updatedAt = null, ageMinutes = null, compact = false }) {
  const s = STYLE[status] || STYLE.unavailable;
  const when = updatedAt ? new Date(updatedAt).toLocaleString() : null;
  const title = [source && `Source: ${source}`, when && `Data time: ${when}`, status === 'stale' && ageText(ageMinutes)]
    .filter(Boolean).join(' · ');
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: compact ? '2px 7px' : '3px 10px',
        borderRadius: compact ? 4 : 20, fontSize: compact ? 10 : 11, fontWeight: 600, letterSpacing: '0.03em',
        background: s.bg, color: s.fg, border: `1px solid ${s.fg}40`, whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.fg }} />
      {s.label}
      {!compact && status === 'stale' && ageMinutes != null && <span style={{ opacity: 0.8 }}>· {ageText(ageMinutes)}</span>}
      {!compact && source && status !== 'unavailable' && <span style={{ opacity: 0.7, fontWeight: 500 }}>· {source}</span>}
    </span>
  );
}
