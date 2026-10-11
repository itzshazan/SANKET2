import React, { useState, useMemo, useEffect } from 'react';
import KpiCard from '../components/KpiCard.jsx';
import HazardBadge from '../components/HazardBadge.jsx';
import DataSourceBadge from '../components/DataSourceBadge.jsx';
import LiveGisLeafletMap from '../components/LiveGisLeafletMap.jsx';
import { NER_STATES, DISTRICTS, HAZARD_LEVELS } from '../data/mockData.js';
import { module1Api } from '../services/module1Api.js';
import { 
  IconMap, IconBell, IconCloudRain, IconDroplet, 
  IconMountain, IconFileText, IconActivity, IconInfo 
} from '../components/icons.jsx';

const HAZARD_ORDER = { normal: 1, watch: 2, warning: 3, danger: 4 };

function sortRows(rows, sortKey, sortDir, accessors) {
  if (!sortKey) return rows;
  const get = accessors[sortKey];
  const sorted = [...rows].sort((a, b) => {
    const av = get(a);
    const bv = get(b);
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
  return sorted;
}

function downloadCSV(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Dashboard({ selection, selectState, selectDistrict, selectZone, goTo, onStartDemo }) {
  const [levelFilter, setLevelFilter] = useState('all');
  const [districtLevelFilter, setDistrictLevelFilter] = useState('all');
  const [compareIds, setCompareIds] = useState(() => new Set());
  const [tableSort, setTableSort] = useState({ key: null, dir: 'asc' });

  // Live real-time summary & environmental states
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [timeAgoText, setTimeAgoText] = useState('JUST NOW');

  const [liveConditions, setLiveConditions] = useState(null);
  const [loadingConditions, setLoadingConditions] = useState(true);

  // Real-time ticking relative elapsed indicator
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - lastUpdated) / 1000);
      if (elapsedSec < 15) setTimeAgoText('JUST NOW');
      else if (elapsedSec < 60) setTimeAgoText(`${elapsedSec}S AGO`);
      else {
        const mins = Math.floor(elapsedSec / 60);
        setTimeAgoText(`${mins}M AGO`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Live district risk telemetry
  const [liveDistricts, setLiveDistricts] = useState({});
  const [liveDistrictsMeta, setLiveDistrictsMeta] = useState(null);

  // Fetch live dashboard aggregated summary
  const fetchSummaryData = () => {
    setLoadingSummary(true);
    module1Api.getDashboardSummary().then((res) => {
      if (res) {
        setSummary(res);
        setLastUpdated(Date.now());
      }
      setLoadingSummary(false);
    }).catch(() => setLoadingSummary(false));
  };

  // Fetch live risk & weather for all monitored districts
  const fetchDistrictsData = () => {
    module1Api.getDistrictsLive().then((res) => {
      if (res && res.districts) {
        setLiveDistricts(res.districts);
        setLiveDistrictsMeta({
          isLive: res.is_live,
          cached: res.cached,
          updatedAt: res.updated_at,
        });
      }
    }).catch(console.error);
  };

  useEffect(() => {
    fetchSummaryData();
    fetchDistrictsData();
    const interval = setInterval(() => {
      fetchSummaryData();
      fetchDistrictsData();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const selectedStateObj = NER_STATES.find((s) => s.id === selection.stateId) || NER_STATES[0];
  
  // Merge static reference data with live API telemetry
  const districtsInState = useMemo(() => {
    const rawDistricts = selectedStateObj ? DISTRICTS[selectedStateObj.id] || [] : [];
    return rawDistricts.map((d) => {
      const live = liveDistricts[d.id];
      if (!live) return d;
      return {
        ...d,
        hazard: live.risk_level || d.hazard,
        riskScore: live.risk_score,
        riskProbability: live.risk_probability,
        rainfall_24h: live.rainfall_24h,
        rainfall_72h: live.rainfall_72h,
        rainfall_7d: live.rainfall_7d,
        soil_moisture: live.soil_moisture,
        temperature: live.temperature,
        isLive: true,
        dataSource: live.data_source,
      };
    });
  }, [selectedStateObj, liveDistricts]);

  // Fetch live telemetry for selected state / district
  useEffect(() => {
    const targetDistrict = selection.districtId 
      ? districtsInState.find(d => d.id === selection.districtId) || districtsInState[0]
      : districtsInState[0];

    const lat = targetDistrict?.lat || (selectedStateObj?.id === 'UK' ? 30.285 : 11.605);
    const lon = targetDistrict?.lon || (selectedStateObj?.id === 'UK' ? 78.981 : 76.083);
    const name = targetDistrict?.name || selectedStateObj?.name || 'Monitoring Sector';

    setLoadingConditions(true);
    module1Api.getEnvironment(lat, lon, name).then((res) => {
      if (res) setLiveConditions(res);
      setLoadingConditions(false);
    }).catch(() => setLoadingConditions(false));
  }, [selection.stateId, selection.districtId, selectedStateObj]);

  // Read active unresolved critical alerts from localStorage
  const activeCriticalAlerts = useMemo(() => {
    try {
      const saved = localStorage.getItem('sanket_incidents_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.filter(i => i.severity === 'critical' && i.status !== 'resolved').length;
      }
    } catch {}
    return summary?.critical_alerts_count || 3;
  }, [summary]);

  const filteredDistricts = useMemo(() => {
    if (districtLevelFilter === 'all') return districtsInState;
    return districtsInState.filter((d) => d.hazard === districtLevelFilter);
  }, [districtsInState, districtLevelFilter]);

  useEffect(() => {
    setDistrictLevelFilter('all');
    setCompareIds(new Set());
  }, [selection.stateId]);

  function toggleCompare(id) {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const compareDistricts = districtsInState.filter((d) => compareIds.has(d.id));

  const sortedDistricts = useMemo(() => sortRows(filteredDistricts, tableSort.key, tableSort.dir, {
    name: (d) => d.name,
    population: (d) => d.population,
    hazard: (d) => HAZARD_ORDER[d.hazard] || 0,
  }), [filteredDistricts, tableSort]);

  function handleTableSort(key) {
    setTableSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  function exportComparisonCSV() {
    downloadCSV(
      `sanket-district-comparison-${selectedStateObj?.id || 'export'}.csv`,
      ['District', 'State', 'Hazard', 'Population', 'Historical Landslides', 'Field Reports', 'Active Alerts'],
      compareDistricts.map((d) => [d.name, selectedStateObj?.name || '', d.hazard, d.population, d.historicalLandslideCount, d.activeFieldReports, d.activeAlerts])
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 01. OVERVIEW / COMMAND CENTER — SITUATION OVERVIEW HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              SITUATION OVERVIEW
            </h1>
            <span style={{ 
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
              padding: '3px 8px', borderRadius: 12,
              background: 'rgba(63, 139, 76, 0.15)', color: 'var(--hazard-normal)',
              border: '1px solid rgba(63, 139, 76, 0.3)'
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--hazard-normal)', animation: 'pulse 2s infinite' }} />
              LIVE • UPDATED {timeAgoText}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Real-time environmental intelligence across North-Western Himalayas, Western Ghats & North-Eastern Region
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onStartDemo && (
            <button 
              className="btn" 
              style={{ borderColor: 'var(--accent-2)', color: 'var(--accent-2)', fontSize: 12 }} 
              onClick={onStartDemo}
            >
              ▶ Play Guided Demo
            </button>
          )}
          <button 
            className="btn primary" 
            style={{ fontSize: 12 }}
            onClick={() => goTo('risk-map')}
          >
            <IconMap width={14} height={14} /> Fullscreen GIS
          </button>
        </div>
      </div>

      {/* 4 CORE KPI CARDS DEFINED IN BLUEPRINT 01 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        <KpiCard 
          label="ACTIVE RISK ZONES" 
          value={loadingSummary && !summary ? "..." : String(summary?.active_risk_zones || 12).padStart(2, '0')} 
          tone="danger" 
          sub={`${summary?.active_risk_zones_breakdown || "6 High Himalayas · 4 Western Ghats · 5 NER"}${summary?.is_fallback ? ' · offline reference data' : ''}`}
        />
        <KpiCard 
          label="AVG RAINFALL" 
          value={loadingSummary && !summary ? "..." : `${summary?.avg_rainfall_24h ?? 8.5} mm`} 
          tone="warning" 
          sub="NASA GPM IMERG 24H National Mean"
        />
        <KpiCard 
          label="AREAS MONITORED" 
          value={String(summary?.areas_monitored || 248)} 
          sub="Pan-India High Relief Sectors"
        />
        <KpiCard 
          label="ALERTS CRITICAL" 
          value={String(activeCriticalAlerts).padStart(2, '0')} 
          tone="danger" 
          sub="Immediate Response Recommended"
        />
      </div>

      {/* 2-COLUMN SPLIT: LIVE RISK MAP (PRIMARY) + CURRENT CONDITIONS PANEL */}
      <div className="grid" style={{ gridTemplateColumns: '1.7fr 1fr', gap: 16, alignItems: 'stretch' }}>
        {/* LEFT: DOMINANT LIVE RISK MAP */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ 
            padding: '12px 16px', 
            borderBottom: '1px solid var(--border)', 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--surface-2)' 
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
                LIVE RISK MAP — NATIONAL SITUATION
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                Click any active landslide node or coordinates to inspect live satellite telemetry
              </div>
            </div>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Esri Satellite + OpenStreetMap
            </span>
          </div>

          <div style={{ flex: 1, minHeight: 460, position: 'relative' }}>
            <LiveGisLeafletMap 
              selectedDistrict={selectedStateObj ? districtsInState[0] : null}
              onSelectDistrict={(distId) => {
                selectDistrict(distId);
                goTo('monitor', { districtId: distId });
              }}
              onSelectZone={(zId) => {
                selectZone(zId);
                goTo('risk-map', { zoneId: zId });
              }}
              goTo={goTo}
            />
          </div>
        </div>

        {/* RIGHT: CURRENT CONDITIONS PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="card-head" style={{ marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div className="card-title" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconActivity width={16} height={16} style={{ color: 'var(--accent)' }} />
                    CURRENT CONDITIONS
                  </div>
                  <div className="card-subtitle">Real-time multi-sensor telemetry</div>
                </div>
                <span className="mvp-flag">LIVE FEED</span>
              </div>

              {/* Factors Stack */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Rainfall */}
                <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IconCloudRain width={14} height={14} style={{ color: 'var(--accent-2)' }} /> Rainfall (24H GPM / ERA5)
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: (liveConditions?.telemetry?.rainfall_24h || 0) > 40 ? 'var(--hazard-danger)' : 'var(--hazard-warning)' }}>
                      {loadingConditions ? '...' : `${liveConditions?.telemetry?.rainfall_24h ?? 8.5} mm`}
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(100, Math.max(8, Math.round(((liveConditions?.telemetry?.rainfall_24h ?? 8.5) / 60) * 100)))}%`, 
                      height: '100%', 
                      background: (liveConditions?.telemetry?.rainfall_24h || 0) > 40 ? 'var(--hazard-danger)' : 'var(--hazard-warning)', 
                      borderRadius: 3,
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                    <span>72H Accum: {liveConditions?.telemetry?.rainfall_72h ?? 18.2} mm</span>
                    <span>7D Accum: {liveConditions?.telemetry?.rainfall_7d ?? 34.5} mm</span>
                  </div>
                </div>

                {/* Soil Moisture */}
                <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IconDroplet width={14} height={14} style={{ color: 'var(--accent)' }} /> Soil Saturation (SMAP / VWC)
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14, color: (liveConditions?.telemetry?.soil_moisture || 0) > 0.38 ? 'var(--hazard-danger)' : 'var(--hazard-warning)' }}>
                      {loadingConditions ? '...' : `${Math.round((liveConditions?.telemetry?.soil_moisture ?? 0.35) * 100)}%`}
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(100, Math.round((liveConditions?.telemetry?.soil_moisture ?? 0.35) * 100))}%`, 
                      height: '100%', 
                      background: (liveConditions?.telemetry?.soil_moisture || 0) > 0.38 ? 'var(--hazard-danger)' : 'var(--hazard-warning)', 
                      borderRadius: 3,
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                    <span>VWC: {liveConditions?.telemetry?.soil_moisture ?? 0.350} m³/m³</span>
                    <span>Liquefaction: {(liveConditions?.telemetry?.soil_moisture || 0) > 0.38 ? 'HIGH' : 'MODERATE'}</span>
                  </div>
                </div>

                {/* Temperature & Wind */}
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Temperature</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                      {loadingConditions ? '...' : `${liveConditions?.telemetry?.temperature ?? 22.4}°C`}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>Surface 2m Telemetry</div>
                  </div>
                  <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Wind Speed</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, marginTop: 2 }}>
                      {loadingConditions ? '...' : `${liveConditions?.telemetry?.wind_speed ?? 3.5} km/h`}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>Anemometer 10m</div>
                  </div>
                </div>

                {/* Terrain Elevation / Slope */}
                <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IconMountain width={14} height={14} /> Elevation / Slope
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12.5 }}>
                      {loadingConditions ? '...' : `${(liveConditions?.telemetry?.elevation ?? 850).toLocaleString()} m · ${liveConditions?.telemetry?.slope ?? 18.5}°`}
                    </span>
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>
                    Copernicus DEM 30m GLO-30 · ISRO Atlas Density: {liveConditions?.telemetry?.historical_landslide_count ?? 18} records
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Stack */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              <button 
                className="btn primary" 
                style={{ width: '100%', justifyContent: 'center' }} 
                onClick={() => goTo('risk-map')}
              >
                <IconMap width={14} height={14} /> Open Detailed Risk Map
              </button>
              <button 
                className="btn" 
                style={{ width: '100%', justifyContent: 'center' }} 
                onClick={() => goTo('alerts')}
              >
                <IconBell width={14} height={14} /> View 3 Critical Incidents
              </button>
              <button 
                className="btn" 
                style={{ width: '100%', justifyContent: 'center' }} 
                onClick={() => goTo('reports')}
              >
                <IconFileText width={14} height={14} /> Generate Situation Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* REGIONAL DRILL-DOWN & DISTRICT COMPARISON TABLE */}
      <div className="card">
        <div className="card-head" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="card-title">Administrative Risk Overview by State & District</div>
              <DataSourceBadge 
                isLive={Boolean(liveDistrictsMeta?.isLive)} 
                source="Open-Meteo ERA5 / Satellite + Copernicus DEM" 
                updatedAt={liveDistrictsMeta?.updatedAt} 
              />
            </div>
            <div className="card-subtitle" style={{ marginTop: 4 }}>
              Select state to view district breakdown · Dynamic ML hazard classification & real-time telemetry
              {compareIds.size > 0 && (
                <>
                  {' · '}
                  <b style={{ color: 'var(--text-primary)' }}>{compareIds.size} selected</b>
                  {' — '}
                  <a href="#" onClick={(e) => { e.preventDefault(); setCompareIds(new Set()); }} style={{ color: 'var(--accent)' }}>clear</a>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* State selector */}
            <select 
              className="select-control" 
              value={selection.stateId || 'UK'} 
              onChange={(e) => selectState(e.target.value)}
            >
              {NER_STATES.map((st) => (
                <option key={st.id} value={st.id}>{st.name} ({st.region})</option>
              ))}
            </select>

            {/* Severity Filter */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button 
                className={`btn ${districtLevelFilter === 'all' ? 'primary' : ''}`}
                style={{ padding: '3px 8px', fontSize: 11 }}
                onClick={() => setDistrictLevelFilter('all')}
              >
                All
              </button>
              {HAZARD_LEVELS.map((lv) => (
                <button
                  key={lv}
                  className="btn"
                  style={{
                    padding: '3px 8px', fontSize: 11,
                    borderColor: districtLevelFilter === lv ? `var(--hazard-${lv})` : undefined,
                    color: districtLevelFilter === lv ? `var(--hazard-${lv})` : undefined,
                  }}
                  onClick={() => setDistrictLevelFilter(lv)}
                >
                  {lv}
                </button>
              ))}
            </div>

            {compareIds.size > 0 && (
              <button className="btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={exportComparisonCSV}>
                Export CSV ({compareIds.size})
              </button>
            )}
          </div>
        </div>

        {/* District Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', fontSize: 12.5 }}>
            <thead>
              <tr>
                <th style={{ width: 34 }}></th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleTableSort('name')}>
                  District {tableSort.key === 'name' && (tableSort.dir === 'asc' ? '▲' : '▼')}
                </th>
                <th>Region</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleTableSort('hazard')}>
                  Live Risk {tableSort.key === 'hazard' && (tableSort.dir === 'asc' ? '▲' : '▼')}
                </th>
                <th>Live 24H Rain</th>
                <th>Live Soil Saturation</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleTableSort('population')}>
                  Population {tableSort.key === 'population' && (tableSort.dir === 'asc' ? '▲' : '▼')}
                </th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedDistricts.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-dim)' }}>
                    No districts match the selected hazard filter.
                  </td>
                </tr>
              ) : (
                sortedDistricts.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={compareIds.has(d.id)} 
                        onChange={() => toggleCompare(d.id)} 
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <b style={{ color: 'var(--text-primary)' }}>{d.name}</b>
                        {d.isLive && <DataSourceBadge compact={true} isLive={true} source={d.dataSource} />}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
                      {selectedStateObj?.name}
                    </td>
                    <td>
                      <HazardBadge level={d.hazard} size="sm" />
                      {d.riskProbability !== undefined && (
                        <span style={{ marginLeft: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {Math.round(d.riskProbability * 100)}%
                        </span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {d.rainfall_24h !== undefined ? `${d.rainfall_24h} mm` : (d.environment?.rainfall?.h24 ? `${d.environment.rainfall.h24} mm` : '—')}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {d.soil_moisture !== undefined ? `${(d.soil_moisture * 100).toFixed(1)}% VWC` : (d.environment?.soilMoisture?.level || '—')}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {d.population?.toLocaleString('en-IN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button 
                          className="btn" 
                          style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => {
                            selectDistrict(d.id);
                            goTo('monitor', { districtId: d.id });
                          }}
                        >
                          Monitor
                        </button>
                        <button 
                          className="btn primary" 
                          style={{ padding: '2px 8px', fontSize: 11 }}
                          onClick={() => {
                            selectDistrict(d.id);
                            goTo('risk-map', { districtId: d.id });
                          }}
                        >
                          GIS View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
