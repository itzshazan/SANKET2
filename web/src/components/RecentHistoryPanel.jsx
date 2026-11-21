import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, LineChart, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend,
} from 'recharts';
import { module1Api } from '../services/module1Api.js';
import DataSourceBadge from './DataSourceBadge.jsx';
import { fmt } from '../data/catalog.js';
import { IconBarChart } from './icons.jsx';

const RANGES = [7, 14, 30];

// Real daily rainfall, soil moisture and threshold ratio for the district's worst hotspot
// (ECMWF IFS via Open-Meteo). Formerly the separate Analytics tab.
export default function RecentHistoryPanel({ district }) {
  const [days, setDays] = useState(14);
  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(false);

  const point = useMemo(() => {
    if (!district) return null;
    const h = (district.hotspots || []).find((x) => x.id === district.governing_hotspot) || district.hotspots?.[0];
    return h ? { lat: h.lat, lon: h.lon, id: h.id } : { lat: district.lat, lon: district.lon, id: 'centre' };
  }, [district?.id, district?.governing_hotspot]);

  useEffect(() => {
    if (!point || !district) return undefined;
    let alive = true;
    setLoading(true);
    module1Api.getTimeseries(point.lat, point.lon, days, district.state).then((res) => {
      if (alive) { setSeries(res); setLoading(false); }
    });
    return () => { alive = false; };
  }, [point?.lat, point?.lon, days, district?.state]);

  const daily = (series?.daily || []).map((r) => ({ ...r, label: r.date.slice(5) }));
  const levels = series?.levels || {};
  const total = daily.reduce((s, r) => s + (r.rain_mm || 0), 0);
  const wettest = daily.reduce((m, r) => (r.rain_mm > (m?.rain_mm ?? -1) ? r : m), null);

  return (
    <div className="card">
      <div className="card-head" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconBarChart width={15} height={15} /> Last {days} days
          </div>
          <div className="card-subtitle">
            {series?.status && series.status !== 'unavailable' ? `Total ${fmt(total, 0, ' mm')}${wettest && wettest.rain_mm > 0 ? ` · wettest ${fmt(wettest.rain_mm, 0, ' mm')} on ${wettest.date.slice(5)}` : ''}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {series?.status && series.status !== 'live' && <DataSourceBadge compact status={series.status} source={series.source} ageMinutes={series.age_minutes} />}
          {RANGES.map((n) => (
            <button key={n} className={`btn ${days === n ? 'primary' : ''}`} style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => setDays(n)}>{n} d</button>
          ))}
        </div>
      </div>

      {loading && !series && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</div>}
      {series?.status === 'unavailable' && <div style={{ fontSize: 12, color: 'var(--hazard-danger)' }}>Unavailable: {series.reason}</div>}

      {series && series.status !== 'unavailable' && (
        <div className="grid stack-sm" style={{ gridTemplateColumns: '1.3fr 1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Daily rain</div>
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 9 }} unit=" mm" width={48} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 9 }} width={36} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar isAnimationActive={false} yAxisId="l" dataKey="rain_mm" name="Daily rain (mm)" fill="#028C74" />
                  <Line isAnimationActive={false} yAxisId="r" dataKey="max_hourly_mm" name="Max hourly (mm/h)" stroke="#FA5D00" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Rain ÷ threshold</div>
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} width={30} />
                  <Tooltip />
                  <ReferenceLine y={levels.watch} stroke="#C9971F" strokeDasharray="4 3" />
                  <ReferenceLine y={levels.warning} stroke="#E5600A" strokeDasharray="4 3" />
                  <ReferenceLine y={levels.danger} stroke="#B42318" strokeDasharray="4 3" />
                  <Bar isAnimationActive={false} dataKey="max_ratio" name="Peak ratio" fill="#013126" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>Soil moisture</div>
            <div style={{ height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} width={40} domain={['auto', 'auto']} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line isAnimationActive={false} dataKey="soil_a" name="7-28 cm" stroke="#028C74" dot={false} />
                  <Line isAnimationActive={false} dataKey="soil_b" name="28-100 cm" stroke="#013126" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
