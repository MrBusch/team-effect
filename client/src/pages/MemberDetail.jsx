import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePrivacy } from '../PrivacyContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Dot,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';

// ─── Competency config ────────────────────────────────────────────────────────

const CATEGORIES = {
  technology: { label: 'Technology', levels: ['Adopts', 'Specializes', 'Evangelizes', 'Masters', 'Creates'] },
  business:   { label: 'Business',   levels: ['Listens', 'Advocates', 'Leads', 'Community', 'Evangelizes'] },
  influence:  { label: 'Influence',  levels: ['Subsystem', 'Team', 'Multiple', 'Company', 'Community'] },
  process:    { label: 'Process',    levels: ['Follows', 'Enforces', 'Challenges', 'Adjusts', 'Defines'] },
  people:     { label: 'People',     levels: ['Learns', 'Supports', 'Mentors', 'Coordinates', 'Manages'] },
  system:     { label: 'System',     levels: ['Enhances', 'Designs', 'Owns', 'Evolves', 'Leads'] },
};
const CAT_KEYS = Object.keys(CATEGORIES);
const EMPTY_COMP = CAT_KEYS.reduce((o, k) => ({ ...o, [k]: '' }), {});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${day}, ${y}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function goalSort(a, b) {
  if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
  const ta = a.target_date || '9999';
  const tb = b.target_date || '9999';
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

function isOverdue(goal) {
  return goal.status === 'active' && goal.target_date && goal.target_date < today();
}

function gradeColor(g) {
  if (!g) return 'var(--text-2)';
  if (g >= 8) return 'var(--green)';
  if (g >= 6) return 'var(--yellow)';
  return 'var(--red)';
}

function gradeBg(g) {
  if (!g) return 'var(--bg-3)';
  if (g >= 8) return 'var(--green-dim)';
  if (g >= 6) return 'var(--yellow-dim)';
  return 'var(--red-dim)';
}

// ─── Custom chart dot ─────────────────────────────────────────────────────────

function GradeDot(props) {
  const { cx, cy, value } = props;
  if (!cx || !cy) return null;
  return (
    <circle
      cx={cx} cy={cy} r={5}
      fill={gradeColor(value)}
      stroke="var(--bg)"
      strokeWidth={2}
    />
  );
}

const ARCHIVE_REASONS = ['Resigned', 'Laid off', 'Performance', 'Contract ended', 'Other'];

// ─── Archive modal ────────────────────────────────────────────────────────────

function ArchiveModal({ name, onConfirm, onCancel }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('Resigned');

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Archive {name}</div>
        <div className="modal-body">
          <p style={{ marginBottom: 16, color: 'var(--text-2)', fontSize: '0.9rem' }}>
            This member will be moved to the archive and removed from the active team.
            Their data and grade history are preserved.
          </p>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label htmlFor="archive-date">Departure Date</label>
            <input
              id="archive-date" type="date" value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="archive-reason">Reason</label>
            <select id="archive-reason" value={reason} onChange={e => setReason(e.target.value)}>
              {ARCHIVE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-warning" onClick={() => onConfirm({ archived_date: date, archived_reason: reason })}>
            Archive Member
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteModal({ name, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Delete {name}?</div>
        <div className="modal-body">
          This will permanently delete this team member and all their grade history.
          This action cannot be undone.
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Grade history chart ──────────────────────────────────────────────────────

function GradeChart({ grades }) {
  if (!grades || grades.length < 2) return null;
  const data = grades.map(g => ({
    date: g.date,
    grade: g.grade,
    label: fmtDate(g.date),
  }));

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 10, right: 16, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-3)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            domain={[1, 10]}
            ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            tick={{ fill: 'var(--text-3)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border-2)',
              borderRadius: '6px',
              color: 'var(--text)',
              fontSize: '0.8rem',
            }}
            itemStyle={{ color: 'var(--text)' }}
            formatter={(v) => [v, 'Grade']}
            labelFormatter={l => l}
          />
          <ReferenceLine y={5} stroke="var(--border-2)" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="grade"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={<GradeDot />}
            activeDot={{ r: 7, fill: 'var(--accent-light)', stroke: 'var(--bg)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Competency radar chart ───────────────────────────────────────────────────

function CompAxisTick({ x, y, cx, cy, payload }) {
  const key = payload.value;
  const { label } = CATEGORIES[key] || { label: key };
  const dx = x - cx;
  const dy = y - cy;
  const anchor = Math.abs(dx) < 10 ? 'middle' : dx > 0 ? 'start' : 'end';
  const yOff = dy < 0 ? -6 : 14;
  return (
    <text x={x} y={y + yOff} textAnchor={anchor} fontSize={11} fill="var(--text-2)" fontFamily="inherit">
      {label}
    </text>
  );
}

function CompetencyRadar({ comp }) {
  const allEmpty = CAT_KEYS.every(k => !comp[k]);
  const data = CAT_KEYS.map(key => ({
    key,
    label: CATEGORIES[key].label,
    value: comp[key] ? Number(comp[key]) : 0,
    levelName: comp[key] ? CATEGORIES[key].levels[Number(comp[key]) - 1] : null,
  }));

  return (
    <div className="comp-chart-wrap">
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} outerRadius="62%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="key" tick={<CompAxisTick />} tickLine={false} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke={allEmpty ? 'var(--border-2)' : 'var(--accent)'}
            fill={allEmpty ? 'transparent' : 'var(--accent)'}
            fillOpacity={allEmpty ? 0 : 0.18}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{ background: 'var(--bg-2)', border: '1px solid var(--border-2)', borderRadius: 6, fontSize: '0.8rem' }}
            formatter={(value, _, { payload }) => [
              payload.levelName ? `${value} · ${payload.levelName}` : '—',
              CATEGORIES[payload.key]?.label,
            ]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [member, setMember] = useState(null);
  const [grades, setGrades] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', position: '', level: '', reporting_to: '',
    salary_local: '', local_currency: 'USD', salary_usd: '',
    equity: '', joined_date: '', last_promoted_date: '',
    promotion_steps: '', notes: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Grade add form
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [gradeForm, setGradeForm] = useState({ date: today(), grade: '', notes: '' });
  const [gradeErrors, setGradeErrors] = useState({});
  const [gradeSaving, setGradeSaving] = useState(false);
  const [deleteGradeId, setDeleteGradeId] = useState(null);

  // Competencies
  const [comp, setComp] = useState(EMPTY_COMP);
  const [compDirty, setCompDirty] = useState(false);
  const [compSaving, setCompSaving] = useState(false);
  const [compSuccess, setCompSuccess] = useState(false);

  // Goals
  const [goals, setGoals] = useState([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', added_date: today(), target_date: '' });
  const [goalErrors, setGoalErrors] = useState({});
  const [goalSaving, setGoalSaving] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [editGoalForm, setEditGoalForm] = useState({});
  const [deleteGoalId, setDeleteGoalId] = useState(null);

  // 1:1 notes
  const [oneOnOnes, setOneOnOnes] = useState([]);
  const [showOooForm, setShowOooForm] = useState(false);
  const [oooForm, setOooForm] = useState({ date: today(), notes: '', action_items: '' });
  const [oooErrors, setOooErrors] = useState({});
  const [oooSaving, setOooSaving] = useState(false);
  const [editingOooId, setEditingOooId] = useState(null);
  const [editOooForm, setEditOooForm] = useState({});
  const [deleteOooId, setDeleteOooId] = useState(null);

  // Fetch member + grades + all members (for manager dropdown)
  useEffect(() => {
    fetch('/api/members')
      .then(r => r.json())
      .then(data => setAllMembers(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) { setLoading(false); return; }
    Promise.all([
      fetch(`/api/members/${id}`).then(r => r.json()),
      fetch(`/api/members/${id}/grades`).then(r => r.json()),
      fetch(`/api/members/${id}/competencies`).then(r => r.json()),
      fetch(`/api/members/${id}/goals`).then(r => r.json()),
      fetch(`/api/members/${id}/one-on-ones`).then(r => r.json()),
    ]).then(([m, g, cp, gl, ooo]) => {
      setComp(CAT_KEYS.reduce((o, k) => ({ ...o, [k]: cp[k] != null ? String(cp[k]) : '' }), {}));
      setGoals(gl);
      setOneOnOnes(ooo);
      if (m.error) { navigate('/'); return; }
      setMember(m);
      setGrades(g);
      setForm({
        name: m.name || '',
        position: m.position || '',
        level: m.level || '',
        reporting_to: m.reporting_to != null ? String(m.reporting_to) : '',
        salary_local: m.salary_local != null ? String(m.salary_local) : '',
        local_currency: m.local_currency || 'USD',
        salary_usd: m.salary_usd != null ? String(m.salary_usd) : '',
        equity: m.equity || '',
        joined_date: m.joined_date || '',
        last_promoted_date: m.last_promoted_date || '',
        promotion_steps: m.promotion_steps || '',
        notes: m.notes || '',
      });
      setLoading(false);
    }).catch(() => { navigate('/'); });
  }, [id, isNew, navigate]);

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setFormErrors(e => ({ ...e, [key]: null }));
  }

  function validate() {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    if (form.salary_local && isNaN(Number(form.salary_local))) errors.salary_local = 'Must be a number';
    if (form.salary_usd && isNaN(Number(form.salary_usd))) errors.salary_usd = 'Must be a number';
    return errors;
  }

  async function handleSave(e) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) { setFormErrors(errors); return; }

    setSaving(true);
    setApiError(null);
    setSaveSuccess(false);

    const payload = {
      ...form,
      reporting_to: form.reporting_to ? Number(form.reporting_to) : null,
      salary_local: form.salary_local ? Number(form.salary_local) : 0,
      salary_usd: form.salary_usd ? Number(form.salary_usd) : 0,
      last_promoted_date: form.last_promoted_date || null,
    };

    try {
      let res, data;
      if (isNew) {
        res = await fetch('/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create member');
        navigate(`/members/${data.id}`, { replace: true });
      } else {
        res = await fetch(`/api/members/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save member');
        setMember(data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      navigate('/');
    } catch (err) {
      setApiError(err.message);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  async function handleArchive({ archived_date, archived_reason }) {
    setArchiving(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/members/${id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived_date, archived_reason }),
      });
      if (!res.ok) throw new Error('Failed to archive member');
      navigate('/');
    } catch (err) {
      setApiError(err.message);
      setArchiving(false);
      setShowArchiveModal(false);
    }
  }

  async function handleAddGrade(e) {
    e.preventDefault();
    const errors = {};
    if (!gradeForm.date) errors.date = 'Date is required';
    const g = Number(gradeForm.grade);
    if (!gradeForm.grade) errors.grade = 'Grade is required';
    else if (!Number.isInteger(g) || g < 1 || g > 10) errors.grade = 'Must be 1–10';
    if (Object.keys(errors).length) { setGradeErrors(errors); return; }

    setGradeSaving(true);
    try {
      const res = await fetch(`/api/members/${id}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: gradeForm.date, grade: g, notes: gradeForm.notes || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add grade');
      setGrades(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)));
      setGradeForm({ date: today(), grade: '', notes: '' });
      setShowGradeForm(false);
      setGradeErrors({});
    } catch (err) {
      setGradeErrors({ _api: err.message });
    } finally {
      setGradeSaving(false);
    }
  }

  async function handleDeleteGrade(gid) {
    try {
      const res = await fetch(`/api/grades/${gid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete grade');
      setGrades(prev => prev.filter(g => g.id !== gid));
    } catch (err) {
      setApiError(err.message);
    } finally {
      setDeleteGradeId(null);
    }
  }

  async function handleSaveComp() {
    setCompSaving(true);
    try {
      const res = await fetch(`/api/members/${id}/competencies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CAT_KEYS.reduce((o, k) => ({ ...o, [k]: comp[k] ? Number(comp[k]) : null }), {})),
      });
      if (!res.ok) throw new Error('Failed to save');
      setCompDirty(false);
      setCompSuccess(true);
      setTimeout(() => setCompSuccess(false), 2000);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setCompSaving(false);
    }
  }

  async function handleAddGoal(e) {
    e.preventDefault();
    const errors = {};
    if (!goalForm.title.trim()) errors.title = 'Title is required';
    if (!goalForm.added_date) errors.added_date = 'Added date is required';
    if (Object.keys(errors).length) { setGoalErrors(errors); return; }
    setGoalSaving(true);
    try {
      const res = await fetch(`/api/members/${id}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...goalForm, target_date: goalForm.target_date || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setGoals(prev => [data, ...prev].sort(goalSort));
      setGoalForm({ title: '', description: '', added_date: today(), target_date: '' });
      setShowGoalForm(false);
      setGoalErrors({});
    } catch (err) {
      setGoalErrors({ _api: err.message });
    } finally {
      setGoalSaving(false);
    }
  }

  async function handleSaveGoalEdit(gid) {
    if (!editGoalForm.title?.trim()) return;
    try {
      const res = await fetch(`/api/goals/${gid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editGoalForm, target_date: editGoalForm.target_date || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setGoals(prev => prev.map(g => g.id === gid ? data : g).sort(goalSort));
      setEditingGoalId(null);
    } catch (err) {
      setApiError(err.message);
    }
  }

  async function handleToggleGoal(goal) {
    const endpoint = goal.status === 'active' ? 'achieve' : 'unachieve';
    const body = endpoint === 'achieve' ? { achieved_date: today() } : {};
    try {
      const res = await fetch(`/api/goals/${goal.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      setGoals(prev => prev.map(g => g.id === goal.id ? data : g).sort(goalSort));
    } catch (err) {
      setApiError(err.message);
    }
  }

  async function handleDeleteGoal(gid) {
    try {
      const res = await fetch(`/api/goals/${gid}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setGoals(prev => prev.filter(g => g.id !== gid));
    } catch (err) {
      setApiError(err.message);
    } finally {
      setDeleteGoalId(null);
    }
  }

  async function handleAddOoo(e) {
    e.preventDefault();
    const errors = {};
    if (!oooForm.date) errors.date = 'Date is required';
    if (!oooForm.notes.trim()) errors.notes = 'Notes are required';
    if (Object.keys(errors).length) { setOooErrors(errors); return; }
    setOooSaving(true);
    try {
      const res = await fetch(`/api/members/${id}/one-on-ones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oooForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setOneOnOnes(prev => [data, ...prev]);
      setOooForm({ date: today(), notes: '', action_items: '' });
      setShowOooForm(false);
      setOooErrors({});
    } catch (err) {
      setOooErrors({ _api: err.message });
    } finally {
      setOooSaving(false);
    }
  }

  async function handleSaveOooEdit(oooId) {
    try {
      const res = await fetch(`/api/one-on-ones/${oooId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editOooForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setOneOnOnes(prev => prev.map(o => o.id === oooId ? data : o));
      setEditingOooId(null);
    } catch (err) {
      setApiError(err.message);
    }
  }

  async function handleDeleteOoo(oooId) {
    try {
      const res = await fetch(`/api/one-on-ones/${oooId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setOneOnOnes(prev => prev.filter(o => o.id !== oooId));
    } catch (err) {
      setApiError(err.message);
    } finally {
      setDeleteOooId(null);
    }
  }

  const { privateMode } = usePrivacy();
  const managersOptions = allMembers.filter(m => !id || String(m.id) !== String(id));

  if (loading) return <div className="loading">Loading…</div>;

  const pageTitle = isNew ? 'New Team Member' : (member?.name || 'Member');

  return (
    <div className="detail-page">
      <Link to="/" className="back-link">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/></svg>
        Back to Team
      </Link>

      <div className="detail-header">
        <div className="detail-header-text">
          <h1 className="detail-name">{pageTitle}</h1>
          {!isNew && member && (
            <div className="detail-meta">
              <span>{member.position}</span>
              {member.level && <><span>·</span><span className="badge badge-level">{member.level}</span></>}
              {member.manager_name && <><span>·</span><span>Reports to {member.manager_name}</span></>}
            </div>
          )}
        </div>
        {!isNew && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-warning btn-sm" onClick={() => setShowArchiveModal(true)} disabled={archiving}>
              Archive Member
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteModal(true)} disabled={deleting}>
              Delete
            </button>
          </div>
        )}
      </div>

      {apiError && <div className="error-banner">{apiError}</div>}
      {saveSuccess && <div className="success-banner">Saved successfully.</div>}

      <div className="detail-sections">
        {/* ── Profile form ── */}
        <div className="card">
          <div className="card-title">{isNew ? 'Add Team Member' : 'Profile'}</div>
          <form onSubmit={handleSave} noValidate>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  id="name" type="text" value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  className={formErrors.name ? 'error' : ''}
                  placeholder="Full name"
                />
                {formErrors.name && <span className="field-error">{formErrors.name}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="position">Position / Title</label>
                <input
                  id="position" type="text" value={form.position}
                  onChange={e => setField('position', e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>
              <div className="form-group">
                <label htmlFor="level">Level</label>
                <input
                  id="level" type="text" value={form.level}
                  onChange={e => setField('level', e.target.value)}
                  placeholder="e.g. L5, Senior, Staff"
                />
              </div>
              <div className="form-group">
                <label htmlFor="reporting_to">Reports To</label>
                <select
                  id="reporting_to" value={form.reporting_to}
                  onChange={e => setField('reporting_to', e.target.value)}
                >
                  <option value="">— No manager (root) —</option>
                  {managersOptions.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="joined_date">Joined Date</label>
                <input
                  id="joined_date" type="date" value={form.joined_date}
                  onChange={e => setField('joined_date', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="last_promoted_date">Last Promoted</label>
                <input
                  id="last_promoted_date" type="date" value={form.last_promoted_date}
                  onChange={e => setField('last_promoted_date', e.target.value)}
                />
              </div>
            </div>

            {!privateMode && (
              <>
                <hr className="divider" />
                <div className="card-title" style={{ marginBottom: 14 }}>Compensation</div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label htmlFor="salary_local">Salary (Local)</label>
                    <input
                      id="salary_local" type="number" value={form.salary_local}
                      onChange={e => setField('salary_local', e.target.value)}
                      className={formErrors.salary_local ? 'error' : ''}
                      placeholder="0"
                      min="0"
                    />
                    {formErrors.salary_local && <span className="field-error">{formErrors.salary_local}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="local_currency">Currency</label>
                    <select
                      id="local_currency" value={form.local_currency}
                      onChange={e => setField('local_currency', e.target.value)}
                    >
                      {['USD','EUR','GBP','CAD','AUD','SEK','DKK','NOK','CHF','SGD','JPY','BRL','INR','MXN','AED'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="salary_usd">Salary (USD equiv.)</label>
                    <input
                      id="salary_usd" type="number" value={form.salary_usd}
                      onChange={e => setField('salary_usd', e.target.value)}
                      className={formErrors.salary_usd ? 'error' : ''}
                      placeholder="0"
                      min="0"
                    />
                    {formErrors.salary_usd && <span className="field-error">{formErrors.salary_usd}</span>}
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label htmlFor="equity">Equity</label>
                  <input
                    id="equity" type="text" value={form.equity}
                    onChange={e => setField('equity', e.target.value)}
                    placeholder="e.g. 10,000 options @ $0.50 strike"
                  />
                </div>
              </>
            )}

            <hr className="divider" />
            <div className="card-title" style={{ marginBottom: 14 }}>Growth</div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label htmlFor="promotion_steps">Steps to Next Promotion</label>
              <textarea
                id="promotion_steps" value={form.promotion_steps}
                onChange={e => setField('promotion_steps', e.target.value)}
                placeholder="Describe what this person needs to demonstrate for their next level…"
                rows={5}
                style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font)' }}
              />
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes" value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                placeholder="Private notes about this team member…"
                rows={4}
              />
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : (isNew ? 'Create Member' : 'Save Changes')}
              </button>
              {!isNew && (
                <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Competency Profile ── */}
        {!isNew && (
          <div className="card">
            <div className="section-actions">
              <div className="card-title" style={{ marginBottom: 0 }}>Competency Profile</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {compSuccess && <span style={{ fontSize: '0.8rem', color: 'var(--green)' }}>Saved</span>}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveComp}
                  disabled={compSaving || !compDirty}
                >
                  {compSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

            <CompetencyRadar comp={comp} />

            <div className="comp-grid">
              {CAT_KEYS.map(key => {
                const { label, levels } = CATEGORIES[key];
                return (
                  <div key={key} className="comp-row">
                    <span className="comp-label">{label}</span>
                    <select
                      value={comp[key]}
                      onChange={e => { setComp(c => ({ ...c, [key]: e.target.value })); setCompDirty(true); }}
                    >
                      <option value="">— not set —</option>
                      {levels.map((lvl, i) => (
                        <option key={i} value={i + 1}>{i + 1} · {lvl}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Grade history (only for existing members, hidden in private mode) ── */}
        {!isNew && !privateMode && (
          <div className="card">
            <div className="section-actions">
              <div className="card-title" style={{ marginBottom: 0 }}>Grade History</div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowGradeForm(v => !v)}
              >
                {showGradeForm ? 'Cancel' : '+ Add Grade'}
              </button>
            </div>

            {showGradeForm && (
              <form onSubmit={handleAddGrade} noValidate className="grade-add-form">
                <div className="grade-add-form-title">New Grade Entry</div>
                {gradeErrors._api && <div className="error-banner">{gradeErrors._api}</div>}
                <div className="grade-add-row">
                  <div className="form-group">
                    <label htmlFor="grade-date">Date</label>
                    <input
                      id="grade-date" type="date" value={gradeForm.date}
                      onChange={e => { setGradeForm(f => ({ ...f, date: e.target.value })); setGradeErrors(e2 => ({ ...e2, date: null })); }}
                      className={gradeErrors.date ? 'error' : ''}
                    />
                    {gradeErrors.date && <span className="field-error">{gradeErrors.date}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="grade-val">Grade (1–10)</label>
                    <select
                      id="grade-val" value={gradeForm.grade}
                      onChange={e => { setGradeForm(f => ({ ...f, grade: e.target.value })); setGradeErrors(e2 => ({ ...e2, grade: null })); }}
                      className={gradeErrors.grade ? 'error' : ''}
                    >
                      <option value="">—</option>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    {gradeErrors.grade && <span className="field-error">{gradeErrors.grade}</span>}
                  </div>
                  <div style={{ paddingTop: 22 }}>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={gradeSaving}>
                      {gradeSaving ? '…' : 'Add'}
                    </button>
                  </div>
                </div>
                <div className="grade-add-row-with-notes">
                  <div className="form-group">
                    <label htmlFor="grade-notes">Notes (optional)</label>
                    <input
                      id="grade-notes" type="text" value={gradeForm.notes}
                      onChange={e => setGradeForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Context for this grade…"
                    />
                  </div>
                </div>
              </form>
            )}

            {grades.length >= 2 && <GradeChart grades={grades} />}

            {grades.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0 8px' }}>No grades recorded yet.</div>
            ) : (
              <ul className="grade-list">
                {[...grades].reverse().map(g => (
                  <li key={g.id} className="grade-item">
                    <div
                      className="grade-item-number"
                      style={{ background: gradeBg(g.grade), color: gradeColor(g.grade) }}
                    >
                      {g.grade}
                    </div>
                    <div className="grade-item-body">
                      <div className="grade-item-date">{fmtDate(g.date)}</div>
                      {g.notes && <div className="grade-item-notes">{g.notes}</div>}
                    </div>
                    {deleteGradeId === g.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Delete?</span>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteGrade(g.id)}>Yes</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleteGradeId(null)}>No</button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => setDeleteGradeId(g.id)}
                        title="Delete grade"
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Development Goals ── */}
        {!isNew && (
          <div className="card">
            <div className="section-actions">
              <div className="card-title" style={{ marginBottom: 0 }}>Development Goals</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowGoalForm(v => !v)}>
                {showGoalForm ? 'Cancel' : '+ Add Goal'}
              </button>
            </div>

            {showGoalForm && (
              <form onSubmit={handleAddGoal} noValidate className="grade-add-form" style={{ marginBottom: 16 }}>
                <div className="grade-add-form-title">New Goal</div>
                {goalErrors._api && <div className="error-banner">{goalErrors._api}</div>}
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label htmlFor="goal-title">Title *</label>
                  <input id="goal-title" type="text" value={goalForm.title}
                    onChange={e => { setGoalForm(f => ({ ...f, title: e.target.value })); setGoalErrors(v => ({ ...v, title: null })); }}
                    className={goalErrors.title ? 'error' : ''}
                    placeholder="e.g. Lead a cross-team project end-to-end"
                  />
                  {goalErrors.title && <span className="field-error">{goalErrors.title}</span>}
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label htmlFor="goal-desc">Description (optional)</label>
                  <textarea id="goal-desc" rows={2} value={goalForm.description}
                    onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="More detail on what success looks like…"
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div className="form-group">
                    <label htmlFor="goal-added">Date Added</label>
                    <input id="goal-added" type="date" value={goalForm.added_date}
                      onChange={e => { setGoalForm(f => ({ ...f, added_date: e.target.value })); setGoalErrors(v => ({ ...v, added_date: null })); }}
                      className={goalErrors.added_date ? 'error' : ''}
                    />
                    {goalErrors.added_date && <span className="field-error">{goalErrors.added_date}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="goal-target">Target Date (optional)</label>
                    <input id="goal-target" type="date" value={goalForm.target_date}
                      onChange={e => setGoalForm(f => ({ ...f, target_date: e.target.value }))}
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={goalSaving}>
                  {goalSaving ? 'Saving…' : 'Add Goal'}
                </button>
              </form>
            )}

            {goals.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0 8px' }}>No goals set yet.</div>
            ) : (
              <ul className="goal-list">
                {goals.map(g => (
                  <li key={g.id} className={`goal-item${g.status === 'achieved' ? ' goal-achieved' : ''}`}>
                    {editingGoalId === g.id ? (
                      <div className="goal-edit-form">
                        <div className="form-group" style={{ marginBottom: 8 }}>
                          <label>Title</label>
                          <input type="text" value={editGoalForm.title}
                            onChange={e => setEditGoalForm(f => ({ ...f, title: e.target.value }))}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 8 }}>
                          <label>Description</label>
                          <textarea rows={2} value={editGoalForm.description}
                            onChange={e => setEditGoalForm(f => ({ ...f, description: e.target.value }))}
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                          <div className="form-group">
                            <label>Date Added</label>
                            <input type="date" value={editGoalForm.added_date}
                              onChange={e => setEditGoalForm(f => ({ ...f, added_date: e.target.value }))}
                            />
                          </div>
                          <div className="form-group">
                            <label>Target Date</label>
                            <input type="date" value={editGoalForm.target_date || ''}
                              onChange={e => setEditGoalForm(f => ({ ...f, target_date: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleSaveGoalEdit(g.id)}>Save</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingGoalId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          className={`goal-checkbox${g.status === 'achieved' ? ' goal-checkbox-done' : ''}`}
                          onClick={() => handleToggleGoal(g)}
                          title={g.status === 'achieved' ? 'Mark as not achieved' : 'Mark as achieved'}
                        >
                          {g.status === 'achieved' && (
                            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                            </svg>
                          )}
                        </button>
                        <div className="goal-body">
                          <div className="goal-title">{g.title}</div>
                          {g.description && <div className="goal-desc">{g.description}</div>}
                          <div className="goal-meta">
                            <span>Added {fmtDate(g.added_date)}</span>
                            {g.target_date && (
                              <span className={`goal-target-date${isOverdue(g) ? ' goal-overdue' : ''}`}>
                                {isOverdue(g) ? '⚠ ' : ''}Target {fmtDate(g.target_date)}
                              </span>
                            )}
                            {g.achieved_date && (
                              <span className="goal-achieved-date">Achieved {fmtDate(g.achieved_date)}</span>
                            )}
                          </div>
                        </div>
                        <div className="goal-actions">
                          {deleteGoalId === g.id ? (
                            <>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Delete?</span>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteGoal(g.id)}>Yes</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteGoalId(null)}>No</button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setEditingGoalId(g.id); setEditGoalForm({ title: g.title, description: g.description, added_date: g.added_date, target_date: g.target_date || '' }); }}>Edit</button>
                              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteGoalId(g.id)} title="Delete">
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── 1:1 Notes ── */}
        {!isNew && (
          <div className="card">
            <div className="section-actions">
              <div className="card-title" style={{ marginBottom: 0 }}>1:1 Notes</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowOooForm(v => !v)}>
                {showOooForm ? 'Cancel' : '+ Add Entry'}
              </button>
            </div>

            {showOooForm && (
              <form onSubmit={handleAddOoo} noValidate className="grade-add-form" style={{ marginBottom: 16 }}>
                <div className="grade-add-form-title">New 1:1 Entry</div>
                {oooErrors._api && <div className="error-banner">{oooErrors._api}</div>}
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label htmlFor="ooo-date">Date</label>
                  <input id="ooo-date" type="date" value={oooForm.date}
                    onChange={e => { setOooForm(f => ({ ...f, date: e.target.value })); setOooErrors(v => ({ ...v, date: null })); }}
                    className={oooErrors.date ? 'error' : ''}
                    style={{ maxWidth: 180 }}
                  />
                  {oooErrors.date && <span className="field-error">{oooErrors.date}</span>}
                </div>
                <div className="form-group" style={{ marginBottom: 10 }}>
                  <label htmlFor="ooo-notes">Notes *</label>
                  <textarea id="ooo-notes" rows={4} value={oooForm.notes}
                    onChange={e => { setOooForm(f => ({ ...f, notes: e.target.value })); setOooErrors(v => ({ ...v, notes: null })); }}
                    className={oooErrors.notes ? 'error' : ''}
                    placeholder="What was discussed…"
                  />
                  {oooErrors.notes && <span className="field-error">{oooErrors.notes}</span>}
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label htmlFor="ooo-actions">Action Items (optional)</label>
                  <textarea id="ooo-actions" rows={2} value={oooForm.action_items}
                    onChange={e => setOooForm(f => ({ ...f, action_items: e.target.value }))}
                    placeholder="Follow-ups, commitments…"
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm" disabled={oooSaving}>
                  {oooSaving ? 'Saving…' : 'Save Entry'}
                </button>
              </form>
            )}

            {oneOnOnes.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0 8px' }}>No 1:1 notes yet.</div>
            ) : (
              <ul className="ooo-list">
                {oneOnOnes.map(o => (
                  <li key={o.id} className="ooo-item">
                    {editingOooId === o.id ? (
                      <div className="ooo-edit-form">
                        <div className="form-group" style={{ marginBottom: 8 }}>
                          <label>Date</label>
                          <input type="date" value={editOooForm.date}
                            onChange={e => setEditOooForm(f => ({ ...f, date: e.target.value }))}
                            style={{ maxWidth: 180 }}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 8 }}>
                          <label>Notes</label>
                          <textarea rows={4} value={editOooForm.notes}
                            onChange={e => setEditOooForm(f => ({ ...f, notes: e.target.value }))}
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 10 }}>
                          <label>Action Items</label>
                          <textarea rows={2} value={editOooForm.action_items}
                            onChange={e => setEditOooForm(f => ({ ...f, action_items: e.target.value }))}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleSaveOooEdit(o.id)}>Save</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingOooId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="ooo-item-header">
                          <span className="ooo-item-date">{fmtDate(o.date)}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {deleteOooId === o.id ? (
                              <>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', alignSelf: 'center' }}>Delete?</span>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteOoo(o.id)}>Yes</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setDeleteOooId(null)}>No</button>
                              </>
                            ) : (
                              <>
                                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingOooId(o.id); setEditOooForm({ date: o.date, notes: o.notes, action_items: o.action_items }); }}>Edit</button>
                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setDeleteOooId(o.id)} title="Delete">
                                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="ooo-item-notes">{o.notes}</div>
                        {o.action_items && (
                          <div className="ooo-item-actions">
                            <span className="ooo-actions-label">Action items</span>
                            <span>{o.action_items}</span>
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {showArchiveModal && (
        <ArchiveModal
          name={member?.name}
          onConfirm={handleArchive}
          onCancel={() => setShowArchiveModal(false)}
        />
      )}

      {showDeleteModal && (
        <DeleteModal
          name={member?.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
