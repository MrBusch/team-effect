#!/bin/bash

PID_FILE="/tmp/team_effect.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill "$PID" 2>/dev/null; then
    rm "$PID_FILE"
    osascript -e 'display notification "Server stopped." with title "Team Effect"'
  else
    rm "$PID_FILE"
    osascript -e 'display notification "Server was not running." with title "Team Effect"'
  fi
else
  # Fallback: find and kill by port
  PID=$(lsof -ti:3001 2>/dev/null)
  if [ -n "$PID" ]; then
    kill "$PID"
    osascript -e 'display notification "Server stopped." with title "Team Effect"'
  else
    osascript -e 'display notification "Server was not running." with title "Team Effect"'
  fi
fi
