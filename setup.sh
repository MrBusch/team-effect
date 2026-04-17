#!/bin/bash
# Creates the "Team Effect" macOS desktop launcher app.
# Run once after cloning: bash setup.sh

set -e

PROJECT="$(cd "$(dirname "$0")" && pwd)"
APP="$HOME/Desktop/Team Effect.app"
TMP="$(mktemp /tmp/team_effect_XXXX.applescript)"

cat > "$TMP" <<APPLESCRIPT
on run
  set projectDir to "$PROJECT"
  set isRunning to false
  try
    set r to do shell script "lsof -ti:3001"
    if r is not "" then set isRunning to true
  end try

  if isRunning then
    set choice to button returned of (display dialog "Team Effect is running." buttons {"Stop Server", "Open App"} default button "Open App" with title "Team Effect")
    if choice is "Open App" then
      do shell script "open http://localhost:3001"
    else
      do shell script "bash '" & projectDir & "/stop.sh'"
    end if
  else
    do shell script "bash '" & projectDir & "/start.sh' >> /tmp/team_effect.log 2>&1"
  end if
end run
APPLESCRIPT

osacompile -o "$APP" "$TMP"
rm "$TMP"

echo "✓ Team Effect.app created on your Desktop."
echo "  Double-click it to start the server and open the app."
