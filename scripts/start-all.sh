#!/bin/bash

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🚀 Full Application Starter                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to start a service in a new terminal
start_service() {
    local service_name=$1
    local service_dir=$2
    local service_command=$3
    
    echo -e "${YELLOW}Starting ${service_name}...${NC}"
    
    # Check if running on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript <<EOF
tell application "Terminal"
    activate
    tell application "System Events" to keystroke "n" using command down
    delay 0.5
    do script "cd '${service_dir}' && ${service_command}" in front window
end tell
EOF
    else
        # For Linux/WSL, use gnome-terminal or xterm
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal -- bash -c "cd '${service_dir}' && ${service_command}; bash"
        elif command -v xterm &> /dev/null; then
            xterm -e "cd '${service_dir}' && ${service_command}; bash" &
        else
            echo -e "${YELLOW}⚠️  Could not find terminal emulator${NC}"
            echo "Please manually run: cd ${service_dir} && ${service_command}"
        fi
    fi
    
    sleep 2
}

# Check if Chroma is running
echo "Checking Chroma..."
if ! curl -s http://localhost:8000/api/v1 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Chroma not running, starting...${NC}"
    start_service "Chroma" "$PROJECT_ROOT" "bash scripts/start-chroma.sh"
else
    echo -e "${GREEN}✅ Chroma already running${NC}"
fi

sleep 2

# Start Backend
echo ""
echo -e "${YELLOW}Starting Backend Server...${NC}"
start_service "Backend" "$PROJECT_ROOT/server" "npm run dev"

sleep 3

# Start Frontend
echo ""
echo -e "${YELLOW}Starting Frontend...${NC}"
start_service "Frontend" "$PROJECT_ROOT/client" "npm run dev"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ All services started in separate terminals!        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Services running on:"
echo -e "  📚 Chroma: ${BLUE}http://localhost:8000${NC}"
echo -e "  🔙 Backend: ${BLUE}http://localhost:3001${NC}"
echo -e "  🌐 Frontend: ${BLUE}http://localhost:5173${NC}"
echo ""
echo "To stop all services, close each terminal window"
echo ""
