import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { module1Api } from '../services/module1Api.js';
import { IconMapPin, IconCloudRain, IconDroplet, IconMountain, IconUpload, IconInfo } from './icons.jsx';

// Pan-India High-Risk Landslide Nodes (Himalayas, Western Ghats, and North East)
export const PAN_INDIA_SPATIAL_NODES = [
  // 1. Western Ghats & Coastal Escarpment (Kerala, Maharashtra, Tamil Nadu)
  { id: 'wayanad', name: 'Wayanad (Meppadi / Chooralmala)', state: 'Kerala', lat: 11.6854, lon: 76.1320, hazard: 'danger', prob: 0.96, zoneId: 'wayanad-a', desc: 'Critical debris flow zone along steep Western Ghats escarpment.' },
  { id: 'idukki', name: 'Idukki (Munnar Section)', state: 'Kerala', lat: 9.8494, lon: 76.9723, hazard: 'warning', prob: 0.74, zoneId: 'idukki-a', desc: 'Steep cardamom hill slopes with high monsoon soil moisture.' },
  { id: 'raigad', name: 'Raigad (Irshalwadi / Mahad)', state: 'Maharashtra', lat: 18.2346, lon: 73.4442, hazard: 'warning', prob: 0.78, zoneId: 'raigad-a', desc: 'Western Ghats basalt cliff face prone to torrential rainfall failures.' },
  { id: 'pune', name: 'Pune Hills (Malin Section)', state: 'Maharashtra', lat: 19.1583, lon: 73.6872, hazard: 'watch', prob: 0.42, zoneId: 'pune-a', desc: 'Terraced slope sections with intense pre-monsoon saturation.' },
  { id: 'nilgiris', name: 'Nilgiris (Ooty / Coonoor)', state: 'Tamil Nadu', lat: 11.4102, lon: 76.6950, hazard: 'watch', prob: 0.46, zoneId: 'nilgiris-a', desc: 'High altitude tea slopes prone to rotational slips.' },

  // 2. North-Western Himalayas (Uttarakhand, Himachal Pradesh, Jammu & Kashmir)
  { id: 'rudraprayag', name: 'Rudraprayag (Kedarnath Corridor)', state: 'Uttarakhand', lat: 30.2844, lon: 78.9811, hazard: 'danger', prob: 0.98, zoneId: 'rudraprayag-a', desc: 'ISRO Rank #1 highest landslide density district in India.' },
  { id: 'chamoli', name: 'Chamoli (Joshimath Flanks)', state: 'Uttarakhand', lat: 30.5564, lon: 79.5670, hazard: 'danger', prob: 0.92, zoneId: 'chamoli-a', desc: 'Steep glacial moraine valley with active slope movements.' },
  { id: 'tehri', name: 'Tehri Garhwal', state: 'Uttarakhand', lat: 30.3800, lon: 78.4800, hazard: 'warning', prob: 0.79, zoneId: 'tehri-a', desc: 'ISRO Rank #2 highest vulnerability district in India.' },
  { id: 'mandi', name: 'Mandi District (Beas Basin)', state: 'Himachal Pradesh', lat: 31.7087, lon: 76.9319, hazard: 'warning', prob: 0.81, zoneId: 'mandi-a', desc: 'High relief river valley with recurring highway slides.' },
  { id: 'shimla', name: 'Shimla District', state: 'Himachal Pradesh', lat: 31.1048, lon: 77.1734, hazard: 'watch', prob: 0.45, zoneId: 'shimla-a', desc: 'Urbanized ridge and valley flanks subject to monsoon loading.' },
  { id: 'kullu', name: 'Kullu Valley', state: 'Himachal Pradesh', lat: 31.9579, lon: 77.1095, hazard: 'warning', prob: 0.73, zoneId: 'kullu-a', desc: 'High velocity river bank erosion and debris slides.' },
  { id: 'ramban', name: 'Ramban (NH-44 Corridor)', state: 'Jammu & Kashmir', lat: 33.2422, lon: 75.2415, hazard: 'danger', prob: 0.94, zoneId: 'ramban-a', desc: 'Pir Panjal shooting stone and mass failure corridor.' },

  // 3. North-Eastern Region (NER)
  { id: 'noney', name: 'Noney District (Tupul)', state: 'Manipur', lat: 24.7831, lon: 93.6322, hazard: 'danger', prob: 0.998, zoneId: 'noney-a', desc: 'Critical slope section near Tupul railway cut.' },
  { id: 'tamenglong', name: 'Tamenglong District', state: 'Manipur', lat: 24.9850, lon: 93.4920, hazard: 'warning', prob: 0.72, zoneId: 'tamenglong-a', desc: 'Steep terrain with elevated soil moisture saturation.' },
  { id: 'east-sikkim', name: 'East Sikkim (Gangtok)', state: 'Sikkim', lat: 27.3389, lon: 88.6065, hazard: 'watch', prob: 0.44, zoneId: 'east-sikkim-a', desc: 'High altitude mountain corridor with moderate drainage.' },
  { id: 'aizawl', name: 'Aizawl District', state: 'Mizoram', lat: 23.7271, lon: 92.7176, hazard: 'warning', prob: 0.68, zoneId: 'aizawl-a', desc: 'Ridge settlement prone to rainfall-triggered mudflows.' },
  { id: 'kohima', name: 'Kohima District', state: 'Nagaland', lat: 25.6751, lon: 94.1086, hazard: 'watch', prob: 0.41, zoneId: 'kohima-a', desc: 'Dissected hill slopes along national highway approach.' },
  { id: 'dima-hasao', name: 'Dima Hasao (Haflong)', state: 'Assam', lat: 25.1830, lon: 93.0210, hazard: 'warning', prob: 0.76, zoneId: 'dima-hasao-a', desc: 'Barail range hill section with extensive cutting.' },
  { id: 'shillong', name: 'East Khasi Hills (Shillong)', state: 'Meghalaya', lat: 25.5788, lon: 91.8933, hazard: 'watch', prob: 0.38, zoneId: 'shillong-a', desc: 'Plateau escarpment with high cumulative monsoon precipitation.' },
  { id: 'papum-pare', name: 'Papum Pare (Itanagar)', state: 'Arunachal Pradesh', lat: 27.1004, lon: 93.6166, hazard: 'watch', prob: 0.48, zoneId: 'papum-pare-a', desc: 'Foothill sedimentary slopes subject to toe erosion.' },
];

