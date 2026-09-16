import React from 'react';

export default function KpiCard({ label, value, sub, tone }) {
  const toneColor = tone ? `var(--hazard-${tone})` : 'var(--text-primary)';
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: toneColor }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
