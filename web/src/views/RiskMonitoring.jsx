import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import HazardBadge from '../components/HazardBadge.jsx';
import DataSourceBadge from '../components/DataSourceBadge.jsx';
import LiveGisLeafletMap from '../components/LiveGisLeafletMap.jsx';
import RecentHistoryPanel from '../components/RecentHistoryPanel.jsx';
import { useLiveDistricts } from '../data/useLiveDistricts.js';
import { module1Api } from '../services/module1Api.js';
import { REGIONS, fmt, HAZARD_COLOR, shortCite } from '../data/catalog.js';
import { IconCloudRain, IconDroplet, IconMountain, IconActivity, IconClock } from '../components/icons.jsx';

const RAIN_CARDS = [
  { key: '1', label: 'LAST 1 H' }, { key: '6', label: 'LAST 6 H' }, { key: '24', label: 'LAST 24 H' },
  { key: '72', label: 'LAST 72 H' }, { key: '168', label: 'LAST 7 DAYS' },
];

function Card({ title, icon, children, sub }) {
  return (
    <div className="card" style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)' }}>
        {title}{icon}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 21, fontWeight: 800, marginTop: 4 }}>{children}</div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function RiskMonitoring({ selection, selectDistrict }) {
  const live = useLiveDistricts();
  const districtId = selection?.districtId && live.byId[selection.districtId] ? selection.districtId : (live.list[0]?.id || null);
  const summary = districtId ? live.byId[districtId] : null;

  const summaryWindow = summary?.weather?.window_end_utc;
  const summaryStatus = summary?.weather_status;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!districtId) return undefined;
    let alive = true;
    setLoading(true); setFailed(false); setDetail(null);
    module1Api.getDistrictDetail(districtId).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res) setDetail(res); else setFailed(true);
    });
    return () => { alive = false; };
  }, [districtId, summaryWindow, summaryStatus]);

  const d = detail || summary;
  const w = d?.weather || {};
  const rateLimited = d?.weather_issue === 'rate_limited' || /HTTP 429/.test(w.reason || '');
  const ev = detail?.evaluation;
  const hourly = useMemo(() => (detail?.weather?.hourly_rain_72h || []).map((h) => ({
    t: new Date(h.time).toLocaleString('en-IN', { day: '2-digit', hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }),
    mm: h.mm ?? 0,
  })), [detail]);

  if (!live.data && live.loading) return <div className="card" style={{ padding: 24 }}>Loading live district data…</div>;
  if (!live.data) return <div className="card" style={{ padding: 24, color: 'var(--hazard-danger)' }}>{live.error || 'Live data unavailable.'}</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <select className="select-control" style={{ fontWeight: 700, height: 32 }} value={districtId || ''} onChange={(e) => selectDistrict?.(e.target.value)}>
          {REGIONS.map((r) => (
            <optgroup key={r} label={r}>
              {live.list.filter((x) => x.region === r).map((x) => (
                <option key={x.id} value={x.id}>{x.name}, {x.state}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {d && <HazardBadge level={d.level} />}
        {d && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--text-muted)' }}>
          {typeof d.ratio === 'number' ? `${d.ratio.toFixed(2)}× threshold` : 'no rainfall data'}
        </span>}
        {d && <span title="Trained model: chance of a recorded landslide near the worst hotspot today"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 800, padding: '3px 9px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          Confidence {typeof d.confidence === 'number' ? `${Math.round(d.confidence * 100)}%` : '—'}
        </span>}
        {d && <DataSourceBadge compact status={d.weather_status} source="ECMWF IFS hourly via Open-Meteo" updatedAt={w.window_end_utc} ageMinutes={w.age_minutes} />}
        {w.window_end_utc && <span style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
          rain up to {new Date(w.window_end_utc).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST
        </span>}
      </div>

      {rateLimited && <div className="card" role="status" style={{ padding: '12px 16px' }}>
        Open-Meteo’s request limit was reached. The last available readings are marked stale.
      </div>}

      {/* Map of this district's hotspots */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '9px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 12, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <b>Hotspots ({(d?.hotspots || []).length})</b>
          <span style={{ color: 'var(--text-dim)' }}>the district shows the worst one</span>
        </div>
        <LiveGisLeafletMap districts={d ? [d] : []} selectedDistrictId={districtId} height={400} />
      </div>

      {/* Rainfall windows */}
      <div className="grid tiles-sm-2" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
        {RAIN_CARDS.map((c) => (
          <Card key={c.key} title={`RAIN ${c.label}`} icon={<IconCloudRain width={14} height={14} />}
            sub={w.status === 'stale' ? 'last real reading' : null}>
            {fmt(w.rain_mm?.[c.key], 1)} <span style={{ fontSize: 12 }}>mm</span>
          </Card>
        ))}
      </div>

      <div className="grid tiles-sm-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        <Card title="SOIL MOISTURE 7-28 cm" icon={<IconDroplet width={14} height={14} />}>
          {fmt(w.soil_moisture_7_28cm, 3)} <span style={{ fontSize: 12 }}>m³/m³</span>
        </Card>
        <Card title="SOIL MOISTURE 28-100 cm" icon={<IconDroplet width={14} height={14} />}>
          {fmt(w.soil_moisture_28_100cm, 3)} <span style={{ fontSize: 12 }}>m³/m³</span>
        </Card>
        <Card title="TEMPERATURE" icon={<IconActivity width={14} height={14} />}>
          {fmt(w.temperature_c, 1, '°C')}
        </Card>
        <Card title="WIND" icon={<IconMountain width={14} height={14} />} sub={`gusts ${fmt(w.wind_gust_kmh, 0, ' km/h')}`}>
          {fmt(w.wind_kmh, 0)} <span style={{ fontSize: 12 }}>km/h</span>
        </Card>
      </div>

      {d && <RecentHistoryPanel district={d} />}

      {loading && <div className="card" style={{ padding: 14, fontSize: 12.5 }}>Loading hotspot details…</div>}
      {failed && <div className="card" style={{ padding: 14, fontSize: 12.5, color: 'var(--hazard-danger)' }}>Hotspot details unavailable.</div>}

      {detail && (
        <>
          <div className="grid stack-sm" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
            {/* Hourly rain chart */}
            <div className="card">
              <div className="card-head">
                <div className="card-title" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><IconClock width={14} height={14} /> Hourly rain, last 72 h</div>
              </div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="t" tick={{ fontSize: 9 }} interval={11} />
                    <YAxis tick={{ fontSize: 10 }} unit=" mm" width={50} />
                    <Tooltip />
                    <Bar isAnimationActive={false} dataKey="mm" fill="#028C74" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Threshold evaluation */}
            <div className="card">
              <div className="card-head"><div>
                <div className="card-title">Why this level</div>
                <div className="card-subtitle">Rain vs the {ev?.region?.label} threshold</div>
              </div></div>
              {ev?.windows?.length ? (
                <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12 }}>
                  <thead><tr><th>Window</th><th>Rain</th><th>Threshold</th><th>Ratio</th></tr></thead>
                  <tbody>
                    {ev.windows.map((r) => (
                      <tr key={r.hours} style={ev.governing_window?.hours === r.hours ? { background: 'var(--surface-2)', fontWeight: 700 } : undefined}>
                        <td>{r.hours} h</td><td>{r.rain_mm} mm</td><td>{r.threshold_mm} mm</td>
                        <td style={{ color: r.ratio >= 1 ? 'var(--hazard-warning)' : undefined }}>{r.ratio.toFixed(2)}×</td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              ) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ev?.reason || 'No rainfall data.'}</div>}
              <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 8 }} title={ev?.region?.citation}>
                Watch ≥ {ev?.levels?.watch}× · Warning ≥ {ev?.levels?.warning}× · Danger ≥ {ev?.levels?.danger}× · {shortCite(ev?.region?.citation)}
              </div>
            </div>
          </div>

          {/* Trained-model confidence */}
          {(() => {
            const h = detail.hotspots.find((x) => x.id === detail.confidence_hotspot) || detail.hotspots[0];
            const c = h?.confidence_detail;
            return (
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Landslide confidence</div>
                </div>
                {!c || c.status !== 'live' ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c?.reason || 'Confidence unavailable.'}</div> : (
                  <div className="grid stack-sm" style={{ gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'start' }}>
                    <div style={{ textAlign: 'center', padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                      <div style={{ fontSize: 40, fontWeight: 900, fontFamily: 'var(--font-mono)' }}>{Math.round(c.confidence * 100)}%</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>worst hotspot ({h.id})</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>What drives it</div>
                      {c.drivers.map((dr) => (
                        <div key={dr.factor} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid var(--border)' }}>
                          <span>{dr.factor}</span>
                          <b style={{ color: dr.points > 0 ? 'var(--hazard-warning)' : 'var(--text-muted)' }}>{dr.points > 0 ? '+' : ''}{dr.points} pts</b>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Hotspot table */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Hotspots in {detail.name}</div>
            </div>
            <div className="table-scroll" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>Hotspot</th><th>Level</th><th>Ratio</th><th>Confidence</th><th>Rain 24 h</th><th>Rain 72 h</th>
                    <th>Slope</th><th>Elevation</th><th>Vegetation (NDVI)</th><th>Past landslides ≤10 km</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.hotspots.map((h) => {
                    const t = h.terrain || {};
                    const v = h.vegetation || {};
                    const hist = h.landslide_history || {};
                    return (
                      <tr key={h.id}>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{h.id}<div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{h.lat.toFixed(4)}, {h.lon.toFixed(4)}</div></td>
                        <td><HazardBadge level={h.level} size="sm" /></td>
                        <td style={{ color: HAZARD_COLOR[h.level] }}>{typeof h.ratio === 'number' ? `${h.ratio.toFixed(2)}×` : '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{typeof h.confidence === 'number' ? `${Math.round(h.confidence * 100)}%` : '—'}</td>
                        <td>{fmt(h.rain_24h_mm, 1, ' mm')}</td>
                        <td>{fmt(h.rain_72h_mm, 1, ' mm')}</td>
                        <td>{fmt(t.slope_deg, 1, '°')}</td>
                        <td>{fmt(t.elevation_m, 0, ' m')}</td>
                        <td title={v.reason || v.period || ''}>
                          {v.status === 'unavailable' ? <span style={{ color: 'var(--text-dim)' }}>no clear image</span>
                            : <>{fmt(v.ndvi, 2)} {v.ndvi_change != null && <span style={{ color: 'var(--text-muted)' }}>({v.ndvi_change >= 0 ? '+' : ''}{v.ndvi_change.toFixed(2)})</span>}{v.status === 'stale' && ' *'}</>}
                        </td>
                        <td title={hist.status === 'live' ? Object.entries(hist.by_source || {}).map(([k, n]) => `${k}: ${n}`).join(' · ') || 'none within 10 km' : hist.reason || ''}>
                          {hist.status === 'live'
                            ? <><b>{hist.count}</b>{hist.latest_year ? <span style={{ color: 'var(--text-muted)' }}> · latest {hist.latest_year}</span> : null}
</>
                            : <span style={{ color: 'var(--text-dim)' }}>no inventory loaded</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {(() => {
            const gov = detail.hotspots.find((h) => h.id === detail.governing_hotspot) || detail.hotspots[0];
            const hist = gov?.landslide_history;
            if (!hist || hist.status !== 'live') return null;
            return (
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Past landslides within {hist.radius_km} km ({hist.count})</div>
                </div>
                {hist.nearest_events?.length ? (
                  <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12 }}>
                    <thead><tr><th>Distance</th><th>Year</th><th>Place</th><th>Trigger</th><th>Source</th></tr></thead>
                    <tbody>
                      {hist.nearest_events.map((e, i) => (
                        <tr key={i}>
                          <td>{fmt(e.distance_km, 2, ' km')}</td><td>{e.year || '—'}</td>
                          <td>{e.name || <span style={{ color: 'var(--text-dim)' }}>unnamed ({e.lat}, {e.lon})</span>}</td>
                          <td>{e.trigger || '—'}</td><td style={{ fontSize: 11 }}>{e.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                ) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No recorded landslide within {hist.radius_km} km (nearest {fmt(hist.nearest_km, 1, ' km')}).</div>}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
