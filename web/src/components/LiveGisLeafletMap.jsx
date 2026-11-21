import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { module1Api } from '../services/module1Api.js';
import { HAZARD_COLOR, fmt } from '../data/catalog.js';

// Free tile providers (no keys)
const BASEMAP_TILES = {
  satellite: { name: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: '&copy; Esri, Maxar, Earthstar Geographics', maxZoom: 18 },
  topo: { name: 'Topo', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap, SRTM | &copy; OpenTopoMap (CC-BY-SA)', maxZoom: 17 },
  street: { name: 'Street', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 },
};

export const REGIONAL_VIEWS = [
  { id: 'all_india', label: 'India', center: [22.5, 82.0], zoom: 5 },
  { id: 'himalayas', label: 'NW Himalayas', center: [31.2, 77.8], zoom: 7 },
  { id: 'western_ghats', label: 'Western Ghats', center: [14.5, 75.0], zoom: 6 },
  { id: 'northeast', label: 'North East', center: [25.5, 93.0], zoom: 7 },
];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CONFIDENCE_LABEL = { context: 'all-factor confidence', rain_soil: 'rain and soil confidence' };
const LEVEL_LABEL = { normal: 'NORMAL', watch: 'WATCH', warning: 'WARNING', danger: 'DANGER', unknown: 'NO DATA' };

// One plain sentence: why this level.
function plainReason({ flat, level, ratio, g, rain }) {
  if (level === 'unknown') return 'No rainfall data right now.';
  if (flat) return 'Flat ground: no slope steep enough for a landslide.';
  if (typeof ratio !== 'number') return 'No rainfall data right now.';
  const r7 = rain?.['168'];
  if (ratio === 0 || (typeof r7 === 'number' && r7 < 1)) return 'No rain in the last 7 days.';
  if (ratio < 1) return `Light rain (${fmt(rain?.['24'], 0)} mm in 24 h), below the landslide threshold.`;
  return `${g?.rain_mm ?? '?'} mm of rain in ${g?.hours ?? '?'} h: ${ratio.toFixed(1)}× the landslide threshold.`;
}

function summaryHtml({ title, level, confidence, confidenceVariant, reason, stale }) {
  const color = HAZARD_COLOR[level] || HAZARD_COLOR.unknown;
  return `
      <div style="font-weight:800;font-size:13px;margin-bottom:6px">${title}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <span style="background:${color};color:#fff;font-weight:800;padding:3px 9px;border-radius:4px;font-size:11.5px">${LEVEL_LABEL[level] || 'NO DATA'}</span>
        <span style="text-align:right"><span style="font-size:18px;font-weight:900">${typeof confidence === 'number' ? `${Math.round(confidence * 100)}%` : '—'}</span>
          <span style="display:block;font-size:9.5px;color:#777;margin-top:-2px">${CONFIDENCE_LABEL[confidenceVariant] || 'landslide confidence'}</span></span>
      </div>
      <div style="margin-top:7px;font-size:12px">${reason}</div>
      ${stale ? '<div style="margin-top:3px;font-size:10.5px;color:#9A6A08">Using the last real weather reading (live feed down).</div>' : ''}`;
}

function pointPopup(lat, lon, res) {
  if (!res) return `<div style="min-width:200px"><b>${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E</b><br/>Backend unreachable: no data.</div>`;
  const ev = res.evaluation || {};
  const w = res.weather || {};
  const t = res.terrain || {};
  const flat = ev.terrain_gate?.applicable === false;
  const conf = res.confidence?.status === 'live' ? res.confidence.confidence : null;
  return `
    <div style="font-family: system-ui; min-width: 230px; max-width: 260px; font-size: 11px; line-height: 1.5">
      ${summaryHtml({
        title: `${esc(res.district || 'Selected point')}${res.state ? `, ${esc(res.state)}` : ''}`,
        level: ev.level || 'unknown', confidence: conf, confidenceVariant: res.confidence?.variant, stale: w.status === 'stale',
        reason: plainReason({ flat, level: ev.level, ratio: ev.ratio, g: ev.governing_window, rain: w.rain_mm }),
      })}
      <details style="margin-top:7px;color:#555">
        <summary style="cursor:pointer;font-size:10.5px">Details</summary>
        <div style="margin-top:4px">Rain 24 h / 72 h / 7 d: <b>${fmt(w.rain_mm?.['24'], 1)} / ${fmt(w.rain_mm?.['72'], 1)} / ${fmt(w.rain_mm?.['168'], 1)} mm</b></div>
        <div>Soil moisture 7-28 cm: <b>${fmt(w.soil_moisture_7_28cm, 3)} m³/m³</b></div>
        <div>Slope: <b>${fmt(t.slope_deg, 1, '°')}</b> here, <b>${fmt(t.steepest_slope_1km_deg, 1, '°')}</b> steepest within 1 km · ${fmt(t.elevation_m, 0, ' m')}</div>
        ${res.confidence?.variant === 'context' ? `<div>Vegetation baseline: <b>${fmt(res.confidence.features.vegetation_baseline_ndvi, 2)} NDVI</b></div>
        <div>Past landslide records within 10 km: <b>${fmt(res.confidence.features.prior_landslides_10km, 0)}</b></div>` : ''}
        ${res.confidence?.missing_inputs?.length ? `<div>Fallback score. Missing ${esc(res.confidence.missing_inputs.join(', '))}.</div>` : ''}
        <div style="color:#888">${esc(ev.region?.label || '')}</div>
        <div style="color:#888;font-family:monospace">${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E</div>
      </details>
    </div>`;
}

export default function LiveGisLeafletMap({
  districts = [],
  selectedDistrictId = null,
  onSelectDistrict,
  showHotspots = true,
  showEvents = false,
  height = 460,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const tileRef = useRef(null);
  const layerRef = useRef(null);
  const clickMarkerRef = useRef(null);
  const [basemap, setBasemap] = useState('satellite');
  const [region, setRegion] = useState('all_india');
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    if (!showEvents) return;
    module1Api.getHistoryEvents().then((r) => setEvents(r?.events || []));
  }, [showEvents]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = L.map(containerRef.current, { center: [22.5, 82.0], zoom: 5, minZoom: 4, maxZoom: 18, zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      if (clickMarkerRef.current) map.removeLayer(clickMarkerRef.current);
      const m = L.circleMarker([lat, lng], { radius: 7, color: '#fff', weight: 3, fillColor: '#028C74', fillOpacity: 1 }).addTo(map);
      clickMarkerRef.current = m;
      m.bindPopup('Evaluating with live data…').openPopup();
      setBusy(true);
      const res = await module1Api.predictPoint(Number(lat.toFixed(4)), Number(lng.toFixed(4)));
      setBusy(false);
      m.setPopupContent(pointPopup(lat, lng, res));
    });
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {   // container resized (e.g. "Bigger map"): let Leaflet re-measure and load tiles
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    return () => clearTimeout(t);
  }, [height]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileRef.current) map.removeLayer(tileRef.current);
    const t = BASEMAP_TILES[basemap];
    tileRef.current = L.tileLayer(t.url, { attribution: t.attribution, maxZoom: t.maxZoom }).addTo(map);
  }, [basemap]);

  useEffect(() => {
    const map = mapRef.current;
    const d = districts.find((x) => x.id === selectedDistrictId);
    if (map && d) map.flyTo([d.lat, d.lon], 10, { duration: 1.0 });
  }, [selectedDistrictId, districts]);

  useEffect(() => {
    const group = layerRef.current;
    if (!group) return;
    group.clearLayers();

    districts.forEach((d) => {
      const lv = d.level || 'unknown';
      const color = HAZARD_COLOR[lv];
      if (showHotspots) {
        (d.hotspots || []).forEach((h) => {
          const hc = HAZARD_COLOR[h.level || 'unknown'];
          L.circleMarker([h.lat, h.lon], { radius: 5, color: '#fff', weight: 1.5, fillColor: hc, fillOpacity: 0.95 })
            .bindTooltip(`${esc(d.name)} hotspot ${esc(h.id.split('-').pop())}: ${(h.level || 'no data').toUpperCase()}`
              + `${typeof h.ratio === 'number' ? ` · ${h.ratio.toFixed(2)}×` : ''}${h.slope_deg != null ? ` · slope ${h.slope_deg}°` : ''}`)
            .addTo(group);
        });
      }
      const icon = L.divIcon({
        className: 'custom-risk-node',
        html: `<div class="${lv === 'danger' ? 'pulse-danger' : ''}" style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.4)"></div>`,
        iconSize: [20, 20], iconAnchor: [10, 10],
      });
      const w = d.weather || {};
      const marker = L.marker([d.lat, d.lon], { icon }).addTo(group);
      marker.bindPopup(`
        <div style="font-family:system-ui;min-width:230px;max-width:260px;font-size:11px;line-height:1.5">
          ${summaryHtml({
            title: `${esc(d.name)}, ${esc(d.state)}`, level: lv, confidence: d.confidence, confidenceVariant: d.confidence_variant, stale: d.weather_status === 'stale',
            reason: plainReason({ flat: false, level: lv, ratio: d.ratio, g: d.governing_window, rain: w.rain_mm }),
          })}
          <button id="open-${esc(d.id)}" style="margin-top:8px;width:100%;padding:5px;background:#028C74;color:#fff;border:0;border-radius:4px;font-weight:700;cursor:pointer">Open in Live Monitor →</button>
        </div>`);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`open-${d.id}`);
        if (btn) btn.onclick = () => onSelectDistrict?.(d.id);
      });
    });

    if (showEvents) {
      events.forEach((ev) => {
        const icon = L.divIcon({
          className: 'custom-hist-node',
          html: '<div style="width:13px;height:13px;background:#222;border:2px solid #FFCC00;transform:rotate(45deg)"></div>',
          iconSize: [13, 13], iconAnchor: [7, 7],
        });
        L.marker([ev.lat, ev.lon], { icon }).addTo(group)
          .bindPopup(`<div style="font-size:11px"><b>${esc(ev.name)}</b><br/>${esc(ev.location)}<br/>${esc(ev.date)}<br/><i>Replay on the History page (ERA5 rainfall)</i></div>`);
      });
    }
  }, [districts, showHotspots, showEvents, events, onSelectDistrict]);

  return (
    // isolation: Leaflet's layers use z-index 400-1000; keep them inside this box so the mobile menu,
    // account menu and search results always draw above the map
    <div style={{ position: 'relative', width: '100%', height, isolation: 'isolate' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, display: 'flex', gap: 4, background: 'rgba(28,38,32,.85)', borderRadius: 6, padding: 4 }}>
        {REGIONAL_VIEWS.map((r) => (
          <button key={r.id} onClick={() => { setRegion(r.id); mapRef.current?.flyTo(r.center, r.zoom, { duration: 1.2 }); }}
            style={{ padding: '3px 8px', fontSize: 11, fontWeight: 700, border: 0, borderRadius: 3, cursor: 'pointer',
              background: region === r.id ? 'var(--accent)' : 'transparent', color: region === r.id ? '#fff' : 'rgba(255,255,255,.8)' }}>
            {r.label}
          </button>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, display: 'flex', gap: 4, background: 'rgba(28,38,32,.85)', borderRadius: 6, padding: 4 }}>
        {Object.entries(BASEMAP_TILES).map(([k, v]) => (
          <button key={k} onClick={() => setBasemap(k)}
            style={{ padding: '3px 8px', fontSize: 11, fontWeight: 700, border: 0, borderRadius: 3, cursor: 'pointer',
              background: basemap === k ? 'var(--accent)' : 'transparent', color: basemap === k ? '#fff' : 'rgba(255,255,255,.8)' }}>
            {v.name}
          </button>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 1000, background: 'rgba(28,38,32,.85)', color: '#fff', borderRadius: 6, padding: '5px 9px', fontSize: 10.5 }}>
        {busy ? 'Checking this point…' : 'Click the map to check any point'}
      </div>
    </div>
  );
}
