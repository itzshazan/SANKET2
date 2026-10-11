import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/Topbar.jsx';
import LiveTicker from './components/LiveTicker.jsx';
import DemoOverlay, { DEMO_STEPS } from './components/DemoOverlay.jsx';
const Dashboard = lazy(() => import('./views/Dashboard.jsx'));
const GisRiskMap = lazy(() => import('./views/GisRiskMap.jsx'));
const RiskMonitoring = lazy(() => import('./views/RiskMonitoring.jsx'));
const Analytics = lazy(() => import('./views/Analytics.jsx'));
const Infrastructure = lazy(() => import('./views/Infrastructure.jsx'));
const HistoricalBacktesting = lazy(() => import('./views/HistoricalBacktesting.jsx'));
const Alerts = lazy(() => import('./views/Alerts.jsx'));
const Reports = lazy(() => import('./views/Reports.jsx'));
const FieldOfficerView = lazy(() => import('./views/FieldOfficerView.jsx'));
const Settings = lazy(() => import('./views/Settings.jsx'));
const Help = lazy(() => import('./views/Help.jsx'));
const Tactical3DGlobe = lazy(() => import('./views/Tactical3DGlobe.jsx'));
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { getState, getDistrict, getZone, ALERT_LANGUAGES } from './data/mockData.js';
import { resolveRoute, canAccess, routeTitle, DEFAULT_ROUTE } from './routes.js';

// canonical route id -> view component (ids live in routes.js)
const VIEWS = {
  overview: Dashboard,
  monitor: RiskMonitoring,
  'risk-map': GisRiskMap,
  'tactical-3d': Tactical3DGlobe,
  analytics: Analytics,
  history: HistoricalBacktesting,
  infra: Infrastructure,
  alerts: Alerts,
  reports: Reports,
  'field-officer': FieldOfficerView,
  settings: Settings,
  help: Help,
};

const readHashRoute = () => resolveRoute(window.location.hash);

