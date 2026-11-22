import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import apiClient from '../../services/apiClient.js';
import { module1Api } from '../../services/module1Api.js';
import { useLiveDistricts } from '../../data/useLiveDistricts.js';
import { REGIONS, SEVERITY } from '../../data/catalog.js';
import Brand from '../../components/Brand.jsx';
import { WakeNote } from '../../components/ServerWake.jsx';
import { useLocation, useSearchParams } from 'react-router';
import { useGo } from '../../routing.jsx';
import { useAuthMotion } from './useAuthMotion.js';
import './auth.css';

// Sign in and sign up: email + password, or Google. No email codes.
// Every new account waits for an administrator's approval ("pending" screen).
// The right-hand panel shows real live data from the public API (district levels, model score).

const ROLE_LABEL = { admin: 'Administrator', district_officer: 'District officer', field_officer: 'Field officer' };
const PANEL_LEVEL = { danger: '#ff6b5e', warning: '#ff9b54', watch: '#f5c451', normal: '#58eda2', unknown: '#9fb5ad' };
const strongEnough = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

function friendly(err) {
  const m = (err?.message || String(err || '')).toLowerCase();
  if (m.includes('invalid login')) return 'Wrong email or password.';
  if (m.includes('email not confirmed')) return 'This email is not confirmed yet. Ask your administrator, or continue with Google.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Sign in instead.';
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) return 'Google sign-in is not switched on in Supabase yet.';
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Too many attempts. Please wait a minute and try again.';
  return err?.message || 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------- small pieces
const PATHS = {
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20c1.4-3.6 4.2-5.5 7.5-5.5s6.1 1.9 7.5 5.5" /></>,
  phone: <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.6A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.2 7.2A16.7 16.7 0 0 0 2.5 12S6 18.5 12 18.5a9.7 9.7 0 0 0 4.3-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  back: <path d="M19 12H5m6-6-6 6 6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  map: <><path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z" /><path d="M9 4.5v13M15 6.5v13" /></>,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.4" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><path d="M12 8v.1" /></>,
  alert: <><path d="M12 3.5 21.5 20h-19z" /><path d="M12 10v4.5" /><path d="M12 17.2v.1" /></>,
};
function Icon({ name, size = 18, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[name]}</svg>
  );
}

const Spinner = ({ light = true }) => <span className={`au-spin ${light ? '' : 'dark'}`} aria-hidden="true" />;

function Head({ kicker, title, sub }) {
  return (
    <div className="au-head au-rise">
      <div className="au-kicker">{kicker}</div>
      <h1 className="au-serif">{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}

function Field({ label, optional, aside, hint, children }) {
  return (
    <label className="au-field">
      <span className="au-label">{label}{optional && <em>Optional</em>}{aside}</span>
      {children}
      {hint}
    </label>
  );
}

const Switch = ({ text, action, onClick }) => (
  <p className="au-switch">{text} <button type="button" className="au-link" onClick={onClick}>{action}</button></p>
);

function Input({ icon, type = 'text', ...rest }) {
  const [show, setShow] = useState(false);
  const pw = type === 'password';
  return (
    <div className="au-input">
      {icon && <Icon name={icon} className="lead" />}
      <input type={pw && show ? 'text' : type} className={pw ? 'has-eye' : ''} {...rest} />
      {pw && (
        <button type="button" className="au-eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
          <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
        </button>
      )}
    </div>
  );
}

function Strength({ pw }) {
  if (!pw) return <small className="au-small">Min. 8 characters, with a number</small>;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) score += 1;
  if (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw)) score += 1;
  const tone = ['#b42318', '#e5600a', '#c9971f', '#028c74'][score];
  const label = ['Too weak', 'Weak', 'Good', 'Strong'][score];
  return (
    <div className="au-strength">
      <span className="bars">{[1, 2, 3].map((i) => <i key={i} style={{ background: i <= score ? tone : undefined }} />)}</span>
      <span style={{ color: tone }}>{label}</span>
    </div>
  );
}

const Notice = ({ kind = 'error', children }) => (children ? (
  <div className={`au-note ${kind}`}><Icon name={{ error: 'alert', info: 'info' }[kind] || 'check'} size={16} /><span>{children}</span></div>
) : null);