export const NER_SPATIAL_NODES = PAN_INDIA_SPATIAL_NODES;

// Historical verified landslide events from ISRO Landslide Atlas & National Disaster Archives
const HISTORICAL_LANDSLIDE_POINTS = [
  { id: 'LS-2024-WAYANAD', name: 'Wayanad Mass Debris Flow', date: '30 July 2024', lat: 11.5300, lon: 76.2200, fatalities: 330, trigger: 'Extremely heavy monsoon rainfall' },
  { id: 'LS-2023-IRSHALWADI', name: 'Irshalwadi Village Buried', date: '19 July 2023', lat: 18.9100, lon: 73.2300, fatalities: 84, trigger: 'Continuous 499mm downpour' },
  { id: 'LS-2013-KEDARNATH', name: 'Kedarnath Flash Flood & Slides', date: '16 June 2013', lat: 30.7350, lon: 79.0670, fatalities: 5700, trigger: 'Chorabari glacial lake breach + cloudburst' },
  { id: 'LS-2014-MALIN', name: 'Malin Hill Slope Collapse', date: '30 July 2014', lat: 19.1600, lon: 73.6900, fatalities: 151, trigger: '3-day continuous heavy rain' },
  { id: 'LS-2022-TUPUL', name: 'Tupul Railway Disaster', date: '30 June 2022', lat: 24.7915, lon: 93.6385, fatalities: 58, trigger: 'Monsoon rainfall on railway cut' },
  { id: 'LS-2023-MANDI', name: 'Mandi-Kullu Highway Severance', date: '14 August 2023', lat: 31.7100, lon: 76.9300, fatalities: 71, trigger: 'Severe Himachal cloudburst sequence' },
  { id: 'LS-2018-TAMENG', name: 'Tamenglong Mass Slide', date: '11 July 2018', lat: 24.9920, lon: 93.4880, fatalities: 7, trigger: 'High cumulative precipitation' },
  { id: 'LS-2024-AIZAWL', name: 'Cyclone Remal Aizawl Slide', date: '28 May 2024', lat: 23.7310, lon: 92.7230, fatalities: 14, trigger: 'Severe cyclone deluge' },
  { id: 'LS-2020-GANGTOK', name: 'Gangtok National Highway Slide', date: '10 July 2020', lat: 27.3290, lon: 88.6120, fatalities: 2, trigger: 'Continuous monsoon soaking' },
  { id: 'LS-2022-DIMA', name: 'New Haflong Railway Submergence', date: '15 May 2022', lat: 25.1780, lon: 93.0150, fatalities: 3, trigger: 'Pre-monsoon cloudburst' },
];

