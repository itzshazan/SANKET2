import React, { useState, useMemo, useEffect } from 'react';
import { module1Api } from '../services/module1Api.js';
import HazardBadge from '../components/HazardBadge.jsx';
import { useLiveDistricts } from '../data/useLiveDistricts.js';
import { IconBell, IconMap, IconInfo, IconActivity, IconAlertTriangle } from '../components/icons.jsx';

// Incidents are created by officers (or from a live district level) and stored in the backend.
// No sample incidents are shipped.
const CACHE_KEY = 'sanket_incidents_v2';

function relTime(iso) {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins} MIN AGO`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)} H AGO`;
  return new Date(iso).toLocaleDateString();
}

export default function Alerts({ role, goTo }) {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Incidents come from the backend (SQLite). localStorage is only an offline read cache.
  const [incidents, setIncidents] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(incidents)); } catch { /* ignore */ }
  }, [incidents]);

  const [storeOnline, setStoreOnline] = useState(false);
  useEffect(() => {
    let alive = true;
    module1Api.listIncidents().then((rows) => {
      if (!alive || !Array.isArray(rows)) return;
      setStoreOnline(true);
      setIncidents(rows);
    });
    return () => { alive = false; };
  }, []);

  // Field reports submitted by field officers (shared through the backend).
  const [fieldReports, setFieldReports] = useState([]);
  useEffect(() => {
    let alive = true;
    const load = () => module1Api.listFieldReports().then((rows) => { if (alive && Array.isArray(rows)) setFieldReports(rows); });
    load();
    const t = setInterval(load, 30000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const [showDispatchModal, setShowDispatchModal] = useState(false);

  // New alert form, pre-filled from a district's live evaluation when one is picked
  const live = useLiveDistricts();
  const [newDistrictId, setNewDistrictId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newSeverity, setNewSeverity] = useState('high');
  const [newFactors, setNewFactors] = useState('');

  function prefillFromDistrict(id) {
    setNewDistrictId(id);
    const d = live.byId[id];
    if (!d) return;
    const g = d.governing_window;
    setNewLocation(`${d.name}, ${d.state}`);
    setNewTitle(`${(d.level || 'unknown').toUpperCase()} — landslide rainfall threshold ${typeof d.ratio === 'number' ? `${d.ratio.toFixed(2)}× exceeded` : 'status'}`);
    setNewSeverity(d.level === 'danger' ? 'critical' : d.level === 'warning' ? 'high' : 'moderate');
    setNewFactors(g ? `${g.rain_mm} mm in ${g.hours} h vs threshold ${g.threshold_mm} mm (${d.threshold_region?.label}); data ${d.weather_status}, evaluated ${new Date(d.evaluated_at).toLocaleString()}`
      : d.ratio === 0 ? 'No rain in the last 10 days' : 'No rainfall data available');
  }

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
      return true;
    });
  }, [incidents, severityFilter, statusFilter]);

  function handleAcknowledge(id) {
    module1Api.patchIncident(id, { status: 'monitoring', statusLabel: 'Acknowledged · Monitoring' });
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: 'monitoring', statusLabel: 'Acknowledged · Monitoring' } : inc))
    );
  }

  function handleResolve(id) {
    module1Api.patchIncident(id, { status: 'resolved', statusLabel: 'Resolved' });
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: 'resolved', statusLabel: 'Resolved' } : inc))
    );
  }

  function handleDispatch() {
    if (!newTitle.trim() || !newLocation.trim()) {
      alert('Please specify both an alert title and location before dispatching.');
      return;
    }
    const now = new Date().toISOString();
    const matched = live.byId[newDistrictId] || live.list.find((d) => newLocation.toLowerCase().includes(d.name.toLowerCase()));
    const newInc = {
      id: `inc-${Date.now()}`,
      severity: newSeverity,
      severityLabel: newSeverity.toUpperCase(),
      createdAt: now,
      title: newTitle.trim(),
      location: newLocation.trim(),
      districtId: matched?.id || null,
      factors: newFactors.trim() || 'Not specified',
      summary: 'Recorded in the SANKET incident log by a district officer.',
      status: 'active',
      statusLabel: 'Active Incident',
    };
    module1Api.saveIncident(newInc);
    setIncidents([newInc, ...incidents]);
    setShowDispatchModal(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 08. ALERTS / INCIDENT CENTER — HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(role === 'district_officer' || role === 'admin') && (
            <button 
              className="btn" 
              style={{ borderColor: 'var(--hazard-danger)', color: 'var(--hazard-danger)', fontSize: 11.5 }}
              onClick={() => setShowDispatchModal(true)}
            >
              + New incident
            </button>
          )}
        </div>
      </div>

      {/* MAIN 2-COLUMN SPLIT: FILTERS (LEFT) | ACTIVE ALERTS LIST (RIGHT) */}
      <div className="grid stack-md" style={{ gridTemplateColumns: '240px 1fr', gap: 16, alignItems: 'start' }}>
        {/* LEFT FILTERS PANE */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.05em', marginBottom: 8 }}>
              SEVERITY
            </div>
            <div className="filter-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { id: 'all', label: 'All', color: 'var(--text-primary)' },
                { id: 'critical', label: '● Critical', color: 'var(--hazard-danger)' },
                { id: 'high', label: '● High', color: 'var(--hazard-warning)' },
                { id: 'moderate', label: '● Moderate', color: 'var(--hazard-watch)' },
              ].map((s) => (
                <button
                  key={s.id}
                  className="btn"
                  style={{
                    justifyContent: 'flex-start',
                    fontSize: 12,
                    borderColor: severityFilter === s.id ? s.color : undefined,
                    color: severityFilter === s.id ? s.color : undefined,
                    background: severityFilter === s.id ? 'var(--surface-2)' : undefined,
                  }}
                  onClick={() => setSeverityFilter(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.05em', marginBottom: 8 }}>
              STATUS
            </div>
            <div className="filter-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: '● Active' },
                { id: 'monitoring', label: '● Monitoring' },
                { id: 'resolved', label: '● Resolved' },
              ].map((st) => (
                <button
                  key={st.id}
                  className="btn"
                  style={{
                    justifyContent: 'flex-start',
                    fontSize: 12,
                    borderColor: statusFilter === st.id ? 'var(--accent)' : undefined,
                    color: statusFilter === st.id ? 'var(--accent)' : undefined,
                    background: statusFilter === st.id ? 'var(--surface-2)' : undefined,
                  }}
                  onClick={() => setStatusFilter(st.id)}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT: ACTIVE ALERTS QUEUE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Incidents ({filteredIncidents.length})
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-dim)' }}>
              No incidents.
            </div>
          ) : (
            filteredIncidents.map((inc) => {
              const isCrit = inc.severity === 'critical';
              const isResolved = inc.status === 'resolved';

              return (
                <div 
                  key={inc.id}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${isCrit ? 'var(--hazard-danger)' : inc.severity === 'high' ? 'var(--hazard-warning)' : 'var(--hazard-watch)'}`,
                    opacity: isResolved ? 0.7 : 1,
                  }}
                >
                  {/* Top line: Severity tag + Time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ 
                        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800,
                        padding: '2px 8px', borderRadius: 'var(--radius-sm)',
                        background: isCrit ? 'rgba(163, 46, 40, 0.15)' : 'rgba(193, 101, 31, 0.15)',
                        color: isCrit ? 'var(--hazard-danger)' : 'var(--hazard-warning)',
                      }}>
                        {inc.severityLabel}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        Status: <b style={{ color: 'var(--text-primary)' }}>{inc.statusLabel}</b>
                      </span>
                    </div>

                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', fontWeight: 600 }}>
                      {inc.createdAt ? relTime(inc.createdAt) : inc.timeAgo}
                    </span>
                  </div>

                  {/* Title & Location */}
                  <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {inc.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--accent-2)', fontWeight: 600, marginBottom: 8 }}>
                    {inc.location}
                  </div>

                  {/* Contributing Factors */}
                  <div style={{ 
                    padding: '6px 10px', 
                    background: 'var(--surface-2)', 
                    borderRadius: 'var(--radius-sm)', 
                    fontSize: 11.5, 
                    color: 'var(--text-muted)',
                    marginBottom: 10
                  }}>
                    <b>Contributing Factors:</b> {inc.factors}
                  </div>

                  <div style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 14 }}>
                    {inc.summary}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      Incident log entry · {inc.createdAt ? new Date(inc.createdAt).toLocaleString() : ''} · no SMS/e-mail gateway connected
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        className="btn"
                        style={{ fontSize: 11.5, padding: '4px 10px' }}
                        onClick={() => goTo('monitor', inc.districtId ? { districtId: inc.districtId } : undefined)}
                      >
                        <IconMap width={13} height={13} /> View Location
                      </button>

                      {!isResolved && (
                        <>
                          {inc.status !== 'monitoring' && (
                            <button 
                              className="btn primary"
                              style={{ fontSize: 11.5, padding: '4px 10px' }}
                              onClick={() => handleAcknowledge(inc.id)}
                            >
                              Acknowledge
                            </button>
                          )}
                          <button 
                            className="btn"
                            style={{ fontSize: 11.5, padding: '4px 10px', color: 'var(--hazard-normal)', borderColor: 'var(--hazard-normal)' }}
                            onClick={() => handleResolve(inc.id)}
                          >
                            Resolve
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FIELD REPORTS FROM THE GROUND */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Field Reports ({fieldReports.length})</div>
          <span style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>
            {storeOnline ? '' : 'Backend offline'}
          </span>
        </div>
        {fieldReports.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', padding: '8px 0' }}>
            No field reports yet.
          </div>
        ) : (
          fieldReports.slice(0, 8).map((r) => (
            <div key={r.id} style={{ fontSize: 12.5, padding: '8px 0', borderTop: '1px solid var(--border-muted)', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <b>#{r.id}</b> · {r.type} · {r.location}
                {r.description && <div style={{ color: 'var(--text-muted)' }}>{r.description}</div>}
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                {r.gps || 'no GPS'} · {new Date(r.submitted_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>

      {/* DISPATCH MODAL */}
      {showDispatchModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: 440, maxWidth: '90vw' }}>
            <div className="card-head">
              <div className="card-title">New incident</div>
              <button className="btn" style={{ padding: '2px 8px' }} onClick={() => setShowDispatchModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>From live district evaluation (optional)</label>
                <select className="select-control" style={{ width: '100%' }} value={newDistrictId} onChange={(e) => prefillFromDistrict(e.target.value)}>
                  <option value="">— choose a district to pre-fill —</option>
                  {live.list.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.state}) · {(d.level || 'unknown').toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Alert Title</label>
                <input 
                  type="text" 
                  className="input-control" 
                  style={{ width: '100%' }}
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Location</label>
                <input 
                  type="text" 
                  className="input-control" 
                  style={{ width: '100%' }}
                  value={newLocation} 
                  onChange={(e) => setNewLocation(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Severity</label>
                <select 
                  className="select-control" 
                  style={{ width: '100%' }}
                  value={newSeverity} 
                  onChange={(e) => setNewSeverity(e.target.value)}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="moderate">Moderate</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700 }}>Contributing Factors</label>
                <input 
                  type="text" 
                  className="input-control" 
                  style={{ width: '100%' }}
                  value={newFactors} 
                  onChange={(e) => setNewFactors(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <button className="btn" onClick={() => setShowDispatchModal(false)}>Cancel</button>
                <button className="btn primary" onClick={handleDispatch}>Save incident</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