function GoogleButton({ label = 'Continue with Google' }) {
  const auth = useAuth();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [params] = useSearchParams();
  useEffect(() => {                                   // came back with the browser's Back button from Google
    const reset = (e) => { if (e.persisted) setBusy(false); };
    window.addEventListener('pageshow', reset);
    return () => window.removeEventListener('pageshow', reset);
  }, []);
  async function go() {
    setErr(''); setBusy(true);
    const next = params.get('next');
    const { error } = await auth.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) { setErr(friendly(error)); setBusy(false); }
  }
  return (
    <>
      <button type="button" className="au-google" onClick={go} disabled={busy}>
        {busy ? <Spinner light={false} /> : (
          <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
        )}
        {busy ? 'Opening Google…' : label}
      </button>
      <Notice>{err}</Notice>
    </>
  );
}

const Divider = ({ text }) => <div className="au-or"><span>{text}</span></div>;

// ---------------------------------------------------------------- right-hand panel (live data)
function Contours() {
  const paths = useMemo(() => {
    const out = [];
    const hills = [{ cx: 650, cy: 210, n: 12, seed: 1.3 }, { cx: 120, cy: 880, n: 11, seed: 4.1 }, { cx: 560, cy: 780, n: 6, seed: 2.7 }];
    hills.forEach((h) => {
      for (let k = 1; k <= h.n; k += 1) {
        const R = 22 + k * 34;
        let d = '';
        for (let a = 0; a <= 360; a += 4) {
          const t = (a * Math.PI) / 180;
          const r = R * (1 + 0.11 * Math.sin(3 * t + h.seed + k * 0.15) + 0.06 * Math.sin(5 * t + h.seed * 1.7) + 0.035 * Math.sin(8 * t + k * 0.4));
          d += `${a ? 'L' : 'M'}${(h.cx + r * Math.cos(t)).toFixed(1)} ${(h.cy + r * 0.82 * Math.sin(t)).toFixed(1)}`;
        }
        out.push({ d: `${d}Z`, o: 0.05 + 0.16 * (1 - k / (h.n + 1)) });
      }
    });
    return out;
  }, []);
  return (
    <svg className="au-contours" viewBox="0 0 800 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {paths.map((p, i) => <path key={i} d={p.d} style={{ opacity: p.o }} />)}
    </svg>
  );
}

