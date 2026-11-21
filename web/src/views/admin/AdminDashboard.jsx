import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { module1Api } from '../../services/module1Api.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import KpiCard from '../../components/KpiCard.jsx';

// Admin: approve new accounts, manage roles and districts, read the activity log, check system health.

const ROLE_LABEL = { admin: 'Administrator', district_officer: 'District officer', field_officer: 'Field officer' };
const STATUS_STYLE = {
  pending: { bg: 'var(--hazard-watch-wash)', fg: 'var(--hazard-watch)' },
  active: { bg: 'var(--hazard-normal-wash)', fg: 'var(--hazard-normal)' },
  disabled: { bg: 'var(--surface-2)', fg: 'var(--text-dim)' },
};
const ACTION_LABEL = {
  signed_in: 'Signed in', approved_user: 'Approved account', updated_user: 'Changed account', disabled_user: 'Disabled account',
  field_report: 'Sent field report', incident_saved: 'Saved incident', incident_updated: 'Updated incident',
};
const when = (t) => (t ? new Date(t).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

function Status({ s }) {
  const st = STATUS_STYLE[s] || STATUS_STYLE.disabled;
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.fg, textTransform: 'uppercase' }}>{s}</span>;
}

function DistrictSelect({ all, value, onChange }) {
  const [open, setOpen] = useState(false);
  const names = value.map((id) => all.find((d) => d.id === id)?.name || id);
  return (
    <div style={{ position: 'relative' }}>
      <button className="btn" style={{ fontSize: 11.5, padding: '3px 8px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        onClick={() => setOpen((v) => !v)}>
        {names.length ? names.join(', ') : 'No districts'} ▾
      </button>
      {open && (
        <div className="card" style={{ position: 'absolute', zIndex: 20, top: '110%', left: 0, width: 260, maxHeight: 260, overflowY: 'auto', padding: 8, boxShadow: 'var(--shadow-modal)' }}>
          {all.map((d) => (
            <label key={d.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, padding: '3px 4px', cursor: 'pointer' }}>
              <input type="checkbox" checked={value.includes(d.id)}
                onChange={() => onChange(value.includes(d.id) ? value.filter((x) => x !== d.id) : [...value, d.id])} />
              {d.name} <span style={{ color: 'var(--text-dim)' }}>{d.state}</span>
            </label>
          ))}
          <div style={{ textAlign: 'right', marginTop: 6 }}><button className="btn" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setOpen(false)}>Done</button></div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const auth = useAuth();
  const [users, setUsers] = useState(null);
  const [audit, setAudit] = useState(null);
  const [overview, setOverview] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => {
    module1Api.adminUsers().then((r) => setUsers(r?.users || null));
    module1Api.adminAudit(80).then((r) => setAudit(r?.entries || null));
    module1Api.adminOverview().then(setOverview);
  }, []);
  useEffect(() => { load(); module1Api.getDistricts().then((r) => setDistricts(r?.districts || [])); }, [load]);

  const draftOf = (u) => drafts[u.id] || {
    role: u.role || u.requested_role || 'field_officer',
    districts: (u.districts?.length ? u.districts : u.requested_districts) || [],
  };
  const setDraft = (u, change) => setDrafts((d) => ({ ...d, [u.id]: { ...draftOf(u), ...change } }));

  async function save(u, change, okText) {
    setMsg('');
    try {
      await module1Api.adminUpdateUser(u.id, change);
      setDrafts((d) => { const n = { ...d }; delete n[u.id]; return n; });
      setMsg(okText);
      load();
    } catch (err) {
      setMsg(err?.message || 'Could not save the change');
    }
  }

  const pending = useMemo(() => (users || []).filter((u) => u.status === 'pending'), [users]);
  const shown = useMemo(() => (users || []).filter((u) => filter === 'all' || u.status === filter), [users, filter]);
  const ov = overview || {};
  const sys = ov.system || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid kpi-row">
        <KpiCard label="PENDING APPROVAL" value={users ? String(pending.length) : '—'} tone={pending.length ? 'watch' : undefined} />
        <KpiCard label="ACTIVE USERS" value={ov.users ? String(ov.users.by_status?.active ?? 0) : '—'} />
        <KpiCard label="DISTRICT OFFICERS" value={ov.users ? String(ov.users.active_by_role?.district_officer ?? 0) : '—'} />
        <KpiCard label="FIELD OFFICERS" value={ov.users ? String(ov.users.active_by_role?.field_officer ?? 0) : '—'} />
        <KpiCard label="FIELD REPORTS 24 H" value={ov.records ? String(ov.records.field_reports_24h) : '—'} />
        <KpiCard label="OPEN INCIDENTS" value={ov.records ? String(ov.records.incidents_open) : '—'} tone={ov.records?.incidents_open ? 'warning' : undefined} />
      </div>

      {msg && <div className="card" style={{ padding: '8px 14px', fontSize: 12.5 }}>{msg}</div>}

      {/* Approval queue */}
      <div className="card">
        <div className="card-head"><div className="card-title">Waiting for approval ({pending.length})</div></div>
        {users === null ? <div style={{ fontSize: 12.5, color: 'var(--hazard-danger)' }}>Could not load users.</div>
          : !pending.length ? <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No new accounts to approve.</div> : (
            <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12.5 }}>
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Districts</th><th>Signed up</th><th /></tr></thead>
              <tbody>
                {pending.map((u) => {
                  const d = draftOf(u);
                  return (
                    <tr key={u.id}>
                      <td><b>{u.full_name || '—'}</b><div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>asked for {ROLE_LABEL[u.requested_role] || '—'}</div></td>
                      <td>{u.email}{!u.email_confirmed && <div style={{ fontSize: 10.5, color: 'var(--hazard-warning)' }}>email not confirmed</div>}</td>
                      <td>{u.phone || '—'}</td>
                      <td>
                        <select className="select-control" value={d.role} onChange={(e) => setDraft(u, { role: e.target.value })}>
                          {Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                      </td>
                      <td><DistrictSelect all={districts} value={d.districts} onChange={(v) => setDraft(u, { districts: v })} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{when(u.created_at)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn primary" style={{ fontSize: 11.5, padding: '4px 10px', marginRight: 6 }}
                          onClick={() => save(u, { role: d.role, districts: d.districts, status: 'active' }, `Approved ${u.email}`)}>Approve</button>
                        <button className="btn" style={{ fontSize: 11.5, padding: '4px 10px' }}
                          onClick={() => save(u, { status: 'disabled' }, `Rejected ${u.email}`)}>Reject</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
      </div>

      {/* All users */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Users ({users?.length ?? 0})</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'active', 'pending', 'disabled'].map((f) => (
              <button key={f} className={`btn ${filter === f ? 'primary' : ''}`} style={{ fontSize: 11, padding: '3px 10px', textTransform: 'capitalize' }} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
        </div>
        {users && (
          <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12.5 }}>
            <thead><tr><th>User</th><th>Role</th><th>Districts</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
            <tbody>
              {shown.map((u) => {
                const d = draftOf(u);
                const changed = drafts[u.id] && (d.role !== u.role || d.districts.join() !== (u.districts || []).join());
                const self = u.id === auth.profile?.id;
                return (
                  <tr key={u.id}>
                    <td><b>{u.full_name || '—'}</b>{self && <span style={{ color: 'var(--text-dim)' }}> (you)</span>}<div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>{u.email}</div></td>
                    <td>
                      <select className="select-control" value={d.role} disabled={self} onChange={(e) => setDraft(u, { role: e.target.value })}>
                        {Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    </td>
                    <td><DistrictSelect all={districts} value={d.districts} onChange={(v) => setDraft(u, { districts: v })} /></td>
                    <td><Status s={u.status} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{when(u.last_sign_in_at)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {changed && <button className="btn primary" style={{ fontSize: 11.5, padding: '4px 10px', marginRight: 6 }}
                        onClick={() => save(u, { role: d.role, districts: d.districts }, `Saved ${u.email}`)}>Save</button>}
                      {!self && u.status === 'active' && <button className="btn" style={{ fontSize: 11.5, padding: '4px 10px' }}
                        onClick={() => save(u, { status: 'disabled' }, `Disabled ${u.email}`)}>Disable</button>}
                      {!self && u.status === 'disabled' && <button className="btn" style={{ fontSize: 11.5, padding: '4px 10px' }}
                        onClick={() => save(u, { role: d.role, status: 'active' }, `Enabled ${u.email}`)}>Enable</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        )}
      </div>

      <div className="grid stack-sm" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* Activity */}
        <div className="card">
          <div className="card-head"><div className="card-title">Activity</div></div>
          {audit === null ? <div style={{ fontSize: 12.5, color: 'var(--hazard-danger)' }}>Could not load the activity log.</div>
            : !audit.length ? <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Nothing yet.</div> : (
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12 }}>
                  <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead>
                  <tbody>
                    {audit.map((e) => (
                      <tr key={e.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>{when(e.at)}</td>
                        <td>{e.actor_email || '—'}</td>
                        <td>{ACTION_LABEL[e.action] || e.action}{e.target ? <span style={{ color: 'var(--text-dim)' }}> · {e.target}</span> : null}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {Object.entries(e.details || {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </div>
            )}
        </div>

        {/* System health */}
        <div className="card">
          <div className="card-head"><div className="card-title">System health</div></div>
          {!overview ? <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Loading…</div> : (
            <div className="table-scroll"><table className="data-table" style={{ width: '100%', fontSize: 12.5 }}>
              <tbody>
                <tr><td>District data updated</td><td>{when(sys.districts_updated_at)}</td></tr>
                <tr><td>Weather feed</td><td>{Object.entries(sys.weather_status || {}).map(([k, n]) => `${n} ${k}`).join(' · ') || '—'}</td></tr>
                <tr><td>Confidence model</td><td>{sys.confidence_model_loaded ? '✓ loaded' : '✗ not trained'}</td></tr>
                <tr><td>Road-blockage model</td><td>{sys.road_model_weights ? '✓ weights present' : '✗ run python -m module3.download_weights'}</td></tr>
                <tr><td>Sentinel-2 NDVI</td><td>{sys.copernicus_ndvi_configured ? '✓ credentials set' : '✗ not configured'}</td></tr>
                <tr><td>Field reports (all time)</td><td>{ov.records?.field_reports ?? '—'}</td></tr>
                <tr><td>Incidents (all / open)</td><td>{ov.records ? `${ov.records.incidents} / ${ov.records.incidents_open}` : '—'}</td></tr>
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    </div>
  );
}
