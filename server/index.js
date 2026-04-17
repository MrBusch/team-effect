const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ─── Database setup ──────────────────────────────────────────────────────────

const DB_PATH = path.join(__dirname, 'team.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    name               TEXT    NOT NULL,
    position           TEXT    NOT NULL DEFAULT '',
    level              TEXT    NOT NULL DEFAULT '',
    reporting_to       INTEGER REFERENCES members(id) ON DELETE SET NULL,
    salary_local       REAL    NOT NULL DEFAULT 0,
    local_currency     TEXT    NOT NULL DEFAULT 'USD',
    salary_usd         REAL    NOT NULL DEFAULT 0,
    equity             TEXT    NOT NULL DEFAULT '',
    joined_date        TEXT    NOT NULL DEFAULT '',
    last_promoted_date TEXT,
    promotion_steps    TEXT    NOT NULL DEFAULT '',
    notes              TEXT    NOT NULL DEFAULT '',
    archived           INTEGER NOT NULL DEFAULT 0,
    archived_date      TEXT,
    archived_reason    TEXT
  );

  CREATE TABLE IF NOT EXISTS grades (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    grade     INTEGER NOT NULL CHECK(grade >= 1 AND grade <= 10),
    date      TEXT    NOT NULL,
    notes     TEXT
  );

  CREATE TABLE IF NOT EXISTS planned_hires (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT    NOT NULL,
    position            TEXT    NOT NULL DEFAULT '',
    level               TEXT    NOT NULL DEFAULT '',
    reporting_to        INTEGER REFERENCES members(id) ON DELETE SET NULL,
    expected_start_date TEXT    NOT NULL DEFAULT '',
    status              TEXT    NOT NULL DEFAULT 'planned'
                          CHECK(status IN ('planned','interviewing','offer_extended','accepted')),
    notes               TEXT    NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS competencies (
    member_id  INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
    technology INTEGER CHECK(technology BETWEEN 1 AND 5),
    business   INTEGER CHECK(business   BETWEEN 1 AND 5),
    influence  INTEGER CHECK(influence  BETWEEN 1 AND 5),
    process    INTEGER CHECK(process    BETWEEN 1 AND 5),
    people     INTEGER CHECK(people     BETWEEN 1 AND 5),
    system     INTEGER CHECK(system     BETWEEN 1 AND 5)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id     INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    title         TEXT    NOT NULL,
    description   TEXT    NOT NULL DEFAULT '',
    added_date    TEXT    NOT NULL,
    target_date   TEXT,
    achieved_date TEXT,
    status        TEXT    NOT NULL DEFAULT 'active' CHECK(status IN ('active','achieved'))
  );

  CREATE TABLE IF NOT EXISTS one_on_ones (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id    INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    date         TEXT    NOT NULL,
    notes        TEXT    NOT NULL DEFAULT '',
    action_items TEXT    NOT NULL DEFAULT ''
  );
`);

// ─── Seed data ────────────────────────────────────────────────────────────────

const seedIfEmpty = db.transaction(() => {
  const count = db.prepare('SELECT COUNT(*) as n FROM members').get().n;
  if (count > 0) return;

  // Insert members
  const insertMember = db.prepare(`
    INSERT INTO members (name, position, level, reporting_to, salary_local, local_currency, salary_usd, equity, joined_date, last_promoted_date, promotion_steps, notes)
    VALUES (@name, @position, @level, @reporting_to, @salary_local, @local_currency, @salary_usd, @equity, @joined_date, @last_promoted_date, @promotion_steps, @notes)
  `);

  const alice = insertMember.run({
    name: 'Alice Chen',
    position: 'Engineering Manager',
    level: 'M2',
    reporting_to: null,
    salary_local: 180000,
    local_currency: 'USD',
    salary_usd: 180000,
    equity: '40,000 options @ $2.50 strike, 2-year cliff',
    joined_date: '2020-03-15',
    last_promoted_date: '2022-06-01',
    promotion_steps: 'N/A — already at current target level.',
    notes: 'Technical lead before transitioning to EM. Strong systems background. Excellent communicator.',
  });

  const bob = insertMember.run({
    name: 'Bob Okafor',
    position: 'Staff Engineer',
    level: 'L6',
    reporting_to: alice.lastInsertRowid,
    salary_local: 165000,
    local_currency: 'USD',
    salary_usd: 165000,
    equity: '30,000 options @ $2.50 strike',
    joined_date: '2020-08-01',
    last_promoted_date: '2023-01-15',
    promotion_steps: '- Drive org-wide technical initiative\n- Mentor 2 senior engineers to independent ownership\n- Publish internal RFC adopted by 2+ teams',
    notes: 'Owns the platform architecture. Deeply trusted by the team. Occasional communication gaps with stakeholders.',
  });

  const carla = insertMember.run({
    name: 'Carla Reyes',
    position: 'Senior Software Engineer',
    level: 'L5',
    reporting_to: alice.lastInsertRowid,
    salary_local: 145000,
    local_currency: 'USD',
    salary_usd: 145000,
    equity: '20,000 options @ $2.50 strike',
    joined_date: '2021-05-10',
    last_promoted_date: '2023-07-01',
    promotion_steps: '- Lead delivery of a cross-team project end-to-end\n- Demonstrate consistent scope estimation accuracy\n- Begin informal mentorship of L4 engineers',
    notes: 'Frontend specialist, increasingly taking on backend work. Strong ownership mindset.',
  });

  const david = insertMember.run({
    name: 'David Kim',
    position: 'Software Engineer',
    level: 'L4',
    reporting_to: bob.lastInsertRowid,
    salary_local: 120000,
    local_currency: 'USD',
    salary_usd: 120000,
    equity: '10,000 options @ $2.50 strike',
    joined_date: '2022-09-19',
    last_promoted_date: null,
    promotion_steps: '- Independently own and deliver a medium-complexity project\n- Reduce review cycle time: aim for <2 rounds per PR\n- Write and share 2 technical deep-dives internally',
    notes: 'High potential. Still building confidence in design decisions. Responds well to feedback.',
  });

  const elena = insertMember.run({
    name: 'Elena Vasquez',
    position: 'Software Engineer',
    level: 'L3',
    reporting_to: carla.lastInsertRowid,
    salary_local: 95000,
    local_currency: 'EUR',
    salary_usd: 103000,
    equity: '5,000 options @ $2.50 strike',
    joined_date: '2023-04-03',
    last_promoted_date: null,
    promotion_steps: '- Complete first solo feature end-to-end\n- Build consistent PR quality over 3 months\n- Proactively unblock self before escalating',
    notes: 'Remote from Barcelona. Strong academic background. Still ramping on production systems.',
  });

  // Grades
  const insertGrade = db.prepare(`
    INSERT INTO grades (member_id, grade, date, notes) VALUES (@member_id, @grade, @date, @notes)
  `);

  insertGrade.run({ member_id: bob.lastInsertRowid, grade: 7, date: '2024-01-15', notes: 'Good output but missed one deadline.' });
  insertGrade.run({ member_id: bob.lastInsertRowid, grade: 8, date: '2024-04-15', notes: 'Strong Q1 delivery on platform refactor.' });
  insertGrade.run({ member_id: bob.lastInsertRowid, grade: 8, date: '2024-07-15', notes: null });
  insertGrade.run({ member_id: bob.lastInsertRowid, grade: 9, date: '2024-10-15', notes: 'Exceptional leadership on infra migration.' });

  insertGrade.run({ member_id: carla.lastInsertRowid, grade: 6, date: '2024-01-15', notes: 'Needs to improve cross-team coordination.' });
  insertGrade.run({ member_id: carla.lastInsertRowid, grade: 7, date: '2024-04-15', notes: null });
  insertGrade.run({ member_id: carla.lastInsertRowid, grade: 8, date: '2024-07-15', notes: 'Big improvement on scoping and delivery.' });
  insertGrade.run({ member_id: carla.lastInsertRowid, grade: 8, date: '2024-10-15', notes: null });

  insertGrade.run({ member_id: david.lastInsertRowid, grade: 5, date: '2024-01-15', notes: 'Still ramping on codebase.' });
  insertGrade.run({ member_id: david.lastInsertRowid, grade: 6, date: '2024-04-15', notes: 'Improving velocity.' });
  insertGrade.run({ member_id: david.lastInsertRowid, grade: 7, date: '2024-07-15', notes: 'Shipped first solo project on time.' });
  insertGrade.run({ member_id: david.lastInsertRowid, grade: 7, date: '2024-10-15', notes: null });

  insertGrade.run({ member_id: elena.lastInsertRowid, grade: 5, date: '2024-04-15', notes: 'Early days, still ramping.' });
  insertGrade.run({ member_id: elena.lastInsertRowid, grade: 6, date: '2024-07-15', notes: 'Growing confidence on the codebase.' });
  insertGrade.run({ member_id: elena.lastInsertRowid, grade: 6, date: '2024-10-15', notes: null });

  // Planned hires
  const insertHire = db.prepare(`
    INSERT INTO planned_hires (name, position, level, reporting_to, expected_start_date, status, notes)
    VALUES (@name, @position, @level, @reporting_to, @expected_start_date, @status, @notes)
  `);

  insertHire.run({
    name: 'Senior Backend Engineer (TBH)',
    position: 'Senior Software Engineer',
    level: 'L5',
    reporting_to: bob.lastInsertRowid,
    expected_start_date: '2025-03-01',
    status: 'interviewing',
    notes: 'Focus on distributed systems. 3 candidates in pipeline.',
  });

  insertHire.run({
    name: 'Frontend Engineer (TBH)',
    position: 'Software Engineer',
    level: 'L4',
    reporting_to: carla.lastInsertRowid,
    expected_start_date: '2025-04-15',
    status: 'planned',
    notes: 'Backfill for expected team growth. React/TypeScript required.',
  });
});

// ─── Migrations ───────────────────────────────────────────────────────────────

const existingCols = db.prepare('PRAGMA table_info(members)').all().map(c => c.name);
if (!existingCols.includes('archived')) {
  db.exec('ALTER TABLE members ADD COLUMN archived INTEGER NOT NULL DEFAULT 0');
}
if (!existingCols.includes('archived_date')) {
  db.exec('ALTER TABLE members ADD COLUMN archived_date TEXT');
}
if (!existingCols.includes('archived_reason')) {
  db.exec('ALTER TABLE members ADD COLUMN archived_reason TEXT');
}

seedIfEmpty();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notFound(res, entity = 'Resource') {
  return res.status(404).json({ error: `${entity} not found` });
}

// ─── Members routes ───────────────────────────────────────────────────────────

app.get('/api/members', (req, res) => {
  const members = db.prepare(`
    SELECT
      m.*,
      mgr.name AS manager_name,
      (SELECT grade FROM grades WHERE member_id = m.id ORDER BY date DESC LIMIT 1)          AS latest_grade,
      (SELECT date  FROM grades WHERE member_id = m.id ORDER BY date DESC LIMIT 1)          AS latest_grade_date,
      (SELECT grade FROM grades WHERE member_id = m.id ORDER BY date DESC LIMIT 1 OFFSET 1) AS prev_grade
    FROM members m
    LEFT JOIN members mgr ON mgr.id = m.reporting_to
    WHERE m.archived = 0
    ORDER BY m.name ASC
  `).all();
  res.json(members);
});

app.get('/api/archive', (req, res) => {
  const members = db.prepare(`
    SELECT
      m.*,
      mgr.name AS manager_name,
      (SELECT grade FROM grades WHERE member_id = m.id ORDER BY date DESC LIMIT 1) AS latest_grade
    FROM members m
    LEFT JOIN members mgr ON mgr.id = m.reporting_to
    WHERE m.archived = 1
    ORDER BY m.archived_date DESC, m.name ASC
  `).all();
  res.json(members);
});

app.post('/api/members/:id/archive', (req, res) => {
  const existing = db.prepare('SELECT id FROM members WHERE id = ? AND archived = 0').get(req.params.id);
  if (!existing) return notFound(res, 'Member');
  const { archived_date, archived_reason = '' } = req.body;
  db.prepare(`
    UPDATE members SET archived = 1, archived_date = @archived_date, archived_reason = @archived_reason
    WHERE id = @id
  `).run({ id: req.params.id, archived_date: archived_date || null, archived_reason: archived_reason || null });
  const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  res.json(updated);
});

app.post('/api/members/:id/unarchive', (req, res) => {
  const existing = db.prepare('SELECT id FROM members WHERE id = ? AND archived = 1').get(req.params.id);
  if (!existing) return notFound(res, 'Member');
  db.prepare(`
    UPDATE members SET archived = 0, archived_date = NULL, archived_reason = NULL WHERE id = ?
  `).run(req.params.id);
  const updated = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  res.json(updated);
});

app.post('/api/members', (req, res) => {
  const {
    name, position = '', level = '', reporting_to = null,
    salary_local = 0, local_currency = 'USD', salary_usd = 0,
    equity = '', joined_date = '', last_promoted_date = null,
    promotion_steps = '', notes = '',
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const result = db.prepare(`
    INSERT INTO members (name, position, level, reporting_to, salary_local, local_currency, salary_usd, equity, joined_date, last_promoted_date, promotion_steps, notes)
    VALUES (@name, @position, @level, @reporting_to, @salary_local, @local_currency, @salary_usd, @equity, @joined_date, @last_promoted_date, @promotion_steps, @notes)
  `).run({ name: name.trim(), position, level, reporting_to, salary_local, local_currency, salary_usd, equity, joined_date, last_promoted_date, promotion_steps, notes });

  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(member);
});

app.get('/api/members/:id', (req, res) => {
  const member = db.prepare(`
    SELECT m.*, mgr.name AS manager_name
    FROM members m
    LEFT JOIN members mgr ON mgr.id = m.reporting_to
    WHERE m.id = ?
  `).get(req.params.id);
  if (!member) return notFound(res, 'Member');
  res.json(member);
});

app.put('/api/members/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id);
  if (!existing) return notFound(res, 'Member');

  const {
    name, position, level, reporting_to,
    salary_local, local_currency, salary_usd,
    equity, joined_date, last_promoted_date,
    promotion_steps, notes,
  } = req.body;

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: 'name cannot be empty' });
  }

  // Prevent self-reference
  if (reporting_to !== undefined && Number(reporting_to) === Number(req.params.id)) {
    return res.status(400).json({ error: 'A member cannot report to themselves' });
  }

  db.prepare(`
    UPDATE members SET
      name               = COALESCE(@name, name),
      position           = COALESCE(@position, position),
      level              = COALESCE(@level, level),
      reporting_to       = @reporting_to,
      salary_local       = COALESCE(@salary_local, salary_local),
      local_currency     = COALESCE(@local_currency, local_currency),
      salary_usd         = COALESCE(@salary_usd, salary_usd),
      equity             = COALESCE(@equity, equity),
      joined_date        = COALESCE(@joined_date, joined_date),
      last_promoted_date = @last_promoted_date,
      promotion_steps    = COALESCE(@promotion_steps, promotion_steps),
      notes              = COALESCE(@notes, notes)
    WHERE id = @id
  `).run({
    id: req.params.id,
    name: name?.trim() ?? null,
    position: position ?? null,
    level: level ?? null,
    reporting_to: reporting_to !== undefined ? (reporting_to || null) : db.prepare('SELECT reporting_to FROM members WHERE id = ?').get(req.params.id).reporting_to,
    salary_local: salary_local ?? null,
    local_currency: local_currency ?? null,
    salary_usd: salary_usd ?? null,
    equity: equity ?? null,
    joined_date: joined_date ?? null,
    last_promoted_date: last_promoted_date !== undefined ? (last_promoted_date || null) : db.prepare('SELECT last_promoted_date FROM members WHERE id = ?').get(req.params.id).last_promoted_date,
    promotion_steps: promotion_steps ?? null,
    notes: notes ?? null,
  });

  const updated = db.prepare(`
    SELECT m.*, mgr.name AS manager_name
    FROM members m
    LEFT JOIN members mgr ON mgr.id = m.reporting_to
    WHERE m.id = ?
  `).get(req.params.id);
  res.json(updated);
});

app.delete('/api/members/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id);
  if (!existing) return notFound(res, 'Member');
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Grades routes ────────────────────────────────────────────────────────────

app.get('/api/members/:id/grades', (req, res) => {
  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id);
  if (!member) return notFound(res, 'Member');
  const grades = db.prepare('SELECT * FROM grades WHERE member_id = ? ORDER BY date ASC').all(req.params.id);
  res.json(grades);
});

app.post('/api/members/:id/grades', (req, res) => {
  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id);
  if (!member) return notFound(res, 'Member');

  const { grade, date, notes = null } = req.body;

  if (grade === undefined || grade === null) {
    return res.status(400).json({ error: 'grade is required' });
  }
  const g = Number(grade);
  if (!Number.isInteger(g) || g < 1 || g > 10) {
    return res.status(400).json({ error: 'grade must be an integer between 1 and 10' });
  }
  if (!date) {
    return res.status(400).json({ error: 'date is required' });
  }

  const result = db.prepare(`
    INSERT INTO grades (member_id, grade, date, notes) VALUES (?, ?, ?, ?)
  `).run(req.params.id, g, date, notes || null);

  const newGrade = db.prepare('SELECT * FROM grades WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newGrade);
});

app.delete('/api/grades/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM grades WHERE id = ?').get(req.params.id);
  if (!existing) return notFound(res, 'Grade');
  db.prepare('DELETE FROM grades WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Planned hires routes ─────────────────────────────────────────────────────

app.get('/api/hires', (req, res) => {
  const hires = db.prepare(`
    SELECT h.*, m.name AS manager_name
    FROM planned_hires h
    LEFT JOIN members m ON m.id = h.reporting_to
    ORDER BY h.expected_start_date ASC
  `).all();
  res.json(hires);
});

app.post('/api/hires', (req, res) => {
  const {
    name, position = '', level = '', reporting_to = null,
    expected_start_date = '', status = 'planned', notes = '',
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }

  const validStatuses = ['planned', 'interviewing', 'offer_extended', 'accepted'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const result = db.prepare(`
    INSERT INTO planned_hires (name, position, level, reporting_to, expected_start_date, status, notes)
    VALUES (@name, @position, @level, @reporting_to, @expected_start_date, @status, @notes)
  `).run({ name: name.trim(), position, level, reporting_to, expected_start_date, status, notes });

  const hire = db.prepare(`
    SELECT h.*, m.name AS manager_name FROM planned_hires h
    LEFT JOIN members m ON m.id = h.reporting_to
    WHERE h.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(hire);
});

