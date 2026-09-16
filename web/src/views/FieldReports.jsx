import React, { useState } from 'react';
import { FIELD_REPORTS } from '../data/mockData.js';
import { IconCamera, IconMapPin, IconCheckCircle } from '../components/icons.jsx';

const STATUS_TONE = { Submitted: 'watch', Triaged: 'normal' };

export default function FieldReports({ goTo, selectZone }) {
  const [filter, setFilter] = useState('all');
  const reports = filter === 'all' ? FIELD_REPORTS : FIELD_REPORTS.filter((r) => r.status === filter);

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div>
            <div className="card-title">Incoming Field Reports</div>
            <div className="card-subtitle">Geo-tagged reports from field officers and citizens — triaged by report type</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'Submitted', 'Triaged'].map((f) => (
              <button key={f} className={`btn ${filter === f ? 'primary' : ''}`} style={{ fontSize: 11.5, padding: '5px 10px' }} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {reports.map((r) => (
          <div key={r.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div className="card-title">Report #{r.id}</div>
              <span className={`hz-badge ${STATUS_TONE[r.status] || 'watch'}`}>{r.status}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconMapPin width={13} height={13} /> {r.location}</div>
              <div>Type: <b style={{ color: 'var(--text-primary)' }}>{r.type}</b></div>
              {r.description && <div style={{ color: 'var(--text-primary)' }}>{r.description}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconCamera width={13} height={13} /> Photo: {r.photo ? 'Attached' : '—'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconCheckCircle width={13} height={13} /> GPS: {r.gps ? 'Captured' : '—'}</div>
              <div>Submitted: {new Date(r.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              {r.synced && <div style={{ color: 'var(--hazard-normal)', fontFamily: 'var(--font-mono)', fontSize: 10.5 }}>SYNCED</div>}
            </div>
            <button
              className="btn"
              style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
              onClick={() => { selectZone(r.zone); goTo('gis-map'); }}
            >
              View on GIS Map
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
