import React, { useEffect, useState } from 'react';

// Evaluation graphs made with matplotlib by `python -m module1.ml.figures`
// (served as static files from web/public/model-figures/).
const BASE = `${import.meta.env.BASE_URL || '/'}model-figures/`;
const METRICS = [['accuracy', 'Accuracy'], ['precision', 'Precision'], ['recall', 'Recall'], ['f1', 'F1 score'], ['roc_auc', 'ROC-AUC']];
const pct = (v) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '—');

export default function ModelFigures() {
  const [man, setMan] = useState(undefined);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    fetch(`${BASE}manifest.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setMan)
      .catch(() => setMan(null));
  }, []);

  if (man === undefined) return <div style={{ fontSize: 12 }}>Loading…</div>;
  if (!man) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        No graphs yet. Create them with <code>python -m module1.ml.figures</code>.
      </div>
    );
  }

  const m = man.metrics || {};
  const v = () => `?v=${encodeURIComponent(man.generated_at)}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12.5 }}>
        <thead>
          <tr>
            <th>At {Math.round((man.alarm_at || 0.5) * 100)}% alarm level</th>
            {METRICS.map(([, label]) => <th key={label}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr><td>Model, training {man.train_years} ({man.train_samples?.toLocaleString()} samples)</td>
            {METRICS.map(([k]) => <td key={k}>{k === 'roc_auc' ? m.train?.[k]?.toFixed(3) : pct(m.train?.[k])}</td>)}</tr>
          <tr style={{ fontWeight: 700 }}><td>Model, test {man.test_years} ({man.test_samples?.toLocaleString()} samples)</td>
            {METRICS.map(([k]) => <td key={k}>{k === 'roc_auc' ? m.test?.[k]?.toFixed(3) : pct(m.test?.[k])}</td>)}</tr>
          <tr><td>Threshold rule, test (alarm at 1×)</td>
            {METRICS.map(([k]) => <td key={k}>{k === 'roc_auc' ? m.threshold_rule_test?.[k]?.toFixed(3) : pct(m.threshold_rule_test?.[k])}</td>)}</tr>
        </tbody>
      </table></div>

      <div className="grid model-fig-grid">
        {(man.figures || []).map((f) => (
          <figure key={f.file} style={{ margin: 0, border: '1px solid var(--border)', borderRadius: 8, padding: 10, background: '#fff' }}>
            <figcaption style={{ fontWeight: 700, fontSize: 12.5, color: '#013126', marginBottom: 6 }}>{f.title}</figcaption>
            <img src={`${BASE}${f.file}${v()}`} alt={f.title} loading="lazy" onClick={() => setOpen(f)}
              style={{ width: '100%', display: 'block', cursor: 'zoom-in' }} />
            <div style={{ fontSize: 11.5, color: '#4A5A56', marginTop: 6, lineHeight: 1.5 }}>{f.text}</div>
          </figure>
        ))}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
        Made with matplotlib on {new Date(man.generated_at).toLocaleString()}. Test graphs use only {man.test_years} landslides the model never saw in training.
      </div>

      {open && (
        <div onClick={() => setOpen(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, cursor: 'zoom-out' }}>
          <img src={`${BASE}${open.file}${v()}`} alt={open.title} style={{ maxWidth: '95%', maxHeight: '95%', background: '#fff', borderRadius: 6 }} />
        </div>
      )}
    </div>
  );
}