app.get('/api/hires/:id', (req, res) => {
  const hire = db.prepare(`
    SELECT h.*, m.name AS manager_name FROM planned_hires h
    LEFT JOIN members m ON m.id = h.reporting_to
    WHERE h.id = ?
  `).get(req.params.id);
  if (!hire) return notFound(res, 'Hire');
  res.json(hire);
});

app.put('/api/hires/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM planned_hires WHERE id = ?').get(req.params.id);
  if (!existing) return notFound(res, 'Hire');

  const { name, position, level, reporting_to, expected_start_date, status, notes } = req.body;

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ error: 'name cannot be empty' });
  }

  const validStatuses = ['planned', 'interviewing', 'offer_extended', 'accepted'];
  if (status !== undefined && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  const cur = db.prepare('SELECT * FROM planned_hires WHERE id = ?').get(req.params.id);

  db.prepare(`
    UPDATE planned_hires SET
      name                = @name,
      position            = @position,
      level               = @level,
      reporting_to        = @reporting_to,
      expected_start_date = @expected_start_date,
      status              = @status,
      notes               = @notes
    WHERE id = @id
  `).run({
    id: req.params.id,
    name: name?.trim() ?? cur.name,
    position: position ?? cur.position,
    level: level ?? cur.level,
    reporting_to: reporting_to !== undefined ? (reporting_to || null) : cur.reporting_to,
    expected_start_date: expected_start_date ?? cur.expected_start_date,
    status: status ?? cur.status,
    notes: notes ?? cur.notes,
  });

  const updated = db.prepare(`
    SELECT h.*, m.name AS manager_name FROM planned_hires h
    LEFT JOIN members m ON m.id = h.reporting_to
    WHERE h.id = ?
  `).get(req.params.id);
  res.json(updated);
});

