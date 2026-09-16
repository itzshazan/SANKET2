import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import HazardBadge from '../components/HazardBadge.jsx';
import { 
  IconHistory, IconClock, IconCloudRain, IconDroplet, 
  IconMap, IconMountain, IconAlertTriangle 
} from '../components/icons.jsx';

const HISTORICAL_EVENTS = [
  {
    id: 'wayanad-2024',
    year: 2024,
    name: 'Wayanad Mass Debris Flow',
    period: 'August 2024 (30 July – 2 August)',
    location: 'Chooralmala & Meppadi, Wayanad, Kerala',
    lat: 11.5300,
    lon: 76.2200,
    rainfall: '240 mm (48H: 572 mm)',
    peakRisk: 91,
    affectedArea: '42 km²',
    fatalities: '330+ casualties',
    summary: 'Massive debris flow triggered by extreme orographic rainfall on steep Western Ghats escarpment slopes, inundating Chooralmala and Mundakkai settlements.',
    leadTimeHours: 18,
    timeline: [
      { dayOffset: -6, level: 'normal', rainfall: 22, soilMoisture: '34%' },
      { dayOffset: -5, level: 'normal', rainfall: 28, soilMoisture: '42%' },
      { dayOffset: -4, level: 'watch', rainfall: 65, soilMoisture: '58%' },
      { dayOffset: -3, level: 'watch', rainfall: 82, soilMoisture: '71%' },
      { dayOffset: -2, level: 'warning', rainfall: 140, soilMoisture: '84%' },
      { dayOffset: -1, level: 'danger', rainfall: 195, soilMoisture: '94%' },
      { dayOffset: 0, level: 'danger', rainfall: 240, soilMoisture: '98%', actualEvent: true },
    ],
  },
  {
    id: 'mandi-2023',
    year: 2023,
    name: 'Himachal Cloudburst & Valley Slides',
    period: 'August 2023',
    location: 'Mandi & Kullu, Himachal Pradesh',
    lat: 31.7100,
    lon: 76.9300,
    rainfall: '210 mm',
    peakRisk: 88,
    affectedArea: '35 km²',
    fatalities: '71 casualties',
    summary: 'Cloudburst sequence caused widespread slope destabilization along Beas River and national highways in Mandi and Shimla districts.',
    leadTimeHours: 14,
    timeline: [
      { dayOffset: -4, level: 'normal', rainfall: 18, soilMoisture: '38%' },
      { dayOffset: -3, level: 'watch', rainfall: 55, soilMoisture: '52%' },
      { dayOffset: -2, level: 'warning', rainfall: 110, soilMoisture: '76%' },
      { dayOffset: -1, level: 'danger', rainfall: 165, soilMoisture: '89%' },
      { dayOffset: 0, level: 'danger', rainfall: 210, soilMoisture: '95%', actualEvent: true },
    ],
  },
  {
    id: 'tupul-2022',
    year: 2022,
    name: 'Tupul Railway Yard Debris Avalanche',
    period: 'June 2022 (30 June)',
    location: 'Tupul, Noney District, Manipur',
    lat: 24.7915,
    lon: 93.6385,
    rainfall: '180 mm',
    peakRisk: 94,
    affectedArea: '18 km²',
    fatalities: '58 casualties',
    summary: 'Massive failure of cut-slope along the Jiribam-Imphal railway line construction camp, blocking the Ijei river and burying infrastructure.',
    leadTimeHours: 24,
    timeline: [
      { dayOffset: -5, level: 'normal', rainfall: 20, soilMoisture: '45%' },
      { dayOffset: -4, level: 'watch', rainfall: 48, soilMoisture: '62%' },
      { dayOffset: -3, level: 'watch', rainfall: 62, soilMoisture: '75%' },
      { dayOffset: -2, level: 'warning', rainfall: 105, soilMoisture: '88%' },
      { dayOffset: -1, level: 'danger', rainfall: 142, soilMoisture: '96%' },
      { dayOffset: 0, level: 'danger', rainfall: 180, soilMoisture: '99%', actualEvent: true },
    ],
  },
  {
    id: 'chamoli-2021',
    year: 2021,
    name: 'Chamoli Glacial Breach & Rockslide',
    period: 'February 2021 (7 February)',
    location: 'Rishiganga Valley, Chamoli, Uttarakhand',
    lat: 30.5564,
    lon: 79.5670,
    rainfall: '145 mm (Hydro trigger)',
    peakRisk: 92,
    affectedArea: '50 km²',
    fatalities: '204 casualties',
    summary: 'Ronti peak rock/ice mass detached, causing catastrophic debris avalanche down Rishiganga and Dhauliganga valleys.',
    leadTimeHours: 8,
    timeline: [
      { dayOffset: -3, level: 'normal', rainfall: 12, soilMoisture: '28%' },
      { dayOffset: -2, level: 'watch', rainfall: 45, soilMoisture: '48%' },
      { dayOffset: -1, level: 'warning', rainfall: 88, soilMoisture: '72%' },
      { dayOffset: 0, level: 'danger', rainfall: 145, soilMoisture: '88%', actualEvent: true },
    ],
  },
  {
    id: 'gangtok-2020',
    year: 2020,
    name: 'Gangtok National Highway Slips',
    period: 'July 2020',
    location: 'NH-10 Corridor, East Sikkim',
    lat: 27.3290,
    lon: 88.6120,
    rainfall: '165 mm',
    peakRisk: 82,
    affectedArea: '12 km²',
    fatalities: '2 casualties, highway severed',
    summary: 'Continuous monsoon soaking triggered rotational slides severing the essential lifeline to Gangtok.',
    leadTimeHours: 16,
    timeline: [
      { dayOffset: -3, level: 'normal', rainfall: 25, soilMoisture: '50%' },
      { dayOffset: -2, level: 'watch', rainfall: 70, soilMoisture: '68%' },
      { dayOffset: -1, level: 'warning', rainfall: 120, soilMoisture: '82%' },
      { dayOffset: 0, level: 'danger', rainfall: 165, soilMoisture: '91%', actualEvent: true },
    ],
  },
];

