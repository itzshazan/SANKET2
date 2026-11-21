import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import HazardBadge from '../components/HazardBadge.jsx';
import { 
  IconBuilding, IconRoad, IconHospital, IconMap, 
  IconAlertTriangle, IconActivity, IconInfo, IconRefresh 
} from '../components/icons.jsx';
import { module1Api } from '../services/module1Api.js';
import { useLiveDistricts } from '../data/useLiveDistricts.js';
import { REGIONS } from '../data/catalog.js';

export default function Infrastructure({ goTo, selection }) {
  // All monitored districts come from the backend registry (no hand-typed list).
  const live = useLiveDistricts();
  const hubs = useMemo(() => live.list.map((d) => ({ id: d.id, name: d.name, state: d.state, region: d.region, lat: d.lat, lon: d.lon })), [live.list]);
  const [activeHubId, setActiveHubId] = useState(selection?.districtId || 'rudraprayag');
  const [radiusKm, setRadiusKm] = useState(6.0);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [riskFilter, setRiskFilter] = useState('all');
  const [enabledLayers, setEnabledLayers] = useState({
    hospitals: true,
    roads: true,
    schools: true,
    bridges: true,
    helipads: true,
  });

  const [osmData, setOsmData] = useState(null);
  const [loadingOsm, setLoadingOsm] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // null until the district registry has loaded, so we never query the wrong place.
  const activeHub = useMemo(() => hubs.find((h) => h.id === activeHubId) || hubs[0] || null, [activeHubId, hubs]);

  // Load live OpenStreetMap Overpass data for the active hub & radius
  async function loadOsmData(force = false) {
    if (!activeHub) return;
    setLoadingOsm(true);
    setErrorMsg('');
    try {
      const res = await module1Api.getInfrastructure(
        activeHub.lat,
        activeHub.lon,
        activeHub.name,
        radiusKm,
        force
      );
      if (res && res.assets) {
        setOsmData(res);
        if (res.assets.length > 0) {
          setSelectedAssetId(res.assets[0].id);
        }
      } else {
        setErrorMsg('Backend unreachable: no OpenStreetMap data.');
      }
    } catch (err) {
      setErrorMsg('Error querying OpenStreetMap Overpass.');
    } finally {
      setLoadingOsm(false);
    }
  }

  useEffect(() => {
    loadOsmData(false);
  }, [activeHub?.id, radiusKm]);

  const assets = useMemo(() => {
    return osmData?.assets || [];
  }, [osmData]);

  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (!enabledLayers[a.type]) return false;
      if (riskFilter === 'critical' && a.risk !== 'danger') return false;
      if (riskFilter === 'moderate' && a.risk !== 'warning') return false;
      return true;
    });
  }, [assets, enabledLayers, riskFilter]);

  const selectedAsset = useMemo(() => {
    return assets.find((a) => a.id === selectedAssetId) || assets[0] || null;
  }, [assets, selectedAssetId]);

  function toggleLayer(layerKey) {
    setEnabledLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  }

  // Leaflet Map Initialization & Rendering
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerGroupRef = useRef(null);
  const radiusCircleRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || !activeHub) return;

    try {
      if (!mapInstanceRef.current) {
        if (mapContainerRef.current._leaflet_id) {
          delete mapContainerRef.current._leaflet_id;
        }
        const map = L.map(mapContainerRef.current, {
          center: [activeHub.lat, activeHub.lon],
          zoom: 12,
          zoomControl: true,
        });

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; Esri, OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);

        // Add OpenStreetMap Carto vector labels overlay for roads and places
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
          opacity: 0.35,
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      map.flyTo([activeHub.lat, activeHub.lon], 12, { duration: 1.0 });

      // Invalidate size in case of tab transitions
      setTimeout(() => {
        try {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        } catch (_) {}
      }, 250);

      // Draw buffer circle around epicenter
      if (radiusCircleRef.current) {
        try {
          map.removeLayer(radiusCircleRef.current);
        } catch (_) {}
      }
      const circle = L.circle([activeHub.lat, activeHub.lon], {
        radius: radiusKm * 1000,
        color: 'rgba(217, 119, 6, 0.6)',
        fillColor: 'rgba(217, 119, 6, 0.08)',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(map);
      radiusCircleRef.current = circle;

      // Render markers group
      if (markerGroupRef.current) {
        try {
          map.removeLayer(markerGroupRef.current);
        } catch (_) {}
      }
      const markerGroup = L.layerGroup().addTo(map);

      // Draw epicenter marker
      const epicenter = L.circleMarker([activeHub.lat, activeHub.lon], {
        radius: 8,
        color: '#ffffff',
        fillColor: '#B42318',
        fillOpacity: 1,
        weight: 2.5,
      }).addTo(markerGroup);
      epicenter.bindTooltip(`
        <div style="font-family: sans-serif; font-size: 11.5px; font-weight: bold; color: #B42318;">
          📍 District centre: ${activeHub.name} (${activeHub.lat.toFixed(3)}°N, ${activeHub.lon.toFixed(3)}°E)
        </div>
      `, { direction: 'top' });

      // Render asset markers
      filteredAssets.forEach((asset) => {
        const isSelected = asset.id === selectedAssetId;
        const color = asset.risk === 'danger' ? '#B42318' : asset.risk === 'warning' ? '#E5600A' : '#1F9D55';

        const marker = L.circleMarker([asset.lat, asset.lon], {
          radius: isSelected ? 12 : 8,
          color: '#ffffff',
          fillColor: color,
          fillOpacity: 1,
          weight: isSelected ? 3 : 2,
        }).addTo(markerGroup);

        marker.bindTooltip(`
          <div style="font-family: sans-serif; font-size: 11.5px;">
            <b>${asset.category}: ${asset.name}</b><br/>
            <span style="color: ${color}; font-weight: bold;">${asset.distance_km} km from the district centre</span>
          </div>
        `, { direction: 'top' });

        marker.on('click', () => {
          setSelectedAssetId(asset.id);
          map.flyTo([asset.lat, asset.lon], 14, { duration: 0.8 });
        });
      });

      markerGroupRef.current = markerGroup;
    } catch (err) {
      console.warn('Leaflet render warning in Infrastructure:', err);
    }
  }, [activeHub, radiusKm, filteredAssets, selectedAssetId]);

  // Clean up Leaflet on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  function flyToAsset(asset) {
    setSelectedAssetId(asset.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([asset.lat, asset.lon], 14, { duration: 0.8 });
    }
  }

  if (!activeHub) {
    return <div className="card" style={{ padding: 20, fontSize: 13, color: live.error ? 'var(--hazard-danger)' : 'var(--text-muted)' }}>{live.error || 'Loading monitored districts…'}</div>;
  }

  const fetched = osmData?.fetched_at ? new Date(osmData.fetched_at).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const osmStatus = loadingOsm ? { c: '#64726F', t: 'Loading…' }
    : osmData?.status === 'unavailable' ? { c: '#64726F', t: `OpenStreetMap unavailable${osmData.reason ? `: ${osmData.reason}` : ''}` }
      : osmData?.status === 'stale' ? { c: '#B7860F', t: `Last real data · ${fetched}` }
        : { c: '#028C74', t: `OpenStreetMap · ${fetched || 'live'}` };
  const RING_COLOR = { danger: '#B42318', warning: '#E5600A', normal: '#1F9D55' };
  const CATEGORIES = [
    { id: 'hospitals', label: 'Hospitals', icon: '🏥' },
    { id: 'roads', label: 'Roads', icon: '🛣️' },
    { id: 'schools', label: 'Schools', icon: '🏫' },
    { id: 'bridges', label: 'Bridges', icon: '🌉' },
    { id: 'helipads', label: 'Helipads', icon: '🚁' },
  ];
  const CAT_ICON = { Hospital: '🏥', Road: '🛣️', School: '🏫', Bridge: '🌉' };
  const rings = [
    ['Within 2.2 km', osmData?.high_risk_count, RING_COLOR.danger],
    ['2.2 – 4.8 km', osmData?.moderate_risk_count, RING_COLOR.warning],
    [`4.8 – ${radiusKm} km`, osmData?.secure_count, RING_COLOR.normal],
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="select-control" style={{ fontWeight: 700, height: 32 }} value={activeHubId} onChange={(e) => setActiveHubId(e.target.value)}>
          {REGIONS.map((r) => (
            <optgroup key={r} label={r}>
              {hubs.filter((h) => h.region === r).map((hub) => (
                <option key={hub.id} value={hub.id}>{hub.name}, {hub.state}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select className="select-control" style={{ height: 32 }} value={radiusKm} onChange={(e) => setRadiusKm(parseFloat(e.target.value))}>
          {[3, 6, 10, 15].map((r) => <option key={r} value={r}>{r} km radius</option>)}
        </select>
        <button className="btn" style={{ fontSize: 12 }} onClick={() => loadOsmData(true)} disabled={loadingOsm}>
          {loadingOsm ? 'Loading…' : 'Refresh'}
        </button>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: osmStatus.c }} /> {osmStatus.t}
        </span>
      </div>

      <div className="grid stack-md" style={{ gridTemplateColumns: '190px 1fr 220px', gap: 14, alignItems: 'stretch' }}>
        {/* Categories */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="section-label">Show</div>
          {CATEGORIES.map((f) => (
            <label key={f.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, cursor: 'pointer',
              padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: enabledLayers[f.id] ? 'var(--surface-2)' : 'transparent',
              color: enabledLayers[f.id] ? 'var(--text-primary)' : 'var(--text-dim)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <input type="checkbox" checked={enabledLayers[f.id]} onChange={() => toggleLayer(f.id)} />
                <span>{f.icon}</span> {f.label}
              </span>
              <b style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{osmData?.by_category?.[f.id] || 0}</b>
            </label>
          ))}
        </div>

        {/* Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: 460, background: '#013126' }} />
        </div>

        {/* Distance summary + selected asset */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-label">Distance from district centre</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12.5 }}>
            <span>Total</span><b style={{ fontFamily: 'var(--font-mono)', fontSize: 20 }}>{osmData?.total_assets || 0}</b>
          </div>
          {rings.map(([label, n, color]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />{label}</span>
              <b style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color }}>{n || 0}</b>
            </div>
          ))}

          {selectedAsset && (
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 12 }}>
              <div className="section-label">Selected</div>
              <div style={{ fontWeight: 800, fontSize: 13, marginTop: 3 }}>{selectedAsset.name}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{selectedAsset.category} · {selectedAsset.distance_km} km</div>
              {selectedAsset.osm_url && (
                <a href={selectedAsset.osm_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', fontSize: 11.5, color: '#028C74', marginTop: 6 }}>
                  Open in OpenStreetMap ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Asset list */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Assets ({filteredAssets.length})</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['all', 'All'], ['critical', 'Within 2.2 km'], ['moderate', '2.2 – 4.8 km']].map(([rf, label]) => (
              <button key={rf} className={`btn ${riskFilter === rf ? 'primary' : ''}`} style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => setRiskFilter(rf)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredAssets.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nothing matches these filters.</div>
        ) : (
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12.5 }}>
              <thead><tr><th style={{ width: 120 }}>Type</th><th>Name</th><th style={{ width: 110 }}>Distance</th><th style={{ width: 70 }} /></tr></thead>
              <tbody>
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} onClick={() => flyToAsset(asset)}
                    style={{ cursor: 'pointer', background: selectedAssetId === asset.id ? 'var(--surface-2)' : undefined }}>
                    <td style={{ whiteSpace: 'nowrap' }}>{CAT_ICON[asset.category] || '🚁'} {asset.category}</td>
                    <td><b>{asset.name}</b></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: RING_COLOR[asset.risk] }}>{asset.distance_km} km</td>
                    <td>{asset.osm_url && (
                      <a href={asset.osm_url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#028C74' }} onClick={(e) => e.stopPropagation()}>OSM ↗</a>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}
      </div>
    </div>
  );
}