app.delete('/api/hires/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM planned_hires WHERE id = ?').get(req.params.id);
  if (!existing) return notFound(res, 'Hire');
  db.prepare('DELETE FROM planned_hires WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Competencies routes ───────────────────────────────────────────────────────

app.get('/api/competencies', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, m.name FROM competencies c
    JOIN members m ON m.id = c.member_id
    WHERE m.archived = 0
    ORDER BY m.name ASC
  `).all();
  res.json(rows);
});

app.get('/api/members/:id/competencies', (req, res) => {
  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id);
  if (!member) return notFound(res, 'Member');
  const row = db.prepare('SELECT * FROM competencies WHERE member_id = ?').get(req.params.id);
  res.json(row || { member_id: Number(req.params.id), technology: null, business: null, influence: null, process: null, people: null, system: null });
});

app.put('/api/members/:id/competencies', (req, res) => {
  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id);
  if (!member) return notFound(res, 'Member');
  const { technology, business, influence, process, people, system } = req.body;
  const val = (v) => (v != null && v !== '' ? Number(v) : null);
  db.prepare(`
    INSERT INTO competencies (member_id, technology, business, influence, process, people, system)
    VALUES (@member_id, @technology, @business, @influence, @process, @people, @system)
    ON CONFLICT(member_id) DO UPDATE SET
      technology = @technology, business = @business, influence = @influence,
      process    = @process,    people   = @people,   system    = @system
  `).run({ member_id: req.params.id, technology: val(technology), business: val(business), influence: val(influence), process: val(process), people: val(people), system: val(system) });
  res.json(db.prepare('SELECT * FROM competencies WHERE member_id = ?').get(req.params.id));
});

// ─── Goals routes ─────────────────────────────────────────────────────────────

app.get('/api/members/:id/goals', (req, res) => {
  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id);
  if (!member) return notFound(res, 'Member');
  const rows = db.prepare(`
    SELECT * FROM goals WHERE member_id = ?
    ORDER BY status ASC, COALESCE(target_date, '9999') ASC, added_date DESC
  `).all(req.params.id);
  res.json(rows);
});

app.post('/api/members/:id/goals', (req, res) => {
  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id);
  if (!member) return notFound(res, 'Member');
  const { title, description = '', added_date, target_date = null } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
  if (!added_date) return res.status(400).json({ error: 'added_date is required' });
  const result = db.prepare(`
    INSERT INTO goals (member_id, title, description, added_date, target_date)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, title.trim(), description, added_date, target_date || null);
  res.status(201).json(db.prepare('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/goals/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  if (!row) return notFound(res, 'Goal');
  const { title, description, added_date, target_date } = req.body;
  if (title !== undefined && !title.trim()) return res.status(400).json({ error: 'title cannot be empty' });
  db.prepare(`
    UPDATE goals SET
      title       = COALESCE(@title, title),
      description = COALESCE(@description, description),
      added_date  = COALESCE(@added_date, added_date),
      target_date = @target_date
    WHERE id = @id
  `).run({
    id: req.params.id,
    title: title?.trim() ?? null,
    description: description ?? null,
    added_date: added_date ?? null,
    target_date: target_date !== undefined ? (target_date || null) : row.target_date,
  });
  res.json(db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id));
});

