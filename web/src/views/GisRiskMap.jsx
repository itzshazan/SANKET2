import React, { useState, useEffect } from 'react';
import LiveGisLeafletMap, { PAN_INDIA_SPATIAL_NODES } from '../components/LiveGisLeafletMap.jsx';
import HazardBadge from '../components/HazardBadge.jsx';
import { DISTRICTS, ZONES } from '../data/mockData.js';
import { module1Api } from '../services/module1Api.js';
import { 
  IconMapPin, IconCloudRain, IconDroplet, IconMountain, 
  IconLayers, IconSearch, IconBell, IconFileText, IconClock 
} from '../components/icons.jsx';

const LAYER_CATEGORIES = [
  {
    category: 'ENVIRONMENT',
    layers: [
      { id: 'rainfall', label: 'Rainfall (GPM IMERG)', default: true },
      { id: 'soil', label: 'Soil Moisture (SMAP)', default: true },
      { id: 'weather', label: 'Live Weather (Open-Meteo)', default: true },
    ],
  },
  {
    category: 'TERRAIN',
    layers: [
      { id: 'elevation', label: 'Copernicus DEM 30m', default: true },
      { id: 'slope', label: 'Slope & Aspect Rasters', default: true },
      { id: 'drainage', label: 'Topographic Wetness (TWI)', default: true },
    ],
  },
  {
    category: 'INFRASTRUCTURE',
    layers: [
      { id: 'roads', label: 'National & State Highways', default: true },
      { id: 'buildings', label: 'Settlements & Buildings', default: false },
      { id: 'hospitals', label: 'Hospitals & Emergency Facilities', default: true },
    ],
  },
  {
    category: 'RISK TIERS',
    layers: [
      { id: 'critical', label: 'Danger Zones (Score > 80)', default: true },
      { id: 'warning', label: 'Warning Flanks (Score 60-80)', default: true },
      { id: 'historical', label: 'ISRO Landslide Catalog', default: true },
    ],
  },
];

const TIMELINE_STEPS = [
  { id: 'now', label: 'NOW', hours: 0 },
  { id: '6h', label: '6H', hours: 6 },
  { id: '12h', label: '12H', hours: 12 },
  { id: '24h', label: '24H', hours: 24 },
  { id: '7d', label: '7D', hours: 168 },
];

