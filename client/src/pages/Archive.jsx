import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(day, 10)}, ${y}`;
}

function tenure(joined, departed) {
  if (!joined) return '—';
  const end = departed ? new Date(departed) : new Date();
  const start = new Date(joined);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}y ${rem}mo` : `${years}y`;
}

export default function Archive() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unarchiving, setUnarchiving] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/archive')
      .then(r => r.json())
      .then(data => { setMembers(data); setLoading(false); })
      .catch(() => { setError('Failed to load archive.'); setLoading(false); });
  }, []);

  async function handleUnarchive(id) {
    setUnarchiving(id);
    setError(null);
    try {
      const res = await fetch(`/api/members/${id}/unarchive`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to unarchive');
      setMembers(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setUnarchiving(null);
    }
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Archive</h1>
          <p className="page-subtitle">Former team members who resigned or were let go.</p>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      {members.length === 0 ? (
        <div className="card">
          <div className="empty-state">No archived members yet.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th>Level</th>
                <th>Joined</th>
                <th>Departed</th>
                <th>Tenure</th>
                <th>Reason</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="table-row-archived">
                  <td>
                    <Link to={`/members/${m.id}`} className="member-link">{m.name}</Link>
                  </td>
                  <td style={{ color: 'var(--text-2)' }}>{m.position || '—'}</td>
                  <td>
                    {m.level
                      ? <span className="badge badge-level">{m.level}</span>
                      : <span style={{ color: 'var(--text-3)' }}>—</span>}
                  </td>
                  <td style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>{fmtDate(m.joined_date)}</td>
                  <td style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>{fmtDate(m.archived_date)}</td>
                  <td style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{tenure(m.joined_date, m.archived_date)}</td>
                  <td>
                    {m.archived_reason
                      ? <span className="badge badge-reason">{m.archived_reason}</span>
                      : <span style={{ color: 'var(--text-3)' }}>—</span>}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleUnarchive(m.id)}
                      disabled={unarchiving === m.id}
                      title="Restore to active team"
                    >
                      {unarchiving === m.id ? '…' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
