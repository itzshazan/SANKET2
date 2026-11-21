import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend } from 'recharts';
import HazardBadge from '../components/HazardBadge.jsx';
import { module1Api } from '../services/module1Api.js';
import { fmt } from '../data/catalog.js';
import { IconHistory } from '../components/icons.jsx';

const leadText = (r, lv) => {
  const h = r?.lead_time_hours?.[lv];
  if (typeof h !== 'number') return 'not reached';
  if ((r.already_at_window_start || []).includes(lv)) return '7+ days before';
  return `${h} h before`;
};
const leadCell = (r, lv) => {
  const h = r?.lead_time_hours?.[lv];
  if (typeof h !== 'number') return '—';
  return (r.already_at_window_start || []).includes(lv) ? '7+ days' : `${h} h`;
};

export default function HistoricalBacktesting() {
  const [events, setEvents] = useState(null);
  const [replays, setReplays] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    setEvents(null);
    setLoadError(null);
    setReplays({});
    setSelectedId(null);
    module1Api.getHistoryEvents({ throwOnError: true }).then((r) => {
      if (!alive) return;
      if (!Array.isArray(r?.events)) throw new Error('The server returned an invalid historical event list.');
      const list = r.events;
      setEvents(list);
      if (list[0]) setSelectedId(list[0].id);
      // Replay every event (ERA5 is cached on the server after the first request).
      list.forEach((ev) => module1Api.getHistoryEvent(ev.id).then((res) => {
        if (alive) setReplays((s) => ({ ...s, [ev.id]: res || { error: true } }));
      }));
    }).catch((err) => {
      if (!alive) return;
      setLoadError(err.status === 0
        ? 'Could not connect to the SANKET backend. Check that it is running, then retry.'
        : err.message || 'Historical events could not be loaded.');
      setEvents([]);
    });
    return () => { alive = false; };
  }, [retry]);

  const rep = selectedId ? replays[selectedId] : null;
  const levels = rep?.levels || {};
  const chart = (rep?.daily || []).map((r) => ({ ...r, label: r.date.slice(5),
    confidence_pct: typeof r.confidence === 'number' ? Math.round(r.confidence * 100) : null }));

  if (events === null) return <div className="card" style={{ padding: 20 }}>Loading events…</div>;
  if (loadError) return (
    <div className="card" role="alert" style={{ padding: 20 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Historical analysis could not be loaded</div>
      <p style={{ color: 'var(--text-muted)', margin: '0 0 16px' }}>{loadError}</p>
      <button className="btn primary" onClick={() => setRetry((n) => n + 1)}>Retry</button>
    </div>
  );
  if (!events.length) return <div className="card" style={{ padding: 20 }}>No historical events are configured yet.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Calibration summary over all events */}
      <div className="card">
        <div className="card-head"><div>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconHistory width={15} height={15} /> Past disasters replayed on real rainfall</div>
          <div className="card-subtitle">How long before each disaster SANKET would have reached each level. Click a row for details.</div>
        </div></div>
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
            <thead><tr><th>Event</th><th>Date</th><th>Watch</th><th>Warning</th><th>Danger</th><th>On the day</th><th>Confidence: week before → day</th></tr></thead>
            <tbody>
              {events.map((ev) => {
                const r = replays[ev.id];
                return (
                  <tr key={ev.id} onClick={() => setSelectedId(ev.id)} style={{ cursor: 'pointer', background: ev.id === selectedId ? 'var(--surface-2)' : undefined }}>
                    <td><b>{ev.name}</b><div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{ev.location}</div></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{ev.date}</td>
                    {!r ? <td colSpan={5} style={{ color: 'var(--text-dim)' }}>loading…</td>
                      : r.error ? <td colSpan={5} style={{ color: 'var(--hazard-danger)' }}>rainfall unavailable</td>
                        : <>
                          <td>{leadCell(r, 'watch')}</td>
                          <td>{leadCell(r, 'warning')}</td>
                          <td>{leadCell(r, 'danger')}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{r.event_day_peak ? <><HazardBadge level={r.event_day_peak.level} size="sm" /> {r.event_day_peak.ratio?.toFixed(1)}×</> : '—'}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{typeof r.model_confidence_week_before === 'number' ? `${Math.round(r.model_confidence_week_before * 100)}%` : '—'} → {typeof r.model_confidence_event_day === 'number' ? `${Math.round(r.model_confidence_event_day * 100)}%` : '—'}</td>
                        </>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {rep && !rep.error && (
        <>
          <div className="grid tiles-sm-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
            <div className="card"><div className="card-subtitle">Event</div><div style={{ fontWeight: 800 }}>{rep.name}</div><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{rep.location} · {rep.date}</div></div>
            <div className="card"><div className="card-subtitle">Warning reached</div><div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{leadText(rep, 'warning')}</div><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{rep.first_reached?.warning?.replace('T', ' ') || ''}</div></div>
            <div className="card"><div className="card-subtitle">Danger reached</div><div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{leadText(rep, 'danger')}</div><div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{rep.first_reached?.danger?.replace('T', ' ') || ''}</div></div>
            <div className="card"><div className="card-subtitle">Threshold used</div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{rep.region?.label}</div></div>
          </div>

          <div className="card">
            <div className="card-head"><div>
              <div className="card-title">{rep.name}: the week before</div>
            </div></div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 10 }} unit=" mm" width={55} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} width={40} />
                  <YAxis yAxisId="c" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" width={45} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar isAnimationActive={false} yAxisId="l" dataKey="rain_mm" name="Daily rain (mm)" fill="#028C74" />
                  <Line yAxisId="r" dataKey="max_ratio" name="Peak ratio (×threshold)" stroke="#FA5D00" />
                  <Line isAnimationActive={false} yAxisId="c" dataKey="confidence_pct" name="Model confidence (%)" stroke="#013126" strokeWidth={2} />
                  <ReferenceLine yAxisId="r" y={levels.warning} stroke="#E5600A" strokeDasharray="4 3" />
                  <ReferenceLine yAxisId="r" y={levels.danger} stroke="#B42318" strokeDasharray="4 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12, marginTop: 10 }}>
              <thead><tr><th>Date</th><th>Rain</th><th>Max hourly</th><th>Soil 7-28 cm</th><th>Peak ratio</th><th>Peak level</th><th>Model confidence</th></tr></thead>
              <tbody>
                {rep.daily.map((r) => (
                  <tr key={r.date} style={r.date === rep.date ? { fontWeight: 700, background: 'var(--surface-2)' } : undefined}>
                    <td>{r.date}{r.date === rep.date ? ' (event)' : ''}</td><td>{fmt(r.rain_mm, 1, ' mm')}</td><td>{fmt(r.max_hourly_mm, 1, ' mm')}</td>
                    <td>{fmt(r.soil_a, 3)}</td><td>{fmt(r.max_ratio, 2, '×')}</td><td><HazardBadge level={r.peak_level} size="sm" /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{typeof r.confidence === 'number' ? `${Math.round(r.confidence * 100)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5 }}>
              ERA5 rainfall (~25 km grid) often underestimates local downpours.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
