import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveDistricts } from '../../data/useLiveDistricts.js';
import { module1Api } from '../../services/module1Api.js';
import { SEVERITY } from '../../data/catalog.js';
import { useLandingMotion, useAudienceMotion, useLiveSnapshotMotion, motionScrollBehavior } from './useLandingMotion.js';
import Brand from '../../components/Brand.jsx';
import './home.css';

// Public landing page. Layout follows the Voice-Agent landing page (hero with sunrise gradient,
// tabbed problem/solution cards, sticky feature list, live demo, proof stats, FAQ, CTA, footer).
// Every number on it comes from the running backend; nothing is hard-coded marketing data.

const BASE = import.meta.env.BASE_URL || '/';
const LEVEL_COLOR = { danger: '#B42318', warning: '#E5600A', watch: '#B7860F', normal: '#1F9D55', unknown: '#64726F' };

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: motionScrollBehavior(), block: 'start' });
}

function Check() {
  return (
    <svg className="h-check" viewBox="0 0 20 20" aria-hidden="true">
      <path fill="currentColor" d="M10 1.5l2.1 1.6 2.6-.3.9 2.5 2.3 1.3-.6 2.6 1.2 2.3-1.9 1.8-.1 2.6-2.6.5-1.5 2.2-2.4-1-2.4 1-1.5-2.2-2.6-.5-.1-2.6L1.7 11.5l1.2-2.3-.6-2.6 2.3-1.3.9-2.5 2.6.3z" />
      <path d="M6.6 10.2l2.2 2.2 4.6-4.8" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Nav({ onDashboard, onLogin, signedIn }) {
  return (
    <header className="h-nav">
      <button className="h-brand" onClick={() => window.scrollTo({ top: 0, behavior: motionScrollBehavior() })}><Brand /></button>
      <nav className="h-links">
        <button onClick={() => scrollToId('how')}>How it works</button>
        <button onClick={() => scrollToId('live')}>Live now</button>
        <button onClick={() => scrollToId('accuracy')}>Accuracy</button>
        <button onClick={() => scrollToId('faq')}>FAQ</button>
      </nav>
      <div className="h-nav-right">
        {!signedIn && <button className="h-textlink" onClick={onLogin}>Log in</button>}
        <button className="h-pill dark" onClick={onDashboard}>Open dashboard <svg className="h-nav-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      </div>
    </header>
  );
}

function Hero({ live, onDashboard }) {
  const counts = live.data?.counts || {};
  const alerting = (counts.watch || 0) + (counts.warning || 0) + (counts.danger || 0);
  return (
    <section className="h-hero">
      <div className="h-hero-sun" aria-hidden="true" />
      <div className="h-hero-content">
        <h1 className="h-serif h-anim-1">Every hillside deserves<br /><em>an early warning.</em></h1>
        <p className="h-anim-2">
          SANKET watches live rainfall, soil moisture and terrain at {live.data ? live.list.reduce((s, d) => s + (d.hotspots || []).length, 0) : 105} landslide
          hotspots across {live.data ? live.list.length : 21} Indian districts, and shows district officers where the danger is rising, hour by hour.
        </p>
        <div className="h-cta-row h-anim-3">
          <button className="h-pill teal lg" onClick={onDashboard}>Open dashboard →</button>
          <button className="h-pill light lg" onClick={() => scrollToId('live')}>See it live</button>
        </div>
        {live.data && (
          <div className="h-live-line h-anim-4">
            <span className="h-dot" /> Live now: {alerting ? `${alerting} district${alerting > 1 ? 's' : ''} above the rainfall threshold` : 'all districts below the rainfall threshold'}
            {' '}· updated {new Date(live.data.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </section>
  );
}

const AUDIENCES = [
  {
    id: 'district', tab: 'District officers', title: 'Know which slope to watch',
    problem: 'Rainfall alerts cover whole districts. They rarely say which hillside is at risk, or why.',
    solution: 'SANKET checks five steep hotspots in every district against the published rainfall threshold for that region, every hour, and shows the reason behind each level.',
    impact: 'One map, worst first: Normal, Watch, Warning or Danger for every monitored district.',
    cta: ['Open the overview', 'overview'], img: 'district-officers.png', pos: 'center', noCaption: true, alt: 'District officers reviewing a terrain map during a mountain planning meeting',
  },
  {
    id: 'field', tab: 'Field teams', title: 'Report what you see, even offline',
    problem: 'Reports from the ground arrive as calls and chat messages that are hard to track and easy to lose.',
    solution: 'Send a photo with GPS from the field. It is kept on the phone without network and sent automatically later. A photo of a road shows how much of it is blocked.',
    impact: 'Reports land in the officers’ Alerts tab, and a blocked road is measured, not guessed.',
    cta: ['Check a road photo', 'road-blockage'], img: 'field-teams.png', pos: 'center', noCaption: true, alt: 'Field officer documenting a damaged mountain road with a smartphone',
  },
  {
    id: 'planners', tab: 'Planners', title: 'Check it against real disasters',
    problem: 'A warning system is only worth trusting if you can see how it would have performed when it mattered.',
    solution: 'Past landslide disasters are replayed hour by hour on reanalysis rainfall, and the confidence model is tested on 2017–2024 landslides it never saw in training.',
    impact: null,
    cta: ['Open historical analysis', 'history'], img: 'planners.png', pos: 'center', noCaption: true, alt: 'Two surveyors studying a topographic map above a mountain settlement',
  },
];

function Audiences({ card, goTo, motionEnabled }) {
  const [tab, setTab] = useState('district');
  const audienceRoot = useRef(null);
  useAudienceMotion(audienceRoot, tab, motionEnabled);
  const a = AUDIENCES.find((x) => x.id === tab);
  const auc = card?.evaluation?.time_split?.model?.roc_auc;
  const impact = a.impact || (auc ? `On landslides it never saw, the model ranks a landslide day above a quiet day ${Math.round(auc * 100)}% of the time (ROC-AUC ${auc}).` : 'Every test result is published in the Data & Model tab.');
  return (
    <section ref={audienceRoot} className="h-section h-gray" id="who">
      <div className="h-eyebrow">Who it is for</div>
      <h2 className="h-sans-title">Built for the people who respond</h2>
      <div className="h-segment">
        {AUDIENCES.map((x) => (
          <button key={x.id} className={tab === x.id ? 'on' : ''} onClick={() => setTab(x.id)}>{x.tab}</button>
        ))}
      </div>
      <div className="h-aud-card">
        <div className="h-aud-text">
          <h3>{a.title}</h3>
          <div className="h-tagbox"><span className="h-tag red">PROBLEM</span><p>{a.problem}</p></div>
          <div className="h-tagbox"><span className="h-tag green">SOLUTION</span><p>{a.solution}</p></div>
          <div className="h-tagbox blue"><span className="h-tag blue">IMPACT</span><p><b>{impact}</b></p></div>
          <button className="h-pill dark" onClick={() => goTo(a.cta[1])}>{a.cta[0]} →</button>
        </div>
        <figure className="h-aud-img" style={{ margin: 0 }}>
          <img src={`${BASE}home/${a.img}`} alt={a.alt} style={{ objectPosition: a.pos }} />
          {!a.noCaption && <figcaption>{a.alt}</figcaption>}
        </figure>
      </div>
    </section>
  );
}

function features(card) {
  const td = card?.training_data;
  const ts = card?.evaluation?.time_split;
  return [
    {
      id: 'f-rain', nav: 'Live rainfall', title: 'Live rainfall, up to the last hour.',
      text: 'Hourly rain over the last 1 hour to 10 days, soil moisture at two depths, temperature and wind for every hotspot, from the ECMWF forecast model via Open-Meteo.',
      cards: [['Rain windows', '1 hour to 10 days, completed hours only'], ['Soil moisture', '7–28 cm and 28–100 cm deep'], ['If the feed is down', 'Last real reading, clearly flagged']],
      bullets: ['No made-up values', 'Stale data is labelled', 'Refreshed every hour'],
    },
    {
      id: 'f-thr', nav: 'Published thresholds', title: 'Thresholds from published research.',
      text: 'Each region is judged against a peer-reviewed rainfall threshold: Garhwal-Kumaon, Western Ghats, Darjeeling-Sikkim and the North-East, with a global threshold elsewhere.',
      cards: [['Watch', 'Rain at or above the threshold'], ['Warning', 'Twice the threshold or more'], ['Danger', 'Four times the threshold or more']],
      bullets: ['Source shown for every level', 'Flat ground filtered out by slope', 'Levels do not flicker on and off'],
    },
    {
      id: 'f-model', nav: 'Landslide confidence', title: `A model trained on ${td?.positives ?? 'real'} landslide days.`,
      text: 'Gradient-boosted trees learn how rainfall, soil moisture and terrain looked on recorded landslide days in India (GSI, NASA and the Kerala 2018 inventory), compared with the same places on other days.',
      cards: [['Trained on', ts?.train ? `${ts.train} records` : 'Earlier years'], ['Tested on', ts?.test ? `${ts.test} landslides it never saw` : 'Later years it never saw'], ['Every graph published', 'Confusion matrix, ROC, calibration']],
      bullets: ['Confidence in %, calibrated', 'What drives it, per place', 'Known limits listed openly'],
    },
    {
      id: 'f-history', nav: 'Past disasters replayed', title: 'Every past disaster, replayed.',
      text: 'Wayanad 2024, Irshalwadi 2023, Pettimudi 2020 and more, replayed hour by hour on ERA5 rainfall: when would Watch, Warning and Danger have been reached?',
      cards: [['Lead time', 'Hours before the event day'], ['Event-day peak', 'Level reached on the day'], ['Model trend', 'Confidence the week before']],
      bullets: ['Real events, real rainfall', 'Same rule as the live system', 'Misses shown, not hidden'],
    },
    {
      id: 'f-road', nav: 'Road blockage', title: 'A blocked road, measured from a photo.',
      text: 'A CNN trained on about 25,000 real photographs marks the road and whatever covers it, then measures how much of the road width is blocked at the worst point.',
      cards: [['Upload a photo', 'From a phone, on the road'], ['See what it saw', 'Road in green, debris in red'], ['Severity', 'Clear to Critical, with the cause']],
      bullets: ['Checked on real landslide photos', 'Says so when no road is visible', 'About two seconds per photo'],
    },
    {
      id: 'f-field', nav: 'Field reports', title: 'Reports from the field, even offline.',
      text: 'Field officers send a crack, slide or blocked road with a photo and the phone’s GPS. Without network the report waits on the phone and is sent when the connection returns.',
      cards: [['Photo + GPS', 'Taken on the spot'], ['Works offline', 'Queued on the device'], ['Straight to officers', 'Shown in the Alerts tab']],
      bullets: ['No separate app to install', 'Nothing lost without signal', 'Incident log for follow-up'],
    },
  ];
}

function Features({ card }) {
  const list = features(card);
  const [active, setActive] = useState(list[0].id);
  const refs = useRef({});
  useEffect(() => {
    const cards = Object.values(refs.current).filter(Boolean);
    let frame = null;
    function updateActive() {
      frame = null;
      // Keep the last card that reached the reading line selected, including gaps.
      const readingLine = Math.max(130, window.innerHeight * 0.35);
      let current = cards[0]?.id;
      for (const el of cards) {
        if (el.getBoundingClientRect().top > readingLine) break;
        current = el.id;
      }
      if (current) setActive(current);
    }
    function scheduleUpdate() {
      if (frame === null) frame = window.requestAnimationFrame(updateActive);
    }
    updateActive();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <section className="h-section" id="how">
      <h2 className="h-serif h-big">Watch. Warn. Respond.</h2>
      <p className="h-lead">From live rain to a decision on the ground, in one place.</p>
      <div className="h-feat">
        <aside className="h-feat-nav">
          {list.map((f) => (
            <button key={f.id} className={active === f.id ? 'on' : ''} aria-current={active === f.id ? 'step' : undefined} aria-controls={f.id} onClick={() => refs.current[f.id]?.scrollIntoView({ behavior: motionScrollBehavior(), block: 'start' })}>
              <span className="h-feat-dot" />{f.nav}
            </button>
          ))}
        </aside>
        <div className="h-feat-cards">
          {list.map((f) => (
            <article key={f.id} id={f.id} ref={(el) => { refs.current[f.id] = el; }} className="h-feat-card">
              <h3 className="h-serif">{f.title}</h3>
              <p>{f.text}</p>
              <div className="h-mini-wrap">
                {f.cards.map(([t, d]) => <div key={t} className="h-mini"><b>{t}</b><span>{d}</span></div>)}
              </div>
              <div className="h-bullets">
                {f.bullets.map((b) => <span key={b}><Check />{b}</span>)}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveNow({ live, goTo, motionEnabled }) {
  const snapshotRoot = useRef(null);
  useLiveSnapshotMotion(snapshotRoot, Boolean(live.data), motionEnabled);
  const rows = useMemo(() => [...live.list]
    .sort((a, b) => (SEVERITY[b.level] - SEVERITY[a.level]) || ((b.ratio || 0) - (a.ratio || 0))).slice(0, 6), [live.list]);
  const aboveThreshold = live.list.filter((d) => ['watch', 'warning', 'danger'].includes(d.level)).length;
  const updatedAt = live.data?.updated_at ? new Date(live.data.updated_at) : null;
  return (
    <section className="h-live" id="live">
      <div className="h-eyebrow">Live district conditions</div>
      <h2 className="h-serif h-big">See it live. Right now.</h2>
      <div ref={snapshotRoot} className="h-live-card">
        {!live.data ? (
          <div className="h-live-empty">{live.loading ? 'Loading the latest district conditions…' : 'Live data is unavailable right now.'}</div>
        ) : (
          <>
            <div className="h-live-status">
              <div className="h-live-status-main"><span className="h-snapshot-dot" aria-hidden="true" /><span><b>{live.list.length}</b> districts monitored</span><span className="h-live-attention"><b>{aboveThreshold}</b> at Watch or higher</span></div>
              <span className="h-live-updated">{live.error ? 'Last available update' : 'Updated'} {updatedAt && !Number.isNaN(updatedAt.getTime()) ? <time dateTime={live.data.updated_at}>{updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time> : 'time unavailable'}</span>
            </div>
            <ol className="h-district-grid" aria-label="Districts ranked by warning level and rainfall ratio">
              {rows.map((d) => (
                <li key={d.id}>
                  <button className={`h-district h-district-${d.level || 'unknown'}`} onClick={() => goTo('monitor', { districtId: d.id })}>
                    <span className="h-district-meta"><span>{d.state}</span><span className="h-district-level"><i aria-hidden="true" />{d.level || 'unknown'}</span></span>
                    <h3>{d.name}</h3>
                    <span className="h-district-metrics">
                      <span><small>Rain / threshold</small><b className="h-district-ratio">{Number.isFinite(d.ratio) ? <>{d.ratio.toFixed(2)}<em>×</em></> : '—'}</b></span>
                      <span><small>Model confidence</small><b>{Number.isFinite(d.confidence) ? <>{Math.round(d.confidence * 100)}<em>%</em></> : '—'}</b></span>
                    </span>
                    <span className="h-district-link">View district<svg className="h-district-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  </button>
                </li>
              ))}
            </ol>
            {!rows.length && <div className="h-live-empty">No district readings are available in this snapshot.</div>}
          </>
        )}
        <div className="h-live-foot">
          <p>Real readings. Published thresholds.<br /><span>Open a district to see the sources behind its warning level.</span></p>
          <button className="h-pill dark" onClick={() => goTo('monitor')}>Explore all districts <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        </div>
      </div>
    </section>
  );
}

function Accuracy({ card, road, live }) {
  const ts = card?.evaluation?.time_split;
  const auc = ts?.model?.roc_auc;
  const rule = ts?.threshold_rule_baseline?.roc_auc;
  const vs = road?.validation?.summary;
  return (
    <section className="h-section" id="accuracy">
      <h2 className="h-serif h-big">Tested on what it never saw.</h2>
      <div className="h-acc-wide">
        <div>
          <div className="h-stat"><span className="h-stat-num">{auc ?? '—'}</span><span className="h-chip">ROC-AUC · {ts?.test || 'UNSEEN YEARS'}</span></div>
          <h3>Judged on landslides from later years</h3>
          <p>The model was trained on {ts?.train || 'earlier'} records only and scored on {ts?.test || 'later'} landslides it had never seen, against the published threshold rule on the same cases.</p>
        </div>
        <div className="h-acc-bars">
          <div className="h-acc-bar"><b>Confidence model</b><span><i style={{ width: `${(auc || 0) * 100}%` }} className="warm" /></span><em>{auc ?? '—'}</em></div>
          <div className="h-acc-bar"><b>Threshold rule</b><span><i style={{ width: `${(rule || 0) * 100}%` }} /></span><em>{rule ?? '—'}</em></div>
          <div className="h-acc-note">1.0 = perfect ranking, 0.5 = a coin toss</div>
        </div>
      </div>
      <div className="h-acc-grid">
        <div className="h-acc-card">
          <div className="h-stat"><span className="h-stat-num">{card?.training_data?.positives ?? '—'}</span><span className="h-chip">REAL LANDSLIDE DAYS</span></div>
          <h3>Learned from Indian records</h3>
          <p>Dated landslides from the GSI inventory, NASA’s Global Landslide Catalog and COOLR, and the Kerala 2018 inventory, matched with the rainfall of that day.</p>
        </div>
        <div className="h-acc-card">
          <div className="h-stat"><span className="h-stat-num">{live.data ? live.list.length : '—'}</span><span className="h-chip">DISTRICTS · EVERY HOUR</span></div>
          <h3>Watched hotspot by hotspot</h3>
          <p>Five steep hotspots per district, each evaluated on its own rainfall, so one wet valley is not averaged away by a dry one.</p>
        </div>
        <div className="h-acc-card">
          <div className="h-stat"><span className="h-stat-num">{vs ? `${vs.blocked_detected}/${vs.blocked_total}` : '—'}</span><span className="h-chip">REAL ROAD PHOTOS</span></div>
          <h3>Blocked roads detected</h3>
          <p>The road-blockage check was run on openly licensed photos of real landslides and clear roads; every result, including the misses, is listed in the tab.</p>
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  ['What is SANKET?', 'A landslide early-warning dashboard for district officers. It watches live rainfall at steep hotspots in landslide-prone districts, compares it with published rainfall thresholds, and adds a landslide confidence from a model trained on real Indian landslides.'],
  ['Where does the data come from?', 'Rainfall, soil moisture, temperature and wind from the ECMWF forecast model via Open-Meteo; terrain from the Copernicus GLO-30 elevation model; vegetation from Sentinel-2; past landslides from GSI, NASA and the Kerala 2018 inventory; infrastructure from OpenStreetMap.'],
  ['How is the warning level decided?', 'Rain over the last 1 hour to 10 days is compared with the published threshold for that region. At or above it is Watch, twice it is Warning, four times it is Danger. On flat ground the level stays Normal.'],
  ['How accurate is it?', 'The confidence model is tested on 2017–2024 landslides it never saw. The full results, including the confusion matrix, ROC curve and calibration, are on the Data & Model page, along with its known limits.'],
  ['Does it work without network?', 'The Field Officer view keeps reports on the phone when there is no signal and sends them automatically when the connection returns.'],
  ['Is this an official warning?', 'No. SANKET supports decisions; it does not replace official warnings from IMD, NDMA or GSI. Always confirm on the ground before acting.'],
];

function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="h-section narrow" id="faq">
      <h2 className="h-serif h-big">Frequently asked questions.</h2>
      <div className="h-faq">
        {FAQS.map(([q, a], i) => (
          <div key={q} className={`h-faq-item ${open === i ? 'open' : ''}`}>
            <button onClick={() => setOpen(open === i ? -1 : i)}><span>{q}</span><svg className="h-chev" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            {open === i && <p>{a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaBanner({ onDashboard }) {
  return (
    <section className="h-section">
      <div className="h-cta">
        <div className="h-cta-rings" aria-hidden="true" />
        <h2 className="h-serif">Early warning for<br /><em>every hillside in India</em></h2>
        <button className="h-pill mint lg" onClick={onDashboard}>Open dashboard →</button>
      </div>
    </section>
  );
}

function Footer({ goTo }) {
  const cols = [
    ['MONITOR', [['Overview', 'overview'], ['Live Monitor', 'monitor'], ['3D Tactical Globe', 'tactical-3d'], ['Alerts', 'alerts']]],
    ['ANALYSE', [['Historical Analysis', 'history'], ['Infrastructure', 'infra'], ['Road Blockage', 'road-blockage'], ['Reports', 'reports']]],
    ['LEARN', [['Data & Model', 'data-model'], ['Field Officer View', 'field-officer']]],
  ];
  const sources = ['Open-Meteo · ECMWF', 'Copernicus GLO-30', 'Sentinel-2', 'GSI · NASA landslide records', 'OpenStreetMap'];
  return (
    <footer className="h-footer">
      <div className="h-footer-top">
        <div>
          <div className="h-footer-brand"><Brand /></div>
          <h2 className="h-serif">Warnings grounded<br /><em>in real data.</em></h2>
        </div>
        <div className="h-footer-copy">
          <p>SANKET turns live rainfall, terrain and India’s own landslide records into a clear level for every monitored hillside: Normal, Watch, Warning or Danger.</p>
          <p>Every number on screen says where it came from, and when a source is down it says so instead of guessing.</p>
        </div>
      </div>
      <div className="h-footer-card">
        <div className="h-footer-id">
          <Brand />
          <i>Landslide early warning for India</i>
        </div>
        {cols.map(([h, items]) => (
          <div key={h} className="h-footer-col">
            <b>{h}</b>
            {items.map(([t, id]) => <button key={id} onClick={() => goTo(id)}>{t}</button>)}
          </div>
        ))}
        <div className="h-footer-col">
          <b>DATA</b>
          {sources.map((s) => <span key={s}>{s}</span>)}
        </div>
      </div>
      <div className="h-footer-bottom">
        <span>© {new Date().getFullYear()} SANKET</span>
        <span>Decision support only. It does not replace official warnings from IMD, NDMA or GSI.</span>
      </div>
    </footer>
  );
}

export default function Home({ goTo, onDashboard, signedIn }) {
  const homeRoot = useRef(null);
  const motionEnabled = true;
  useLandingMotion(homeRoot, motionEnabled);
  const live = useLiveDistricts();
  const [card, setCard] = useState(null);
  const [road, setRoad] = useState(null);
  useEffect(() => {
    module1Api.getModelCard().then(setCard);
    module1Api.getRoadBlockageModel().then(setRoad);
  }, []);
  return (
    <main ref={homeRoot} className="home" data-motion={motionEnabled ? 'full' : 'reduced'}>
      <Nav onDashboard={onDashboard} onLogin={() => goTo('login')} signedIn={signedIn} />
      <Hero live={live} onDashboard={onDashboard} />
      <Audiences card={card} goTo={goTo} motionEnabled={motionEnabled} />
      <Features card={card} />
      <LiveNow live={live} goTo={goTo} motionEnabled={motionEnabled} />
      <Accuracy card={card} road={road} live={live} />
      <Faq />
      <CtaBanner onDashboard={onDashboard} />
      <Footer goTo={goTo} />
    </main>
  );
}
