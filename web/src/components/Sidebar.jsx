import React from 'react';
import { Link, NavLink } from 'react-router';
import Brand from './Brand.jsx';
import { NAV_ITEMS, canAccess, pathFor } from '../routes.js';
import {
  IconGrid, IconMonitor, IconBell, IconHistory, IconUser, IconLock,
  IconBuilding, IconFileText, IconInfo, IconGlobe, IconRoad
} from './icons.jsx';

const ICONS = {
  overview: IconGrid,
  monitor: IconMonitor,
  'tactical-3d': IconGlobe,
  history: IconHistory,
  infra: IconBuilding,
  alerts: IconBell,
  reports: IconFileText,
  'data-model': IconInfo,
  'road-blockage': IconRoad,
};

// Real links (<a href>), so pages open in a new tab with Ctrl/middle-click and show their URL on hover.
// On mobile the sidebar is a drawer; the shell closes it whenever the page changes.
export default function Sidebar({ view, role, districtId, open, onClose }) {
  const navClass = (id) => ({ isActive }) => `nav-item ${isActive || view === id ? 'active' : ''}`;

  return (
    <nav className={`sidebar ${open ? 'open' : ''}`} aria-label="Main">
      <div className="sidebar-brand">
        <Link to="/" className="sidebar-brand-link" title="Home">
          <Brand inverse />
          <div className="tag">Landslide Early Warning</div>
        </Link>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">×</button>
      </div>

      <ul className="nav-list">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.id] || IconInfo;
          if (!canAccess(item.id, role)) {
            return (
              <li key={item.id}>
                <span className="nav-item disabled" style={{ opacity: 0.4, cursor: 'not-allowed' }} title="Not available for your role" aria-disabled="true">
                  <IconLock />{item.label}
                </span>
              </li>
            );
          }
          return (
            <li key={item.id}>
              <NavLink to={pathFor(item.id, { districtId })} className={navClass(item.id)} end>
                <Icon />{item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="divider" style={{ margin: '14px 20px' }} />

      <div style={{ padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NavLink to={pathFor('field-officer')} className={navClass('field-officer')} end>
          <IconUser />Field Officer View
        </NavLink>
        {role === 'admin' && (
          <NavLink to={pathFor('admin')} className={navClass('admin')} end>
            <IconLock />Admin
          </NavLink>
        )}
      </div>

      <div className="sidebar-footer">SANKET v2.0</div>
    </nav>
  );
}
