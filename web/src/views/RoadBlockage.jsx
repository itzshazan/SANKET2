import React, { useEffect, useRef, useState } from 'react';
import { module1Api } from '../services/module1Api.js';
import { IconCamera } from '../components/icons.jsx';

// Module 3: how much of a road is blocked, from one photo.
// Main answer: CNN pretrained on real photographs (ADE20K) that labels every pixel; the blocked share
// of the road width is measured from that.

const SEVERITY_COLOR = {
  Clear: 'var(--hazard-normal)', Minor: 'var(--hazard-watch)', Moderate: 'var(--hazard-warning)',
  Severe: 'var(--hazard-danger)', Critical: 'var(--hazard-danger)',
};
const CAUSE_LABEL = {
  fallen_tree: 'Fallen trees / vegetation', fallen_pole: 'Fallen poles', loose_soil: 'Soil and mud',
  fallen_rocks: 'Rocks and debris', vehicle: 'Vehicles', water_flood: 'Flood water', barricade: 'Barricades',
};
const SAMPLE_BASE = `${import.meta.env.BASE_URL || '/'}module3-samples/`;
const SAMPLES = ['girdu', 'kentucky', 'zenia', 'mallorca', 'us30', 'clear_lahaul', 'clear_nh7', 'clear_nelliampathy'];
const OUTCOME = { pass: ['✓ correct', 'var(--hazard-normal)'], fail: ['✗ wrong', 'var(--hazard-danger)'], no_road: ['no road seen', 'var(--text-dim)'], error: ['error', 'var(--hazard-danger)'] };

