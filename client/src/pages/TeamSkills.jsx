import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

// ─── Shared config ────────────────────────────────────────────────────────────

const CATEGORIES = {
  technology: { label: 'Technology', levels: ['Adopts', 'Specializes', 'Evangelizes', 'Masters', 'Creates'] },
  business:   { label: 'Business',   levels: ['Listens', 'Advocates', 'Leads', 'Community', 'Evangelizes'] },
  influence:  { label: 'Influence',  levels: ['Subsystem', 'Team', 'Multiple', 'Company', 'Community'] },
  process:    { label: 'Process',    levels: ['Follows', 'Enforces', 'Challenges', 'Adjusts', 'Defines'] },
  people:     { label: 'People',     levels: ['Learns', 'Supports', 'Mentors', 'Coordinates', 'Manages'] },
  system:     { label: 'System',     levels: ['Enhances', 'Designs', 'Owns', 'Evolves', 'Leads'] },
};
const CAT_KEYS = Object.keys(CATEGORIES);
const N = CAT_KEYS.length;
const MAX_LEVEL = 5;

function levelName(key, val) {
  if (!val) return null;
  return CATEGORIES[key].levels[Math.round(val) - 1] ?? null;
}

// ─── Custom SVG radar chart ───────────────────────────────────────────────────

const CX = 270, CY = 195, R = 138, LABEL_PAD = 38;
const VIEWBOX_W = 540, VIEWBOX_H = 390;

function angle(i) {
  return -Math.PI / 2 + (2 * Math.PI * i) / N;
}

