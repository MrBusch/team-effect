# Team Effect

A local-first engineering team management app for engineering managers. Runs entirely on your machine — no cloud, no subscriptions, no data leaving your laptop.

![Team Effect](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Team roster** — track each person's role, level, manager, tenure, and promotion history
- **Compensation tracking** — local currency + USD equivalent salary and equity
- **Performance grades** — monthly 1–10 grades with trend indicators and history charts
- **Competency profiles** — radar chart scoring across Technology, Business, Influence, Process, People, and System dimensions
- **Team Skills overview** — aggregate radar chart showing team-wide average and min/max range per dimension
- **Development goals** — trackable goals with added/target/achieved dates and one-click check-off
- **1:1 notes** — timestamped log of meeting notes and action items per person
- **Org chart** — interactive tree view of the reporting structure including planned hires
- **Planned hires** — model future headcount with expected start dates and pipeline status
- **Team cost dashboard** — payroll overview by level with individual salary breakdown
- **Archive** — retain historical data for departed team members without cluttering the active roster
- **Private mode** — one-click toggle that hides salary, equity, and grades for screen sharing

## Requirements

- [Node.js](https://nodejs.org/) v18 or later
- macOS (for the desktop launcher — the web app itself works on any OS)

## Installation

```bash
git clone https://github.com/MrBusch/team-effect.git
cd team-effect
npm run install:all
```

## Usage

### Development (live reload)

```bash
npm run dev
```

Opens the API on `http://localhost:3001` and the Vite dev server on `http://localhost:5173`.

### Production (single process)

```bash
npm run build    # build the React frontend once
npm start        # serve everything from Express on http://localhost:3001
```

### macOS desktop launcher

After running `npm run build`, compile the launcher app onto your Desktop:

```bash
osacompile -o ~/Desktop/Team\ Effect.app launcher.applescript
```

Then double-click **Team Effect** on your Desktop to start the server and open the app in your browser. Double-clicking again while running lets you reopen the app or stop the server.

The launcher auto-rebuilds the frontend whenever source files have changed since the last build.

## Data storage

All data is stored in a local [SQLite](https://www.sqlite.org/) file at `server/team.db`. There is no remote database or API.

**To back up your data:** copy `server/team.db` anywhere safe.  
**To restore:** replace `server/team.db` with your backup and restart the server.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Recharts, ReactFlow |
| Backend | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| Charts | Recharts (line/radar), custom SVG (team radar) |

## Project structure

```
team-effect/
├── client/               # React frontend (Vite)
│   └── src/
│       ├── pages/        # TeamList, MemberDetail, OrgChart, …
│       ├── PrivacyContext.jsx
│       └── styles/
├── server/
│   └── index.js          # Express API + SQLite setup
├── start.sh              # macOS launcher script
├── stop.sh               # macOS stop script
└── package.json
```

## License

MIT
