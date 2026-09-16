import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/Topbar.jsx';
import LiveTicker from './components/LiveTicker.jsx';
import DemoOverlay, { DEMO_STEPS } from './components/DemoOverlay.jsx';
import Dashboard from './views/Dashboard.jsx';
import GisRiskMap from './views/GisRiskMap.jsx';
import RiskMonitoring from './views/RiskMonitoring.jsx';
import Analytics from './views/Analytics.jsx';
import Infrastructure from './views/Infrastructure.jsx';
import HistoricalBacktesting from './views/HistoricalBacktesting.jsx';
import Alerts from './views/Alerts.jsx';
import Reports from './views/Reports.jsx';
import FieldOfficerView from './views/FieldOfficerView.jsx';
import Settings from './views/Settings.jsx';
import Help from './views/Help.jsx';
import Tactical3DGlobe from './views/Tactical3DGlobe.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { getState, getDistrict, getZone, ALERT_LANGUAGES } from './data/mockData.js';

const TITLES = {
  overview: 'Overview / Command Center',
  dashboard: 'Overview / Command Center',
  monitor: 'Live Environmental Monitor',
  monitoring: 'Live Environmental Monitor',
  'risk-map': 'Risk Intelligence Map',
  'gis-map': 'Risk Intelligence Map',
  'tactical-3d': "3D Tactical Globe (God's Eye View)",
  analytics: 'Environmental Analytics',
  history: 'Historical Analysis & Backtesting',
  backtesting: 'Historical Analysis & Backtesting',
  infra: 'Infrastructure Intelligence',
  priorities: 'Infrastructure Intelligence',
  alerts: 'Alerts & Incident Center',
  reports: 'Intelligence Reports & Dossiers',
  'field-reports': 'Intelligence Reports',
  'field-officer': 'Field Officer — Report Submission',
  settings: 'System Settings & Integrations',
  help: 'Help & Operational User Guide',
};

export default function App() {
  const [view, setView] = useState('overview');
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

  // URL Hash Routing synchronization for bookmarking and back/forward navigation
  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && TITLES[hash]) {
        setView(hash);
      }
    }
    if (window.location.hash) {
      onHashChange();
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Guided demo walkthrough
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [demoPaused, setDemoPaused] = useState(false);

  function applyDemoStep(i) {
    const step = DEMO_STEPS[i];
    if (!step) return;
    setSelection((s) => ({ ...s, ...step.selection }));
    setView(step.view);
  }
  function startDemo() {
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
    try { window.location.hash = nextView; } catch {}
    setView(nextView);
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
    if (selectedZone && view !== 'overview' && view !== 'dashboard') c.push(selectedZone.name);
    return c;
  }, [selectedState, selectedDistrict, selectedZone, view]);

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
        onNavigate={setView}
        role={role}
        onFieldView={() => { setRole('field_officer'); setView('field-officer'); }}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className={`sidebar-backdrop ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
      <div className="main-col">
        <TopBar
          title={TITLES[view] || 'SANKET Early Warning'}
          crumbs={view === 'field-officer' ? null : crumbs}
          role={role}
          onRoleChange={(r) => { 
            setRole(r); 
            if (r === 'field_officer') setView('field-officer'); 
            else if (view === 'field-officer') setView('overview'); 
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
            {(view === 'overview' || view === 'dashboard') && <Dashboard {...commonProps} />}
            {(view === 'monitor' || view === 'monitoring') && <RiskMonitoring {...commonProps} />}
            {(view === 'risk-map' || view === 'gis-map') && <GisRiskMap {...commonProps} />}
            {view === 'tactical-3d' && <Tactical3DGlobe {...commonProps} />}
            {view === 'analytics' && <Analytics {...commonProps} />}
            {(view === 'history' || view === 'backtesting') && <HistoricalBacktesting {...commonProps} />}
            {(view === 'infra' || view === 'priorities') && <Infrastructure {...commonProps} />}
            {view === 'alerts' && <Alerts {...commonProps} />}
            {(view === 'reports' || view === 'field-reports') && <Reports {...commonProps} />}
            {view === 'field-officer' && <FieldOfficerView {...commonProps} />}
            {view === 'settings' && <Settings {...commonProps} theme={theme} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />}
            {view === 'help' && <Help {...commonProps} />}
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
