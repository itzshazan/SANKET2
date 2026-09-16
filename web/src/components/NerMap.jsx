import React, { useMemo } from 'react';
import { NER_VIEWBOX, STATE_PATHS, DISTRICT_PATHS } from '../data/nerGeo.js';
import { VILLAGES, ROADS, INFRASTRUCTURE, FIELD_EVIDENCE } from '../data/mockData.js';

// Real state and district boundaries — district-level polygons from
// udit-001/india-maps-data (see docs/data-sources.md), dissolved per state
// and per district with Shapely, simplified, and projected into a static SVG
// viewBox (equirectangular, cos-latitude corrected — accurate enough at NER's
// scale to not need a full map projection). Precomputed by
// web/geodata_src/build_geo.py into web/src/data/nerGeo.js — this component
// only renders paths, it does no geometry work at runtime.

function dominantHazard(zones) {
  if (zones.danger > 0) return 'danger';
  if (zones.warning > 0) return 'warning';
  if (zones.watch > 0) return 'watch';
  return 'normal';
}

// Map fills use the stronger --hazard-*-map tokens, not the subtle badge
// washes — a badge only needs to tint a few words of text, but a map has to
// communicate risk level across a whole shape at a glance.
const HZ_FILL = {
  normal: 'var(--hazard-normal-map)',
  watch: 'var(--hazard-watch-map)',
  warning: 'var(--hazard-warning-map)',
  danger: 'var(--hazard-danger-map)',
};
const HZ_STROKE = {
  normal: 'var(--hazard-normal)',
  watch: 'var(--hazard-watch)',
  warning: 'var(--hazard-warning)',
  danger: 'var(--hazard-danger)',
};
const HZ_LABEL = { normal: 'Normal', watch: 'Watch', warning: 'Warning', danger: 'Danger' };

const ROAD_COLOR = { open: 'var(--hazard-normal)', 'at-risk': 'var(--hazard-warning)', blocked: 'var(--hazard-danger)' };
const VILLAGE_COLOR = { 'at-risk': 'var(--hazard-warning)', isolated: 'var(--hazard-danger)' };

