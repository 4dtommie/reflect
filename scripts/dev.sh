#!/bin/bash

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper function to open a named terminal window
open_terminal() {
  local title="$1"
  local cmd="$2"
  
  osascript - "$title" "$cmd" <<'APPLESCRIPT'
on run argv
  set windowTitle to item 1 of argv
  set shellCmd to item 2 of argv
  tell application "Terminal"
    activate
    do script shellCmd
    set custom title of front window to windowTitle
  end tell
end run
APPLESCRIPT
}

# Helper function to close Reflectie terminal windows
close_reflectie_windows() {
  # Stop Docker and Vite first so processes exit cleanly
  cd "$PROJECT_DIR"
  docker compose down 2>/dev/null
  pkill -f "vite dev" 2>/dev/null
  sleep 1
  
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
}

echo -e "${BLUE}🚀 Starting Reflectie development environment...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Docker is not running. Please start Docker Desktop and try again.${NC}"
  exit 1
fi

# Close any existing Reflectie terminal windows
echo -e "${BLUE}🧹 Closing existing terminal windows...${NC}"
close_reflectie_windows 2>/dev/null

# Give a moment for ports to be released
sleep 1

# Start the database in a new named terminal window
echo -e "${GREEN}📦 Opening database terminal...${NC}"
open_terminal "Reflectie DB" "cd ${PROJECT_DIR} && docker compose up"

# Wait for database to be healthy
echo -e "${BLUE}⏳ Waiting for database to be ready...${NC}"
sleep 3  # Give Docker a moment to start
until docker compose exec -T postgres pg_isready -U reflectie -d reflectie > /dev/null 2>&1; do
  sleep 1
done
echo -e "${GREEN}✅ Database is ready!${NC}"

# Run migrations
echo -e "${BLUE}🔄 Running database migrations...${NC}"
npx prisma migrate deploy

# Generate Prisma client
echo -e "${BLUE}🔧 Generating Prisma client...${NC}"
npx prisma generate

# Seed the database
echo -e "${BLUE}🌱 Seeding database...${NC}"
npm run seed

echo -e "${GREEN}✅ Database setup complete!${NC}"

# Start Vite dev server in a new named terminal window
echo -e "${GREEN}🌐 Opening web server terminal...${NC}"
open_terminal "Reflectie Web" "cd ${PROJECT_DIR} && npx vite dev --open"

echo ""
echo -e "${GREEN}✅ All done! Two terminal windows are now running:${NC}"
echo -e "   ${BLUE}📦 Reflectie DB${NC}  - Docker PostgreSQL logs"
echo -e "   ${BLUE}🌐 Reflectie Web${NC} - Vite dev server"
echo ""
echo -e "${YELLOW}💡 Tip: Use 'npm run dev:stop' to shut everything down${NC}"
