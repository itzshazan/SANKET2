import React from 'react';
import { 
  IconInfo, IconMap, IconCloudRain, IconDroplet, 
  IconMountain, IconBell, IconActivity 
} from '../components/icons.jsx';
import HazardBadge from '../components/HazardBadge.jsx';

export default function Help({ goTo }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 960 }}>
      {/* HEADER */}
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          HELP & OPERATIONAL USER GUIDE
        </h1>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Standard operating procedures, hazard tier protocols, telemetry reference, and emergency helpline directory
        </div>
      </div>

      {/* 1. DISASTER HAZARD TIERS & RESPONSE PROTOCOL */}
      <div className="card" style={{ padding: '18px' }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginBottom: 12 }}>
          1. Hazard Warning Tiers & NDMA Standard Operating Procedures
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {/* Normal */}
          <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <HazardBadge level="normal" size="sm" />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>Score 0–34</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>Routine Monitoring</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
              Maintain standard satellite telemetry checks. Clear road culverts and roadside drainage.
            </div>
          </div>

          {/* Watch */}
          <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <HazardBadge level="watch" size="sm" />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>Score 35–59</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>Heightened Vigilance</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
              Inform tehsildar and village panchayat heads. Verify local rainfall gauges and slope cracks.
            </div>
          </div>

          {/* Warning */}
          <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <HazardBadge level="warning" size="sm" />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>Score 60–79</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>Pre-Position Response</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
              Pre-position SDRF / NDRF squads. Prepare community relief centers. Issue yellow alerts via SMS.
            </div>
          </div>

          {/* Danger */}
          <div style={{ padding: '12px', background: 'var(--hazard-danger-wash)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--hazard-danger)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <HazardBadge level="danger" size="sm" />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--hazard-danger)', fontWeight: 700 }}>Score 80–100</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--hazard-danger)', marginTop: 4 }}>Immediate Evacuation</div>
            <div style={{ fontSize: 11, color: 'var(--hazard-danger)', marginTop: 4, lineHeight: 1.4 }}>
              Close arterial hill roads. Evacuate toe slope and riverbank residents to relief shelters immediately.
            </div>
          </div>
        </div>
      </div>

      {/* 2. SATELLITE & SENSOR GUIDE */}
      <div className="card" style={{ padding: '18px' }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginBottom: 12 }}>
          2. Integrated Spaceborn Sensor Specifications
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconCloudRain width={14} height={14} style={{ color: 'var(--accent-2)' }} />
              NASA GPM IMERG (Global Precipitation Measurement)
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.5 }}>
              Combines multi-satellite constellation with dual-frequency precipitation radar. Provides 0.1° (~10 km) gridded rainfall updated half-hourly. SANKET computes antecedent 24h, 72h, and 7-day cumulative precipitation.
            </div>
          </div>

          <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconDroplet width={14} height={14} style={{ color: 'var(--accent)' }} />
              NASA SMAP L3 (Soil Moisture Active Passive)
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.5 }}>
              Measures L-band microwave radiometry yielding volumetric soil water content (VWC 0–5cm). When soil saturation exceeds 70%, hydraulic pore pressure severely reduces slope shear strength, triggering mass movement.
            </div>
          </div>

          <div style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconMountain width={14} height={14} />
              Copernicus DEM 30m (GLO-30) & ISRO Landslide Atlas
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 3, lineHeight: 1.5 }}>
              Copernicus 30m digital surface model computes finite-difference slope gradient, aspect, curvature, and Topographic Wetness Index (TWI). Correlated with official ISRO NRSC Landslide Atlas (2023) historical density records.
            </div>
          </div>
        </div>
      </div>

      {/* 3. SHORTCUTS & EMERGENCY HELPLINES */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
        {/* Navigation tips */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>
            GIS & Keyboard Navigation
          </div>
          <ul style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
            <li><b>Click any map location:</b> Run instant live ML hazard inference</li>
            <li><b>Regional focus buttons:</b> Instant pan to Himalayas, Western Ghats, or NER</li>
            <li><b>Search bar:</b> Type district, village, bridge, or coordinates (`11.55, 76.12`)</li>
            <li><b>Timeline slider:</b> Scrub forecast horizon from NOW to 7D</li>
          </ul>
        </div>

        {/* Emergency Helplines */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>
            Emergency Disaster Operations Helplines
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-primary)', lineHeight: 1.7 }}>
            <div><b>National Disaster Management Authority (NDMA):</b> 1078 / 011-26701728</div>
            <div><b>State Emergency Operations Center (SEOC Kerala):</b> 1077 / 0471-2364424</div>
            <div><b>SEOC Uttarakhand (Dehradun):</b> 1070 / 0135-2710334</div>
            <div><b>SEOC Himachal Pradesh (Shimla):</b> 1070 / 0177-2629439</div>
            <div><b>SEOC Manipur (Imphal):</b> 0385-2443441 / 2443442</div>
          </div>
        </div>
      </div>
    </div>
  );
}
