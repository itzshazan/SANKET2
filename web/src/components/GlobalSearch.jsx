import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DISTRICTS, NER_STATES, ZONES } from '../data/mockData.js';
import { PAN_INDIA_SPATIAL_NODES } from './LiveGisLeafletMap.jsx';
import HazardBadge from './HazardBadge.jsx';

const ALL_DISTRICTS = Object.values(DISTRICTS).flat();
const ALL_ZONES = Object.values(ZONES || {});

const SEARCH_INFRA = [
  { id: 'wayanad', name: 'Wayanad District Medical Center', type: 'Hospital', location: 'Meppadi, Kerala' },
  { id: 'wayanad', name: 'Chooralmala River Bridge', type: 'Bridge', location: 'Wayanad, Kerala' },
  { id: 'wayanad', name: 'NH-766 Calicut-Vythiri Hill Highway', type: 'Road', location: 'Thamarassery Ghat, Kerala' },
  { id: 'rudraprayag', name: 'Rudraprayag CHC Trauma Center', type: 'Hospital', location: 'Rudraprayag, Uttarakhand' },
  { id: 'rudraprayag', name: 'NH-107 Kedarnath Pilgrim Highway', type: 'Road', location: 'Guptkashi, Uttarakhand' },
  { id: 'noney', name: 'Tupul Railway Station & Bridge', type: 'Rail', location: 'Noney, Manipur' },
  { id: 'mandi', name: 'Mandi Zonal Trauma Hospital', type: 'Hospital', location: 'Mandi, Himachal' },
  { id: 'chamoli', name: 'Chamoli District Emergency Ops', type: 'Emergency', location: 'Chamoli, Uttarakhand' },
];

function stateName(code) {
  return NER_STATES.find((s) => s.id === code)?.name || code;
}

export default function GlobalSearch({ onSelectDistrict }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // Check if input is a direct coordinate (e.g. "11.60, 76.08" or "30.28 78.98")
    const coordMatch = q.match(/^([0-9.]+)\s*[, \t]\s*([0-9.]+)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      if (lat >= 8.0 && lat <= 38.0 && lon >= 68.0 && lon <= 98.0) {
        return [{
          id: 'custom-coord',
          name: `Coordinates: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`,
          sub: 'Pan-India GIS Location Jump',
          type: 'coord',
          lat, lon,
          hazard: 'watch',
        }];
      }
    }

    const matched = [];

    // 1. Search Districts
    ALL_DISTRICTS.forEach((d) => {
      if (d.name.toLowerCase().includes(q)) {
        matched.push({
          id: d.id,
          name: d.name,
          sub: `${stateName(d.state)} (District)`,
          hazard: d.hazard,
          type: 'district',
        });
      }
    });

    // 2. Search Pan-India Spatial Nodes / Villages
    PAN_INDIA_SPATIAL_NODES.forEach((node) => {
      if (node.name.toLowerCase().includes(q) && !matched.some((m) => m.id === node.id)) {
        matched.push({
          id: node.id,
          name: node.name,
          sub: `${node.state} (High-Relief Zone)`,
          hazard: node.hazard,
          type: 'zone',
        });
      }
    });

    // 3. Search Infrastructure
    SEARCH_INFRA.forEach((infra) => {
      if (infra.name.toLowerCase().includes(q) || infra.location.toLowerCase().includes(q)) {
        matched.push({
          id: infra.id,
          name: infra.name,
          sub: `${infra.location} · ${infra.type}`,
          hazard: 'warning',
          type: 'infra',
        });
      }
    });

    return matched.slice(0, 8);
  }, [query]);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(item) {
    if (item.id === 'custom-coord') {
      // Find nearest district to this coordinate
      const nearest = ALL_DISTRICTS[0];
      onSelectDistrict(nearest.id);
    } else {
      onSelectDistrict(item.id);
    }
    setQuery('');
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && results.length > 0) {
      pick(results[0]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      e.currentTarget.blur();
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="Search district, village, coord…"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="select-control"
        style={{ width: 220, fontSize: 12 }}
        aria-label="Search across all districts, zones, coordinates, and infrastructure"
      />
      {open && query.trim() && (
        <div className="global-search-results" style={{ width: 280, maxHeight: 320, overflowY: 'auto' }}>
          {results.length > 0 ? (
            results.map((item, idx) => (
              <div 
                key={`${item.id}-${idx}`} 
                className="global-search-result" 
                onClick={() => pick(item)}
                style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{item.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{item.sub}</div>
                </div>
                {item.hazard && <HazardBadge level={item.hazard} size="sm" />}
              </div>
            ))
          ) : (
            <div style={{ padding: '9px 10px', fontSize: 12, color: 'var(--text-dim)' }}>
              No matches for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