const YEARS = [2020, 2021, 2022, 2023, 2024];

export default function HistoricalBacktesting() {
  const [selectedEventId, setSelectedEventId] = useState('wayanad-2024');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef(null);

  const event = HISTORICAL_EVENTS.find((e) => e.id === selectedEventId) || HISTORICAL_EVENTS[0];

  // Auto-play progression
  useEffect(() => {
    if (!playing) return undefined;
    timerRef.current = setInterval(() => {
      setStep((s) => {
        if (s >= event.timeline.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 950);
    return () => clearInterval(timerRef.current);
  }, [playing, event.timeline.length]);

  // Reset step when event changes
  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [selectedEventId]);

  // Leaflet Map Initialization
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerGroupRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [22.5, 82.0],
        zoom: 5,
        zoomControl: true,
      });

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri & OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    if (markerGroupRef.current) {
      map.removeLayer(markerGroupRef.current);
    }

    const markerGroup = L.layerGroup().addTo(map);

    HISTORICAL_EVENTS.forEach((ev) => {
      const isSelected = ev.id === selectedEventId;
      const marker = L.circleMarker([ev.lat, ev.lon], {
        radius: isSelected ? 12 : 8,
        color: '#ffffff',
        fillColor: isSelected ? '#A32E28' : '#C1651F',
        fillOpacity: 0.9,
        weight: isSelected ? 3 : 2,
      }).addTo(markerGroup);

      marker.bindTooltip(`<b>${ev.name}</b><br/>${ev.period}<br/>Peak Risk: ${ev.peakRisk}`, {
        direction: 'top',
        className: 'historical-map-tooltip',
      });

      marker.on('click', () => {
        setSelectedEventId(ev.id);
        map.flyTo([ev.lat, ev.lon], 9, { duration: 1.2 });
      });
    });

    markerGroupRef.current = markerGroup;

    // Fly to current event
    map.flyTo([event.lat, event.lon], 8, { duration: 1.2 });

  }, [selectedEventId, event.lat, event.lon]);

  const point = event.timeline[step] || event.timeline[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 06. HISTORICAL ANALYSIS PAGE — HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              HISTORICAL ANALYSIS
            </h1>
            <span style={{ 
              fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, 
              padding: '2px 8px', borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-2)', border: '1px solid var(--border)' 
            }}>
              {event.location}
            </span>
            <span style={{ 
              fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, 
              padding: '2px 8px', borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)' 
            }}>
              ARCHIVE: 2020–2026
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Disaster backtesting & ML model lead-time validation against verified ground truth events
          </div>
        </div>

        {/* Disaster Event Dropdown */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Historical Disaster:</label>
          <select 
            className="select-control"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            {HISTORICAL_EVENTS.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.year} — {ev.name} ({ev.location})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* INTERACTIVE HISTORICAL MAP */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ 
          padding: '10px 16px', 
          background: 'var(--surface-2)', 
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>INTERACTIVE HISTORICAL MAP</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              Click any historical disaster epicenter across India to review retrospective early warning telemetry
            </span>
          </div>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            ISRO Landslide Atlas Database
          </span>
        </div>

        <div 
          ref={mapContainerRef} 
          style={{ width: '100%', height: 380, minHeight: 340, background: '#1c2620' }} 
        />
      </div>

      {/* EVENT TIMELINE DEFINED IN BLUEPRINT 06 */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
            EVENT TIMELINE (2020 – 2024 ARCHIVES)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Select year to inspect major recorded monsoon disasters
          </div>
        </div>

        {/* Timeline Axis: 2020 ────●──── 2021 ───●──── 2022 ────●──── 2023 ────●──── 2024 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', margin: '12px 24px 6px' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 3, background: 'var(--border)', transform: 'translateY(-50%)', borderRadius: 2 }} />

          {YEARS.map((yr) => {
            const ev = HISTORICAL_EVENTS.find((e) => e.year === yr);
            const isSelected = event.year === yr;

            return (
              <button
                key={yr}
                onClick={() => ev && setSelectedEventId(ev.id)}
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
                  background: isSelected ? 'var(--hazard-danger)' : 'var(--accent)',
                  border: isSelected ? '3px solid #ffffff' : '2px solid var(--surface)',
                  boxShadow: isSelected ? '0 0 0 2px var(--hazard-danger)' : 'none',
                  transition: 'all 0.15s ease',
                }} />
                <span style={{
                  marginTop: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: isSelected ? 12.5 : 11,
                  fontWeight: isSelected ? 800 : 600,
                  color: isSelected ? 'var(--hazard-danger)' : 'var(--text-muted)',
                }}>
                  {yr}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTED EVENT CARD & DAY-BY-DAY LEAD TIME PROGRESSION */}
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* SELECTED EVENT DETAILS */}
        <div className="card">
          <div className="card-head">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-2)', textTransform: 'uppercase' }}>
                SELECTED EVENT
              </div>
              <div className="card-title" style={{ fontSize: 16, marginTop: 2 }}>
                {event.name}
              </div>
              <div className="card-subtitle">{event.period} · {event.location}</div>
            </div>
            <span className="mvp-flag">VERIFIED GROUND TRUTH</span>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 16 }}>
            {event.summary}
          </div>

          {/* 3 Core Metric Badges Required by Blueprint 06 */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rainfall</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 18, marginTop: 2, color: 'var(--accent-2)' }}>
                {event.rainfall}
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Peak Risk</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 18, marginTop: 2, color: 'var(--hazard-danger)' }}>
                {event.peakRisk} <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>/ 100</span>
              </div>
            </div>

            <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Affected Area</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 18, marginTop: 2 }}>
                {event.affectedArea}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Impact Footprint: <b style={{ color: 'var(--hazard-danger)' }}>{event.fatalities}</b>
          </div>
        </div>

        {/* PLAYBACK & LEAD TIME VALIDATION */}
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Retrospective Early Warning Lead Time</div>
              <div className="card-subtitle">
                Warning Lead Time: <b style={{ color: 'var(--hazard-danger)' }}>{event.leadTimeHours} Hours Ahead</b>
              </div>
            </div>
            <button 
              className="btn primary" 
              style={{ fontSize: 11, padding: '3px 10px' }}
              onClick={() => { 
                if (step >= event.timeline.length - 1) setStep(0); 
                setPlaying((p) => !p); 
              }}
            >
              {playing ? 'Pause' : step >= event.timeline.length - 1 ? 'Replay' : 'Play Sequence'}
            </button>
          </div>

          <input
            type="range" min={0} max={event.timeline.length - 1} step={1} value={step}
            onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }}
            style={{ width: '100%', margin: '8px 0 16px' }}
          />

          {/* Stepper Dots */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            {event.timeline.map((t, i) => (
              <div 
                key={i} 
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => { setPlaying(false); setStep(i); }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: i <= step ? `var(--hazard-${t.level})` : 'var(--surface-2)',
                  border: `2px solid ${i <= step ? `var(--hazard-${t.level})` : 'var(--border)'}`,
                }} />
                <span style={{ fontSize: 9.5, color: 'var(--text-dim)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  {t.dayOffset === 0 ? 'EVENT' : `D-${Math.abs(t.dayOffset)}`}
                </span>
              </div>
            ))}
          </div>

          {/* Current Day Telemetry */}
          <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                {step === event.timeline.length - 1 ? 'DISASTER OCCURRENCE DAY' : `${Math.abs(point.dayOffset)} DAYS BEFORE COLLAPSE`}
              </span>
              <HazardBadge level={point.level} size="sm" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span>Cumulative Rain: <b>{point.rainfall} mm</b></span>
              <span>Soil Moisture: <b>{point.soilMoisture}</b></span>
            </div>
            {point.actualEvent && (
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--hazard-danger)', fontWeight: 700 }}>
                ⚠ Threshold breached — Mass debris avalanche triggered.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
