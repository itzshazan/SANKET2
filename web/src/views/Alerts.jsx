import React, { useState, useMemo } from 'react';
import HazardBadge from '../components/HazardBadge.jsx';
import { ALERTS, ALERT_AUDIENCES, ALERT_LANGUAGES, ALERT_TEMPLATES, ZONES, DISTRICTS } from '../data/mockData.js';
import { IconBell, IconMap, IconInfo, IconActivity, IconAlertTriangle } from '../components/icons.jsx';

const INCIDENTS_DATA = [
  {
    id: 'inc-01',
    severity: 'critical',
    severityLabel: 'CRITICAL',
    timeAgo: '12 MIN AGO',
    title: 'HIGH DEBRIS FLOW & MASS COLLAPSE PROBABILITY',
    location: 'Wayanad District (Meppadi / Chooralmala), Kerala',
    districtId: 'wayanad',
    factors: 'Rainfall (42.8mm/hr) + Soil Saturation (94%) + Steep Escarpment (34°)',
    summary: 'Continuous monsoon rainfall has exceeded critical threshold on tea estate slopes. High probability of debris flow towards valley settlements.',
    status: 'active',
    statusLabel: 'Active Incident',
    recipients: 420,
  },
  {
    id: 'inc-02',
    severity: 'critical',
    severityLabel: 'CRITICAL',
    timeAgo: '28 MIN AGO',
    title: 'EXTREME RAINFALL DETECTED & FLASH FLOOD TRIGGER',
    location: 'Rudraprayag District (Kedarnath Valley), Uttarakhand',
    districtId: 'rudraprayag',
    factors: 'Cloudburst Rainfall (68mm) + Glacial Moraine Instability + River Siltation',
    summary: 'Cloudburst pulse recorded near upper catchment. NH-107 pilgrimage corridor is flagged for immediate vehicular holding.',
    status: 'active',
    statusLabel: 'Active Incident',
    recipients: 680,
  },
  {
    id: 'inc-03',
    severity: 'high',
    severityLabel: 'HIGH',
    timeAgo: '45 MIN AGO',
    title: 'CUT-SLOPE DESTABILIZATION & HIGHWAY SEVERANCE',
    location: 'Noney District (Tupul Section), Manipur',
    districtId: 'noney',
    factors: 'Sustained Monsoon Inundation + Excavated Railway Embankment',
    summary: 'Tupul railway yard approach exhibits tension cracks and active toe seepages. Immediate slope geotechnical stabilization alert issued.',
    status: 'monitoring',
    statusLabel: 'Under Monitoring',
    recipients: 190,
  },
  {
    id: 'inc-04',
    severity: 'moderate',
    severityLabel: 'MODERATE',
    timeAgo: '2 HOURS AGO',
    title: 'SLOPE TENSION CRACK ADVISORY',
    location: 'Mandi District (Beas Basin Corridor), Himachal Pradesh',
    districtId: 'mandi',
    factors: 'Moderate Rainfall (32mm) + River Toe Erosion',
    summary: 'Local monitoring sensors detect minor acoustic emissions and displacement along village bypass road.',
    status: 'monitoring',
    statusLabel: 'Under Monitoring',
    recipients: 120,
  },
  {
    id: 'inc-05',
    severity: 'moderate',
    severityLabel: 'RESOLVED',
    timeAgo: '4 HOURS AGO',
    title: 'DEBRIS REMOVAL CLEARED — TRAFFIC RESTORED',
    location: 'Raigad District (Mahad Section), Maharashtra',
    districtId: 'raigad',
    factors: 'Debris Cleared + Rainfall Subsided',
    summary: 'Minor mudflow across highway cleared by district public works department. Slope sensors report stable equilibrium.',
    status: 'resolved',
    statusLabel: 'Resolved',
    recipients: 310,
  },
];