export default function NerMap({ states, selectedId, onSelect }) {
  const visibleIds = useMemo(() => new Set(states.map((s) => s.id)), [states]);

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={NER_VIEWBOX}
        role="img"
        aria-label="Map of the eight North Eastern states using real district-derived boundaries, coloured by highest active hazard level, click a state to drill in"
        style={{ width: '100%', height: 'auto', maxHeight: 460 }}
      >
        {Object.entries(STATE_PATHS).map(([code, geo]) => {
          const stateData = states.find((s) => s.id === code);
          const dimmed = !visibleIds.has(code);
          const hz = stateData ? dominantHazard(stateData.zones) : 'normal';
          const selected = selectedId === code;
          return (
            <g
              key={code}
              onClick={() => stateData && onSelect(code)}
              style={{ cursor: stateData ? 'pointer' : 'default', opacity: dimmed ? 0.25 : 1 }}
            >
              <path
                d={geo.d}
                fill={HZ_FILL[hz]}
                stroke={selected ? 'var(--accent-2)' : HZ_STROKE[hz]}
                strokeWidth={selected ? 2.6 : 1.2}
                strokeLinejoin="round"
              />
              <text
                x={geo.label[0]} y={geo.label[1] - 4}
                textAnchor="middle"
                fontFamily="var(--font-display)"
                fontWeight="700"
                fontSize="13"
                fill="var(--text-primary)"
                style={{ pointerEvents: 'none' }}
              >
                {code}
              </text>
              {stateData && (
                <text
                  x={geo.label[0]} y={geo.label[1] + 11}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize="9.5"
                  fill="var(--text-muted)"
                  style={{ pointerEvents: 'none' }}
                >
                  {stateData.zones.danger > 0 ? `${stateData.zones.danger} danger` : `${stateData.districts} districts`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ fontSize: 10.5, color: 'var(--text-dim)', marginTop: 4 }}>
        Real state boundaries (district polygons dissolved &amp; simplified). Colour = highest active hazard level in the state.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// District-level zone map — real district boundary when we have one, zones
// plotted using their fractional coords remapped into that district's own
// bounding box (zone positions inside it are still illustrative — see
// docs/HANDOFF.md §3a — but the boundary itself is real). `activeLayers` is
// the Set driven by GisRiskMap's layer panel: this is what makes those
// checkboxes actually do something instead of being decorative.
//
// Honesty note: only Risk / Villages / Roads / Infrastructure / Disaster
// layers have real backing data (village positions, road paths, field
// reports) and are genuinely wired. Rivers/drainage and Terrain have no
// vector geometry in this prototype — toggling them surfaces a caption
// note saying so rather than drawing fabricated lines.
// ---------------------------------------------------------------------------

const REPORT_TYPE_TO_LAYER = {
  Landslide: 'Reported landslides',
  Crack: 'Reported cracks',
  'Road blockage': 'Road blockages',
  Debris: 'Reported cracks',
  'Slope movement': 'Reported landslides',
};

export function DistrictZoneMap({ district, zones, selectedZoneId, onSelectZone, activeLayers }) {
  const geo = DISTRICT_PATHS[district.id];
  const layers = activeLayers || new Set(['Normal', 'Watch', 'Warning', 'Danger', 'State boundaries', 'District boundaries']);

  if (!geo) {
    return (
      <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}>
        No boundary loaded for {district.name} yet.
      </div>
    );
  }

  const [bx0, by0, bx1, by1] = geo.bbox;
  const pad = Math.max((bx1 - bx0), (by1 - by0)) * 0.15 || 5;
  const vb = `${bx0 - pad} ${by0 - pad} ${bx1 - bx0 + pad * 2} ${by1 - by0 + pad * 2}`;
  const P = (c) => [bx0 + c.x * (bx1 - bx0), by0 + c.y * (by1 - by0)];
  const unit = bx1 - bx0;

  const visibleZones = zones.filter((z) => layers.has(HZ_LABEL[z.hazard]));

  const villageEntries = layers.has('Villages')
    ? zones.flatMap((z) => z.villages.map((vid) => VILLAGES[vid]).filter(Boolean))
    : [];
  const roadEntries = layers.has('Roads')
    ? zones.flatMap((z) => z.roads.map((rid) => ROADS[rid]).filter(Boolean))
    : [];
  const infraEntries = layers.has('Bridges') || layers.has('Hospitals') || layers.has('Schools') || layers.has('Other critical infrastructure')
    ? zones.flatMap((z) => z.infrastructure.map((iid) => INFRASTRUCTURE[iid]).filter(Boolean))
    : [];
  const evidenceEntries = FIELD_EVIDENCE.filter((e) => zones.some((z) => z.id === e.zone) && layers.has(REPORT_TYPE_TO_LAYER[e.reportType]));

  const envChips = [];
  if (layers.has('Rainfall')) envChips.push(`Rainfall: ${district.environment.rainfall.current}`);
  if (layers.has('Soil moisture')) envChips.push(`Soil moisture: ${district.environment.soilMoisture.level}`);
  if (layers.has('Vegetation / NDVI')) envChips.push(`NDVI: ${district.environment.vegetation.ndvi} (${district.environment.vegetation.change})`);
  if (layers.has('Historical landslides')) envChips.push(`${district.historicalLandslideCount} historical landslides`);

  const showNoGeometryNote = layers.has('Rivers/drainage') || layers.has('Terrain');
  const showDistrictBoundary = layers.has('District boundaries');

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={vb}
        role="img"
        aria-label={`Real boundary of ${district.name} district with active map layers rendered, click a zone for detail`}
        style={{ width: '100%', height: 'auto', maxHeight: 340, background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}
      >
        <path
          d={geo.d}
          fill="var(--surface)"
          stroke={showDistrictBoundary ? 'var(--border)' : 'transparent'}
          strokeWidth={Math.max(unit * 0.006, 0.4)}
        />

        {/* Roads — status-coloured line segments, real path data */}
        {roadEntries.map((r) => (
          <polyline
            key={r.id}
            points={r.path.map((c) => P(c).join(',')).join(' ')}
            fill="none"
            stroke={ROAD_COLOR[r.status] || 'var(--text-dim)'}
            strokeWidth={unit * 0.012}
            strokeLinecap="round"
            strokeDasharray={r.status === 'blocked' ? `${unit * 0.02} ${unit * 0.014}` : undefined}
          />
        ))}

        {/* Risk zones, filtered by which hazard levels are toggled on */}
        {visibleZones.map((z) => {
          const [cx, cy] = P(z.coords);
          const r = unit * (z.hazard === 'danger' ? 0.05 : z.hazard === 'warning' ? 0.042 : 0.032);
          const selected = selectedZoneId === z.id;
          return (
            <g key={z.id} onClick={() => onSelectZone(z.id)} style={{ cursor: 'pointer' }}>
              <circle cx={cx} cy={cy} r={r} fill={HZ_FILL[z.hazard]} stroke={selected ? 'var(--accent-2)' : HZ_STROKE[z.hazard]} strokeWidth={selected ? r * 0.18 : r * 0.09} />
              <text x={cx} y={cy + r * 0.32} textAnchor="middle" fontFamily="var(--font-mono)" fontWeight="700" fontSize={r * 0.6} fill="var(--text-primary)" style={{ pointerEvents: 'none' }}>
                {z.name.replace(district.name, '').trim().replace('Zone', '')}
              </text>
            </g>
          );
        })}

        {/* Villages */}
        {villageEntries.map((v) => {
          const [cx, cy] = P(v.coords);
          return (
            <g key={v.id}>
              <circle cx={cx} cy={cy} r={unit * 0.022} fill="var(--surface)" stroke={VILLAGE_COLOR[v.status] || 'var(--accent)'} strokeWidth={unit * 0.009} />
              <title>{`${v.name} — pop. ${v.population} — ${v.status}`}</title>
            </g>
          );
        })}

        {/* Infrastructure — small square marker */}
        {infraEntries.map((i) => {
          const [cx, cy] = P(i.coords);
          const s = unit * 0.022;
          return (
            <g key={i.id}>
              <rect x={cx - s / 2} y={cy - s / 2} width={s} height={s} fill="var(--accent-2)" stroke="var(--surface)" strokeWidth={unit * 0.003} transform={`rotate(45 ${cx} ${cy})`} />
              <title>{`${i.name} (${i.type}) — ${i.status}`}</title>
            </g>
          );
        })}

        {/* Field evidence — reported landslides/cracks/blockages, offset near their zone */}
        {evidenceEntries.map((e, idx) => {
          const zone = zones.find((z) => z.id === e.zone);
          if (!zone) return null;
          const jx = ((idx % 3) - 1) * 0.03;
          const jy = (Math.floor(idx / 3) % 3 - 1) * 0.03;
          const [cx, cy] = P({ x: zone.coords.x + jx, y: zone.coords.y + jy + 0.08 });
          const s = unit * 0.02;
          return (
            <g key={e.id}>
              <polygon points={`${cx},${cy - s} ${cx - s},${cy + s} ${cx + s},${cy + s}`} fill="var(--accent-2)" stroke="var(--surface)" strokeWidth={unit * 0.003} />
              <title>{`${e.reportId} — ${e.reportType} — ${e.status}`}</title>
            </g>
          );
        })}
      </svg>

      {envChips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
          {envChips.map((c) => (
            <span key={c} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, background: 'var(--accent-2-glow)', color: 'var(--accent-2-dim)', padding: '2px 7px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-2)' }}>
              {c}
            </span>
          ))}
        </div>
      )}

      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
        {district.name} boundary is real (Survey-derived); zone/village/road positions within it are illustrative.
        {showNoGeometryNote && ' Rivers/drainage and Terrain have no vector layer in this prototype — see docs/ARCHITECTURE.md for the live GIS plan.'}
      </div>
    </div>
  );
}
