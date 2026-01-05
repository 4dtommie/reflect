#!/bin/bash

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🛑 Stopping Reflectie development environment...${NC}"

# Stop Docker containers first (cleanly stops the process in the DB terminal)
cd "$PROJECT_DIR"
docker compose down 2>/dev/null

# Kill any vite processes
pkill -f "vite dev" 2>/dev/null

# Give processes a moment to exit
sleep 1

# Now close Reflectie terminal windows (processes should be stopped)
osascript <<'APPLESCRIPT'
tell application "Terminal"
  set windowList to every window
  repeat with w in windowList
    try
      if name of w contains "Reflectie" then
        close w saving no
      end if
    end try
  end repeat
end tell
APPLESCRIPT

echo -e "${GREEN}✅ All stopped!${NC}"
