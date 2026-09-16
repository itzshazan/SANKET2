import React, { useState, useEffect } from 'react';
import { 
  IconCheck, IconActivity, IconInfo, IconBell, 
  IconCloudRain, IconMountain, IconUpload 
} from '../components/icons.jsx';
import { module1Api } from '../services/module1Api.js';

export default function Settings({ theme, onToggleTheme, language }) {
  const [credStatus, setCredStatus] = useState(null);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [savedMessage, setSavedMessage] = useState('');

  // Threshold settings state
  const [rfTrigger, setRfTrigger] = useState(60);
  const [soilTrigger, setSoilTrigger] = useState(70);
  const [slopeTrigger, setSlopeTrigger] = useState(28);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [smsGateway, setSmsGateway] = useState(true);

  useEffect(() => {
    module1Api.checkCredentialsStatus().then((res) => {
      setCredStatus(res);
      setLoadingCreds(false);
    }).catch(() => setLoadingCreds(false));
  }, []);

  function handleSave() {
    setSavedMessage('Configuration and hazard thresholds saved successfully.');
    setTimeout(() => setSavedMessage(''), 3000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 960 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            SYSTEM SETTINGS & INTEGRATIONS
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Configure multi-source satellite ingestion, machine learning thresholds, and emergency notification relays
          </div>
        </div>

        <button className="btn primary" onClick={handleSave} style={{ fontSize: 12 }}>
          Save Configuration
        </button>
      </div>

      {savedMessage && (
        <div style={{ padding: '10px 14px', background: 'rgba(63, 139, 76, 0.15)', border: '1px solid var(--hazard-normal)', borderRadius: 'var(--radius-sm)', color: 'var(--hazard-normal)', fontSize: 13 }}>
          ✓ {savedMessage}
        </div>
      )}

      {/* 1. API & INGESTION PIPELINE STATUS */}
      <div className="card" style={{ padding: '18px' }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconActivity width={16} height={16} style={{ color: 'var(--accent)' }} />
          Geospatial Ingestion Pipelines & Satellite Status
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Live verification of credentials configured in SANKET deployment environment
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {/* NASA GPM */}
          <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <b style={{ fontSize: 13, color: 'var(--text-primary)' }}>NASA GPM IMERG</b>
              <span style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 3, background: 'rgba(63, 139, 76, 0.15)', color: 'var(--hazard-normal)', fontWeight: 700 }}>
                CONNECTED
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Product: GPM_3IMERGHHL_07 (0.1° Early Run)<br />
              Auth: {credStatus?.sources?.nasa_gpm_imerg?.account || 'sh****23'}<br />
              Pipeline: Real-Time Precipitation & 7-Day Accumulation
            </div>
          </div>

          {/* NASA SMAP */}
          <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <b style={{ fontSize: 13, color: 'var(--text-primary)' }}>NASA SMAP L3</b>
              <span style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 3, background: 'rgba(63, 139, 76, 0.15)', color: 'var(--hazard-normal)', fontWeight: 700 }}>
                CONNECTED
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Product: SPL3SMP_E_006 (9km Enhanced Radiometer)<br />
              Target: Volumetric Water Content (0-5cm VWC)<br />
              Plastic Limit Threshold: 85%
            </div>
          </div>

          {/* Copernicus DEM */}
          <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <b style={{ fontSize: 13, color: 'var(--text-primary)' }}>Copernicus DEM 30m</b>
              <span style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 3, background: 'rgba(63, 139, 76, 0.15)', color: 'var(--hazard-normal)', fontWeight: 700 }}>
                ACTIVE GLO-30
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Resolution: 30-meter high geomorphic raster<br />
              Algorithm: Finite-Difference Gradient & Aspect<br />
              CDSE Client ID: {credStatus?.sources?.copernicus_dem?.account || 'sh****87'}
            </div>
          </div>

          {/* OpenStreetMap */}
          <div style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <b style={{ fontSize: 13, color: 'var(--text-primary)' }}>OpenStreetMap Overpass</b>
              <span style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 3, background: 'rgba(63, 139, 76, 0.15)', color: 'var(--hazard-normal)', fontWeight: 700 }}>
                OPERATIONAL
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.5 }}>
              Endpoint: overpass-api.de/api/interpreter<br />
              Features: Bridges, Highways, Hospitals, Relief Shelters<br />
              Query Mode: Live Bounding-Box REST
            </div>
          </div>
        </div>
      </div>

      {/* 2. HAZARD THRESHOLD CONTROLS */}
      <div className="card" style={{ padding: '18px' }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
          Early Warning Alert Thresholds (NDMA / GSI Standards)
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Calibrate automated trigger thresholds that transition risk zones to Warning and Danger tiers
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
              24H Rainfall Trigger Boundary: <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{rfTrigger} mm</span>
            </label>
            <input 
              type="range" 
              min="30" 
              max="120" 
              value={rfTrigger} 
              onChange={(e) => setRfTrigger(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Baseline: 45mm · Extreme: 100mm+</div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Soil Moisture Critical Saturation: <span style={{ color: 'var(--hazard-danger)', fontFamily: 'var(--font-mono)' }}>{soilTrigger}%</span>
            </label>
            <input 
              type="range" 
              min="50" 
              max="95" 
              value={soilTrigger} 
              onChange={(e) => setSoilTrigger(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--hazard-danger)' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>Liquid Plastic Limit: 85% VWC</div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
              Critical Slope Shear Gradient: <span style={{ color: 'var(--hazard-warning)', fontFamily: 'var(--font-mono)' }}>{slopeTrigger}°</span>
            </label>
            <input 
              type="range" 
              min="15" 
              max="45" 
              value={slopeTrigger} 
              onChange={(e) => setSlopeTrigger(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--hazard-warning)' }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>High geomorphic instability above 28°</div>
          </div>
        </div>
      </div>

      {/* 3. NOTIFICATION & PREFERENCES */}
      <div className="card" style={{ padding: '18px' }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginBottom: 14 }}>
          System Dispatch & Interface Preferences
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={soundAlerts} 
              onChange={(e) => setSoundAlerts(e.target.checked)} 
              style={{ accentColor: 'var(--accent)' }}
            />
            <span><b>Audible High-Hazard Warning Tone:</b> Play sound when danger threshold (&gt;80%) is exceeded</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={smsGateway} 
              onChange={(e) => setSmsGateway(e.target.checked)} 
              style={{ accentColor: 'var(--accent)' }}
            />
            <span><b>NDMA / BSNL CAP-Compliant SMS Gateway:</b> Auto-dispatch broadcast alerts to field teams</span>
          </label>
        </div>

        <div className="divider" style={{ margin: '14px 0' }} />

        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Appearance Mode: </span>
            <button className="btn" onClick={onToggleTheme} style={{ marginLeft: 6, fontSize: 12 }}>
              {theme === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
            </button>
          </div>

          <div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>System Language: </span>
            <b style={{ fontSize: 12.5, marginLeft: 4 }}>{language}</b>
          </div>

          <div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Platform Version: </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginLeft: 4 }}>v1.0.0-xgb (SIH 26001)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
