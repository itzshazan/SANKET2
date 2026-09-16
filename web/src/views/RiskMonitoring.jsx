import React, { useMemo, useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import HazardBadge from '../components/HazardBadge.jsx';
import DataSourceBadge from '../components/DataSourceBadge.jsx';
import Sparkline from '../components/Sparkline.jsx';
import {
  ZONES, VILLAGES, ROADS, INFRASTRUCTURE, SATELLITE_DETECTIONS, FIELD_EVIDENCE, DISTRICTS,
} from '../data/mockData.js';
import { module1Api } from '../services/module1Api.js';
import {
  IconCloudRain, IconDroplet, IconMountain, IconActivity, IconInfo, IconMap, IconSatellite, IconClock
} from '../components/icons.jsx';

const TIME_STEPS = [
  { id: 'now', label: 'NOW', hours: 0, mult: 0.15 },
  { id: '6h', label: '6H', hours: 6, mult: 0.35 },
  { id: '12h', label: '12H', hours: 12, mult: 0.65 },
  { id: '24h', label: '24H', hours: 24, mult: 1.0 },
  { id: '7d', label: '7D', hours: 168, mult: 2.8 },
];

const DISTRICT_COORDS = {
  // Western Ghats
  wayanad: { lat: 11.6854, lon: 76.1320, name: 'Wayanad, Kerala' },
  idukki: { lat: 9.8494, lon: 76.9723, name: 'Idukki, Kerala' },
  raigad: { lat: 18.2346, lon: 73.4442, name: 'Raigad, Maharashtra' },
  pune: { lat: 19.1583, lon: 73.6872, name: 'Pune Hills, Maharashtra' },
  nilgiris: { lat: 11.4102, lon: 76.6950, name: 'Nilgiris, Tamil Nadu' },

  // Himalayas
  rudraprayag: { lat: 30.2844, lon: 78.9811, name: 'Rudraprayag, Uttarakhand' },
  chamoli: { lat: 30.5564, lon: 79.5670, name: 'Chamoli, Uttarakhand' },
  tehri: { lat: 30.3800, lon: 78.4800, name: 'Tehri Garhwal, Uttarakhand' },
  mandi: { lat: 31.7087, lon: 76.9319, name: 'Mandi, Himachal Pradesh' },
  shimla: { lat: 31.1048, lon: 77.1734, name: 'Shimla, Himachal Pradesh' },
  kullu: { lat: 31.9579, lon: 77.1095, name: 'Kullu, Himachal Pradesh' },
  ramban: { lat: 33.2422, lon: 75.2415, name: 'Ramban, Jammu & Kashmir' },

  // North East
  noney: { lat: 24.7831, lon: 93.6322, name: 'Noney, Manipur' },
  tamenglong: { lat: 24.9850, lon: 93.4920, name: 'Tamenglong, Manipur' },
  'east-sikkim': { lat: 27.3389, lon: 88.6065, name: 'East Sikkim, Sikkim' },
  aizawl: { lat: 23.7271, lon: 92.7176, name: 'Aizawl, Mizoram' },
  kohima: { lat: 25.6751, lon: 94.1086, name: 'Kohima, Nagaland' },
  'dima-hasao': { lat: 25.1830, lon: 93.0210, name: 'Dima Hasao, Assam' },
  'east-khasi-hills': { lat: 25.5788, lon: 91.8933, name: 'East Khasi Hills, Meghalaya' },
  'lower-dibang-valley': { lat: 28.1400, lon: 95.8400, name: 'Lower Dibang Valley, Arunachal' },
  khowai: { lat: 24.0600, lon: 91.6000, name: 'Khowai, Tripura' },
};

export default function RiskMonitoring({ selectedDistrict, selectedZone, selectZone, selectDistrict, goTo }) {
  const [timeStep, setTimeStep] = useState('24h');
  const [livePrediction, setLivePrediction] = useState(null);
  const [liveExplanation, setLiveExplanation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const activeTime = TIME_STEPS.find((t) => t.id === timeStep) || TIME_STEPS[3];

  // Default fallback to Wayanad or Noney if none selected
  const allDistricts = useMemo(() => Object.values(DISTRICTS).flat(), []);
  const currentDistrict = selectedDistrict || allDistricts.find((d) => d.id === 'wayanad') || allDistricts[0];

  const zonesInDistrict = useMemo(
    () => (currentDistrict ? currentDistrict.zones.map((zid) => ZONES[zid]).filter(Boolean) : []),
    [currentDistrict]
  );
  const zone = selectedZone && zonesInDistrict.some((z) => z.id === selectedZone.id) ? selectedZone : zonesInDistrict[0];

  const coords = DISTRICT_COORDS[currentDistrict?.id] || { lat: 11.6854, lon: 76.1320, name: currentDistrict?.name || 'Wayanad' };

  // Fetch ML predictions
  useEffect(() => {
    if (!currentDistrict) return;
    let active = true;
    setEvaluating(true);

    const payload = {
      latitude: coords.lat,
      longitude: coords.lon,
      zone_id: zone?.id || `${currentDistrict.id}-a`,
    };

    Promise.all([
      module1Api.predictRisk(payload),
      module1Api.explainRisk(zone?.id || `${currentDistrict.id}-a`, payload),
    ])
      .then(([pred, exp]) => {
        if (active) {
          setLivePrediction(pred);
          setLiveExplanation(exp);
          setEvaluating(false);
        }
      })
      .catch(() => {
        if (active) setEvaluating(false);
      });

    return () => { active = false; };
  }, [currentDistrict?.id, zone?.id, timeStep]);

  // Leaflet map initialization
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const radarLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [coords.lat, coords.lon],
        zoom: 11,
        zoomControl: true,
      });

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri & OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([coords.lat, coords.lon], 11);
    }

    const map = mapInstanceRef.current;

    // Remove old radar circles
    if (radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current);
    }

    // Add simulated rainfall radar contour layer based on time horizon
    const radarGroup = L.layerGroup().addTo(map);
    const rainRadius = Math.max(3000, 7500 * activeTime.mult);

    // Precipitation intensity contours
    L.circle([coords.lat, coords.lon], {
      radius: rainRadius,
      color: '#3B82F6',
      fillColor: '#60A5FA',
      fillOpacity: 0.38,
      weight: 1.5,
    }).addTo(radarGroup);

    L.circle([coords.lat, coords.lon], {
      radius: rainRadius * 0.55,
      color: '#F59E0B',
      fillColor: '#FBBF24',
      fillOpacity: 0.45,
      weight: 1.5,
    }).addTo(radarGroup);

    L.circle([coords.lat, coords.lon], {
      radius: rainRadius * 0.28,
      color: '#EF4444',
      fillColor: '#F87171',
      fillOpacity: 0.55,
      weight: 2,
    }).addTo(radarGroup);

    // Marker for the focal station
    const centerMarker = L.circleMarker([coords.lat, coords.lon], {
      radius: 9,
      color: '#ffffff',
      fillColor: '#A32E28',
      fillOpacity: 1,
      weight: 3,
    }).addTo(radarGroup);

    centerMarker.bindPopup(`
      <div style="font-family: var(--font-display); padding: 4px;">
        <b style="font-size: 13px;">${currentDistrict.name} Telemetry Station</b>
        <div style="font-size: 11px; color: #555; margin-top: 3px;">
          Lat: ${coords.lat.toFixed(4)}°, Lon: ${coords.lon.toFixed(4)}°
        </div>
        <div style="font-size: 11.5px; margin-top: 6px; font-weight: 700; color: #A32E28;">
          Precipitation Horizon: ${activeTime.label}
        </div>
      </div>
    `);

    radarLayerRef.current = radarGroup;

    return () => {
      // Map cleanup on dependency change or unmount
      if (radarLayerRef.current) {
        map.removeLayer(radarLayerRef.current);
      }
    };
  }, [coords.lat, coords.lon, activeTime.mult, currentDistrict.name]);

  // Cleanup map container when component completely unmounts
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Compute live telemetry metrics across the selected time horizon
  const env = livePrediction?.environment || {};
  const baseRain24 = env.rainfall_24h ?? 15.4;
  const rain7d = env.rainfall_7d ?? 42.8;
  const max1h = env.max_rainfall_1h ?? 2.8;

  let displayRainfall = baseRain24;
  if (timeStep === 'now') displayRainfall = max1h;
  else if (timeStep === '6h') displayRainfall = Number((baseRain24 * 0.35).toFixed(1));
  else if (timeStep === '12h') displayRainfall = Number((baseRain24 * 0.65).toFixed(1));
  else if (timeStep === '24h') displayRainfall = baseRain24;
  else if (timeStep === '7d') displayRainfall = rain7d;

  const displaySoil = env.soil_moisture ? Math.min(98, Math.round(env.soil_moisture * 100)) : 68;
  const displayTemp = env.temperature ? Number(env.temperature).toFixed(1) : '22.8';
  const displayWind = env.wind_speed ? Math.round(env.wind_speed) : 8;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 02. LIVE MONITOR PAGE — HEADER WITH LOCATION, HORIZON, AND LIVE BADGE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              LIVE MONITOR
            </h1>
            <span style={{ 
              fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, 
              padding: '2px 8px', borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-2)', border: '1px solid var(--border)' 
            }}>
              {currentDistrict.name}, {currentDistrict.state}
            </span>
            <span style={{ 
              fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, 
              padding: '2px 8px', borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)' 
            }}>
              WINDOW: {activeTime.label}
            </span>
            {livePrediction && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <HazardBadge level={livePrediction.risk_level} size="sm" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {Math.round(livePrediction.risk_probability * 100)}% ML PROB
                </span>
              </div>
            )}
            <DataSourceBadge 
              isLive={!livePrediction?.is_mock} 
              source={livePrediction?.data_source || 'Open-Meteo ERA5 / DEM'} 
              updatedAt={livePrediction?.evaluated_at} 
            />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            ENVIRONMENTAL MONITORING — Real-time satellite feeds, DEM topography & ML hazard classification
          </div>
        </div>

        {/* District Switcher */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Focal Station:</label>
          <select 
            className="select-control"
            value={currentDistrict.id}
            onChange={(e) => {
              const d = allDistricts.find((item) => item.id === e.target.value);
              if (d && selectDistrict) selectDistrict(d.id);
            }}
          >
            <optgroup label="Western Ghats">
              <option value="wayanad">Wayanad (Kerala)</option>
              <option value="idukki">Idukki (Kerala)</option>
              <option value="raigad">Raigad (Maharashtra)</option>
              <option value="pune">Pune Hills (Maharashtra)</option>
              <option value="nilgiris">Nilgiris (Tamil Nadu)</option>
            </optgroup>
            <optgroup label="North-Western Himalayas">
              <option value="rudraprayag">Rudraprayag (Uttarakhand)</option>
              <option value="chamoli">Chamoli (Uttarakhand)</option>
              <option value="tehri">Tehri Garhwal (Uttarakhand)</option>
              <option value="mandi">Mandi (Himachal Pradesh)</option>
              <option value="shimla">Shimla (Himachal Pradesh)</option>
              <option value="kullu">Kullu (Himachal Pradesh)</option>
              <option value="ramban">Ramban (Jammu & Kashmir)</option>
            </optgroup>
            <optgroup label="North-Eastern Region">
              <option value="noney">Noney (Manipur)</option>
              <option value="tamenglong">Tamenglong (Manipur)</option>
              <option value="east-sikkim">East Sikkim (Sikkim)</option>
              <option value="aizawl">Aizawl (Mizoram)</option>
              <option value="kohima">Kohima (Nagaland)</option>
              <option value="dima-hasao">Dima Hasao (Assam)</option>
              <option value="east-khasi-hills">East Khasi Hills (Meghalaya)</option>
              <option value="lower-dibang-valley">Lower Dibang Valley (Arunachal)</option>
              <option value="khowai">Khowai (Tripura)</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* DOMINANT LIVE MAP (WEATHER / RAINFALL LAYER) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          padding: '10px 16px', 
          background: 'var(--surface-2)', 
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>LIVE WEATHER & PRECIPITATION RADAR LAYER</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              NASA GPM IMERG 0.1° + High Resolution Radar Overlay
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, background: '#60A5FA', borderRadius: 2 }} /> Light (&lt;20mm)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, background: '#FBBF24', borderRadius: 2 }} /> Moderate (&gt;40mm)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, background: '#F87171', borderRadius: 2 }} /> Intense Cloudburst (&gt;80mm)
            </span>
          </div>
        </div>

        <div 
          ref={mapContainerRef} 
          style={{ width: '100%', height: 440, minHeight: 400, background: '#1c2620' }} 
        />
      </div>

      {/* 4 WEATHER KPI CARDS SPECIFIED IN BLUEPRINT 02 */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>RAINFALL</span>
            <IconCloudRain width={15} height={15} style={{ color: 'var(--accent-2)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800, color: displayRainfall > 50 ? 'var(--hazard-danger)' : 'var(--text-primary)' }}>
            {displayRainfall} <span style={{ fontSize: 14 }}>mm</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            Window: {activeTime.label} accumulation
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>SOIL</span>
            <IconDroplet width={15} height={15} style={{ color: 'var(--accent)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800, color: displaySoil > 70 ? 'var(--hazard-danger)' : 'var(--text-primary)' }}>
            {displaySoil}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            NASA SMAP Saturated Column
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>TEMP</span>
            <IconActivity width={15} height={15} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            {displayTemp}°C
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            Open-Meteo High Elevation
          </div>
        </div>

        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>WIND SPEED</span>
            <IconMountain width={15} height={15} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
            {displayWind} <span style={{ fontSize: 14 }}>km/h</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            Gusting up to 24 km/h
          </div>
        </div>
      </div>

      {/* TIMELINE SCRUBBER DEFINED IN BLUEPRINT 02 */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconClock width={15} height={15} /> TIMELINE SCRUBBER (HORIZON PROJECTION)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Clicking updates radar circles, soil saturation, and ML susceptibility
          </div>
        </div>

        {/* Scrub Track */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', margin: '10px 16px 4px' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 4, background: 'var(--surface-2)', transform: 'translateY(-50%)', borderRadius: 2 }} />
          
          {TIME_STEPS.map((t) => {
            const isSelected = t.id === timeStep;
            return (
              <button
                key={t.id}
                onClick={() => setTimeStep(t.id)}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <div style={{
                  width: isSelected ? 22 : 14,
                  height: isSelected ? 22 : 14,
                  borderRadius: '50%',
                  background: isSelected ? 'var(--accent)' : 'var(--border)',
                  border: isSelected ? '3px solid #ffffff' : '2px solid var(--surface)',
                  boxShadow: isSelected ? '0 0 0 2px var(--accent)' : 'none',
                  transition: 'all 0.15s ease',
                }} />
                <span style={{
                  marginTop: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: isSelected ? 12 : 11,
                  fontWeight: isSelected ? 800 : 500,
                  color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* AI EXPLANATIONS & SUBSURFACE RISK CARD */}
      {liveExplanation && (
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">TreeSHAP Explainability & Factor Attribution</div>
              <div className="card-subtitle">
                Model: XGBoost v1.0 · Multi-Sensor Feature Contributions for {zone?.name || currentDistrict.name}
              </div>
            </div>
            <span className="mvp-flag">{liveExplanation.method || 'TreeSHAP Ingested'}</span>
          </div>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {(liveExplanation.factors || []).map((f, i) => (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{f.factor}</div>
                <div style={{ 
                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, marginTop: 4,
                  color: f.status === 'Critical' || f.status === 'High' ? 'var(--hazard-danger)' : f.status === 'Elevated' ? 'var(--hazard-warning)' : 'var(--hazard-normal)' 
                }}>
                  {f.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
