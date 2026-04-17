import React, { useState, useEffect } from 'react';

const STATUS_OPTIONS = [
  { value: 'planned',        label: 'Planned' },
  { value: 'interviewing',   label: 'Interviewing' },
  { value: 'offer_extended', label: 'Offer Extended' },
  { value: 'accepted',       label: 'Accepted' },
];

function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_OPTIONS.find(s => s.value === status)?.label || status}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${day}, ${y}`;
}

const EMPTY_FORM = {
  name: '', position: '', level: '', reporting_to: '',
  expected_start_date: '', status: 'planned', notes: '',
};

function HireForm({ form, setForm, onSubmit, onCancel, errors, saving, members, submitLabel }) {
  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }));
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {errors._api && <div className="error-banner">{errors._api}</div>}
      <div className="form-grid">
        <div className="form-group">
          <label>Role / Name *</label>
          <input
            type="text" value={form.name}
            onChange={e => setField('name', e.target.value)}
            className={errors.name ? 'error' : ''}
            placeholder="e.g. Senior Backend Engineer (TBH)"
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="form-group">
          <label>Position / Title</label>
          <input
            type="text" value={form.position}
            onChange={e => setField('position', e.target.value)}
            placeholder="e.g. Senior Software Engineer"
          />
        </div>
        <div className="form-group">
          <label>Level</label>
          <input
            type="text" value={form.level}
            onChange={e => setField('level', e.target.value)}
            placeholder="e.g. L5"
          />
        </div>
        <div className="form-group">
          <label>Reports To</label>
          <select value={form.reporting_to} onChange={e => setField('reporting_to', e.target.value)}>
            <option value="">— No manager —</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Expected Start</label>
          <input
            type="date" value={form.expected_start_date}
            onChange={e => setField('expected_start_date', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select value={form.status} onChange={e => setField('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group full">
          <label>Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            placeholder="Context, requirements, pipeline notes…"
            rows={3}
          />
        </div>
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function PlannedHires() {
  const [hires, setHires] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ ...EMPTY_FORM });
  const [addErrors, setAddErrors] = useState({});
  const [addSaving, setAddSaving] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM });
  const [editErrors, setEditErrors] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/hires').then(r => r.json()),
      fetch('/api/members').then(r => r.json()),
    ]).then(([h, m]) => {
      setHires(h);
      setMembers(m);
      setLoading(false);
    }).catch(() => {
      setError('Failed to load planned hires.');
      setLoading(false);
    });
  }, []);

  function validateForm(form) {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    return errors;
  }

  async function handleAdd(e) {
    e.preventDefault();
    const errors = validateForm(addForm);
    if (Object.keys(errors).length) { setAddErrors(errors); return; }

    setAddSaving(true);
    try {
      const res = await fetch('/api/hires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          reporting_to: addForm.reporting_to ? Number(addForm.reporting_to) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create hire');
      setHires(prev => [...prev, data]);
      setAddForm({ ...EMPTY_FORM });
      setShowAddForm(false);
      setAddErrors({});
    } catch (err) {
      setAddErrors({ _api: err.message });
    } finally {
      setAddSaving(false);
    }
  }

  function startEdit(hire) {
    setEditId(hire.id);
    setEditForm({
      name: hire.name || '',
      position: hire.position || '',
      level: hire.level || '',
      reporting_to: hire.reporting_to != null ? String(hire.reporting_to) : '',
      expected_start_date: hire.expected_start_date || '',
      status: hire.status || 'planned',
      notes: hire.notes || '',
    });
    setEditErrors({});
  }

  async function handleEdit(e) {
    e.preventDefault();
    const errors = validateForm(editForm);
    if (Object.keys(errors).length) { setEditErrors(errors); return; }

    setEditSaving(true);
    try {
      const res = await fetch(`/api/hires/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          reporting_to: editForm.reporting_to ? Number(editForm.reporting_to) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update hire');
      setHires(prev => prev.map(h => h.id === editId ? data : h));
      setEditId(null);
    } catch (err) {
      setEditErrors({ _api: err.message });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/hires/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setHires(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteId(null);
    }
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Planned Hires</h1>
          <p className="page-subtitle">{hires.length} planned position{hires.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setShowAddForm(true); setAddForm({ ...EMPTY_FORM }); setAddErrors({}); }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
          Add Hire
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showAddForm && (
        <div className="hire-add-panel">
          <div className="card-title" style={{ marginBottom: 16 }}>New Planned Hire</div>
          <HireForm
            form={addForm}
            setForm={setAddForm}
            onSubmit={handleAdd}
            onCancel={() => { setShowAddForm(false); setAddErrors({}); }}
            errors={addErrors}
            saving={addSaving}
            members={members}
            submitLabel="Add Hire"
          />
        </div>
      )}

      {hires.length === 0 ? (
        <div className="card">
          <div className="empty-state">No planned hires yet. Add your first one!</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Level</th>
                <th>Reports To</th>
                <th>Expected Start</th>
                <th>Status</th>
                <th>Notes</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hires.map(hire => {
                if (editId === hire.id) {
                  return (
                    <tr key={hire.id} className="inline-edit-row">
                      <td colSpan={7} style={{ padding: '16px 14px' }}>
                        <HireForm
                          form={editForm}
                          setForm={setEditForm}
                          onSubmit={handleEdit}
                          onCancel={() => setEditId(null)}
                          errors={editErrors}
                          saving={editSaving}
                          members={members}
                          submitLabel="Save"
                        />
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={hire.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{hire.name}</div>
                      {hire.position && <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{hire.position}</div>}
                    </td>
                    <td>
                      {hire.level
                        ? <span className="badge badge-level">{hire.level}</span>
                        : <span className="td-muted">—</span>
                      }
                    </td>
                    <td className="td-muted">{hire.manager_name || '—'}</td>
                    <td className="td-muted">{fmtDate(hire.expected_start_date)}</td>
                    <td><StatusBadge status={hire.status} /></td>
                    <td className="td-muted" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {hire.notes || '—'}
                    </td>
                    <td>
                      {deleteId === hire.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>Delete?</span>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(hire.id)}>Yes</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setDeleteId(null)}>No</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => startEdit(hire)}
                            title="Edit"
                          >
                            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeleteId(hire.id)}
                            title="Delete"
                          >
                            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
