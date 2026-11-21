import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TACTICAL_SHADERS } from './tactical/shaders/index.js';
import { module1Api } from '../services/module1Api.js';
import './tactical/Tactical3DGlobe.css';

// Preset Tactical Mountain Vantage Points (Oblique camera vectors revealing 3D relief)
const TACTICAL_PRESETS = [
  {
    id: 'pan-india',
    name: 'All India',
    region: 'Whole country',
    lat: 22.5,
    lon: 82.0,
    alt: 3800000,
    heading: 0,
    pitch: -85,
  },
  {
    id: 'wayanad',
    name: 'Wayanad (Chooralmala)',
    region: 'Western Ghats, Kerala',
    lat: 11.52,
    lon: 76.15,
    alt: 3600,
    heading: 45,
    pitch: -32,
    districtId: 'wayanad',
  },
  {
    id: 'rudraprayag',
    name: 'Kedarnath (Mandakini)',
    region: 'Uttarakhand',
    lat: 30.73,
    lon: 79.06,
    alt: 5400,
    heading: 15,
    pitch: -35,
    districtId: 'rudraprayag',
  },
  {
    id: 'chamoli',
    name: 'Joshimath (Alaknanda)',
    region: 'Uttarakhand',
    lat: 30.55,
    lon: 79.56,
    alt: 4400,
    heading: 330,
    pitch: -28,
    districtId: 'chamoli',
  },
  {
    id: 'noney',
    name: 'Tupul (Noney)',
    region: 'Manipur',
    lat: 24.81,
    lon: 93.65,
    alt: 2800,
    heading: 90,
    pitch: -26,
    districtId: 'noney',
  },
  {
    id: 'shimla',
    name: 'Shimla Ridge',
    region: 'Himachal Pradesh',
    lat: 31.10,
    lon: 77.17,
    alt: 3900,
    heading: 195,
    pitch: -30,
    districtId: 'shimla',
  },
  {
    id: 'gangtok',
    name: 'Gangtok / Teesta',
    region: 'Sikkim',
    lat: 27.33,
    lon: 88.61,
    alt: 3400,
    heading: 65,
    pitch: -32,
    districtId: 'east-sikkim',
  },
];