function Panel() {
  const live = useLiveDistricts();
  const [card, setCard] = useState(null);
  useEffect(() => { module1Api.getModelCard().then(setCard); }, []);
  const top = useMemo(() => [...live.list]
    .sort((a, b) => (SEVERITY[b.level] - SEVERITY[a.level]) || ((b.ratio || 0) - (a.ratio || 0))).slice(0, 3), [live.list]);
  const hotspots = live.list.reduce((s, d) => s + (d.hotspots || []).length, 0);
  const auc = card?.evaluation?.time_split?.model?.roc_auc;
  const updated = live.data?.updated_at ? new Date(live.data.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <aside className="au-panel">
      <div className="au-panel-bg" aria-hidden="true"><Contours /><div className="au-orb a" /><div className="au-orb b" /></div>
      <div className="au-panel-inner">
        <div className="au-panel-mid">
          <div className="au-eyebrow">Landslide early warning for India</div>
          <h2 className="au-serif">Every hillside deserves <em>an early warning.</em></h2>
          <p>Live rainfall, terrain and India’s own landslide records, turned into one clear level for every monitored hillside.</p>
        </div>

        <div className="au-panel-cards">
          <div className="au-glass au-float-1">
            <div className="au-glass-head"><span>Closest to their threshold</span>{updated && <span className="t">{updated}</span>}</div>
            {top.length ? top.map((d) => {
              const c = PANEL_LEVEL[d.level] || PANEL_LEVEL.unknown;
              return (
                <div className="au-live-row" key={d.id}>
                  <span className="au-dot" style={{ background: c, boxShadow: `0 0 0 4px ${c}22, 0 0 14px ${c}88` }} />
                  <span className="au-live-name"><b>{d.name}</b><small>{d.state} · {(d.level || 'unknown').toUpperCase()}</small></span>
                  <span className="au-live-bar"><i style={{ width: `${Math.min(100, ((d.ratio || 0) / 4) * 100)}%`, background: c }} /></span>
                  <span className="au-live-num">{typeof d.ratio === 'number' ? `${d.ratio.toFixed(2)}×` : '—'}</span>
                </div>
              );
            }) : [0, 1, 2].map((i) => <div className="au-live-row skeleton" key={i}><span /><span /><span /><span /></div>)}
          </div>
          <div className="au-glass au-stats au-float-2">
            <div><b>{live.data ? live.list.length : '—'}</b><span>districts watched</span></div>
            <div><b>{live.data ? hotspots : '—'}</b><span>hotspots, every hour</span></div>
            <div><b>{auc ?? '—'}</b><span>ROC-AUC on unseen landslides</span></div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Shell({ children, goHome, variant = '' }) {
  const shellRef = useRef(null);
  const heading = React.Children.toArray(children).find((child) => React.isValidElement(child) && child.type === Head);
  useAuthMotion(shellRef, heading?.props.title || variant);
  return (
    <div ref={shellRef} className={`au ${variant ? `au--${variant}` : ''}`}>
      <div className="au-form-side">
        <header className="au-top">
          <button className="au-brand" onClick={goHome} aria-label="SANKET home"><Brand /></button>
        </header>
        <main className="au-card">{children}</main>
      </div>
      <Panel />
    </div>
  );
}

// ---------------------------------------------------------------- role + district pickers
const ROLE_CARDS = [
  { k: 'district_officer', icon: 'map', title: 'District officer', desc: 'Watch district levels, manage incidents and read field reports.' },
  { k: 'field_officer', icon: 'pin', title: 'Field officer', desc: 'Report cracks, slides and blocked roads from the ground.' },
];

function RoleCards({ value, onChange }) {
  return (
    <div className="au-roles" role="radiogroup" aria-label="Role">
      {ROLE_CARDS.map((r) => (
        <button type="button" key={r.k} role="radio" aria-checked={value === r.k} className={`au-role ${value === r.k ? 'on' : ''}`} onClick={() => onChange(r.k)}>
          <span className="ic"><Icon name={r.icon} size={20} /></span>
          <b>{r.title}</b>
          <small>{r.desc}</small>
          <span className="tick"><Icon name="check" size={13} /></span>
        </button>
      ))}
    </div>
  );
}

function DistrictPicker({ value, onChange }) {
  const [list, setList] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const pickPageSize = () => window.innerHeight < 700 ? 2 : window.innerHeight < 780 || window.innerWidth < 560 ? 4 : 6;
  const [pageSize, setPageSize] = useState(pickPageSize);
  useEffect(() => {
    let alive = true;
    module1Api.getDistricts().then((r) => {
      if (alive) { setList(r?.districts || []); setLoaded(true); }
    });
    const resize = () => setPageSize(pickPageSize());
    window.addEventListener('resize', resize);
    return () => { alive = false; window.removeEventListener('resize', resize); };
  }, []);
  const filtered = list.filter((d) => !q.trim() || `${d.name} ${d.state} ${d.region || ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="au-dp au-dp-paged">
      <div className="au-dp-head">
        <div className="au-dp-search"><Icon name="search" size={16} /><input aria-label="Search districts or states" placeholder="Search districts or states" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></div>
        <span className="au-dp-count">{value.length ? <>{value.length} selected · <button type="button" className="au-link sm" onClick={() => onChange([])}>Clear</button></> : 'None selected'}</span>
      </div>
      <div className="au-dp-body" aria-label="Available districts">
        {!loaded ? <span className="au-small">Loading districts…</span>
          : !list.length ? <span className="au-small">Districts are unavailable right now.</span>
            : !visible.length ? <span className="au-small">No matching districts.</span>
              : visible.map((d) => (
                <button type="button" key={d.id} title={`${d.name}, ${d.state}`} aria-label={`${d.name}, ${d.state}`} aria-pressed={value.includes(d.id)} className={`au-chip ${value.includes(d.id) ? 'on' : ''}`} onClick={() => toggle(d.id)}>
                  {value.includes(d.id) && <Icon name="check" size={12} />}<span>{d.name}</span>
                </button>
              ))}
      </div>
      <div className="au-dp-pages">
        <span aria-live="polite">{filtered.length ? start + 1 : 0}–{Math.min(start + pageSize, filtered.length)} of {filtered.length} districts</span>
        <div><button type="button" aria-label="Previous districts" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}><Icon name="back" size={14} /></button><span>{currentPage + 1} / {pageCount}</span><button type="button" aria-label="Next districts" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}><Icon name="arrow" size={14} /></button></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Sign in
function Login({ navigate, goHome }) {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const [err, setErr] = useState(location.state?.error || '');      // e.g. Google sign-in was cancelled
  const [forgot, setForgot] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const { data, error } = await auth.client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setBusy(false); setErr(friendly(error)); return; }
    await auth.completeSignIn(data.session);   // spinner stays on; the route guard then opens the right page
  }

  return (
    <Shell goHome={goHome}>
      <Head kicker="Sign in" title="Welcome back" sub="Sign in to monitor your districts, alerts and field reports." />
      <div className="au-stack au-rise d1">
        <GoogleButton />
        <Divider text="or sign in with email" />
        <form onSubmit={submit} className="au-stack">
          <Field label="Email"><Input icon="mail" type="email" autoComplete="email" required placeholder="you@district.gov.in" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Password" aside={<button type="button" className="au-link sm" onClick={(e) => { e.preventDefault(); setForgot((v) => !v); }}>Forgot password?</button>}>
            <Input icon="lock" type="password" autoComplete="current-password" required placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {forgot && <Notice kind="info">Ask your administrator to reset it, or continue with Google using the same email.</Notice>}
          <Notice>{err}</Notice>
          <button className="au-btn" disabled={busy}>{busy ? <><Spinner />Signing in…</> : <>Sign in<Icon name="arrow" size={18} className="arr" /></>}</button>
        </form>
        <Switch text="New to SANKET?" action="Create account" onClick={() => navigate(`/signup${location.search}`)} />
      </div>
    </Shell>
  );
}

// ---------------------------------------------------------------- Sign up (two steps)
function Stepper({ step }) {
  return (
    <ol className="au-stepper au-rise">
      {['Account', 'Role & districts'].map((l, i) => {
        const n = i + 1;
        return <li key={l} className={n < step ? 'done' : n === step ? 'on' : ''}><span>{n < step ? <Icon name="check" size={13} /> : n}</span>{l}</li>;
      })}
    </ol>
  );
}

function Signup({ navigate, goHome }) {
  const auth = useAuth();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ full_name: '', email: '', phone: '', role: 'district_officer', districts: [], password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e?.target ? e.target.value : e }));

  function next(e) {
    e.preventDefault();
    setErr('');
    if (!strongEnough(f.password)) { setErr('Use at least 8 characters, with a letter and a number.'); return; }
    if (f.password !== f.confirm) { setErr('The two passwords do not match.'); return; }
    setStep(2);
  }

  async function submit(e) {
    e.preventDefault();
    setErr(''); setInfo('');
    if (f.role === 'district_officer' && !f.districts.length) { setErr('Choose at least one district you are responsible for.'); return; }
    setBusy(true);
    const { data, error } = await auth.client.auth.signUp({
      email: f.email.trim(), password: f.password,
      options: { data: { full_name: f.full_name.trim(), phone: f.phone.trim(), requested_role: f.role, requested_districts: f.districts } },
    });
    if (error) { setBusy(false); setErr(friendly(error)); return; }
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setBusy(false); setErr('An account with this email already exists. Sign in instead.'); return;
    }
    if (data?.session) { await auth.completeSignIn(data.session); return; }   // the route guard opens the waiting screen
    setBusy(false);
    setInfo('Account created. Open the confirmation link sent to your email, then sign in.');   // "Confirm email" still on
  }

  if (step === 1) {
    return (
      <Shell goHome={goHome}>
        <Head kicker="Create account" title="Join SANKET" />
        <Stepper step={1} />
        <div className="au-stack au-rise d1">
          <GoogleButton label="Sign up with Google" />
          <Divider text="or sign up with email" />
          <form onSubmit={next} className="au-stack">
            <Field label="Full name"><Input icon="user" required autoComplete="name" placeholder="As on your official ID" value={f.full_name} onChange={set('full_name')} /></Field>
            <div className="au-two">
              <Field label="Work email"><Input icon="mail" type="email" required autoComplete="email" placeholder="you@district.gov.in" value={f.email} onChange={set('email')} /></Field>
              <Field label="Mobile" optional><Input icon="phone" type="tel" autoComplete="tel" placeholder="+91" value={f.phone} onChange={set('phone')} /></Field>
            </div>
            <div className="au-two">
              <Field label="Password" hint={<Strength pw={f.password} />}><Input icon="lock" type="password" required autoComplete="new-password" placeholder="Create one" value={f.password} onChange={set('password')} /></Field>
              <Field label="Confirm" hint={f.confirm && (f.confirm === f.password
                ? <small className="au-small ok"><Icon name="check" size={13} />Passwords match</small>
                : <small className="au-small bad">Does not match yet</small>)}>
                <Input icon="lock" type="password" required autoComplete="new-password" placeholder="Type it again" value={f.confirm} onChange={set('confirm')} />
              </Field>
            </div>
            <Notice>{err}</Notice>
            <button className="au-btn">Continue<Icon name="arrow" size={18} className="arr" /></button>
          </form>
          <Switch text="Already have an account?" action="Sign in" onClick={() => navigate(`/login${location.search}`)} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell goHome={goHome} variant="role-setup">
      <Head kicker="Create account" title="Your role" />
      <Stepper step={2} />
      <form onSubmit={submit} className="au-stack au-rise d1">
        <Field label="I am a"><RoleCards value={f.role} onChange={(r) => setF((s) => ({ ...s, role: r }))} /></Field>
        <Field label={f.role === 'district_officer' ? 'Districts you are responsible for' : 'Districts you work in'} optional={f.role !== 'district_officer'}>
          <DistrictPicker value={f.districts} onChange={set('districts')} />
        </Field>
        <Notice>{err}</Notice>
        <Notice kind="ok">{info}</Notice>
        <div className="au-row">
          <button type="button" className="au-btn ghost" onClick={() => { setErr(''); setStep(1); }}><Icon name="back" size={18} />Back</button>
          <button className="au-btn grow" disabled={busy}>{busy ? <><Spinner />Creating account…</> : <>Create account<Icon name="arrow" size={18} className="arr" /></>}</button>
        </div>
      </form>
    </Shell>
  );
}

// ---------------------------------------------------------------- Waiting for approval / disabled / role request
function Pending({ navigate, goHome }) {
  const auth = useAuth();
  const p = auth.profile;
  const [req, setReq] = useState({ role: 'district_officer', districts: [], phone: '' });
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState(null);
  const [err, setErr] = useState('');
  const disabled = p?.status === 'disabled';
  const needsRequest = p && !disabled && p.status === 'pending' && !p.requested_role;      // e.g. signed up with Google

  useEffect(() => {                                           // look for the approval every 15 seconds
    if (!auth.session || p?.status !== 'pending' || needsRequest) return undefined;
    const t = setInterval(() => auth.refreshProfile().then(() => setCheckedAt(new Date())), 15000);
    return () => clearInterval(t);
  }, [auth.session, p?.status, needsRequest]);

  const signOut = async () => { navigate('/', { replace: true }); await auth.signOut(); };

  async function checkNow() {
    setChecking(true);
    await auth.refreshProfile();
    setCheckedAt(new Date());
    setChecking(false);
  }

  async function sendRequest(e) {
    e.preventDefault();
    if (req.role === 'district_officer' && !req.districts.length) { setErr('Choose at least one district.'); return; }
    setBusy(true); setErr('');
    try {
      await apiClient.post('/api/v1/module1/me/request',
        { requested_role: req.role, requested_districts: req.districts, phone: req.phone }, { timeoutMs: 10000 });
      await auth.refreshProfile();
    } catch (ex) { setErr(ex?.message || 'Could not send your request'); }
    setBusy(false);
  }

  if (needsRequest) {
    return (
      <Shell goHome={goHome} variant="role-setup">
        <Head kicker="One more step" title="Tell us your role" />
        <form onSubmit={sendRequest} className="au-stack au-rise d1">
          <Field label="I am a"><RoleCards value={req.role} onChange={(r) => setReq((s) => ({ ...s, role: r }))} /></Field>
          <Field label={req.role === 'district_officer' ? 'Districts you are responsible for' : 'Districts you work in'} optional={req.role !== 'district_officer'}>
            <DistrictPicker value={req.districts} onChange={(v) => setReq((s) => ({ ...s, districts: v }))} />
          </Field>
          <Field label="Mobile" optional><Input icon="phone" type="tel" placeholder="+91" value={req.phone} onChange={(e) => setReq((s) => ({ ...s, phone: e.target.value }))} /></Field>
          <Notice>{err}</Notice>
          <button className="au-btn" disabled={busy}>{busy ? <><Spinner />Sending…</> : <>Send for approval<Icon name="arrow" size={18} className="arr" /></>}</button>
          <Switch text={`Signed in as ${p.email}.`} action="Sign out" onClick={signOut} />
        </form>
      </Shell>
    );
  }

  if (disabled) {
    return (
      <Shell goHome={goHome}>
        <Head kicker="Access paused" title="Account disabled" sub="An administrator has disabled this account. Contact your district administrator if this is a mistake." />
        <button className="au-btn ghost" onClick={signOut}>Sign out</button>
      </Shell>
    );
  }

  return (
    <Shell goHome={goHome}>
      <Head kicker="Almost there" title="Waiting for approval" sub="An administrator reviews every new account before it can open the dashboard." />
      <div className="au-rise d1">
        <ol className="au-timeline">
          <li className="done"><span><Icon name="check" size={14} /></span><div><b>Account created</b><small>{p?.email}</small></div></li>
          <li className="on"><span><i /></span><div><b>Administrator approval</b><small>Checking automatically every 15 seconds</small></div></li>
          <li><span /><div><b>Access to SANKET</b><small>You are taken in as soon as you are approved</small></div></li>
        </ol>
        {p && (
          <div className="au-summary">
            <div><span>Name</span><b>{p.full_name || '—'}</b></div>
            <div><span>Requested role</span><b>{ROLE_LABEL[p.requested_role] || '—'}</b></div>
            <div><span>Districts</span><b>{(p.requested_districts || []).join(', ') || '—'}</b></div>
          </div>
        )}
        <Notice>{auth.error}</Notice>
        <button className="au-btn" onClick={checkNow} disabled={checking}>{checking ? <><Spinner />Checking…</> : 'Check now'}</button>
        <p className="au-help">{checkedAt ? `Last checked ${checkedAt.toLocaleTimeString()}: still waiting for approval.` : 'Approved already? Press “Check now”.'}</p>
        <Switch text="Wrong account?" action="Sign out" onClick={signOut} />
      </div>
    </Shell>
  );
}

function NotConfigured({ goHome, error }) {
  return (
    <Shell goHome={goHome}>
      <Head kicker="Setup needed" title="Sign-in is not set up yet" sub={error || 'This SANKET server has no Supabase keys yet.'} />
      <ol className="au-setup au-rise d1">
        <li>Create a free project at supabase.com (Mumbai region).</li>
        <li>Run <code>supabase/migrations/0001_sanket_auth.sql</code> in its SQL editor.</li>
        <li>Add <code>SUPABASE_URL</code>, <code>SUPABASE_ANON_KEY</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env</code>, then restart the API.</li>
      </ol>
      <button className="au-btn ghost" onClick={goHome}><Icon name="back" size={18} />Back to home</button>
    </Shell>
  );
}

// The server did not answer, even after waiting for a sleeping server to start (services/apiClient.js).
function ServerUnreachable({ goHome, onRetry }) {
  return (
    <Shell goHome={goHome}>
      <Head kicker="Connection" title="The server is not answering"
        sub="It did not start within 3 minutes. Check your internet connection, then try again." />
      <div className="au-stack au-rise d1">
        <button className="au-btn" onClick={onRetry}>Try again<Icon name="arrow" size={18} className="arr" /></button>
        <button className="au-btn ghost" onClick={goHome}><Icon name="back" size={18} />Back to home</button>
      </div>
    </Shell>
  );
}

const SCREENS = { login: Login, signup: Signup, pending: Pending };

// Redirects (already signed in, approved, signed out) are made by the route guards in routing.jsx.
export default function AuthPages({ mode }) {
  const auth = useAuth();
  const navigate = useGo();
  const goHome = () => navigate('/');
  const Screen = useMemo(() => SCREENS[mode] || Login, [mode]);
  if (!auth?.ready) return <div className="au-loading" role="status"><Brand /><WakeNote /></div>;
  if (auth.unreachable) return <ServerUnreachable goHome={goHome} onRetry={auth.retry} />;
  if (!auth.configured) return <NotConfigured goHome={goHome} error={auth.error} />;
  return <Screen navigate={navigate} goHome={goHome} />;
}
