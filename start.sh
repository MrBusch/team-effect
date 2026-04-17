#!/bin/bash

PROJECT="$(cd "$(dirname "$0")" && pwd)"
LOG="/tmp/team_effect_server.log"
PID_FILE="/tmp/team_effect.pid"
PORT=3001

# ── Resolve Node ──────────────────────────────────────────────────────────────
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

if ! command -v node &>/dev/null; then
  osascript -e 'display alert "Team Effect" message "Could not find Node.js. Make sure it is installed and try again." as warning'
  exit 1
fi

# ── Already running? Just open the browser ────────────────────────────────────
if lsof -ti:$PORT &>/dev/null; then
  open "http://localhost:$PORT"
  exit 0
fi

# ── Build frontend if missing or source has changed ──────────────────────────
DIST="$PROJECT/client/dist"
NEEDS_BUILD=false
if [ ! -d "$DIST" ]; then
  NEEDS_BUILD=true
elif find "$PROJECT/client/src" "$PROJECT/client/index.html" -newer "$DIST/index.html" -print -quit 2>/dev/null | grep -q .; then
  NEEDS_BUILD=true
fi
if [ "$NEEDS_BUILD" = true ]; then
  osascript -e 'display notification "Updating frontend…" with title "Team Effect"'
  cd "$PROJECT" && npm run build >> "$LOG" 2>&1
fi

# ── Start server ──────────────────────────────────────────────────────────────
cd "$PROJECT"
nohup node server/index.js >> "$LOG" 2>&1 &
echo $! > "$PID_FILE"

# ── Wait for server (up to 10 s) ─────────────────────────────────────────────
for i in $(seq 1 20); do
  if curl -sf "http://localhost:$PORT/api/members" &>/dev/null; then
    break
  fi
  sleep 0.5
done

# ── Open browser ─────────────────────────────────────────────────────────────
open "http://localhost:$PORT"