export default function Tactical3DGlobe({ role, goTo, selection, selectDistrict }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const stagesRef = useRef({});
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(performance.now());

  const [activePreset, setActivePreset] = useState('pan-india');
  const [activeSensor, setActiveSensor] = useState('normal'); // normal, thermal, surveillance, retro, noir, snow, anime
  const [thermalMode, setThermalMode] = useState('ironbow'); // ironbow, whot, bhot
  const [mapSource, setMapSource] = useState('Loading free satellite imagery...');
  const [telemetry, setTelemetry] = useState({
    lat: '22.5000° N',
    lon: '82.0000° E',
    alt: '3,800 km',
    heading: '000°',
    pitch: '-85°',
  });
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [liveDistricts, setLiveDistricts] = useState([]);

  // Live district evaluation from the backend. No static fallback: if the API is down the globe
  // shows no beacons rather than invented ones.
  const [liveError, setLiveError] = useState(null);
  useEffect(() => {
    let mounted = true;
    module1Api.getDistrictsLive().then((live) => {
      if (!mounted) return;
      if (!live?.districts) { setLiveError('Live district data unavailable'); return; }
      setLiveDistricts(Object.values(live.districts).map((d) => {
        const slopes = (d.hotspots || []).map((h) => h.slope_deg).filter((v) => typeof v === 'number');
        return {
          id: d.id, name: d.name, state: d.state, lat: d.lat, lon: d.lon,
          hazard: d.level, ratio: d.ratio,
          rainfall_24h: d.weather?.rain_mm?.['24'] ?? null,
          soil_moisture: d.weather?.soil_moisture_7_28cm ?? null,
          slope: slopes.length ? Math.max(...slopes) : null,
          weatherStatus: d.weather_status,
        };
      }));
    });
    return () => { mounted = false; };
  }, []);

  // Initialize Cesium viewer with God's Eye View architecture
  useEffect(() => {
    let isCancelled = false;

    async function initViewer() {
      if (!window.Cesium) {
        setTimeout(initViewer, 300);
        return;
      }

      const Cesium = window.Cesium;

      // Free, keyless stack: no Cesium ion token and no Google Maps key are needed.
      // Imagery comes from Esri World Imagery (OpenStreetMap as fallback) on the
      // default ellipsoid terrain.

      if (isCancelled || !containerRef.current) return;

      try {
        // Build Cesium Viewer with God's Eye View minimal chrome
        const viewer = new Cesium.Viewer(containerRef.current, {
          timeline: false,
          animation: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          vrButton: false,
          selectionIndicator: false,
          infoBox: false,
          baseLayer: false,
          msaaSamples: 4,
          contextOptions: {
            webgl: { preserveDrawingBuffer: true },
          },
        });

        viewer.showRenderLoopErrors = false;
        viewerRef.current = viewer;
        viewer.targetFrameRate = 60;

        // Atmosphere and sky matching God's Eye View
        if (viewer.scene.skyAtmosphere) {
          viewer.scene.skyAtmosphere.show = true;
          viewer.scene.skyAtmosphere.atmosphereLightIntensity = 18.0;
          viewer.scene.skyAtmosphere.saturationShift = -0.12;
          viewer.scene.skyAtmosphere.brightnessShift = -0.08;
        }

        // 1. Base imagery (free, no API key)
        viewer.scene.globe.show = true;
        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.globe.enableLighting = true;

        let imageryProvider = null;
        try {
          imageryProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
            { enablePickFeatures: false }
          );
          setMapSource('Esri satellite');
        } catch (arcErr) {
          console.warn('Esri imagery unavailable, falling back to OpenStreetMap:', arcErr);
          imageryProvider = new Cesium.OpenStreetMapImageryProvider({
            url: 'https://tile.openstreetmap.org/',
          });
          setMapSource('OpenStreetMap');
        }

        // The page may have been closed (or re-mounted) while imagery was loading: this viewer
        // is then already destroyed, so stop here instead of configuring a dead viewer.
        if (isCancelled || viewer.isDestroyed()) return;
        if (imageryProvider) {
          viewer.scene.imageryLayers.addImageryProvider(imageryProvider);
        }

        // 2. Initialize God's Eye View GLSL Post-Process Stages
        const stages = {};
        for (const [name, shader] of Object.entries(TACTICAL_SHADERS)) {
          if (!shader) continue;
          const uniforms = { intensity: 0.0 };

          if (shader.fragmentShader.includes('uniform float time')) {
            uniforms.time = 0.0;
          }
          if (shader.uniforms) {
            for (const [uName, uMeta] of Object.entries(shader.uniforms)) {
              uniforms[uName] = uMeta.default;
            }
          }

          try {
            const stage = new Cesium.PostProcessStage({
              name: `godsEyeView_${name}`,
              fragmentShader: shader.fragmentShader,
              uniforms,
            });
            stage.enabled = false;
            viewer.scene.postProcessStages.add(stage);
            stages[name] = stage;
          } catch (stErr) {
            console.warn(`Could not register shader stage ${name}:`, stErr);
          }
        }
        stagesRef.current = stages;

        // 3. 60 FPS Shader Uniform Animation Loop (Time, Scanlines, Snow particles)
        const updateUniforms = () => {
          const now = performance.now();
          const elapsed = (now - startTimeRef.current) / 1000.0;

          for (const stage of Object.values(stagesRef.current)) {
            if (stage && stage.enabled && stage.uniforms && stage.uniforms.time !== undefined) {
              stage.uniforms.time = elapsed;
            }
          }

          // Telemetry HUD readouts
          if (viewer && viewer.camera) {
            const cam = viewer.camera;
            const carto = viewer.scene.globe?.ellipsoid
              ? Cesium.Cartographic.fromCartesian(cam.position)
              : null;

            if (carto) {
              const latDeg = Cesium.Math.toDegrees(carto.latitude).toFixed(4);
              const lonDeg = Cesium.Math.toDegrees(carto.longitude).toFixed(4);
              const altM = Math.round(carto.height);
              const altStr = altM > 10000 ? `${(altM / 1000).toLocaleString()} km` : `${altM.toLocaleString()} m MSL`;
              const headingDeg = Math.round(Cesium.Math.toDegrees(cam.heading));
              const pitchDeg = Math.round(Cesium.Math.toDegrees(cam.pitch));

              setTelemetry({
                lat: `${latDeg}° N`,
                lon: `${lonDeg}° E`,
                alt: altStr,
                heading: `${String(headingDeg).padStart(3, '0')}°`,
                pitch: `${pitchDeg}°`,
              });
            }
          }

          animFrameRef.current = requestAnimationFrame(updateUniforms);
        };
        animFrameRef.current = requestAnimationFrame(updateUniforms);

        // Initial vantage point: Pan-India
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(82.0, 22.5, 3800000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-85),
            roll: 0.0,
          },
        });
      } catch (err) {
        console.error('Cesium Tactical Globe initialization failure:', err);
      }
    }

    initViewer();

    return () => {
      isCancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Render 3D glowing beacons for landslide hotspots
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !window.Cesium || viewer.isDestroyed()) return;
    const Cesium = window.Cesium;

    // Clear old entities
    viewer.entities.removeAll();

    liveDistricts.forEach((d) => {
      if (!d || !d.lat || !d.lon) return;

      const dName = String(d.name || d.id || 'LOCATION');
      const dHazard = String(d.hazard || 'unknown').toLowerCase();
      const dTag = typeof d.ratio === 'number' ? `${d.ratio.toFixed(1)}×` : 'no data';

      let color = Cesium.Color.fromCssColorString(dHazard === 'unknown' ? '#6b7280' : '#10b981'); // normal / no data
      let cylinderH = 1600;
      let radius = 30;

      if (dHazard === 'danger') {
        color = Cesium.Color.fromCssColorString('#ef4444');
        cylinderH = 3600;
        radius = 65;
      } else if (dHazard === 'warning') {
        color = Cesium.Color.fromCssColorString('#f97316');
        cylinderH = 2600;
        radius = 50;
      } else if (dHazard === 'watch') {
        color = Cesium.Color.fromCssColorString('#eab308');
        cylinderH = 2000;
        radius = 40;
      }

      // Vertical 3D glowing beacon cylinder
      viewer.entities.add({
        name: dName,
        districtData: d,
        position: Cesium.Cartesian3.fromDegrees(d.lon, d.lat, cylinderH / 2),
        cylinder: {
          length: cylinderH,
          topRadius: radius,
          bottomRadius: 8,
          material: color.withAlpha(0.65),
          outline: true,
          outlineColor: color.withAlpha(0.9),
          outlineWidth: 2,
        },
      });

      // Beacon base glowing point and tactical font label
      viewer.entities.add({
        name: `${dName} Point`,
        districtData: d,
        position: Cesium.Cartesian3.fromDegrees(d.lon, d.lat, 10),
        point: {
          pixelSize: dHazard === 'danger' ? 14 : 10,
          color: color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 1.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: `${dName} ${dTag}`,
          font: '10px "IBM Plex Mono", monospace',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -18),
          disableDepthTestDistance: 500000,
        },
      });
    });

    // Beacon click handler
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement) => {
      const picked = viewer.scene.pick(movement.position);
      if (picked && picked.id && picked.id.districtData) {
        const d = picked.id.districtData;
        setSelectedDistrict(d);
        flyToTarget(d.lat, d.lon, 4500, 30, -32);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      if (!handler.isDestroyed()) handler.destroy();
    };
  }, [liveDistricts]);

  // Smooth cinematic camera flight to coordinates
  const flyToTarget = useCallback((lat, lon, alt, heading = 0, pitch = -35) => {
    const viewer = viewerRef.current;
    if (!viewer || !window.Cesium || viewer.isDestroyed()) return;
    const Cesium = window.Cesium;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
      orientation: {
        heading: Cesium.Math.toRadians(heading),
        pitch: Cesium.Math.toRadians(pitch),
        roll: 0.0,
      },
      duration: 2.2,
    });
  }, []);

  // Preset selector
  const handleSelectPreset = (preset) => {
    setActivePreset(preset.id);
    flyToTarget(preset.lat, preset.lon, preset.alt, preset.heading, preset.pitch);
    if (preset.districtId) {
      const found = liveDistricts.find((d) => d.id === preset.districtId);
      if (found) setSelectedDistrict(found);
    }
  };

  // Sensor mode switcher (controls God's Eye View post-process shaders)
  const applySensorMode = (modeName) => {
    setActiveSensor(modeName);
    const stages = stagesRef.current;

    // First disable all stages
    for (const stage of Object.values(stages)) {
      if (stage) {
        stage.uniforms.intensity = 0.0;
        stage.enabled = false;
      }
    }

    if (modeName === 'normal' || !stages[modeName]) {
      return;
    }

    // Enable selected stage with 1.0 intensity
    const activeStage = stages[modeName];
    activeStage.uniforms.intensity = 1.0;
    activeStage.enabled = true;

    // Apply FLIR thermal sub-modes if thermal
    if (modeName === 'thermal' && activeStage.uniforms) {
      if (thermalMode === 'ironbow') {
        activeStage.uniforms.palette = 1.0;
        activeStage.uniforms.mode = 0.0;
      } else if (thermalMode === 'whot') {
        activeStage.uniforms.palette = 0.0;
        activeStage.uniforms.mode = 0.0;
      } else if (thermalMode === 'bhot') {
        activeStage.uniforms.palette = 0.0;
        activeStage.uniforms.mode = 1.0;
      }
    }
  };

  // Switch thermal sub-palette (Ironbow / WHOT / BHOT)
  const setThermalPalette = (pal) => {
    setThermalMode(pal);
    const stage = stagesRef.current.thermal;
    if (!stage || !stage.uniforms) return;

    if (pal === 'ironbow') {
      stage.uniforms.palette = 1.0;
      stage.uniforms.mode = 0.0;
    } else if (pal === 'whot') {
      stage.uniforms.palette = 0.0;
      stage.uniforms.mode = 0.0;
    } else if (pal === 'bhot') {
      stage.uniforms.palette = 0.0;
      stage.uniforms.mode = 1.0;
    }
  };

  return (
    <div className="tactical-globe-wrapper">
      {/* Cesium 3D WebGL Surface */}
      <div ref={containerRef} className="tactical-cesium-viewport" />

      {/* Top Intelligence HUD Bar */}
      <div className="tactical-hud-topbar">

        <div className="hud-telemetry-readouts">
          <div className="telemetry-chip highlight">
            <span>POS:</span> <strong>{telemetry.lat} {telemetry.lon}</strong>
          </div>
          <div className="telemetry-chip">
            <span>ALT:</span> <strong>{telemetry.alt}</strong>
          </div>
          <div className="telemetry-chip">
            <span>IMAGERY:</span> <strong>{mapSource}</strong>
          </div>
        </div>

      </div>

      {/* Left Mountain Presets Deck */}
      <div className="tactical-vantage-deck">
        <div className="deck-header">
          <span>Go to</span>
        </div>
        <div className="deck-list">
          {TACTICAL_PRESETS.map((p) => (
            <button
              key={p.id}
              className={`deck-item-btn ${activePreset === p.id ? 'active' : ''}`}
              onClick={() => handleSelectPreset(p)}
            >
              <div>
                <div className="name">{p.name}</div>
                <div className="sub">{p.region}</div>
              </div>
              <span style={{ fontSize: '10px', opacity: 0.6 }}>↗</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Tactical Sensors Dock */}
      <div className="tactical-sensor-dock">
        <div className="dock-row">
          <button
            className={`sensor-chip-btn ${activeSensor === 'normal' ? 'active' : ''}`}
            onClick={() => applySensorMode('normal')}
          >
            🌐 Normal
          </button>
          <button
            className={`sensor-chip-btn flir ${activeSensor === 'thermal' ? 'active' : ''}`}
            onClick={() => applySensorMode('thermal')}
          >
            🔥 Thermal
          </button>
          <button
            className={`sensor-chip-btn nvg ${activeSensor === 'surveillance' ? 'active' : ''}`}
            onClick={() => applySensorMode('surveillance')}
          >
            🟢 Night vision
          </button>
          <button
            className={`sensor-chip-btn crt ${activeSensor === 'retro' ? 'active' : ''}`}
            onClick={() => applySensorMode('retro')}
          >
            📺 Retro
          </button>
          <button
            className={`sensor-chip-btn ${activeSensor === 'noir' ? 'active' : ''}`}
            onClick={() => applySensorMode('noir')}
          >
            🎞️ Noir
          </button>
          <button
            className={`sensor-chip-btn ${activeSensor === 'snow' ? 'active' : ''}`}
            onClick={() => applySensorMode('snow')}
          >
            ❄️ Snow
          </button>
          <button
            className={`sensor-chip-btn ${activeSensor === 'anime' ? 'active' : ''}`}
            onClick={() => applySensorMode('anime')}
          >
            🎨 Cartoon
          </button>
        </div>

        {/* FLIR Thermal Sub-Palette Switcher */}
        {activeSensor === 'thermal' && (
          <div className="submode-pill-row">
            <span style={{ fontSize: '9px', fontFamily: 'monospace', color: '#94a3b8', marginRight: '4px' }}>
              Palette:
            </span>
            <button
              className={`submode-pill ${thermalMode === 'ironbow' ? 'active' : ''}`}
              onClick={() => setThermalPalette('ironbow')}
            >
              Ironbow
            </button>
            <button
              className={`submode-pill ${thermalMode === 'whot' ? 'active' : ''}`}
              onClick={() => setThermalPalette('whot')}
            >
              White hot
            </button>
            <button
              className={`submode-pill ${thermalMode === 'bhot' ? 'active' : ''}`}
              onClick={() => setThermalPalette('bhot')}
            >
              Black hot
            </button>
          </div>
        )}
      </div>

      {/* Right Rail: Target Intelligence Dossier */}
      {selectedDistrict && (
        <div className="tactical-dossier-rail">
          <div className="dossier-header">
            <span>District</span>
            <button className="dossier-close-btn" onClick={() => setSelectedDistrict(null)}>
              ✕
            </button>
          </div>

          <div className="dossier-title-box">
            <div className="name">{selectedDistrict.name}</div>
            <div className="state">
              {selectedDistrict.state}
            </div>
          </div>

          <div className="dossier-metric-line">
            <span className="label">Level</span>
            <span className={`risk-level-badge ${selectedDistrict.hazard || 'unknown'}`}>
              {String(selectedDistrict.hazard || 'unknown').toUpperCase()}
            </span>
          </div>

          <div className="dossier-metric-line">
            <span className="label">Rain ÷ threshold</span>
            <span className="val">{typeof selectedDistrict.ratio === 'number' ? `${selectedDistrict.ratio.toFixed(2)}x` : 'no data'}</span>
          </div>

          <div className="prob-meter-bar">
            <div
              className="prob-meter-fill"
              style={{
                width: `${typeof selectedDistrict.ratio === 'number' ? Math.min(100, (selectedDistrict.ratio / 4) * 100) : 0}%`,
                background:
                  selectedDistrict.hazard === 'danger'
                    ? '#ef4444'
                    : selectedDistrict.hazard === 'warning'
                    ? '#f97316'
                    : selectedDistrict.hazard === 'watch'
                    ? '#eab308'
                    : '#10b981',
              }}
            />
          </div>

          <div className="dossier-metric-line">
            <span className="label">Rain, last 24 h</span>
            <span className="val">{selectedDistrict.rainfall_24h ?? '—'} mm</span>
          </div>

          <div className="dossier-metric-line">
            <span className="label">Soil moisture</span>
            <span className="val">{selectedDistrict.soil_moisture != null ? `${selectedDistrict.soil_moisture} m³/m³` : '—'}</span>
          </div>

          <div className="dossier-metric-line">
            <span className="label">Steepest slope</span>
            <span className="val">{selectedDistrict.slope != null ? `${selectedDistrict.slope}°` : '—'}</span>
          </div>

          <div className="dossier-metric-line">
            <span className="label">Coordinates</span>
            <span className="val">{selectedDistrict.lat?.toFixed(3)}°N, {selectedDistrict.lon?.toFixed(3)}°E</span>
          </div>

          <div className="dossier-actions-row">
            <button
              className="dossier-action-btn"
              onClick={() => goTo('monitor', { districtId: selectedDistrict.id })}
            >
              Live Monitor →
            </button>
            <button
              className="dossier-action-btn secondary"
              onClick={() => goTo('infra', { districtId: selectedDistrict.id })}
            >
              Infrastructure
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