export default function App() {
  const [view, setView] = useState(() => readHashRoute() || 'overview');
  const [role, setRole] = useState('district_officer');
  const [language, setLanguage] = useState('en');
  const [selection, setSelection] = useState({ stateId: 'UK', districtId: 'rudraprayag', zoneId: 'rudraprayag-a' });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('sanket-theme') || 'light'; } catch { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('sanket-theme', theme); } catch { /* ignore */ }
  }, [theme]);

  // Hash routing. ALL navigation (sidebar, goTo, demo, role switch) goes through
  // navigate(), so the URL hash is always the source of truth: bookmarks and the
  // browser back/forward buttons work, and unknown/legacy ids are normalised.
  const navigate = useCallback((id, { replace = false } = {}) => {
    const target = resolveRoute(id) || 'overview';
    setView(target);
    try {
      if (replace) window.history.replaceState(null, '', `#${target}`);
      else if (window.location.hash !== `#${target}`) window.location.hash = target;
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    function onHashChange() {
      const route = readHashRoute();
      if (route) setView(route);
      else navigate('overview', { replace: true }); // unknown hash -> overview
    }
    // Normalise the initial URL (empty, legacy alias or unknown hash).
    const initial = readHashRoute();
    if (initial !== window.location.hash.replace(/^#\/?/, '')) navigate(initial || 'overview', { replace: true });
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [navigate]);

  // Role guard: a role can never sit on a route it has no access to (e.g. a
  // field officer opening #analytics by hand).
  useEffect(() => {
    if (!canAccess(view, role)) navigate(DEFAULT_ROUTE[role], { replace: true });
  }, [view, role, navigate]);

  // Guided demo walkthrough
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoPaused, setDemoPaused] = useState(false);

  function applyDemoStep(i) {
    const step = DEMO_STEPS[i];
    if (!step) return;
    setSelection((s) => ({ ...s, ...step.selection }));
    navigate(step.view, { replace: true });
  }
  function startDemo() {
    setRole('district_officer');
    setDemoStep(0);
    applyDemoStep(0);
    setDemoPaused(false);
    setDemoActive(true);
  }
  function exitDemo() {
    setDemoActive(false);
  }
  function goToDemoStep(i) {
    const clamped = Math.max(0, Math.min(DEMO_STEPS.length - 1, i));
    applyDemoStep(clamped);
    setDemoStep(clamped);
  }
  function nextDemoStep() {
    if (demoStep >= DEMO_STEPS.length - 1) { setDemoActive(false); return; }
    goToDemoStep(demoStep + 1);
  }

  useEffect(() => {
    if (!demoActive || demoPaused) return undefined;
    const step = DEMO_STEPS[demoStep];
    if (!step) return undefined;
    const t = setTimeout(nextDemoStep, step.duration);
    return () => clearTimeout(t);
  }, [demoActive, demoPaused, demoStep]);

  const selectedState = useMemo(() => getState(selection.stateId), [selection.stateId]);
  const selectedDistrict = useMemo(() => (selection.districtId ? getDistrict(selection.districtId) : null), [selection.districtId]);
  const selectedZone = useMemo(() => (selection.zoneId ? getZone(selection.zoneId) : null), [selection.zoneId]);

  function goTo(nextView, partialSelection) {
    if (partialSelection) setSelection((s) => ({ ...s, ...partialSelection }));
    navigate(nextView);
  }

  function selectState(stateId) {
    setSelection((s) => ({ ...s, stateId, districtId: null, zoneId: null }));
  }
  function selectDistrict(districtId) {
    const d = getDistrict(districtId);
    setSelection((s) => ({ ...s, districtId, stateId: d ? d.state : s.stateId, zoneId: null }));
  }
  function selectZone(zoneId) {
    const z = getZone(zoneId);
    setSelection((s) => ({ ...s, zoneId, districtId: z ? z.district : s.districtId, stateId: z ? z.state : s.stateId }));
  }

  const crumbs = useMemo(() => {
    const c = ['Pan-India'];
    if (selectedState) c.push(selectedState.name);
    if (selectedDistrict) c.push(selectedDistrict.name);
    if (selectedZone && view !== 'overview') c.push(selectedZone.name);
    return c;
  }, [selectedState, selectedDistrict, selectedZone, view]);

  const ActiveView = VIEWS[view];
  const langLabel = ALERT_LANGUAGES.find((l) => l.code === language)?.label || 'English';

  const commonProps = {
    role, language: langLabel,
    selection, selectedState, selectedDistrict, selectedZone,
    selectState, selectDistrict, selectZone, goTo,
    onStartDemo: startDemo,
  };

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        onNavigate={navigate}
        role={role}
        onFieldView={() => { setRole('field_officer'); navigate('field-officer'); }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className={`sidebar-backdrop ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      <div className="main-col">
        <TopBar
          title={routeTitle(view)}
          crumbs={view === 'field-officer' ? null : crumbs}
          role={role}
          onRoleChange={(r) => {
            setRole(r);
            if (r === 'field_officer') navigate('field-officer');
            else if (view === 'field-officer') navigate('overview');
          }}
          language={language}
          onLanguageChange={setLanguage}
          onSearchSelectDistrict={(id) => { selectDistrict(id); goTo('monitor', { districtId: id }); }}
          onMenuClick={() => setSidebarOpen(true)}
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        />
        <div className={`content scrollbar-thin ${demoActive ? 'content--demo-active' : ''}`}>
          <ErrorBoundary key={view}>
            {ActiveView && (
              <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-dim)', fontSize: 13 }}>Loading view…</div>}>
              <ActiveView
                {...commonProps}
                {...(view === 'settings' ? { theme, onToggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) } : {})}
              />
              </Suspense>
            )}
          </ErrorBoundary>
        </div>
      </div>
      <LiveTicker
        enabled={role === 'district_officer'}
        onOpenDistrict={(id) => { selectDistrict(id); goTo('monitor', { districtId: id }); }}
      />
      {demoActive && (
        <DemoOverlay
          stepIndex={demoStep}
          paused={demoPaused}
          onNext={nextDemoStep}
          onPrev={() => goToDemoStep(demoStep - 1)}
          onPauseToggle={() => setDemoPaused((p) => !p)}
          onExit={exitDemo}
        />
      )}
    </div>
  );
}
