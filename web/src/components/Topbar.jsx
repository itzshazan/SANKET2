import React from 'react';
import { IconChevronRight } from './icons.jsx';
import { ALERT_LANGUAGES, NAV_ROLE_ACCESS } from '../data/mockData.js';
import GlobalSearch from './GlobalSearch.jsx';

export default function TopBar({ title, crumbs, role, onRoleChange, language, onLanguageChange, onSearchSelectDistrict, onMenuClick, theme, onToggleTheme }) {
  // Search navigates to Risk Monitoring — only offer it to a role that can
  // actually reach that view (matches Sidebar's own NAV_ROLE_ACCESS check),
  // rather than hand-carving a "field_officer" special case here.
  const canSearch = (NAV_ROLE_ACCESS.monitor || NAV_ROLE_ACCESS.monitoring || []).includes(role);
  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Only visible below the mobile breakpoint (index.css) — on desktop
            the sidebar is always visible, so there's nothing to open. */}
        <button className="hamburger-btn" onClick={onMenuClick} aria-label="Open menu">☰</button>
        <div className="topbar-title">{title}</div>
        {crumbs && crumbs.length > 0 && (
          <div className="breadcrumb">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <IconChevronRight width={12} height={12} />}
                {i === crumbs.length - 1 ? <b>{c}</b> : <span>{c}</span>}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-right">
        {canSearch && <GlobalSearch onSelectDistrict={onSearchSelectDistrict} />}
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <span className="live-dot" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 12, background: 'rgba(63, 139, 76, 0.12)', color: 'var(--hazard-normal)', border: '1px solid rgba(63, 139, 76, 0.25)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--hazard-normal)', display: 'inline-block' }} />
          LIVE ● NASA + COPERNICUS
        </span>

        <select
          className="select-control"
          value={role}
          onChange={(e) => onRoleChange(e.target.value)}
        >
          <option value="district_officer">District Officer</option>
          <option value="field_officer">Field Officer</option>
        </select>

        <select
          className="select-control"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
        >
          {ALERT_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} disabled={l.status === 'planned'}>
              {l.label}{l.status === 'planned' ? ' (planned)' : ''}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