export default function RoadBlockage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(undefined);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { module1Api.getRoadBlockageModel().then(setInfo); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function choose(f) {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setResult({ error: 'Please choose an image file.' }); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  }

  async function analyze(f = file) {
    if (!f) return;
    setBusy(true);
    setResult(await module1Api.analyzeRoadBlockage(f));
    setBusy(false);
  }

  async function trySample(name) {
    const blob = await (await fetch(`${SAMPLE_BASE}${name}.jpg`)).blob();
    const f = new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
    choose(f);
    analyze(f);
  }

  const ok = result && !result.error && result.status === 'ok';
  const pct = ok ? result.blockage_percentage : null;
  const sevColor = ok ? SEVERITY_COLOR[result.severity] || 'var(--text-primary)' : undefined;
  const causes = ok ? Object.entries(result.cause_share || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]) : [];
  const val = info?.validation;
  const vs = val?.summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
        Take the photo on the road, looking along it. The model marks the road and anything covering it, then measures how
        much of the road's width is blocked at the worst point. Confirm on the ground before acting.
      </div>

      <div className="grid stack-sm" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
        {/* Photo */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="card-title">Road photo</div>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files?.[0]); }}
            style={{
              border: `2px dashed ${drag ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer',
              minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              background: 'var(--surface-2)',
            }}
          >
            {preview ? <img src={preview} alt="Selected road" style={{ maxWidth: '100%', maxHeight: 360, display: 'block' }} />
              : <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  <IconCamera width={28} height={28} /><div style={{ marginTop: 6 }}>Click or drop a photo of the road</div>
                </div>}
          </div>
          <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => choose(e.target.files?.[0])} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn primary" disabled={!file || busy} onClick={() => analyze()}>{busy ? 'Checking…' : 'Check blockage'}</button>
            <button className="btn" onClick={() => inputRef.current?.click()}>Choose photo</button>
          </div>
          <div>
            <div className="section-label" style={{ marginBottom: 6 }}>Or try a real photo</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SAMPLES.map((s) => (
                <img key={s} src={`${SAMPLE_BASE}${s}.jpg`} alt={s} title={val?.photos?.find((p) => p.file === `${s}.jpg`)?.label || s}
                  onClick={() => trySample(s)} style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', border: '1px solid var(--border)' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card-title">Result</div>
          {!result && !busy && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Choose a photo and press “Check blockage”.</div>}
          {busy && <div style={{ fontSize: 13 }}>Checking… (about 2–5 seconds)</div>}
          {result?.error && <div style={{ fontSize: 13, color: 'var(--hazard-danger)' }}>{result.error}</div>}
          {result?.status === 'unavailable' && <div style={{ fontSize: 13, color: 'var(--hazard-danger)' }}>Model unavailable: {result.reason}</div>}
          {result?.status === 'no_road' && (
            <div style={{ fontSize: 13 }}>
              <b>No road surface recognised.</b> {result.reason}
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>
                Seen in the photo: {(result.scene || []).map((s) => `${s.class} ${Math.round(s.share * 100)}%`).join(', ')}
              </div>
            </div>
          )}
          {ok && (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 44, fontWeight: 900, fontFamily: 'var(--font-mono)', color: sevColor }}>{Math.round(pct)}%</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>of the road width blocked</span>
                <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 12, padding: '3px 10px', borderRadius: 4, color: '#fff', background: sevColor }}>
                  {result.severity.toUpperCase()}
                </span>
              </div>
              <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: sevColor }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{result.summary}</div>

              {result.overlay && (
                <figure style={{ margin: 0 }}>
                  <img src={result.overlay} alt="What the model saw" style={{ width: '100%', borderRadius: 6, display: 'block' }} />
                  <figcaption style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    What the model saw: <b style={{ color: '#1f9d55' }}>green</b> road, <b style={{ color: '#d6382c' }}>red</b> blocking it, yellow road edges.
                  </figcaption>
                </figure>
              )}

              {causes.length > 0 && (
                <div>
                  <div className="section-label" style={{ marginBottom: 6 }}>What is blocking it</div>
                  {causes.map(([k, v]) => (
                    <div key={k} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 170px) minmax(0, 1fr) 44px', alignItems: 'center', gap: 8, fontSize: 12, padding: '2px 0',
                      fontWeight: result.obstacles?.includes(k) ? 700 : 400 }}>
                      <span>{CAUSE_LABEL[k] || k}</span>
                      <span style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <span style={{ display: 'block', width: `${Math.round(v * 100)}%`, height: '100%', background: 'var(--hazard-danger)' }} />
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{Math.round(v * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                {result.inference_time_ms} ms · photo {result.image_size?.join(' × ')} px
              </div>
            </>
          )}
        </div>
      </div>

      {/* About + validation */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 8 }}>About this model</div>
        {info === undefined ? <div style={{ fontSize: 12 }}>Loading…</div> : !info ? (
          <div style={{ fontSize: 12, color: 'var(--hazard-danger)' }}>Backend unreachable.</div>
        ) : (
          <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            {!info.available && <div style={{ color: 'var(--hazard-danger)' }}>{info.error}</div>}

            {val && (
              <>
                <div style={{ fontWeight: 700, marginTop: 12 }}>
                  Checked on {vs.blocked_total + vs.clear_total} real photos: {vs.blocked_detected} of {vs.blocked_total} blocked roads detected,
                  {' '}{vs.clear_correct} of {vs.clear_total - vs.clear_no_road} clear roads correct
                  {vs.clear_no_road + vs.blocked_no_road ? `, ${vs.clear_no_road + vs.blocked_no_road} photos where no road was recognised` : ''}.
                </div>
                <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 11.5, marginTop: 6 }}>
                  <thead><tr><th>Photo</th><th>Actually</th><th>Model</th><th /><th>Credit</th></tr></thead>
                  <tbody>
                    {val.photos.map((p) => {
                      const [txt, col] = OUTCOME[p.outcome] || [p.outcome, undefined];
                      return (
                        <tr key={p.file}>
                          <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img src={`${SAMPLE_BASE}${p.file}`} alt="" style={{ width: 48, height: 32, objectFit: 'cover', borderRadius: 3 }} />{p.label}
                          </td>
                          <td>{p.expected}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{p.blockage_percentage == null ? '—' : `${Math.round(p.blockage_percentage)}%`}</td>
                          <td style={{ color: col, fontWeight: 700, whiteSpace: 'nowrap' }}>{txt}</td>
                          <td style={{ fontSize: 10.5 }}>
                            <a href={p.source_url} target="_blank" rel="noreferrer" style={{ color: '#028C74' }}>{p.author || 'Wikimedia Commons'}</a>, {p.license}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table></div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
                  Rule: a road counts as blocked at ≥ 10% of its width. Known weak spots: slides that push in from the side of the road,
                  and gravel roads (sometimes read as soil). Photos from Wikimedia Commons; re-run with <code>python -m module3.validate</code>.
                </div>
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
