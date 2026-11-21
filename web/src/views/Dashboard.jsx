import React, { useMemo, useState } from 'react';
import KpiCard from '../components/KpiCard.jsx';
import HazardBadge from '../components/HazardBadge.jsx';
import DataSourceBadge from '../components/DataSourceBadge.jsx';
import LiveGisLeafletMap from '../components/LiveGisLeafletMap.jsx';
import { useLiveDistricts } from '../data/useLiveDistricts.js';
import { HAZARD_LEVELS, REGIONS, SEVERITY, fmt } from '../data/catalog.js';
import { IconMap } from '../components/icons.jsx';

function downloadCSV(filename, headers, rows) {
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export default function Dashboard({ selection, selectDistrict, goTo }) {
  const live = useLiveDistricts();
  const [regionFilter, setRegionFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [showHotspots, setShowHotspots] = useState(true);
  const [showEvents, setShowEvents] = useState(false);
  const [bigMap, setBigMap] = useState(false);

  const counts = live.data?.counts || {};
  const rows = useMemo(() => live.list
    .filter((d) => (regionFilter === 'all' || d.region === regionFilter) && (levelFilter === 'all' || d.level === levelFilter))
    .sort((a, b) => (SEVERITY[b.level] - SEVERITY[a.level]) || ((b.ratio || 0) - (a.ratio || 0))), [live.list, regionFilter, levelFilter]);

  const rains = live.list.map((d) => d.weather?.rain_mm?.['24']).filter((v) => typeof v === 'number');
  const avgRain = rains.length ? rains.reduce((a, b) => a + b, 0) / rains.length : null;
  const rateLimited = live.list.some((d) => d.weather_issue === 'rate_limited' || /HTTP 429/.test(d.weather?.reason || ''));
  const hotspotCount = live.list.reduce((s, d) => s + (d.hotspots || []).length, 0);

  function exportCSV() {
    downloadCSV('sanket-districts-live.csv',
      ['District', 'State', 'Level', 'Ratio to threshold', 'Governing window (h)', 'Rain 24h (mm)', 'Rain 72h (mm)', 'Soil 7-28cm (m3/m3)', 'Data status', 'Threshold', 'Evaluated at'],
      rows.map((d) => [d.name, d.state, d.level, d.ratio, d.governing_window?.hours, d.weather?.rain_mm?.['24'], d.weather?.rain_mm?.['72'],
        d.weather?.soil_moisture_7_28cm, d.weather_status, d.threshold_region?.label, d.evaluated_at]));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--text-muted)' }}>
        {live.data && <span>Updated {new Date(live.data.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {live.list.length} districts · {hotspotCount} hotspots</span>}
        <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => live.refresh(true)} disabled={live.loading}>
          {live.loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {!live.data && <div className="card" style={{ padding: 20, color: live.loading ? undefined : 'var(--hazard-danger)' }}>{live.loading ? 'Loading live data for all districts…' : live.error}</div>}

      {live.data && (
        <>
          {rateLimited && <div className="card" role="status" style={{ padding: '12px 16px' }}>
            Open-Meteo’s request limit was reached. Districts without a saved reading show “No data”.
          </div>}
          <div className="grid kpi-row">
            <KpiCard label="DANGER" value={String(counts.danger ?? 0)} tone="danger" />
            <KpiCard label="WARNING" value={String(counts.warning ?? 0)} tone="warning" />
            <KpiCard label="WATCH" value={String(counts.watch ?? 0)} tone="watch" />
            <KpiCard label="NORMAL" value={String(counts.normal ?? 0)} />
            <KpiCard label="NO DATA" value={String(counts.unknown ?? 0)} />
            <KpiCard label="AVG RAIN 24 H" value={avgRain == null ? '—' : `${avgRain.toFixed(1)} mm`} />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IconMap width={14} height={14} /><b>Risk map</b></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <label style={{ display: 'flex', gap: 5, cursor: 'pointer' }}><input type="checkbox" checked={showHotspots} onChange={() => setShowHotspots((v) => !v)} /> Hotspots</label>
                <label style={{ display: 'flex', gap: 5, cursor: 'pointer' }}><input type="checkbox" checked={showEvents} onChange={() => setShowEvents((v) => !v)} /> Past disasters</label>
                <button className="btn" style={{ padding: '2px 9px', fontSize: 11 }} onClick={() => setBigMap((v) => !v)}>{bigMap ? 'Smaller map' : 'Bigger map'}</button>
              </span>
            </div>
            <LiveGisLeafletMap districts={live.list} selectedDistrictId={selection?.districtId}
              onSelectDistrict={(id) => goTo('monitor', { districtId: id })}
              showHotspots={showHotspots} showEvents={showEvents} height={bigMap ? 760 : 460} />
          </div>

          <div className="card">
            <div className="card-head" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div className="card-title">Districts</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <select className="select-control" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                  <option value="all">All regions</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select className="select-control" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                  <option value="all">All levels</option>
                  {[...HAZARD_LEVELS, 'unknown'].map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={exportCSV}>Export CSV</button>
              </div>
            </div>
            <div className="table-scroll" style={{ overflowX: 'auto' }}>
              <table className="data-table nowrap-num" style={{ width: '100%', fontSize: 12.5 }}>
                <thead>
                  <tr><th>District</th><th>Level</th><th>Rain ÷ threshold</th><th>Confidence</th><th>Rain 24 h</th><th>Rain 72 h</th><th>Soil moisture</th></tr>
                </thead>
                <tbody>
                  {rows.map((d) => (
                    <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => goTo('monitor', { districtId: d.id })}>
                      <td><b>{d.name}</b><div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{d.state}</div></td>
                      <td style={{ whiteSpace: 'nowrap' }}><HazardBadge level={d.level} size="sm" />
                        {d.weather_status !== 'live' && <span style={{ marginLeft: 6 }}><DataSourceBadge compact status={d.weather_status} ageMinutes={d.weather?.age_minutes} /></span>}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{typeof d.ratio === 'number' ? `${d.ratio.toFixed(2)}×${d.governing_window ? ` · ${d.governing_window.hours} h` : ''}` : '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{typeof d.confidence === 'number' ? `${Math.round(d.confidence * 100)}%` : '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{fmt(d.weather?.rain_mm?.['24'], 1, ' mm')}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{fmt(d.weather?.rain_mm?.['72'], 1, ' mm')}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{fmt(d.weather?.soil_moisture_7_28cm, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
