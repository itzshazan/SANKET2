import React from 'react';
import HazardBadge from '../components/HazardBadge.jsx';
import { PRIORITIES, ZONES } from '../data/mockData.js';
import { IconVillage, IconRoad, IconMap } from '../components/icons.jsx';

export default function ResponsePriorities({ selectZone, goTo }) {
  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Where Should Authorities Act First?</div>
        <div className="card-subtitle">
          Priority for the MVP is computed from predefined values — Risk + Population + Road Importance + Infrastructure + Isolation. The live system replaces this with a scored ranking (see docs/FEATURES.md F4.11).
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PRIORITIES.map((p) => {
          const zone = ZONES[p.zone];
          return (
            <div key={p.rank} className="card" style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 24, width: 46, textAlign: 'center',
                color: p.rank === 1 ? 'var(--hazard-danger)' : p.rank === 2 ? 'var(--hazard-warning)' : 'var(--text-dim)',
              }}>
                {p.rank}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{p.label}</span>
                  <HazardBadge level={p.hazard} size="sm" />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconVillage width={13} height={13} /> {p.villages} {p.villages === 1 ? 'village' : 'villages'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><IconRoad width={13} height={13} /> {p.roads} {p.roads === 1 ? 'road' : 'roads'}</span>
                  {p.infra && <span>{p.infra}</span>}
                </div>
                {zone && <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 4 }}>{p.reasoning}</div>}
              </div>
              <button className="btn primary" onClick={() => { selectZone(p.zone); goTo('gis-map'); }}>
                <IconMap width={13} height={13} /> View on GIS Map
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
