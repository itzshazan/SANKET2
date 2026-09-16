import React from 'react';

// Scripted walkthrough of the Manipur → Noney "golden path" — the one
// district built out in full hand-authored depth (see docs/HANDOFF.md §3) —
// across the views that tell the actual product story. Each step just sets
// {view, selection}; App.jsx applies it the same way any other navigation
// does, so this is a sequence of real navigations, not a fake recording.
export const DEMO_STEPS = [
  {
    view: 'dashboard',
    selection: { stateId: 'MN', districtId: null, zoneId: null },
    caption: 'NER Regional Dashboard — 118 districts across all 8 North Eastern states, colour-coded by live hazard level.',
    duration: 5000,
  },
  {
    view: 'dashboard',
    selection: { stateId: 'MN', districtId: 'noney', zoneId: 'noney-a' },
    caption: 'Drilling into Manipur → Noney — the district built out in full depth for this demo, matching the real 2022 event.',
    duration: 5500,
  },
  {
    view: 'gis-map',
    selection: { stateId: 'MN', districtId: 'noney', zoneId: 'noney-a' },
    caption: 'GIS Risk Map — real district boundaries, with toggleable layers for roads, villages, and environmental signals.',
    duration: 6000,
  },
  {
    view: 'monitoring',
    selection: { stateId: 'MN', districtId: 'noney', zoneId: 'noney-a' },
    caption: 'Risk Monitoring — live environmental readings, an AI risk assessment, and a ranked "why is this area at risk" explanation.',
    duration: 7000,
  },
  {
    view: 'alerts',
    selection: { stateId: 'MN', districtId: 'noney', zoneId: 'noney-a' },
    caption: 'Alerts — generate a real, translated warning for the audience and channel that need it.',
    duration: 6000,
  },
  {
    view: 'priorities',
    selection: { stateId: 'MN', districtId: 'noney', zoneId: 'noney-a' },
    caption: 'Response Priorities — every zone in the region ranked by hazard, population exposure, and isolation risk.',
    duration: 6000,
  },
  {
    view: 'backtesting',
    selection: { stateId: 'MN', districtId: 'noney', zoneId: 'noney-a' },
    caption: 'Historical Backtesting — replaying the real Noney 2022 landslide against 30 days of archived signal.',
    duration: 7000,
  },
];

export default function DemoOverlay({ stepIndex, paused, onNext, onPrev, onPauseToggle, onExit }) {
  const step = DEMO_STEPS[stepIndex];
  if (!step) return null;

  return (
    <div className="demo-overlay">
      <div className="demo-overlay-progress">
        <span className="mvp-flag" style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}>GUIDED DEMO</span>
        <span>Step {stepIndex + 1} of {DEMO_STEPS.length}</span>
      </div>
      <div className="demo-overlay-caption">{step.caption}</div>
      <div className="demo-overlay-controls">
        <button className="btn" style={{ padding: '5px 10px', fontSize: 11 }} onClick={onPrev} disabled={stepIndex === 0}>← Prev</button>
        <button className="btn" style={{ padding: '5px 10px', fontSize: 11 }} onClick={onPauseToggle}>{paused ? '▶ Resume' : '⏸ Pause'}</button>
        <button className="btn" style={{ padding: '5px 10px', fontSize: 11 }} onClick={onNext}>
          {stepIndex === DEMO_STEPS.length - 1 ? 'Finish' : 'Next →'}
        </button>
        <button className="btn" style={{ padding: '5px 10px', fontSize: 11, marginLeft: 'auto' }} onClick={onExit}>Exit demo</button>
      </div>
    </div>
  );
}
