import React, { useEffect, useState } from 'react';
import { IconActivity, IconInfo } from '../components/icons.jsx';
import HazardBadge from '../components/HazardBadge.jsx';
import { HAZARD_META } from '../data/catalog.js';
import { module1Api } from '../services/module1Api.js';
import ModelFigures from '../components/ModelFigures.jsx';

// "Data & Model": what every number comes from, how levels and confidence are decided, how to
// use the app, and emergency numbers. Replaces the old Settings and Help tabs.

const Row = ({ name, children }) => (
  <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 12, lineHeight: 1.55 }}>
    <b style={{ fontSize: 13 }}>{name}</b><div style={{ color: 'var(--text-muted)' }}>{children}</div>
  </div>
);

const Section = ({ title, icon, children, sub }) => (
  <div className="card" style={{ padding: 18 }}>
    <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>{icon}{title}</div>
    {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    <div style={{ marginTop: 12 }}>{children}</div>
  </div>
);

const TABS = [
  ['Overview', 'All 21 monitored districts on one map and one table, worst first. Click any point on the map to evaluate it.'],
  ['Live Monitor', 'One district in detail: rainfall windows, soil moisture, the reason for the level, landslide confidence, every hotspot, and the last 7/14/30 days.'],
  ['3D Tactical Globe', 'The same live levels on a 3D satellite globe, with camera presets for the main landslide belts.'],
  ['Historical Analysis', 'Real past disasters replayed on ERA5 rainfall: how early the rule and the model would have warned.'],
  ['Infrastructure', 'Hospitals, schools, roads, bridges and helipads from OpenStreetMap around each district centre.'],
  ['Road Blockage', 'Upload a road photo: a CNN trained on real photos marks the road and what covers it, and reports how much of the road width is blocked.'],
  ['Alerts', 'Incident log for officers, plus field reports sent from the Field Officer View.'],
  ['Reports', 'A printable / CSV situation report for one district, built from the live data.'],
  ['Field Officer View', 'Report a crack, slide or blocked road with photo and device GPS. Works offline and sends when back online.'],
];

export default function DataModel({ theme, onToggleTheme, language }) {
  const [sources, setSources] = useState(undefined);
  const [thr, setThr] = useState(undefined);
  const [health, setHealth] = useState(undefined);
  const [card, setCard] = useState(undefined);
  useEffect(() => {
    module1Api.getModelCard().then(setCard);
    module1Api.getDataSources().then(setSources);
    module1Api.getThresholds().then(setThr);
    module1Api.checkHealth().then(setHealth);
  }, []);
  const lv = thr?.levels;
  const ts = card?.evaluation?.time_split || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1050 }}>
      <Section title="How SANKET decides" icon={<IconInfo width={16} height={16} />}
        sub="Every place gets two independent answers. Both use live rainfall up to the last completed hour.">
        <div className="grid stack-sm" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12.5, lineHeight: 1.6 }}>
          <Row name="1. Level (Normal / Watch / Warning / Danger)">
            Rain over the last 1 hour to 10 days is compared with a <b>published rainfall threshold</b> for the region.
            The level comes from how many times the threshold is exceeded{lv ? <> (watch ≥ {lv.watch}×, warning ≥ {lv.warning}×, danger ≥ {lv.danger}×)</> : null}.
            On flat ground (no slope of {thr?.terrain_gate?.min_steepest_slope_1km_deg ?? 12}° or more within 1 km) the level stays Normal.
          </Row>
          <Row name="2. Landslide confidence (%)">
            A model <b>trained on {card?.training_data?.positives ?? '—'} real landslide days</b> in India and the same places on other days
            uses {card?.variant === 'context'
              ? 'rainfall, soil moisture, temperature, wind, terrain, a vegetation baseline and nearby past landslide records'
              : card?.variant === 'rain_soil' ? 'rainfall and soil moisture' : 'rainfall, soil moisture, temperature, wind and terrain'}.
            Tested on {ts.test || 'later years'} cases held out from training. Read the percentage as a relative confidence score.
          </Row>
        </div>
        <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12, marginTop: 12 }}>
          <thead><tr><th>Level</th><th>Meaning</th><th>Suggested action</th></tr></thead>
          <tbody>
            {[['normal', 'Rain below the published threshold (or flat ground)'],
              ['watch', `Rain has reached the threshold (≥ ${lv?.watch ?? 1}×)`],
              ['warning', `Rain is ${lv?.warning ?? 2}× the threshold or more`],
              ['danger', `Rain is ${lv?.danger ?? 4}× the threshold or more`],
              ['unknown', 'No rainfall data (live feed and last reading unavailable)']].map(([k, meaning]) => (
              <tr key={k}><td><HazardBadge level={k} size="sm" /></td><td>{meaning}</td><td>{HAZARD_META[k].action}</td></tr>
            ))}
          </tbody>
        </table></div>
        <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
          The 2× and 4× multiples are SANKET operational settings, not published values. Actions are guidance for the district officer, not an automatic order.
        </div>
      </Section>

      <Section title="Data sources" icon={<IconActivity width={16} height={16} />}>
        {sources === undefined ? 'Loading…' : !sources ? <span style={{ color: 'var(--hazard-danger)' }}>Backend unreachable.</span> : (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(290px, 100%), 1fr))', gap: 10 }}>
            <Row name="Rainfall, soil moisture, temperature, wind">{sources.rainfall_soil_temperature_wind.source}<br />If down: {sources.rainfall_soil_temperature_wind.fallback}</Row>
            <Row name="Terrain (slope, curvature, TWI)">{sources.terrain.source}<br />If down: {sources.terrain.fallback}</Row>
            <Row name="Vegetation (NDVI)">{sources.ndvi.source}<br />{sources.ndvi.configured ? <>If down: {sources.ndvi.fallback}</> : <b>Not configured</b>}</Row>
            <Row name="History page rainfall">{sources.history_rainfall.source}</Row>
            <Row name="Infrastructure">{sources.infrastructure.source}<br />If down: {sources.infrastructure.fallback}</Row>
            <Row name="Monitoring hotspots">{sources.hotspots.source}</Row>
            <Row name="Landslide records">{!sources.landslide_inventory.loaded ? 'Not loaded' : Object.entries(sources.landslide_inventory.records_by_source || {})
              .map(([k, n]) => <div key={k}>{k.replace(/\.csv$/, '').replace(/_/g, ' ')}: <b>{n.toLocaleString()}</b></div>)}</Row>
          </div>
        )}
      </Section>

      <Section title="Trained landslide-confidence model">
        {card === undefined ? 'Loading…' : !card ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No trained model. Build it with <code>python -m module1.ml.dataset</code> then <code>python -m module1.ml.train</code>.</div>
        ) : (
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            <div><b>{card.name}</b> · trained {new Date(card.trained_at).toLocaleString()} · {card.algorithm}</div>
            <div>{card.training_data?.positives} landslide days and {card.training_data?.samples - card.training_data?.positives} comparison cases ({card.training_data?.years}). {card.training_data?.weather}</div>
            {card.variant === 'context' && <ul style={{ paddingLeft: 18 }}>
              <li>{card.training_data.terrain}</li>
              <li>{card.training_data.vegetation} <a href={card.training_data.vegetation_url}>NASA vegetation data</a></li>
              <li>{card.training_data.landslide_history} <a href={card.training_data.landslide_history_url}>NASA landslide catalogue</a></li>
            </ul>}
            <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12, marginTop: 8 }}>
              <thead><tr><th>Test (never seen in training)</th><th>Model ROC-AUC</th><th>Threshold rule ROC-AUC</th></tr></thead>
              <tbody>
                <tr><td>{ts.test}, all cases (trained on {ts.train})</td><td>{ts.model?.roc_auc}</td><td>{ts.threshold_rule_baseline?.roc_auc}</td></tr>
                <tr><td>Same place, other days (is it the right day?)</td><td>{ts.hard_when_same_place?.model?.roc_auc}</td><td>{ts.hard_when_same_place?.threshold_rule?.roc_auc}</td></tr>
                <tr><td>Same day, random place elsewhere (is it the right place?)</td><td>{ts.where_same_day_elsewhere?.model?.roc_auc}</td><td>{ts.where_same_day_elsewhere?.threshold_rule?.roc_auc}</td></tr>
                <tr><td>Whole states held out (5 folds)</td><td>{card.evaluation?.state_split_cv?.roc_auc_mean} ({card.evaluation?.state_split_cv?.roc_auc_min}–{card.evaluation?.state_split_cv?.roc_auc_max})</td><td>—</td></tr>
              </tbody>
            </table></div>
            <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12, marginTop: 8 }}>
              <thead><tr><th>Alarm at confidence</th><th>Landslides caught</th><th>False alarms</th><th>Precision</th></tr></thead>
              <tbody>{(ts.model_operating_points || []).map((o) => (
                <tr key={o.at}><td>≥ {Math.round(o.at * 100)}%</td><td>{Math.round(o.hit_rate * 100)}%</td><td>{(o.false_alarm_rate * 100).toFixed(1)}% of non-events</td><td>{Math.round(o.precision * 100)}%</td></tr>
              ))}</tbody>
            </table></div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>{card.meaning_of_confidence}</div>
            {card.rain_soil && <details style={{ marginTop: 8 }}>
              <summary>Rain and soil fallback model</summary>
              <p>Uses 3–240 hour rainfall totals and soil moisture. Held-out ROC-AUC was {card.rain_soil.evaluation?.time_split?.model?.roc_auc} on {card.rain_soil.evaluation?.time_split?.test} cases.</p>
              <p>{card.rain_soil.meaning_of_confidence}</p>
            </details>}
            <ul style={{ fontSize: 11, color: 'var(--text-dim)', margin: '6px 0 0 16px' }}>{(card.limitations || []).map((l) => <li key={l}>{l}</li>)}</ul>
          </div>
        )}
      </Section>

      <Section title="Original hourly model evaluation graphs" sub="Click a graph to enlarge it.">
        <ModelFigures />
      </Section>

      <Section title="Rainfall thresholds used for the level">
        {thr === undefined ? 'Loading…' : !thr ? <span style={{ color: 'var(--hazard-danger)' }}>Backend unreachable.</span> : (
          <>
            <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12 }}>
              <thead><tr><th>Region</th><th>Equation</th><th>Valid durations</th><th>Source</th></tr></thead>
              <tbody>
                {Object.values(thr.regions).map((r) => (
                  <tr key={r.id}>
                    <td><b>{r.label}</b></td><td style={{ fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{r.equation.replace(/\s*\(.*\)\s*$/, '')}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{r.valid_hours[0]}–{r.valid_hours[1]} h</td>
                    <td style={{ fontSize: 11 }}>{r.citation}{r.doi ? ` doi:${r.doi}` : ''} <i>({r.status})</i></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
            {thr.terrain_gate && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>Flat ground: {thr.terrain_gate.note}</div>}
          </>
        )}
      </Section>

      <Section title="How to use SANKET">
        <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12 }}>
          <tbody>{TABS.map(([tab, what]) => <tr key={tab}><td style={{ width: 170 }}><b>{tab}</b></td><td>{what}</td></tr>)}</tbody>
        </table></div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>
          Search (top bar) jumps to a district or to the nearest monitored district for a "lat, lon".
          A grey <b>NO DATA</b> or an orange <b>last real reading</b> label means the live weather feed is down; nothing is ever filled in with made-up values.
        </div>
      </Section>

      <Section title="Emergency numbers (India)" sub="National short codes. Confirm the local control-room numbers for your district.">
        <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12.5 }}>
          <tbody>
            <tr><td style={{ width: 90 }}><b>112</b></td><td>Emergency Response Support System (police, fire, ambulance)</td></tr>
            <tr><td><b>1078</b></td><td>NDMA disaster helpline</td></tr>
            <tr><td><b>1070</b></td><td>State Emergency Operation Centre</td></tr>
            <tr><td><b>1077</b></td><td>District Emergency Operation Centre</td></tr>
          </tbody>
        </table></div>
      </Section>

      <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
        API {health ? `v${health.version} · ${health.monitored_districts} districts` : 'offline'} · no SMS / e-mail gateway is connected; alerts are recorded in the incident log only.
      </div>
    </div>
  );
}