export default function GisRiskMap({ selection, selectDistrict, selectZone, goTo }) {
  const [activeLayers, setActiveLayers] = useState(() => {
    const set = new Set();
    LAYER_CATEGORIES.forEach((cat) => {
      cat.layers.forEach((l) => {
        if (l.default) set.add(l.id);
      });
    });
    return set;
  });

  const [timelineStep, setTimelineStep] = useState('now');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(() => PAN_INDIA_SPATIAL_NODES[0]);
  const [liveEvaluation, setLiveEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  function toggleLayer(layerId) {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      next.has(layerId) ? next.delete(layerId) : next.add(layerId);
      return next;
    });
  }

  // When selection.districtId changes from outside, update selectedNode
  useEffect(() => {
    if (selection?.districtId) {
      const found = PAN_INDIA_SPATIAL_NODES.find((n) => n.id === selection.districtId);
      if (found) setSelectedNode(found);
    }
  }, [selection?.districtId]);

  // Fetch live ML risk prediction whenever selectedNode changes
  useEffect(() => {
    if (!selectedNode) return;
    let isCurrent = true;
    setEvaluating(true);

    module1Api.predictRisk({
      latitude: selectedNode.lat,
      longitude: selectedNode.lon,
      zone_id: selectedNode.zoneId || `${selectedNode.id}-a`,
    })
      .then((res) => {
        if (isCurrent) {
          setLiveEvaluation(res);
          setEvaluating(false);
        }
      })
      .catch(() => {
        if (isCurrent) setEvaluating(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedNode?.id]);

  const riskScore = liveEvaluation
    ? Math.round(liveEvaluation.risk_probability * 100)
    : Math.round(selectedNode.prob * 100);

  const riskLevel = liveEvaluation
    ? liveEvaluation.risk_level.toUpperCase()
    : selectedNode.hazard.toUpperCase();

  const filteredLocations = searchQuery.trim()
    ? PAN_INDIA_SPATIAL_NODES.filter((n) =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.state.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 3-Column Core Workspace: [Layers 240px] | [Map 65%] | [Intelligence 340px] */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr 340px',
          gap: 14,
          alignItems: 'stretch',
          minHeight: '620px',
        }}
      >
        {/* LEFT COLUMN: Layer Control Panel (240px) */}
        <div
          className="card"
          style={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: 'var(--surface-1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            <IconLayers width={16} height={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Map Layers
            </span>
          </div>

          <div className="scrollbar-thin" style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: '530px' }}>
            {LAYER_CATEGORIES.map((cat) => (
              <div key={cat.category}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: 'var(--text-dim)',
                    letterSpacing: '0.08em',
                    marginBottom: 8,
                  }}
                >
                  {cat.category}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cat.layers.map((layer) => {
                    const active = activeLayers.has(layer.id);
                    return (
                      <label
                        key={layer.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 12,
                          color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                          padding: '4px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: active ? 'var(--surface-2)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleLayer(layer.id)}
                          style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: active ? 600 : 400 }}>{layer.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER COLUMN: Interactive Satellite Map (Flexible / Dominant 65%) */}
        <div
          className="card"
          style={{
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            background: 'var(--surface-1)',
          }}
        >
          {/* Top Map Header & Location Search */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                  Risk Intelligence Map
                </span>
                <span
                  className="mvp-flag"
                  style={{
                    background: 'var(--accent-forest-wash)',
                    color: 'var(--accent-forest)',
                    borderColor: 'var(--accent-forest)',
                    fontSize: 10,
                  }}
                >
                  LIVE ML SATELLITE
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                Click any terrain slope to run live multi-source AI hazard inference
              </div>
            </div>

            {/* Quick Search Location */}
            <div style={{ position: 'relative', width: '220px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 8px',
                  gap: 6,
                }}
              >
                <IconSearch width={13} height={13} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search Location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    width: '100%',
                  }}
                />
              </div>

              {filteredLocations.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: '260px',
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    zIndex: 2000,
                    marginTop: 4,
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  {filteredLocations.map((loc) => (
                    <div
                      key={loc.id}
                      onClick={() => {
                        setSelectedNode(loc);
                        setSearchQuery('');
                        selectDistrict?.(loc.id);
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: 12,
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700 }}>{loc.name}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{loc.state}</div>
                      </div>
                      <HazardBadge level={loc.hazard} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Leaflet Satellite Map Component */}
          <div style={{ flex: 1, minHeight: '520px', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <LiveGisLeafletMap
              selectedDistrict={selectedNode}
              selectedZone={selectedNode}
              onSelectDistrict={(id) => {
                const found = PAN_INDIA_SPATIAL_NODES.find((n) => n.id === id);
                if (found) setSelectedNode(found);
                selectDistrict?.(id);
              }}
              onSelectZone={(zid) => selectZone?.(zid)}
              goTo={goTo}
              activeLayers={activeLayers}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Location Intelligence Panel (340px) */}
        <div
          className="card"
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: 'var(--surface-1)',
          }}
        >
          {/* Page 04 Blueprint: Header & Lat/Lon */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                ← LOCATION INTELLIGENCE
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginTop: 4 }}>
                {selectedNode.name}, {selectedNode.state}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                {selectedNode.lat.toFixed(4)}° N &nbsp; {selectedNode.lon.toFixed(4)}° E
              </div>
            </div>
            <HazardBadge level={riskScore >= 80 ? 'danger' : riskScore >= 60 ? 'warning' : 'watch'} size="sm" />
          </div>

          {/* Page 04 Blueprint: Big Centered Risk Score Gauge Box */}
          <div
            style={{
              borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${riskScore >= 80 ? 'var(--hazard-danger)' : riskScore >= 60 ? 'var(--hazard-warning)' : 'var(--border)'}`,
              background: 'var(--surface-2)',
              padding: '18px 14px',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
              RISK SCORE
            </div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 900,
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.1,
                margin: '6px 0',
                color:
                  riskScore >= 80 ? 'var(--hazard-danger)' : riskScore >= 60 ? 'var(--hazard-warning)' : 'var(--hazard-normal)',
              }}
            >
              {evaluating ? '...' : riskScore}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color:
                  riskScore >= 80 ? 'var(--hazard-danger)' : riskScore >= 60 ? 'var(--hazard-warning)' : 'var(--hazard-normal)',
              }}
            >
              {riskLevel} RISK
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              TreeSHAP ML Evaluated · Live Telemetry Ingestion
            </div>
          </div>

          {/* Page 04 Blueprint: Contributing Factors Bars */}
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: 10 }}>
              CONTRIBUTING FACTORS
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Factor 1: Rainfall */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconCloudRain width={13} height={13} style={{ color: 'var(--accent-2)' }} /> Rainfall
                  </span>
                  <b style={{ color: (liveEvaluation?.environment?.rainfall_24h || 25) > 40 ? 'var(--hazard-danger)' : 'var(--hazard-warning)', fontFamily: 'var(--font-mono)' }}>
                    {(liveEvaluation?.environment?.rainfall_24h || 25) > 40 ? 'HIGH' : 'ELEVATED'} · {liveEvaluation?.environment?.rainfall_24h ?? 28}mm
                  </b>
                </div>
                <div style={{ height: 7, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, Math.max(15, Math.round(((liveEvaluation?.environment?.rainfall_24h ?? 28) / 60) * 100)))}%`, 
                    height: '100%', 
                    background: (liveEvaluation?.environment?.rainfall_24h || 25) > 40 ? 'var(--hazard-danger)' : 'var(--hazard-warning)', 
                    borderRadius: 4 
                  }} />
                </div>
              </div>

              {/* Factor 2: Soil Saturation */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconDroplet width={13} height={13} style={{ color: 'var(--accent)' }} /> Soil Saturation
                  </span>
                  <b style={{ color: (liveEvaluation?.environment?.soil_moisture || 0.35) > 0.38 ? 'var(--hazard-danger)' : 'var(--hazard-warning)', fontFamily: 'var(--font-mono)' }}>
                    {Math.min(99, Math.round((liveEvaluation?.environment?.soil_moisture ?? 0.35) * 100))}%
                  </b>
                </div>
                <div style={{ height: 7, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, Math.round((liveEvaluation?.environment?.soil_moisture ?? 0.35) * 100))}%`, 
                    height: '100%', 
                    background: (liveEvaluation?.environment?.soil_moisture || 0.35) > 0.38 ? 'var(--hazard-danger)' : 'var(--hazard-warning)', 
                    borderRadius: 4 
                  }} />
                </div>
              </div>

              {/* Factor 3: Terrain Elevation & Slope */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IconMountain width={13} height={13} /> Terrain Elevation
                  </span>
                  <b style={{ color: (liveEvaluation?.environment?.slope || 24) > 28 ? 'var(--hazard-danger)' : 'var(--hazard-warning)', fontFamily: 'var(--font-mono)' }}>
                    {(liveEvaluation?.environment?.slope || 24) > 28 ? 'HIGH SHEAR' : 'MODERATE'} · {liveEvaluation?.environment?.elevation ?? 1250}m
                  </b>
                </div>
                <div style={{ height: 7, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, Math.max(20, Math.round(((liveEvaluation?.environment?.slope ?? 24) / 45) * 100)))}%`, 
                    height: '100%', 
                    background: (liveEvaluation?.environment?.slope || 24) > 28 ? 'var(--hazard-danger)' : 'var(--hazard-warning)', 
                    borderRadius: 4 
                  }} />
                </div>
              </div>

              {/* Factor 4: Drainage Capacity */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Drainage Capacity</span>
                  <b style={{ color: (liveEvaluation?.environment?.twi || 7) < 8 ? 'var(--hazard-danger)' : 'var(--hazard-normal)', fontFamily: 'var(--font-mono)' }}>
                    {(liveEvaluation?.environment?.twi || 7) < 8 ? 'POOR / CONFINED' : 'ADEQUATE'}
                  </b>
                </div>
                <div style={{ height: 7, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, Math.max(25, Math.round(((liveEvaluation?.environment?.twi ?? 7) / 14) * 100)))}%`, 
                    height: '100%', 
                    background: (liveEvaluation?.environment?.twi || 7) < 8 ? 'var(--hazard-danger)' : 'var(--hazard-normal)', 
                    borderRadius: 4 
                  }} />
                </div>
              </div>
            </div>
          </div>

          {/* Recommended Action Advisory */}
          <div
            style={{
              marginTop: 'auto',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'var(--surface-2)',
            }}
          >
            <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
              RECOMMENDED ACTION
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 4, lineHeight: 1.5 }}>
              Continuous slope monitoring recommended. Alert district emergency response authorities and inspect culvert drainage.
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                className="btn primary"
                style={{ flex: 1, padding: '5px 8px', fontSize: 11, justifyContent: 'center' }}
                onClick={() => goTo?.('alerts')}
              >
                <IconBell width={12} height={12} /> Dispatch Alert
              </button>
              <button
                className="btn"
                style={{ flex: 1, padding: '5px 8px', fontSize: 11, justifyContent: 'center' }}
                onClick={() => goTo?.('reports')}
              >
                <IconFileText width={12} height={12} /> Export Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Map Timeline Scrubber */}
      <div
        className="card"
        style={{
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconClock width={14} height={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Map Timeline
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            Satellite accumulation interval:
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {TIMELINE_STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => setTimelineStep(step.id)}
              style={{
                padding: '4px 12px',
                fontSize: 11.5,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                borderRadius: '4px',
                border: '1px solid',
                borderColor: timelineStep === step.id ? 'var(--accent)' : 'var(--border)',
                background: timelineStep === step.id ? 'var(--accent)' : 'var(--surface-2)',
                color: timelineStep === step.id ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
