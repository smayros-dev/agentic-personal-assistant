#!/bin/bash

echo "🚀 Starting Agentic RAG Application (Local Mode)"
echo "================================================"
echo ""
echo "This script assumes Docker services are already running:"
echo "  docker-compose -f docker-compose.dev.yml up"
echo ""
echo "Starting backend and frontend locally with hot-reload..."
echo ""

# Open two terminal windows or tabs
echo "📋 Backend will start in one terminal"
echo "   Frontend will start in another"
echo ""

# Get the directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Press Enter to start backend (Terminal 1)..."
read

# Terminal 1: Backend
osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "cd $PROJECT_DIR/server && npm run dev"
end tell
APPLESCRIPT

sleep 2

echo "Press Enter to start frontend (Terminal 2)..."
read

# Terminal 2: Frontend
osascript <<APPLESCRIPT
tell application "Terminal"
  activate
  do script "cd $PROJECT_DIR/client && npm run dev"
end tell
APPLESCRIPT

echo ""
echo "✅ Services starting in separate terminals"
echo ""
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "Waiting for services to be ready..."
sleep 5

# Check health
echo ""
echo "🔍 Service Health Check:"
echo ""

# Check backend
if curl -s http://localhost:3001/healthz > /dev/null 2>&1; then
  echo "  ✓ Backend ready"
else
  echo "  ⏳ Backend still starting..."
fi

# Check if port 5173 is listening
if netstat -tuln | grep -q 5173; then
  echo "  ✓ Frontend ready"
else
  echo "  ⏳ Frontend still starting..."
fi

echo ""
echo "✅ Application is launching!"
echo "📱 Open browser: http://localhost:5173"
