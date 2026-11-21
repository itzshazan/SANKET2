import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useMatches, useNavigate, useSearchParams } from 'react-router';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/Topbar.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ALERT_LANGUAGES } from './data/catalog.js';
import { useLiveDistricts } from './data/useLiveDistricts.js';
import { canAccess, routeTitle } from './routes.js';
import { useAuth } from './auth/AuthContext.jsx';
import { NoAccess, useGo } from './routing.jsx';

const VIEWS = {
  overview: lazy(() => import('./views/Dashboard.jsx')),
  monitor: lazy(() => import('./views/RiskMonitoring.jsx')),
  'tactical-3d': lazy(() => import('./views/Tactical3DGlobe.jsx')),
  history: lazy(() => import('./views/HistoricalBacktesting.jsx')),
  infra: lazy(() => import('./views/Infrastructure.jsx')),
  alerts: lazy(() => import('./views/Alerts.jsx')),
  reports: lazy(() => import('./views/Reports.jsx')),
  'field-officer': lazy(() => import('./views/FieldOfficerView.jsx')),
  'data-model': lazy(() => import('./views/DataModel.jsx')),
  admin: lazy(() => import('./views/admin/AdminDashboard.jsx')),
  'road-blockage': lazy(() => import('./views/RoadBlockage.jsx')),
};

function useStoredState(key, initial) {
  const [value, setValue] = useState(() => { try { return localStorage.getItem(key) || initial; } catch { return initial; } });
  useEffect(() => { try { localStorage.setItem(key, value); } catch { /* private mode */ } }, [key, value]);
  return [value, setValue];
}

// The signed-in app: sidebar, top bar and the page for the current URL. The page id comes from the
// matched route (routes.js); the selected district lives in the URL as ?district=.
export default function AppShell() {
  const auth = useAuth();
  const role = auth.role;
  const matches = useMatches();
  const view = matches[matches.length - 1]?.handle?.id;
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const districtId = params.get('district');
  const go = useGo();
  const navigate = useNavigate();
  const live = useLiveDistricts();

  const [language, setLanguage] = useStoredState('sanket-language', 'en');
  const [theme, setTheme] = useStoredState('sanket-theme', 'light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {                         // new page: close the mobile menu and start at the top
    setSidebarOpen(false);
    contentRef.current?.scrollTo(0, 0);
  }, [pathname]);

  const selection = useMemo(() => ({ districtId }), [districtId]);
  const selectDistrict = useCallback((id) => {
    setParams((prev) => {
      const nextParams = new URLSearchParams(prev);
      if (id) nextParams.set('district', id); else nextParams.delete('district');
      return nextParams;
    }, { replace: true });                 // picking a district refines the page; it is not a new Back step
  }, [setParams]);
  // Moving to another page keeps the chosen district unless a new one is given.
  const goTo = useCallback((id, partial) => go(id, { districtId: partial?.districtId ?? districtId }), [go, districtId]);
  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [setTheme]);
  const signOut = useCallback(async () => {
    navigate('/', { replace: true });
    await auth.signOut();
  }, [navigate, auth]);

  const ActiveView = VIEWS[view];
  const langLabel = ALERT_LANGUAGES.find((l) => l.code === language)?.label || 'English';
  const selectedDistrict = districtId ? live.byId[districtId] || null : null;
  const commonProps = { role, language: langLabel, selection, selectedDistrict, selectDistrict, goTo };

  return (
    <div className="app-shell">
      <Sidebar view={view} role={role} districtId={districtId} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={`sidebar-backdrop ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      <div className="main-col">
        <TopBar
          title={routeTitle(view)}
          role={role}
          user={auth.profile}
          onSignOut={signOut}
          language={language}
          onLanguageChange={setLanguage}
          onSearchSelectDistrict={(id) => goTo('monitor', { districtId: id })}
          onMenuClick={() => setSidebarOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <div className="content scrollbar-thin" ref={contentRef}>
          {!canAccess(view, role) ? <NoAccess role={role} /> : (
            <ErrorBoundary key={view}>
              {ActiveView && (
                <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-dim)', fontSize: 13 }}>Loading view…</div>}>
                  <ActiveView {...commonProps} {...(view === 'data-model' ? { theme, onToggleTheme: toggleTheme } : {})} />
                </Suspense>
              )}
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}
