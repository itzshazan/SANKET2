import React, { useState, useRef, useEffect } from 'react';
import { module1Api } from '../services/module1Api.js';
import { REPORT_TYPES } from '../data/catalog.js';
import { useLiveDistricts } from '../data/useLiveDistricts.js';
import { IconCamera, IconUpload, IconWifiOff, IconMapPin, IconCheckCircle, IconRefresh } from '../components/icons.jsx';

export default function FieldOfficerView() {
  // Real connection state from the device (no simulation toggle).
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  const offlineMode = !online;
  const live = useLiveDistricts();
  const [location, setLocation] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [reportType, setReportType] = useState('Road blockage');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [gps, setGps] = useState(null);
  // Reports waiting to be sent; kept on this device so they survive a reload while offline.
  const [queue, setQueue] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sanket_field_queue_v1') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem('sanket_field_queue_v1', JSON.stringify(queue.map((r) => ({ ...r, photoUrl: r.photoUrl ? 'attached' : null })))); } catch { /* ignore */ }
  }, [queue]);
  const [submitted, setSubmitted] = useState([]); // synced report cards
  const nextId = useRef(1);
  const [notice, setNotice] = useState('');

  // Reports are persisted by the backend (SQLite), so they survive a reload and
  // are visible to the district officer's Alert Center.
  useEffect(() => {
    let alive = true;
    module1Api.listFieldReports().then((rows) => {
      if (alive && Array.isArray(rows)) {
        setSubmitted(rows.map((r) => ({ ...r, photoUrl: r.has_photo ? 'attached' : null, submittedAt: r.submitted_at })));
      }
    });
    return () => { alive = false; };
  }, []);

  const toPayload = (r) => ({
    location: r.location, type: r.type, description: r.description || '',
    gps: r.gps, has_photo: !!r.photoUrl, submitted_at: r.submittedAt,
  });
  const fileRef = useRef(null);

  // Real device location (browser Geolocation API). Nothing is invented if it is unavailable.
  function captureGps() {
    setGpsError('');
    if (!navigator.geolocation) { setGpsError('This device/browser has no geolocation'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps(`${pos.coords.latitude.toFixed(5)}° N, ${pos.coords.longitude.toFixed(5)}° E (±${Math.round(pos.coords.accuracy)} m)`),
      (err) => setGpsError(`GPS unavailable: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (file) setPhotoUrl(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    // Compute locally rather than reading `gps` state, which would still hold
    // its pre-update value inside this same handler (React state updates are
    // async) if the officer never pressed "Capture GPS" first.
    if (!location.trim()) { setNotice('Enter the location of the observation.'); return; }
    const gpsValue = gps || null;
    const report = {
      id: String(nextId.current++),
      location, type: reportType, description, photoUrl,
      gps: gpsValue,
      submittedAt: new Date().toISOString(),
    };
    if (offlineMode) {
      setQueue((q) => [...q, report]);
    } else {
      const saved = await module1Api.submitFieldReport(toPayload(report));
      if (saved) {
        setSubmitted((s) => [{ ...report, ...saved, photoUrl: report.photoUrl, submittedAt: saved.submitted_at }, ...s]);
        setNotice('');
      } else {
        setQueue((q) => [...q, report]);
        setNotice('Server unreachable — report saved locally. Press Sync when the connection returns.');
      }
    }
    setDescription('');
    setPhotoUrl(null);
    setGps(null);
  }

  // Send queued reports automatically when the connection comes back.
  useEffect(() => {
    if (online && queue.length) handleSync();
  }, [online]);

  async function handleSync() {
    const failed = [];
    const synced = [];
    for (const r of queue) {
      const saved = await module1Api.submitFieldReport(toPayload(r));
      if (saved) synced.push({ ...r, ...saved, photoUrl: r.photoUrl, submittedAt: saved.submitted_at });
      else failed.push(r);
    }
    setSubmitted((s) => [...synced.reverse(), ...s]);
    setQueue(failed);
    setNotice(failed.length ? `${failed.length} report(s) could not be synced — server unreachable.` : '');
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', justifyContent: 'center' }}>
      {/* Phone-framed form */}
      <div style={{ width: 340, flex: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 600, color: online ? 'var(--hazard-normal)' : 'var(--hazard-danger)' }}>
            {online ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} /> : <IconWifiOff width={13} height={13} />}
            {online ? 'Online' : 'Offline'}
          </span>
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
          </div>

          <div className="section-label">Location</div>
          <input className="select-control" list="sanket-district-list" placeholder="Village / road / landmark, district" style={{ width: '100%', marginBottom: 14 }} value={location} onChange={(e) => setLocation(e.target.value)} />
          <datalist id="sanket-district-list">
            {live.list.map((d) => <option key={d.id} value={`${d.name}, ${d.state}`} />)}
          </datalist>

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
            <IconMapPin width={14} height={14} /> {gps ? gps : 'Capture GPS (device location)'}
          </button>
          {gpsError && <div style={{ fontSize: 11, color: 'var(--hazard-danger)', marginTop: -10, marginBottom: 12 }}>{gpsError}</div>}

          <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSubmit}>
            <IconUpload width={14} height={14} /> Submit Report
          </button>

          {offlineMode && (
            <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: 'var(--hazard-watch)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <IconWifiOff width={12} height={12} /> Offline: reports are saved on this device and sent automatically when the connection returns
            </div>
          )}
        </div>
      </div>

      {/* Report cards / queue */}
      <div style={{ width: 320, flex: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {notice && (
          <div className="card" style={{ borderColor: 'var(--hazard-watch)', fontSize: 12, color: 'var(--hazard-watch)' }}>{notice}</div>
        )}
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
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Submitted reports appear here, and in the district officer's Alerts tab.</div>
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
              <div>GPS: {r.gps || 'not captured'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--hazard-normal)' }}><IconCheckCircle width={12} height={12} /> Synced to dashboard</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
