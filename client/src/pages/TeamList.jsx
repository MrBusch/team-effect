import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivacy } from '../PrivacyContext';

const ALL_COLS = [
  { key: 'name',               label: 'Name',      private: false },
  { key: 'level',              label: 'Level',     private: false },
  { key: 'manager_name',       label: 'Manager',   private: false },
  { key: 'salary_usd',         label: 'Salary',    private: true  },
  { key: 'joined_date',        label: 'Joined',    private: false },
  { key: 'last_promoted_date', label: 'Last Promo',private: false },
  { key: 'latest_grade',       label: 'Grade',     private: true  },
];

function gradeBadgeClass(g) {
  if (!g) return 'badge-grade';
  if (g >= 8) return 'badge-grade badge-grade-high';
  if (g >= 6) return 'badge-grade badge-grade-mid';
  return 'badge-grade badge-grade-low';
}

function gradeTrend(m) {
  if (!m.latest_grade) return 'none';
  const daysSince = m.latest_grade_date
    ? (Date.now() - new Date(m.latest_grade_date).getTime()) / 86400000
    : Infinity;
  if (daysSince > 45) return 'stale';
  if (m.prev_grade == null) return 'none';
  if (m.latest_grade > m.prev_grade) return 'up';
  if (m.latest_grade < m.prev_grade) return 'down';
  return 'flat';
}

function TrendIndicator({ m }) {
  const trend = gradeTrend(m);
  if (trend === 'none') return null;
  const map = {
    up:    { symbol: '↑', cls: 'trend-up' },
    down:  { symbol: '↓', cls: 'trend-down' },
    flat:  { symbol: '→', cls: 'trend-flat' },
    stale: { symbol: '!',  cls: 'trend-stale', title: 'No grade in 45+ days' },
  };
  const { symbol, cls, title } = map[trend];
  return <span className={`trend-indicator ${cls}`} title={title}>{symbol}</span>;
}

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m)-1]} ${day}, ${y}`;
}

function fmtSalary(member) {
  const local = member.salary_local
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: member.local_currency || 'USD', maximumFractionDigits: 0 }).format(member.salary_local)
    : null;
  const usd = member.salary_usd && member.local_currency !== 'USD'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(member.salary_usd)
    : null;
  return { local, usd };
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function TeamList() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });
  const navigate = useNavigate();
  const { privateMode } = usePrivacy();
  const COLS = ALL_COLS.filter(c => !privateMode || !c.private);

  useEffect(() => {
    fetch('/api/members')
      .then(r => r.json())
      .then(data => { setMembers(data); setLoading(false); })
      .catch(() => { setError('Failed to load team members.'); setLoading(false); });
  }, []);

  const sorted = useMemo(() => {
    return [...members].sort((a, b) => {
      let av = a[sort.key] ?? '';
      let bv = b[sort.key] ?? '';
      if (sort.key === 'salary_usd') {
        // Fall back to local salary when USD equivalent isn't set
        av = Number(a.salary_usd) || Number(a.salary_local) || 0;
        bv = Number(b.salary_usd) || Number(b.salary_local) || 0;
      } else if (sort.key === 'latest_grade') {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [members, sort]);

  function toggleSort(key) {
    setSort(s => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }

  function SortIcon({ col }) {
    if (sort.key !== col) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon">{sort.dir === 'asc' ? '↑' : '↓'}</span>;
  }

  if (loading) return <div className="loading">Loading team…</div>;
  if (error) return <div className="page"><div className="error-banner">{error}</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/members/new')}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/></svg>
          Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <div className="card">
          <div className="empty-state">No team members yet. Add your first one!</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {COLS.map(col => (
                  <th
                    key={col.key}
                    className={`sortable${sort.key === col.key ? ' sort-active' : ''}`}
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.label} <SortIcon col={col.key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(m => {
                const { local, usd } = fmtSalary(m);
                return (
                  <tr key={m.id} className="clickable" onClick={() => navigate(`/members/${m.id}`)}>
                    <td>
                      <div className="name-cell">
                        <div className="avatar">{initials(m.name)}</div>
                        <div className="name-cell-text">
                          <div className="name-cell-name">{m.name}</div>
                          <div className="name-cell-position">{m.position}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {m.level ? <span className="badge badge-level">{m.level}</span> : <span className="td-muted">—</span>}
                    </td>
                    <td className="td-muted">{m.manager_name || '—'}</td>
                    {!privateMode && (
                      <td>
                        {local ? (
                          <div className="currency-pair">
                            <span className="currency-main">{local}</span>
                            {usd && <span className="currency-sub">{usd} USD</span>}
                          </div>
                        ) : <span className="td-muted">—</span>}
                      </td>
                    )}
                    <td className="td-muted">{fmtDate(m.joined_date)}</td>
                    <td className="td-muted">{fmtDate(m.last_promoted_date)}</td>
                    {!privateMode && (
                      <td>
                        <div className="grade-cell">
                          {m.latest_grade != null
                            ? <span className={gradeBadgeClass(m.latest_grade)}>{m.latest_grade}</span>
                            : <span className="td-muted">—</span>
                          }
                          <TrendIndicator m={m} />
                        </div>
                      </td>
                    )}
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
