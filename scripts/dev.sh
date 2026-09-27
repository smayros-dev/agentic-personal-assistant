#!/bin/bash

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🚀 Development Mode - All Services                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT" || exit 1

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}⏹️  Stopping all services...${NC}"
    
    # Kill all background processes in this session
    jobs -p | xargs kill 2>/dev/null
    
    echo -e "${GREEN}✅ All services stopped${NC}"
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Check and start Chroma
echo -e "${YELLOW}📦 Checking Chroma...${NC}"
if ! curl -s http://localhost:8000/api/v1 > /dev/null 2>&1; then
    echo -e "${YELLOW}Starting Chroma...${NC}"
    
    # Try Python/Chroma first
    if command -v python3 &> /dev/null && python3 -c "import chromadb" 2>/dev/null; then
        echo -e "${BLUE}Using Python Chroma${NC}"
        chroma run --host localhost --port 8000 > /tmp/chroma.log 2>&1 &
        CHROMA_PID=$!
    # Try Docker
    elif command -v docker &> /dev/null; then
        echo -e "${BLUE}Using Docker Chroma${NC}"
        docker run --rm -p 8000:8000 chromadb/chroma > /tmp/chroma-docker.log 2>&1 &
        CHROMA_PID=$!
    else
        echo -e "${RED}❌ Neither Docker nor Python/Chroma found${NC}"
        echo "Please install: pip3 install chromadb OR docker"
        exit 1
    fi
    
    # Wait for Chroma to start
    echo -e "${YELLOW}Waiting for Chroma to start...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:8000/api/v1 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Chroma started${NC}"
            break
        fi
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Chroma startup timeout${NC}"
            exit 1
        fi
        sleep 1
    done
else
    echo -e "${GREEN}✅ Chroma already running${NC}"
fi

echo ""

# Start Backend
echo -e "${YELLOW}🔙 Starting Backend Server...${NC}"
cd "$PROJECT_ROOT/server" || exit 1
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend PID: $BACKEND_PID${NC}"

sleep 2

# Start Frontend
echo -e "${YELLOW}🌐 Starting Frontend...${NC}"
cd "$PROJECT_ROOT/client" || exit 1
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend PID: $FRONTEND_PID${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ All services started!                              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Services running on:"
echo -e "  📚 Chroma:   ${BLUE}http://localhost:8000${NC}"
echo -e "  🔙 Backend:  ${BLUE}http://localhost:3001${NC}"
echo -e "  🌐 Frontend: ${BLUE}http://localhost:5173${NC}"
echo ""
echo "Logs:"
echo "  Chroma:   tail -f /tmp/chroma.log"
echo "  Backend:  tail -f /tmp/backend.log"
echo "  Frontend: tail -f /tmp/frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for processes
wait