export default function Alerts({ role, goTo }) {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Load persisted incidents from localStorage with fallback to default data
  const [incidents, setIncidents] = useState(() => {
    try {
      const saved = localStorage.getItem('sanket_incidents_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INCIDENTS_DATA;
  });

  // Persist incidents whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('sanket_incidents_v1', JSON.stringify(incidents));
    } catch {}
  }, [incidents]);

  const [showDispatchModal, setShowDispatchModal] = useState(false);

  // New Alert Form state
  const [newTitle, setNewTitle] = useState('HIGH RUNOFF HAZARD WARNING');
  const [newLocation, setNewLocation] = useState('Wayanad, Kerala');
  const [newSeverity, setNewSeverity] = useState('critical');
  const [newFactors, setNewFactors] = useState('Extreme Rainfall + Soil Saturation');

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
      return true;
    });
  }, [incidents, severityFilter, statusFilter]);

  function handleAcknowledge(id) {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: 'monitoring', statusLabel: 'Acknowledged · Monitoring' } : inc))
    );
  }

  function handleResolve(id) {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: 'resolved', statusLabel: 'Resolved' } : inc))
    );
  }

  function handleDispatch() {
    if (!newTitle.trim() || !newLocation.trim()) {
      alert('Please specify both an alert title and location before dispatching.');
      return;
    }
    const newInc = {
      id: `inc-${Date.now()}`,
      severity: newSeverity,
      severityLabel: newSeverity.toUpperCase(),
      timeAgo: 'JUST NOW',
      title: newTitle.trim(),
      location: newLocation.trim(),
      districtId: 'wayanad',
      factors: newFactors.trim() || 'Extreme Rainfall + Soil Saturation',
      summary: 'Emergency alert dispatched to district emergency operations and field responders.',
      status: 'active',
      statusLabel: 'Active Incident',
      recipients: 350,
    };
    setIncidents([newInc, ...incidents]);
    setShowDispatchModal(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 08. ALERTS / INCIDENT CENTER — HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              ALERT CENTER
            </h1>
            <span style={{ 
              fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, 
              padding: '2px 8px', borderRadius: 'var(--radius-sm)',
              background: 'var(--hazard-danger-wash)', color: 'var(--hazard-danger)', border: '1px solid var(--hazard-danger)' 
            }}>
              INCIDENT RESPONSE MODE
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Active tactical incidents requiring operational attention & emergency coordination
          </div>
        </div>

        {/* Top Quick Filter Tabs per Blueprint 08: [All] [Critical] [High] [Resolved] */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[
            { id: 'all', label: 'All Incidents' },
            { id: 'critical', label: 'Critical' },
            { id: 'high', label: 'High' },
            { id: 'resolved', label: 'Resolved' },
          ].map((tab) => {
            const isActive = severityFilter === tab.id || (tab.id === 'resolved' && statusFilter === 'resolved');
            return (
              <button
                key={tab.id}
                className={`btn ${isActive ? 'primary' : ''}`}
                style={{ padding: '4px 10px', fontSize: 11.5 }}
                onClick={() => {
                  if (tab.id === 'resolved') {
                    setSeverityFilter('all');
                    setStatusFilter('resolved');
                  } else {
                    setStatusFilter('all');
                    setSeverityFilter(tab.id);
                  }
                }}
              >
                {tab.label}
              </button>
            );
          })}

          {role === 'district_officer' && (
            <button 
              className="btn" 
              style={{ borderColor: 'var(--hazard-danger)', color: 'var(--hazard-danger)', fontSize: 11.5 }}
              onClick={() => setShowDispatchModal(true)}
            >
              + Dispatch Incident Alert
            </button>
          )}
        </div>
      </div>

      {/* MAIN 2-COLUMN SPLIT: FILTERS (LEFT) | ACTIVE ALERTS LIST (RIGHT) */}
      <div className="grid" style={{ gridTemplateColumns: '240px 1fr', gap: 16, alignItems: 'start' }}>
        {/* LEFT FILTERS PANE */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.05em', marginBottom: 8 }}>
              SEVERITY
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { id: 'all', label: 'All Severities', color: 'var(--text-primary)' },
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { id: 'all', label: 'All Statuses' },
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

          <div style={{ marginTop: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.5 }}>
            <b>Design Rule:</b> Alerts represent operational incidents requiring human decisions, not passive notification streams.
          </div>
        </div>

        {/* RIGHT: ACTIVE ALERTS QUEUE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            ACTIVE INCIDENTS ({filteredIncidents.length})
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-dim)' }}>
              No incidents match the active severity and status filters.
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
                      {inc.timeAgo}
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
                      Dispatched to: <b>{inc.recipients} Field Responders</b>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button 
                        className="btn"
                        style={{ fontSize: 11.5, padding: '4px 10px' }}
                        onClick={() => goTo('risk-map', { districtId: inc.districtId })}
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

      {/* DISPATCH MODAL */}
      {showDispatchModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="card" style={{ width: 440, maxWidth: '90vw' }}>
            <div className="card-head">
              <div className="card-title">Dispatch Incident Alert</div>
              <button className="btn" style={{ padding: '2px 8px' }} onClick={() => setShowDispatchModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
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
                <button className="btn primary" onClick={handleDispatch}>Dispatch Alert</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
