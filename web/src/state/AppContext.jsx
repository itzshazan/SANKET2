// SANKET Global Application Context
// Unifies application state, role capabilities, theming, and spatial focus.

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { INITIAL_SELECTION, computeBreadcrumbs, updateSpatialSelection } from './selectionState.js';
import { getState, getDistrict, getZone, ALERT_LANGUAGES } from '../data/mockData.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [view, setView] = useState('dashboard');
  const [role, setRole] = useState('district_officer');
  const [language, setLanguage] = useState('en');
  const [selection, setSelection] = useState(INITIAL_SELECTION);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Theme state synced with localStorage and html data-theme
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('sanket-theme') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('sanket-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const selectState = useCallback((stateId) => {
    setSelection({ stateId, districtId: null, zoneId: null });
  }, []);

  const selectDistrict = useCallback((districtId) => {
    setSelection((prev) => updateSpatialSelection(prev, { districtId, zoneId: null }));
  }, []);

  const selectZone = useCallback((zoneId) => {
    setSelection((prev) => updateSpatialSelection(prev, { zoneId }));
  }, []);

  const goTo = useCallback((nextView, partialSelection = null) => {
    if (partialSelection) {
      setSelection((prev) => updateSpatialSelection(prev, partialSelection));
    }
    setView(nextView);
  }, []);

  const selectedState = useMemo(() => getState(selection.stateId), [selection.stateId]);
  const selectedDistrict = useMemo(
    () => (selection.districtId ? getDistrict(selection.districtId) : null),
    [selection.districtId]
  );
  const selectedZone = useMemo(
    () => (selection.zoneId ? getZone(selection.zoneId) : null),
    [selection.zoneId]
  );

  const crumbs = useMemo(() => computeBreadcrumbs(selection, view), [selection, view]);
  const langLabel = useMemo(
    () => ALERT_LANGUAGES.find((l) => l.code === language)?.label || 'English',
    [language]
  );

  const value = useMemo(
    () => ({
      view,
      setView,
      role,
      setRole,
      language,
      setLanguage,
      langLabel,
      selection,
      setSelection,
      selectedState,
      selectedDistrict,
      selectedZone,
      crumbs,
      sidebarOpen,
      setSidebarOpen,
      theme,
      setTheme,
      toggleTheme,
      selectState,
      selectDistrict,
      selectZone,
      goTo,
    }),
    [
      view,
      role,
      language,
      langLabel,
      selection,
      selectedState,
      selectedDistrict,
      selectedZone,
      crumbs,
      sidebarOpen,
      theme,
      toggleTheme,
      selectState,
      selectDistrict,
      selectZone,
      goTo,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}

export default AppContext;
