import React, { useEffect, useRef, useState } from 'react';
import { ALERT_LANGUAGES } from '../data/catalog.js';
import { useLiveDistricts } from '../data/useLiveDistricts.js';
import { canAccess } from '../routes.js';
import GlobalSearch from './GlobalSearch.jsx';

const ROLE_LABEL = { admin: 'Administrator', district_officer: 'District officer', field_officer: 'Field officer' };

function initials(user) {
  const name = (user?.full_name || user?.email || '').trim();
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

function LanguageSelect({ language, onLanguageChange, ...rest }) {
  return (
    <select className="select-control" value={language} onChange={(e) => onLanguageChange(e.target.value)} aria-label="Alert language" {...rest}>
      {ALERT_LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} disabled={l.status === 'planned'}>
          {l.label}{l.status === 'planned' ? ' (planned)' : ''}
        </option>
      ))}
    </select>
  );
}

// Phones: one row (menu, title, feed status, theme, account) plus the search on its own row; the
// account details, language and Sign out move into the account menu. Wider screens show everything inline.
export default function TopBar({ title, role, user, onSignOut, language, onLanguageChange, onSearchSelectDistrict, onMenuClick, theme, onToggleTheme }) {
  // Search opens Live Monitor, so it is offered only to roles that can open it (same check as the sidebar).
  const canSearch = canAccess('monitor', role);
  const live = useLiveDistricts();
  const statuses = new Set(live.list.map((d) => d.weather_status));
  const feed = !live.data ? { label: live.loading ? 'CONNECTING' : 'OFFLINE', color: '#64726F' }
    : statuses.size === 1 && statuses.has('live') ? { label: 'LIVE', color: 'var(--hazard-normal)' }
      : statuses.has('live') || statuses.has('stale') ? { label: 'PARTLY STALE', color: '#B7860F' }
        : { label: 'NO DATA', color: '#64726F' };
  const feedTitle = live.data ? `Weather: Open-Meteo · terrain: Copernicus GLO-30 · updated ${new Date(live.data.updated_at).toLocaleTimeString()}` : '';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [menuOpen]);
  useEffect(() => { setMenuOpen(false); }, [title]);          // a new page closes the menu

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Only visible below the mobile breakpoint (index.css); on desktop the sidebar is always shown. */}
        <button className="hamburger-btn" onClick={onMenuClick} aria-label="Open menu">☰</button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-right">
        {canSearch && <div className="topbar-search"><GlobalSearch onSelectDistrict={onSearchSelectDistrict} /></div>}
        <div className="topbar-tools">
          <span className="live-dot feed-badge" title={feedTitle} style={{ color: feed.color }}>
            <span className="feed-dot" />
            <span className="feed-label">{feed.label}</span>
          </span>
          <button
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <span className="topbar-wide topbar-user" title={user?.email}>
            <b>{user?.full_name || user?.email || ''}</b>
            <span>{ROLE_LABEL[role] || ''}</span>
          </span>
          <button className="btn topbar-wide" style={{ fontSize: 12 }} onClick={onSignOut}>Sign out</button>
          <LanguageSelect className="select-control topbar-wide" language={language} onLanguageChange={onLanguageChange} />

          <div className="account" ref={menuRef}>
            <button className="account-btn" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen}
              aria-label="Account and settings">{initials(user)}</button>
            {menuOpen && (
              <div className="account-menu" role="menu">
                <div className="account-who">
                  <b>{user?.full_name || 'Signed in'}</b>
                  <span>{user?.email}</span>
                  <span className="account-role">{ROLE_LABEL[role] || ''}</span>
                </div>
                <label className="account-row">
                  <span>Alert language</span>
                  <LanguageSelect language={language} onLanguageChange={onLanguageChange} />
                </label>
                <button className="btn account-signout" role="menuitem" onClick={() => { setMenuOpen(false); onSignOut(); }}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