function polar(val, i) {
  const a = angle(i);
  const r = R * (val / MAX_LEVEL);
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function toPath(points) {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ') + 'Z';
}

function TeamRadarChart({ stats }) {
  // Grid rings
  const gridRings = Array.from({ length: MAX_LEVEL }, (_, lvl) => {
    const pts = CAT_KEYS.map((_, i) => polar(lvl + 1, i));
    return toPath(pts);
  });

  // Spoke endpoints
  const spokes = CAT_KEYS.map((_, i) => polar(MAX_LEVEL, i));

  // Data paths
  const maxPts  = CAT_KEYS.map((k, i) => polar(stats[k]?.max  ?? 0, i));
  const avgPts  = CAT_KEYS.map((k, i) => polar(stats[k]?.avg  ?? 0, i));
  const minPts  = CAT_KEYS.map((k, i) => polar(stats[k]?.min  ?? 0, i));

  // Band = max polygon + min polygon together with evenodd → ring shape
  const bandPath = `${toPath(maxPts)} ${toPath(minPts)}`;
  const avgPath  = toPath(avgPts);
  const maxPath  = toPath(maxPts);
  const minPath  = toPath(minPts);

  // Axis labels
  const labels = CAT_KEYS.map((key, i) => {
    const a = angle(i);
    const lx = CX + (R + LABEL_PAD) * Math.cos(a);
    const ly = CY + (R + LABEL_PAD) * Math.sin(a);
    const anchor = Math.abs(Math.cos(a)) < 0.12 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end';
    const baseline = Math.abs(Math.sin(a)) < 0.12 ? 'middle' : Math.sin(a) > 0 ? 'hanging' : 'auto';
    const avg = stats[key]?.avg;
    const lvlName = avg != null ? levelName(key, Math.round(avg)) : null;
    return { key, label: CATEGORIES[key].label, lx, ly, anchor, baseline, avg, lvlName };
  });

  const hasData = CAT_KEYS.some(k => stats[k]?.count > 0);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      width="100%"
      style={{ maxWidth: 560, display: 'block', margin: '0 auto' }}
      aria-label="Team competency radar chart"
    >
      {/* Grid rings */}
      {gridRings.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--border)" strokeWidth={i === MAX_LEVEL - 1 ? 1.5 : 1} />
      ))}

      {/* Spokes */}
      {spokes.map(([x, y], i) => (
        <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="var(--border)" strokeWidth={1} />
      ))}

      {/* Level tick labels on first spoke (technology axis) */}
      {Array.from({ length: MAX_LEVEL }, (_, lvl) => {
        const [tx, ty] = polar(lvl + 1, 0);
        return (
          <text key={lvl} x={tx + 5} y={ty} fontSize={9} fill="var(--text-3)" dominantBaseline="middle">
            {lvl + 1}
          </text>
        );
      })}

      {hasData && (
        <>
          {/* Range band: filled area between min and max */}
          <path d={bandPath} fill="var(--accent)" fillOpacity={0.14} fillRule="evenodd" stroke="none" />

          {/* Max boundary */}
          <path d={maxPath} fill="none" stroke="var(--accent)" strokeOpacity={0.4} strokeWidth={1.5} strokeDasharray="5 3" strokeLinejoin="round" />

          {/* Min boundary */}
          <path d={minPath} fill="none" stroke="var(--accent-light)" strokeOpacity={0.4} strokeWidth={1} strokeDasharray="2 4" strokeLinejoin="round" />

          {/* Average fill + stroke */}
          <path d={avgPath} fill="var(--accent)" fillOpacity={0.28} stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" />

          {/* Average dots */}
          {avgPts.map(([x, y], i) => (
            stats[CAT_KEYS[i]]?.avg != null && (
              <circle key={i} cx={x} cy={y} r={4.5} fill="var(--accent)" stroke="var(--bg-2)" strokeWidth={2} />
            )
          ))}
        </>
      )}

      {!hasData && (
        <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize={13} fill="var(--text-3)">
          No competency data yet
        </text>
      )}

      {/* Axis labels */}
      {labels.map(({ key, label, lx, ly, anchor, baseline, avg, lvlName }) => (
        <g key={key}>
          <text x={lx} y={ly} textAnchor={anchor} dominantBaseline={baseline} fontSize={12} fontWeight={600} fill="var(--text-2)" fontFamily="inherit">
            {label}
          </text>
          {lvlName && (
            <text x={lx} y={ly + (baseline === 'hanging' ? 16 : baseline === 'auto' ? -16 : 0)} dy={baseline === 'middle' ? 14 : 0} textAnchor={anchor} fontSize={10} fill="var(--accent-light)" fontFamily="inherit">
              {lvlName}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// ─── Score cell helper ────────────────────────────────────────────────────────

function ScoreCell({ catKey, value }) {
  if (value == null) return <span style={{ color: 'var(--text-3)' }}>—</span>;
  const name = CATEGORIES[catKey].levels[value - 1];
  const opacity = 0.4 + (value / MAX_LEVEL) * 0.6;
  return (
    <span className="score-cell" style={{ '--score-opacity': opacity }}>
      <span className="score-num">{value}</span>
      <span className="score-name">{name}</span>
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeamSkills() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/competencies')
      .then(r => r.json())
      .then(data => { setRows(data); setLoading(false); })
      .catch(() => { setError('Failed to load competency data.'); setLoading(false); });
  }, []);

  const stats = useMemo(() => {
    const out = {};
    for (const key of CAT_KEYS) {
      const vals = rows.map(r => r[key]).filter(v => v != null);
      if (vals.length === 0) {
        out[key] = { count: 0, min: null, avg: null, max: null };
      } else {
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
        out[key] = { count: vals.length, min: Math.min(...vals), avg, max: Math.max(...vals) };
      }
    }
    return out;
  }, [rows]);

  if (loading) return <div className="loading">Loading…</div>;
  if (error)   return <div className="page"><div className="error-banner">{error}</div></div>;

  const coveredCount = rows.length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Skills</h1>
          <p className="page-subtitle">
            Competency profile across {coveredCount} member{coveredCount !== 1 ? 's' : ''} with data.
          </p>
        </div>
      </div>

      {/* Chart + legend */}
      <div className="card" style={{ marginBottom: 20 }}>
        <TeamRadarChart stats={stats} />

        <div className="radar-legend">
          <div className="radar-legend-item">
            <svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke="var(--accent)" strokeWidth="2.5"/></svg>
            <span>Average</span>
          </div>
          <div className="radar-legend-item">
            <svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="5 3" strokeOpacity="0.6"/></svg>
            <span>Maximum</span>
          </div>
          <div className="radar-legend-item">
            <svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke="var(--accent-light)" strokeWidth="1" strokeDasharray="2 4" strokeOpacity="0.6"/></svg>
            <span>Minimum</span>
          </div>
          <div className="radar-legend-item">
            <div className="radar-legend-band" />
            <span>Range</span>
          </div>
        </div>
      </div>

      {/* Stats summary table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Category Summary</div>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Coverage</th>
              <th>Min</th>
              <th>Average</th>
              <th>Max</th>
            </tr>
          </thead>
          <tbody>
            {CAT_KEYS.map(key => {
              const s = stats[key];
              return (
                <tr key={key}>
                  <td style={{ fontWeight: 600 }}>{CATEGORIES[key].label}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-3)', fontSize: '0.85rem' }}>
                    {s.count}/{coveredCount}
                  </td>
                  <td><ScoreCell catKey={key} value={s.min} /></td>
                  <td>
                    {s.avg != null ? (
                      <span className="score-cell" style={{ '--score-opacity': 0.4 + (s.avg / MAX_LEVEL) * 0.6 }}>
                        <span className="score-num">{s.avg.toFixed(1)}</span>
                        <span className="score-name">{levelName(key, Math.round(s.avg))}</span>
                      </span>
                    ) : <span style={{ color: 'var(--text-3)' }}>—</span>}
                  </td>
                  <td><ScoreCell catKey={key} value={s.max} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Individual breakdown */}
      {rows.length > 0 && (
        <div className="card">
          <div className="card-title">Individual Breakdown</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="skills-table">
              <thead>
                <tr>
                  <th>Member</th>
                  {CAT_KEYS.map(k => <th key={k}>{CATEGORIES[k].label}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.member_id}>
                    <td>
                      <Link to={`/members/${r.member_id}`} className="member-link">{r.name}</Link>
                    </td>
                    {CAT_KEYS.map(k => (
                      <td key={k}><ScoreCell catKey={k} value={r[k]} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
