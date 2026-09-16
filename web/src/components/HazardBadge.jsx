import React from 'react';
import { HAZARD_META } from '../data/mockData.js';

export default function HazardBadge({ level, size = 'md' }) {
  const meta = HAZARD_META[level] || HAZARD_META.normal;
  return (
    <span className={`hz-badge ${level}`} style={size === 'sm' ? { fontSize: 10, padding: '2px 7px' } : undefined}>
      <span className="hz-dot" />
      {meta.label}
    </span>
  );
}