app.post('/api/goals/:id/achieve', (req, res) => {
  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  if (!row) return notFound(res, 'Goal');
  const { achieved_date } = req.body;
  db.prepare(`UPDATE goals SET status = 'achieved', achieved_date = ? WHERE id = ?`)
    .run(achieved_date || new Date().toISOString().slice(0, 10), req.params.id);
  res.json(db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id));
});

app.post('/api/goals/:id/unachieve', (req, res) => {
  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  if (!row) return notFound(res, 'Goal');
  db.prepare(`UPDATE goals SET status = 'active', achieved_date = NULL WHERE id = ?`).run(req.params.id);
  res.json(db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id));
});

app.delete('/api/goals/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM goals WHERE id = ?').get(req.params.id);
  if (!row) return notFound(res, 'Goal');
  db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── 1:1 routes ───────────────────────────────────────────────────────────────

app.get('/api/members/:id/one-on-ones', (req, res) => {
  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id);
  if (!member) return notFound(res, 'Member');
  const rows = db.prepare('SELECT * FROM one_on_ones WHERE member_id = ? ORDER BY date DESC').all(req.params.id);
  res.json(rows);
});

app.post('/api/members/:id/one-on-ones', (req, res) => {
  const member = db.prepare('SELECT id FROM members WHERE id = ?').get(req.params.id);
  if (!member) return notFound(res, 'Member');
  const { date, notes = '', action_items = '' } = req.body;
  if (!date) return res.status(400).json({ error: 'date is required' });
  if (!notes.trim()) return res.status(400).json({ error: 'notes are required' });
  const result = db.prepare(
    'INSERT INTO one_on_ones (member_id, date, notes, action_items) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, date, notes, action_items);
  res.status(201).json(db.prepare('SELECT * FROM one_on_ones WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/one-on-ones/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM one_on_ones WHERE id = ?').get(req.params.id);
  if (!row) return notFound(res, '1:1');
  const { date, notes, action_items } = req.body;
  if (notes !== undefined && !notes.trim()) return res.status(400).json({ error: 'notes cannot be empty' });
  db.prepare(`
    UPDATE one_on_ones SET
      date         = COALESCE(@date, date),
      notes        = COALESCE(@notes, notes),
      action_items = COALESCE(@action_items, action_items)
    WHERE id = @id
  `).run({ id: req.params.id, date: date ?? null, notes: notes ?? null, action_items: action_items ?? null });
  res.json(db.prepare('SELECT * FROM one_on_ones WHERE id = ?').get(req.params.id));
});

app.delete('/api/one-on-ones/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM one_on_ones WHERE id = ?').get(req.params.id);
  if (!row) return notFound(res, '1:1');
  db.prepare('DELETE FROM one_on_ones WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Serve built frontend ─────────────────────────────────────────────────────

const fs = require('fs');
const distPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Team Effect API running on http://localhost:${PORT}`);
});
