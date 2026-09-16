import React, { useState, useRef } from 'react';
import { REPORT_TYPES, VILLAGES } from '../data/mockData.js';
import { IconCamera, IconUpload, IconWifiOff, IconMapPin, IconCheckCircle, IconRefresh } from '../components/icons.jsx';

// Field Officer View is scoped to Noney (the district this role is demoed against) —
// pulling from every district's villages here would (a) show a field officer
// locations outside their own area, and (b) collide on React keys, since the
// ~109 auto-generated districts reuse generic names like "Village A".
const LOCATIONS = Object.entries(VILLAGES)
  .filter(([id]) => id.startsWith('village-noney-'))
  .map(([, v]) => v.name)
  .concat(['Noney town centre', 'Tupul railway camp (NH-37)']);

export default function FieldOfficerView() {
  const [offlineMode, setOfflineMode] = useState(false);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [reportType, setReportType] = useState('Road blockage');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [gps, setGps] = useState(null);
  const [queue, setQueue] = useState([]); // pending-sync reports while offline
  const [submitted, setSubmitted] = useState([]); // synced report cards
  const nextId = useRef(25);
  const fileRef = useRef(null);

  function generateGpsString() {
    // Simulated GPS lock — a jittered coordinate near Noney, consistent with the mock zone.
    const lat = (24.73 + (Math.random() - 0.5) * 0.01).toFixed(4);
    const lng = (93.745 + (Math.random() - 0.5) * 0.01).toFixed(4);
    return `${lat}° N, ${lng}° E`;
  }

  function captureGps() {
    setGps(generateGpsString());
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (file) setPhotoUrl(URL.createObjectURL(file));
  }

  function handleSubmit() {
    // Compute locally rather than reading `gps` state, which would still hold
    // its pre-update value inside this same handler (React state updates are
    // async) if the officer never pressed "Capture GPS" first.
    const gpsValue = gps || generateGpsString();
    setGps(gpsValue);
    const report = {
      id: String(nextId.current++),
      location, type: reportType, description, photoUrl,
      gps: gpsValue,
      submittedAt: new Date().toISOString(),
    };
    if (offlineMode) {
      setQueue((q) => [...q, report]);
    } else {
      setSubmitted((s) => [{ ...report, status: 'Submitted' }, ...s]);
    }
    setDescription('');
    setPhotoUrl(null);
    setGps(null);
  }

  function handleSync() {
    setSubmitted((s) => [...queue.map((r) => ({ ...r, status: 'Submitted' })).reverse(), ...s]);
    setQueue([]);
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', justifyContent: 'center' }}>
      {/* Phone-framed form */}
      <div style={{ width: 340, flex: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: offlineMode ? 'var(--hazard-danger)' : 'var(--text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={offlineMode} onChange={(e) => setOfflineMode(e.target.checked)} />
            <IconWifiOff width={13} height={13} /> Simulate no network
          </label>
          {queue.length > 0 && (
            <button className="btn primary" style={{ fontSize: 11, padding: '4px 9px' }} onClick={handleSync}>
              <IconRefresh width={12} height={12} /> Sync {queue.length}
            </button>
          )}
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
          padding: '20px 18px', boxShadow: '0 8px 24px rgba(15,20,25,0.10)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>SANKET Field Report</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>Field Officer view</div>
          </div>

          <div className="section-label">Location</div>
          <select className="select-control" style={{ width: '100%', marginBottom: 14 }} value={location} onChange={(e) => setLocation(e.target.value)}>
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>

          <div className="section-label">Report Type</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {REPORT_TYPES.map((t) => (
              <button
                key={t}
                className="btn"
                style={{ fontSize: 11.5, padding: '5px 9px', borderColor: reportType === t ? 'var(--accent)' : undefined, color: reportType === t ? 'var(--accent)' : undefined }}
                onClick={() => setReportType(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="section-label">Photo / Video</div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
          <button className="btn" style={{ width: '100%', justifyContent: 'center', marginBottom: 14, minHeight: photoUrl ? 120 : undefined, flexDirection: 'column', gap: 6 }} onClick={() => fileRef.current?.click()}>
            {photoUrl ? (
              <img src={photoUrl} alt="attached" style={{ maxWidth: '100%', maxHeight: 100, borderRadius: 6 }} />
            ) : (
              <><IconCamera width={18} height={18} /> Upload Photo/Video</>
            )}
          </button>

          <div className="section-label">Description</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Road partially blocked by debris after morning rainfall"
            rows={3}
            style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 8, fontSize: 12.5, marginBottom: 14, resize: 'vertical', fontFamily: 'inherit' }}
          />

          <div className="section-label">GPS Location</div>
          <button className="btn" style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }} onClick={captureGps}>
            <IconMapPin width={14} height={14} /> {gps ? gps : 'Capture GPS'}
          </button>

          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSubmit}>
            <IconUpload width={14} height={14} /> Submit Report
          </button>

          {offlineMode && (
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: 'var(--hazard-watch)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <IconWifiOff width={12} height={12} /> No network — reports save locally
            </div>
          )}
        </div>
      </div>

      {/* Report cards / queue */}
      <div style={{ width: 320, flex: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {queue.length > 0 && (
          <div className="card" style={{ borderColor: 'var(--hazard-watch)' }}>
            <div className="section-label" style={{ color: 'var(--hazard-watch)' }}>Pending Sync ({queue.length})</div>
            {queue.map((r) => (
              <div key={r.id} style={{ fontSize: 12, padding: '6px 0', borderTop: '1px solid var(--border-muted)' }}>
                <b>Report #{r.id}</b> — {r.type} · {r.location}
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 6 }}>Saved locally. Will sync automatically when connectivity returns.</div>
          </div>
        )}

        {submitted.length === 0 && queue.length === 0 && (
          <div className="card">
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Submitted reports appear here as cards, matching the district officer's Field Reports view.</div>
          </div>
        )}

        {submitted.map((r) => (
          <div key={r.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div className="card-title" style={{ fontSize: 12.5 }}>Report #{r.id}</div>
              <span className="hz-badge watch">{r.status}</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div>Location: <b style={{ color: 'var(--text-primary)' }}>{r.location}</b></div>
              <div>Type: <b style={{ color: 'var(--text-primary)' }}>{r.type}</b></div>
              {r.description && <div style={{ color: 'var(--text-primary)' }}>{r.description}</div>}
              <div>Photo: {r.photoUrl ? 'Attached' : '—'}</div>
              <div>GPS: {r.gps}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--hazard-normal)' }}><IconCheckCircle width={12} height={12} /> Synced to dashboard</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
