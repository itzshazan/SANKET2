import React from 'react';
import { NAV_ITEMS, NAV_ROLE_ACCESS, ROLES } from '../data/mockData.js';
import { 
  IconGrid, IconMap, IconMonitor, IconCamera, IconBell, 
  IconList, IconHistory, IconUser, IconLock, IconBarChart, 
  IconBuilding, IconFileText, IconInfo, IconActivity, IconGlobe
} from './icons.jsx';

const ICONS = {
  overview: IconGrid,
  dashboard: IconGrid,
  monitor: IconMonitor,
  monitoring: IconMonitor,
  'risk-map': IconMap,
  'gis-map': IconMap,
  'tactical-3d': IconGlobe,
  analytics: IconBarChart,
  history: IconHistory,
  backtesting: IconHistory,
  infra: IconBuilding,
  priorities: IconList,
  alerts: IconBell,
  reports: IconFileText,
  'field-reports': IconCamera,
  settings: IconActivity,
  help: IconInfo,
};

export default function Sidebar({ view, onNavigate, role, onFieldView, open, onClose }) {
  const allowed = (navId) => (NAV_ROLE_ACCESS[navId] || []).includes(role);

  // On mobile the sidebar is an overlay drawer (see the @media block in
  // index.css) — picking a destination should also close it, otherwise it
  // stays covering the screen after navigating. onClose is undefined/no-op
  // on desktop where there's nothing to close, so this is safe everywhere.
  function navigate(id) {
    onNavigate(id);
    onClose?.();
  }

  return (
    <nav className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <div className="mark">S</div>
        <div>
          <div className="name">SANKET</div>
          <div className="tag">Landslide Early Warning</div>
        </div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">×</button>
      </div>

      <ul className="nav-list">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.id] || IconInfo;
          const isAllowed = allowed(item.id);
          return (
            <li key={item.id}>
              <button
                className={`nav-item ${view === item.id ? 'active' : ''}`}
                style={!isAllowed ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                disabled={!isAllowed}
                title={!isAllowed ? `Requires District Officer access` : undefined}
                onClick={() => isAllowed && navigate(item.id)}
              >
                {isAllowed ? <Icon /> : <IconLock />}
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="divider" style={{ margin: '14px 20px' }} />

      <div style={{ padding: '0 10px' }}>
        <button className={`nav-item ${view === 'field-officer' ? 'active' : ''}`} onClick={() => { onFieldView(); onClose?.(); }}>
          <IconUser />
          Field Officer View
        </button>
      </div>

      <div className="sidebar-footer">
        Role: <b style={{ color: 'var(--text-muted)' }}>{ROLES[role]?.label}</b>
        <div style={{ marginTop: 4, fontSize: 10.5, lineHeight: 1.5 }}>
          Can: {ROLES[role]?.can.join(' · ')}
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--hazard-normal)', fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--hazard-normal)', display: 'inline-block' }} />
          SANKET v1.0.0 · Live Telemetry
        </div>
      </div>
    </nav>
  );
}
