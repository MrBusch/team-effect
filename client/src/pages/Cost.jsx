import React, { useState, useEffect, useMemo } from 'react';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

const STATUS_LABELS = {
  planned: 'Planned',
  interviewing: 'Interviewing',
  offer_extended: 'Offer Extended',
  accepted: 'Accepted',
};

export default function Cost() {
  const [members, setMembers] = useState([]);
  const [hires, setHires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/members').then(r => r.json()),
      fetch('/api/hires').then(r => r.json()),
    ])
      .then(([m, h]) => { setMembers(m); setHires(h); setLoading(false); })
      .catch(() => { setError('Failed to load data.'); setLoading(false); });
  }, []);

  const stats = useMemo(() => {
    const withSalary = members.filter(m => m.salary_usd > 0);
    const total = members.reduce((s, m) => s + (m.salary_usd || 0), 0);
    const avg = withSalary.length ? total / withSalary.length : 0;

    // Group by level
    const byLevel = {};
    for (const m of members) {
      const lvl = m.level || '(no level)';
      if (!byLevel[lvl]) byLevel[lvl] = { count: 0, total: 0 };
      byLevel[lvl].count++;
      byLevel[lvl].total += m.salary_usd || 0;
    }
    const levels = Object.entries(byLevel)
      .map(([level, d]) => ({ level, count: d.count, total: d.total, avg: d.count ? d.total / d.count : 0 }))
      .sort((a, b) => b.total - a.total);

    // Hires by status
    const hiresByStatus = {};
    for (const h of hires) {
      hiresByStatus[h.status] = (hiresByStatus[h.status] || 0) + 1;
    }

    return { total, avg, headcount: members.length, withSalary: withSalary.length, levels, hiresByStatus };
  }, [members, hires]);

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="page"><div className="error-banner">{error}</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Cost</h1>
          <p className="page-subtitle">Payroll overview based on USD-equivalent salaries.</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="cost-cards">
        <div className="cost-card">
          <div className="cost-card-label">Headcount</div>
          <div className="cost-card-value">{stats.headcount}</div>
          {stats.withSalary < stats.headcount && (
            <div className="cost-card-sub">{stats.headcount - stats.withSalary} without salary data</div>
          )}
        </div>
        <div className="cost-card">
          <div className="cost-card-label">Annual Payroll</div>
          <div className="cost-card-value">{fmt(stats.total)}</div>
          <div className="cost-card-sub">USD equivalent</div>
        </div>
        <div className="cost-card">
          <div className="cost-card-label">Average Salary</div>
          <div className="cost-card-value">{stats.withSalary ? fmt(stats.avg) : '—'}</div>
          {stats.withSalary > 0 && <div className="cost-card-sub">across {stats.withSalary} with data</div>}
        </div>
        <div className="cost-card">
          <div className="cost-card-label">Planned Hires</div>
          <div className="cost-card-value">{hires.length}</div>
          {Object.keys(stats.hiresByStatus).length > 0 && (
            <div className="cost-card-sub">
              {Object.entries(stats.hiresByStatus).map(([s, n]) => `${n} ${STATUS_LABELS[s] ?? s}`).join(' · ')}
            </div>
          )}
        </div>
      </div>

      {/* Level breakdown */}
      {stats.levels.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-title">Breakdown by Level</div>
          <table>
            <thead>
              <tr>
                <th>Level</th>
                <th style={{ textAlign: 'right' }}>Count</th>
                <th style={{ textAlign: 'right' }}>Avg Salary (USD)</th>
                <th style={{ textAlign: 'right' }}>Total (USD)</th>
                <th style={{ textAlign: 'right' }}>% of Payroll</th>
              </tr>
            </thead>
            <tbody>
              {stats.levels.map(row => (
                <tr key={row.level}>
                  <td><span className="badge badge-level">{row.level}</span></td>
                  <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>{row.count}</td>
                  <td style={{ textAlign: 'right' }}>{row.avg ? fmt(row.avg) : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{row.total ? fmt(row.total) : '—'}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>
                    {stats.total ? `${((row.total / stats.total) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
              <tr className="cost-total-row">
                <td><strong>Total</strong></td>
                <td style={{ textAlign: 'right' }}><strong>{stats.headcount}</strong></td>
                <td></td>
                <td style={{ textAlign: 'right' }}><strong>{fmt(stats.total)}</strong></td>
                <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Individual salaries */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">Individual Salaries</div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Level</th>
              <th>Manager</th>
              <th style={{ textAlign: 'right' }}>Local Salary</th>
              <th style={{ textAlign: 'right' }}>USD Equiv.</th>
            </tr>
          </thead>
          <tbody>
            {[...members].sort((a, b) => (b.salary_usd || 0) - (a.salary_usd || 0)).map(m => (
              <tr key={m.id}>
                <td style={{ fontWeight: 500 }}>{m.name}</td>
                <td>{m.level ? <span className="badge badge-level">{m.level}</span> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                <td style={{ color: 'var(--text-2)' }}>{m.manager_name || '—'}</td>
                <td style={{ textAlign: 'right', color: 'var(--text-2)' }}>
                  {m.salary_local
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: m.local_currency || 'USD', maximumFractionDigits: 0 }).format(m.salary_local)
                    : '—'}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 500 }}>
                  {m.salary_usd ? fmt(m.salary_usd) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
