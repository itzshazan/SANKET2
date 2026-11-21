import React from 'react';
import { HAZARD_META } from '../data/catalog.js';

export default function HazardBadge({ level, size = 'md' }) {
  const key = HAZARD_META[level] ? level : 'unknown';
  return (
    <span className={`hz-badge ${key}`} style={size === 'sm' ? { fontSize: 10, padding: '2px 7px' } : undefined}>
      <span className="hz-dot" />
      {HAZARD_META[key].label}
    </span>
  );
}
