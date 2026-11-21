import React, { useEffect, useState } from 'react';
import HazardBadge from '../components/HazardBadge.jsx';
import DataSourceBadge from '../components/DataSourceBadge.jsx';
import { useLiveDistricts } from '../data/useLiveDistricts.js';
import { module1Api } from '../services/module1Api.js';
import { REGIONS, fmt, shortCite } from '../data/catalog.js';
import { IconFileText } from '../components/icons.jsx';

function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// Situation report built only from live API data. Every number shows its source; missing
// values print as "—" instead of being filled in.
export default function Reports({ selection, selectDistrict }) {
  const live = useLiveDistricts();
  const districtId = selection?.districtId && live.byId[selection.districtId] ? selection.districtId : (live.list[0]?.id || null);
  const [detail, setDetail] = useState(null);
  const [infra, setInfra] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!districtId) return undefined;
    let alive = true;
    const d = live.byId[districtId];
    setLoading(true); setDetail(null); setInfra(null);
    Promise.all([module1Api.getDistrictDetail(districtId), module1Api.getInfrastructure(d.lat, d.lon, d.name, 6.0)])
      .then(([det, inf]) => { if (alive) { setDetail(det); setInfra(inf); setLoading(false); } });
    return () => { alive = false; };
  }, [districtId]);

  const d = detail;
  const w = d?.weather || {};
  const ev = d?.evaluation;
  const generated = new Date();

  function exportCSV() {
    if (!d) return;
    const rows = [['Field', 'Value', 'Source']];
    rows.push(['District', `${d.name}, ${d.state}`, 'SANKET registry']);
    rows.push(['Level', d.level, 'Published rainfall threshold rule']);
    rows.push(['Rain / threshold', d.ratio, ev?.region?.citation]);
    rows.push(['Governing window (h)', d.governing_window?.hours, '']);
    ['1', '6', '24', '72', '168'].forEach((k) => rows.push([`Rain ${k} h (mm)`, w.rain_mm?.[k], w.source]));
    rows.push(['Soil 7-28 cm (m3/m3)', w.soil_moisture_7_28cm, w.source]);
    rows.push(['Soil 28-100 cm (m3/m3)', w.soil_moisture_28_100cm, w.source]);
    rows.push(['Weather data status', d.weather_status, `window ends ${w.window_end_utc}`]);
    const govH = d.hotspots.find((h) => h.id === d.governing_hotspot) || d.hotspots[0];
    const hist = govH?.landslide_history;
    if (hist?.status === 'live') rows.push([`Recorded landslides within ${hist.radius_km} km of ${govH.id}`, hist.count, Object.entries(hist.by_source || {}).map(([k, n]) => `${k}: ${n}`).join('; ')]);
    d.hotspots.forEach((h) => rows.push([`Hotspot ${h.id}`, `${h.level} ${h.ratio ?? ''}x; slope ${h.terrain?.slope_deg ?? ''} deg; NDVI ${h.vegetation?.ndvi ?? 'n/a'}`, `${h.lat},${h.lon}`]));
    if (infra?.status && infra.status !== 'unavailable') {
      Object.entries(infra.by_category || {}).forEach(([k, v]) => rows.push([`OSM ${k} within ${infra.radius_km} km`, v, 'OpenStreetMap Overpass']));
    }
    rows.push(['Generated', generated.toISOString(), 'SANKET']);
    downloadCSV(`sanket-sitrep-${d.id}-${generated.toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div className="toolbar-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <select className="select-control" style={{ fontWeight: 700, height: 32 }} value={districtId || ''} onChange={(e) => selectDistrict?.(e.target.value)}>
            {REGIONS.map((r) => (
              <optgroup key={r} label={r}>{live.list.filter((x) => x.region === r).map((x) => <option key={x.id} value={x.id}>{x.name}, {x.state}</option>)}</optgroup>
            ))}
          </select>
          <button className="btn" onClick={exportCSV} disabled={!d}>Export CSV</button>
          <button className="btn primary" onClick={() => window.print()} disabled={!d}>Print / PDF</button>
        </div>
      </div>

      {loading && <div className="card" style={{ padding: 14 }}>Preparing report…</div>}
      {!loading && districtId && !d && <div className="card" style={{ padding: 14, color: 'var(--hazard-danger)' }}>Live district detail unavailable.</div>}

      {d && (
        <div className="card" style={{ padding: 22, lineHeight: 1.6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>SANKET LANDSLIDE SITUATION REPORT</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{d.name}, {d.state}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Generated {generated.toLocaleString()} · rain up to {w.window_end_utc ? new Date(w.window_end_utc).toLocaleString() : '—'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <HazardBadge level={d.level} />
              <div style={{ marginTop: 6 }}><DataSourceBadge compact status={d.weather_status} source={w.source} ageMinutes={w.age_minutes} /></div>
            </div>
          </div>

          <p style={{ fontSize: 13 }}>
            {typeof d.ratio === 'number' && d.ratio === 0 ? <>No rain has fallen at any of the {d.hotspots.length} monitored hotspots in the last 10 days. Level: <b>NORMAL</b>.</> : typeof d.ratio === 'number' && d.governing_window ? (
              <>The worst of {d.hotspots.length} monitored hotspots has received <b>{d.governing_window?.rain_mm} mm in the last {d.governing_window?.hours} h</b>,
                which is <b>{d.ratio.toFixed(2)}×</b> the published threshold for this region ({d.governing_window?.threshold_mm} mm).
                Level: <b>{d.level.toUpperCase()}</b>.</>
            ) : <>Rainfall data is currently unavailable for this district, so no hazard level can be given.</>}
          </p>

          <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12.5 }}>
            <thead><tr><th>Indicator</th><th>Value</th></tr></thead>
            <tbody>
              {['1', '6', '24', '72', '168'].map((k) => (
                <tr key={k}><td>Rain, last {k === '168' ? '7 days' : `${k} h`}</td><td>{fmt(w.rain_mm?.[k], 1, ' mm')}</td></tr>
              ))}
              <tr><td>Soil moisture 7-28 cm</td><td>{fmt(w.soil_moisture_7_28cm, 3, ' m³/m³')}</td></tr>
              <tr><td>Soil moisture 28-100 cm</td><td>{fmt(w.soil_moisture_28_100cm, 3, ' m³/m³')}</td></tr>
              <tr><td>Rainfall threshold</td><td>{ev?.region?.label} ({shortCite(ev?.region?.citation)})</td></tr>
              {(() => {
                const gov = d.hotspots.find((h) => h.id === d.governing_hotspot) || d.hotspots[0];
                const hist = gov?.landslide_history;
                return (
                  <tr><td>Past landslides within {hist?.radius_km ?? 10} km</td>
                    <td>{hist?.status === 'live' ? `${hist.count}${hist.latest_year ? ` (latest ${hist.latest_year})` : ''}` : '—'}</td></tr>
                );
              })()}
            </tbody>
          </table></div>

          <div style={{ fontWeight: 800, marginTop: 16 }}>Hotspots</div>
          <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12 }}>
            <thead><tr><th>Hotspot</th><th>Level</th><th>Rain ÷ threshold</th><th>Slope</th><th>Elevation</th><th>NDVI</th></tr></thead>
            <tbody>
              {d.hotspots.map((h) => (
                <tr key={h.id}>
                  <td>{h.id}</td><td><HazardBadge level={h.level} size="sm" /></td>
                  <td>{fmt(h.ratio, 2, '×')}</td><td>{fmt(h.terrain?.slope_deg, 1, '°')}</td><td>{fmt(h.terrain?.elevation_m, 0, ' m')}</td>
                  <td>{h.vegetation?.status === 'unavailable' ? '—' : fmt(h.vegetation?.ndvi, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>

          <div style={{ fontWeight: 800, marginTop: 16 }}>Infrastructure within {infra?.radius_km ?? 6} km of the district centre</div>
          {!infra || infra.status === 'unavailable' ? (
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>OpenStreetMap unavailable{infra?.reason ? `: ${infra.reason}` : ''}.</div>
          ) : (
            <div style={{ fontSize: 12.5 }}>
              {Object.entries(infra.by_category || {}).map(([k, v]) => `${v} ${k}`).join(' · ') || 'No tagged assets found'}
              {' '}({infra.high_risk_count} within {infra.proximity_bands_km?.[0] ?? 2.2} km){infra.status === 'stale' ? ' — last real OSM response' : ''}
            </div>
          )}
          <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 14 }}>
            Sources: rainfall and soil moisture from ECMWF IFS via Open-Meteo (weather-model values, not rain gauges) · terrain from Copernicus GLO-30 · vegetation from Sentinel-2 · infrastructure from OpenStreetMap.
          </div>
        </div>
      )}
    </div>
  );
}