// Tile providers (100% free, zero keys needed)
const BASEMAP_TILES = {
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 18,
  },
  topo: {
    name: 'Terrain Topo',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
    maxZoom: 17,
  },
  dark: {
    name: 'Dark Tactical',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 19,
  },
  street: {
    name: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
};

const HAZARD_COLOR = {
  danger: '#A32E28',
  warning: '#C1651F',
  watch: '#C99A2E',
  normal: '#3F8B4C',
};

export const REGIONAL_VIEWS = [
  { id: 'all_india', label: '🇮🇳 Whole India', center: [22.5, 82.0], zoom: 5 },
  { id: 'himalayas', label: '🏔️ NW Himalayas (UK / HP / J&K)', center: [31.2, 77.8], zoom: 7 },
  { id: 'western_ghats', label: '🌴 Western Ghats (KL / MH)', center: [12.2, 75.8], zoom: 7 },
  { id: 'northeast', label: '⛰️ North East (NER)', center: [25.5, 93.0], zoom: 7 },
];

export default function LiveGisLeafletMap({
  selectedDistrict,
  selectedZone,
  onSelectDistrict,
  onSelectZone,
  goTo,
  activeLayers = new Set(),
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerGroupRef = useRef(null);
  const inspectionMarkerRef = useRef(null);

  const [basemap, setBasemap] = useState('satellite');
  const [activeRegion, setActiveRegion] = useState('all_india');
  const [clickPrediction, setClickPrediction] = useState(null);
  const [predictingLocation, setPredictingLocation] = useState(false);
  const [liveDistricts, setLiveDistricts] = useState({});

  useEffect(() => {
    module1Api.getDistrictsLive().then((res) => {
      if (res && res.districts) {
        setLiveDistricts(res.districts);
      }
    }).catch(() => {});
  }, []);

  const handleRegionJump = (region) => {
    setActiveRegion(region.id);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(region.center, region.zoom, { duration: 1.4 });
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Pan-India Extent
    const map = L.map(mapContainerRef.current, {
      center: [22.5, 82.0],
      zoom: 5,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial tile layer
    const tileConfig = BASEMAP_TILES[basemap];
    const tileLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    markerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    // Handle map click for real-time inference on any coordinate
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      setPredictingLocation(true);

      // Remove existing pin
      if (inspectionMarkerRef.current) {
        map.removeLayer(inspectionMarkerRef.current);
      }

      // Add click pin
      const pinIcon = L.divIcon({
        className: 'custom-leaflet-pin',
        html: `<div style="width: 14px; height: 14px; background: #fff; border: 3px solid #2E5E45; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const clickMarker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
      inspectionMarkerRef.current = clickMarker;

      try {
        const prediction = await module1Api.predictRisk({
          latitude: parseFloat(lat.toFixed(4)),
          longitude: parseFloat(lng.toFixed(4)),
        });

        setClickPrediction({
          lat: lat.toFixed(4),
          lon: lng.toFixed(4),
          ...prediction,
        });

        const popupContent = `
          <div style="font-family: var(--font-sans, system-ui); min-width: 220px;">
            <div style="font-weight: 800; font-size: 13px; color: var(--text-primary); margin-bottom: 2px;">
              📍 Coordinate Inspection
            </div>
            <div style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted); margin-bottom: 8px;">
              ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-2); padding: 6px 8px; border-radius: 4px; margin-bottom: 8px;">
              <span style="font-weight: 700; font-size: 11px; text-transform: uppercase; color: ${HAZARD_COLOR[prediction.risk_level] || 'var(--text-primary)'};">
                ${prediction.risk_level}
              </span>
              <span style="font-family: var(--font-mono); font-weight: 800; font-size: 11.5px;">
                ${(prediction.risk_probability * 100).toFixed(1)}% PROB
              </span>
            </div>
            ${
              prediction.environment
                ? `
              <div style="font-size: 10.5px; color: var(--text-muted); line-height: 1.5; margin-bottom: 8px;">
                <b>Rainfall 72h:</b> ${prediction.environment.rainfall_72h}mm<br/>
                <b>Soil Moisture:</b> ${(prediction.environment.soil_moisture * 100).toFixed(1)}% VWC<br/>
                <b>DEM Elevation:</b> ${prediction.environment.elevation}m (Slope ${prediction.environment.slope}°)
              </div>
            `
                : ''
            }
            <div style="font-size: 9.5px; color: var(--text-dim); text-align: right;">
              Open-Meteo live weather + DEM · ML risk model
            </div>
          </div>
        `;

        clickMarker.bindPopup(popupContent).openPopup();
      } catch (err) {
        console.error('Click prediction error:', err);
      } finally {
        setPredictingLocation(false);
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap Tiles when selected
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const map = mapInstanceRef.current;
    map.removeLayer(tileLayerRef.current);

    const tileConfig = BASEMAP_TILES[basemap];
    const newLayer = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: tileConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [basemap]);

  // Center on Selected District if provided
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedDistrict) return;
    const found = NER_SPATIAL_NODES.find((n) => n.id === selectedDistrict.id);
    if (found) {
      mapInstanceRef.current.flyTo([found.lat, found.lon], 11, { duration: 1.2 });
    }
  }, [selectedDistrict]);

  // Render Operational Layers & Markers based on activeLayers
  useEffect(() => {
    if (!mapInstanceRef.current || !markerGroupRef.current) return;
    const layerGroup = markerGroupRef.current;
    layerGroup.clearLayers();

    const hasFilters = activeLayers && activeLayers.size > 0;
    const showCritical = !hasFilters || activeLayers.has('critical');
    const showWarning = !hasFilters || activeLayers.has('warning');
    const showHistorical = !hasFilters || activeLayers.has('historical');
    const showRainfall = !hasFilters || activeLayers.has('rainfall');
    const showSoil = !hasFilters || activeLayers.has('soil');
    const showHospitals = hasFilters && activeLayers.has('hospitals');

    // 1. Live Risk Hotspot Markers
    PAN_INDIA_SPATIAL_NODES.forEach((node) => {
      const live = liveDistricts[node.id];
      const hazardLevel = live?.risk_level || node.hazard;
      const probValue = live?.risk_probability !== undefined ? live.risk_probability : node.prob;

      if (hazardLevel === 'danger' && !showCritical) return;
      if (hazardLevel === 'warning' && !showWarning) return;
      if (hazardLevel === 'watch' && hasFilters && !showWarning && !showCritical) return;

      const color = HAZARD_COLOR[hazardLevel] || '#3F8B4C';
      const isDanger = hazardLevel === 'danger';

      // Optional: Precipitation buffer overlay
      if (showRainfall) {
        const radius = isDanger ? 22000 : 14000;
        L.circle([node.lat, node.lon], {
          radius,
          color: '#3B82F6',
          fillColor: '#60A5FA',
          fillOpacity: isDanger ? 0.28 : 0.15,
          weight: 1,
          interactive: false,
        }).addTo(layerGroup);
      }

      // Optional: Soil saturation contour overlay
      if (showSoil && (isDanger || hazardLevel === 'warning')) {
        L.circle([node.lat, node.lon], {
          radius: isDanger ? 12000 : 8000,
          color: '#C1651F',
          fillColor: '#F59E0B',
          fillOpacity: 0.22,
          weight: 1,
          dashArray: '3 3',
          interactive: false,
        }).addTo(layerGroup);
      }

      const markerHtml = `
        <div class="${isDanger ? 'pulse-danger' : ''}" style="
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
        ">
          <div style="width: 7px; height: 7px; background: #fff; border-radius: 50%;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-risk-node',
        html: markerHtml,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker([node.lat, node.lon], { icon: customIcon }).addTo(layerGroup);

      const popupHtml = `
        <div style="font-family: var(--font-sans, system-ui); min-width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 800; font-size: 13.5px; color: var(--text-primary);">${node.name}</span>
            <span style="font-weight: 700; font-size: 10px; padding: 2px 6px; border-radius: 3px; background: ${color}; color: #fff; text-transform: uppercase;">
              ${hazardLevel}
            </span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">
            ${node.state} · ${node.lat.toFixed(4)}°N, ${node.lon.toFixed(4)}°E
          </div>
          ${
            live
              ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: var(--surface-2); padding: 6px 8px; border-radius: 4px; margin-bottom: 8px; font-size: 10.5px;">
              <div>Rain 24h: <b>${live.rainfall_24h}mm</b></div>
              <div>Rain 72h: <b>${live.rainfall_72h}mm</b></div>
              <div>Soil: <b>${(live.soil_moisture * 100).toFixed(1)}%</b></div>
              <div>Temp: <b>${live.temperature}°C</b></div>
            </div>
          `
              : `
            <div style="font-size: 11.5px; color: var(--text-primary); margin-bottom: 8px;">
              ${node.desc || 'Monitored vulnerable mountain slope corridor'}
            </div>
          `
          }
          <div style="display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 11px; margin-bottom: 10px; background: var(--surface-2); padding: 5px 8px; border-radius: 4px;">
            <span>ML Hazard Risk:</span>
            <b style="color: ${color};">${(probValue * 100).toFixed(1)}%</b>
          </div>
          <button id="btn-inspect-${node.id}" style="
            width: 100%;
            padding: 6px 10px;
            background: var(--accent);
            color: #fff;
            border: none;
            border-radius: 4px;
            font-size: 11.5px;
            font-weight: 700;
            cursor: pointer;
          ">
            Inspect Location Intelligence →
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-inspect-${node.id}`);
        if (btn) {
          btn.onclick = () => {
            if (onSelectDistrict) onSelectDistrict(node.id);
            if (onSelectZone && node.zoneId) onSelectZone(node.zoneId);
            if (goTo) goTo('risk-map', { districtId: node.id, zoneId: node.zoneId });
          };
        }
      });
    });

    // 2. Historical Landslide Events Layer
    if (showHistorical) {
      HISTORICAL_LANDSLIDE_POINTS.forEach((pt) => {
        const historyHtml = `
          <div style="
            width: 16px;
            height: 16px;
            background: #333;
            border: 2px solid #FFCC00;
            transform: rotate(45deg);
            box-shadow: 0 2px 6px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
          </div>
        `;

        const histIcon = L.divIcon({
          className: 'custom-hist-node',
          html: historyHtml,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([pt.lat, pt.lon], { icon: histIcon }).addTo(layerGroup);

        const histPopup = `
          <div style="font-family: var(--font-sans, system-ui); min-width: 190px;">
            <div style="font-weight: 800; font-size: 12.5px; color: #C99A2E; margin-bottom: 2px;">
              ⚠️ ISRO Landslide Record
            </div>
            <div style="font-weight: 700; font-size: 12px; color: var(--text-primary); margin-bottom: 4px;">
              ${pt.name}
            </div>
            <div style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">
              <b>Date:</b> ${pt.date}<br/>
              <b>Casualties:</b> ${pt.fatalities} reported<br/>
              <b>Trigger:</b> ${pt.trigger}
            </div>
          </div>
        `;

        marker.bindPopup(histPopup);
      });
    }

    // 3. Emergency Hospital Infrastructure Layer
    if (showHospitals) {
      const HOSPITALS = [
        { name: 'Wayanad District Medical Center', lat: 11.5540, lon: 76.1260, beds: 180 },
        { name: 'Rudraprayag CHC Emergency Unit', lat: 30.2860, lon: 78.9840, beds: 60 },
        { name: 'Noney District Hospital', lat: 24.8120, lon: 93.6050, beds: 45 },
        { name: 'Mandi Zonal Trauma Hospital', lat: 31.7080, lon: 76.9320, beds: 150 },
        { name: 'Chamoli District Hospital', lat: 30.4120, lon: 79.3320, beds: 90 },
        { name: 'Mahad Sub-District Hospital', lat: 18.2380, lon: 73.4480, beds: 80 },
      ];

      HOSPITALS.forEach((hosp) => {
        const hospHtml = `
          <div style="
            width: 18px;
            height: 18px;
            background: #fff;
            border: 2px solid #EF4444;
            border-radius: 4px;
            color: #EF4444;
            font-size: 11px;
            font-weight: 900;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          ">✚</div>
        `;
        const icon = L.divIcon({
          className: 'custom-hosp-node',
          html: hospHtml,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        const m = L.marker([hosp.lat, hosp.lon], { icon }).addTo(layerGroup);
        m.bindPopup(`
          <div style="font-family: var(--font-sans, system-ui); min-width: 180px;">
            <b style="color: #EF4444;">🏥 Emergency Hospital</b>
            <div style="font-weight: 700; font-size: 12px; margin-top: 3px;">${hosp.name}</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Capacity: ${hosp.beds} beds</div>
          </div>
        `);
      });
    }
  }, [activeLayers, liveDistricts, onSelectDistrict, onSelectZone, goTo]);

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {/* Regional Focus Presets Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 1000,
          background: 'rgba(28, 38, 32, 0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 6px',
          display: 'flex',
          gap: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
        }}
      >
        {REGIONAL_VIEWS.map((r) => (
          <button
            key={r.id}
            onClick={() => handleRegionJump(r)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '3px',
              border: 'none',
              cursor: 'pointer',
              background: activeRegion === r.id ? 'var(--accent)' : 'transparent',
              color: activeRegion === r.id ? '#fff' : 'rgba(255, 255, 255, 0.75)',
              transition: 'all 0.15s ease',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Basemap Switcher Toolbar */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1000,
          background: 'rgba(28, 38, 32, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 6px',
          display: 'flex',
          gap: 4,
        }}
      >
        {Object.entries(BASEMAP_TILES).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setBasemap(key)}
            style={{
              padding: '4px 9px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '3px',
              border: 'none',
              cursor: 'pointer',
              background: basemap === key ? 'var(--accent)' : 'transparent',
              color: basemap === key ? '#fff' : 'rgba(255, 255, 255, 0.75)',
              transition: 'all 0.15s ease',
            }}
          >
            {val.name}
          </button>
        ))}
      </div>

      {/* Real-time Status Ticker */}
      <div
        style={{
          position: 'absolute',
          bottom: 14,
          left: 14,
          zIndex: 1000,
          background: 'rgba(28, 38, 32, 0.90)',
          backdropFilter: 'blur(6px)',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '11.5px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3F8B4C' }}></div>
        <span>
          <b>Live GIS:</b> Click anywhere to evaluate real-time satellite ML risk
        </span>
        {predictingLocation && (
          <span style={{ color: 'var(--hazard-warning)', fontWeight: 700 }}>
            (Querying satellite telemetry...)
          </span>
        )}
      </div>

      {/* Map DOM Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '560px',
          minHeight: '480px',
        }}
      />
    </div>
  );
}
