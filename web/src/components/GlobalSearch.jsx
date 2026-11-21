import React, { useState, useMemo, useRef, useEffect } from 'react';
import HazardBadge from './HazardBadge.jsx';
import { useLiveDistricts } from '../data/useLiveDistricts.js';

// Searches the monitored districts (live levels from the backend). Coordinates jump to the
// nearest monitored district.
export default function GlobalSearch({ onSelectDistrict }) {
  const live = useLiveDistricts();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !live.list.length) return [];
    const m = q.match(/^(-?[0-9.]+)\s*[, \t]\s*(-?[0-9.]+)$/);
    if (m) {
      const lat = parseFloat(m[1]); const lon = parseFloat(m[2]);
      const nearest = [...live.list].sort((a, b) => Math.hypot(a.lat - lat, a.lon - lon) - Math.hypot(b.lat - lat, b.lon - lon))[0];
      return [{ id: nearest.id, name: `Nearest monitored district to ${lat.toFixed(3)}, ${lon.toFixed(3)}`, sub: `${nearest.name}, ${nearest.state}`, hazard: nearest.level }];
    }
    return live.list
      .filter((d) => d.name.toLowerCase().includes(q) || d.state.toLowerCase().includes(q))
      .slice(0, 8)
      .map((d) => ({ id: d.id, name: d.name, sub: `${d.state} · ${d.region}`, hazard: d.level }));
  }, [query, live.list]);

  useEffect(() => {
    function onDocClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(item) { onSelectDistrict(item.id); setQuery(''); setOpen(false); }

  return (
    <div ref={wrapRef} className="global-search">
      <input
        type="search" enterKeyHint="search" placeholder="Search district or lat, lon…" value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) pick(results[0]); else if (e.key === 'Escape') setOpen(false); }}
        className="select-control global-search-input" aria-label="Search monitored districts"
      />
      {open && query.trim() && (
        <div className="global-search-results">
          {results.length ? results.map((item, i) => (
            <div key={`${item.id}-${i}`} className="global-search-result" onClick={() => pick(item)} style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
              <div><div style={{ fontWeight: 700, fontSize: 12 }}>{item.name}</div><div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{item.sub}</div></div>
              <HazardBadge level={item.hazard} size="sm" />
            </div>
          )) : <div style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-dim)' }}>{live.list.length ? `No monitored district matches "${query}"` : 'District list unavailable'}</div>}
        </div>
      )}
    </div>
  );
}
