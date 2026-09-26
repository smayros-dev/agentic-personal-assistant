#!/bin/bash

##############################################################################
#
#  🚀 AGENTIC PERSONAL ASSISTANT - Complete Startup
#
#  Starts ALL services in proper order:
#  1. Chroma Vector Database (port 8000)
#  2. Backend API Server (port 3001)  
#  3. Frontend React App (port 5173)
#
#  Usage: ./start.sh
#
##############################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Logging
LOG_DIR="/tmp/agentic-assistant-logs"
mkdir -p "$LOG_DIR"

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${BLUE}→${NC} $1"
}

# Cleanup function
cleanup() {
    echo ""
    echo ""
    print_warning "Stopping all services..."
    
    # Kill all background processes
    jobs -p 2>/dev/null | while read -r pid; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || true
        fi
    done
    
    sleep 2
    
    # Kill any remaining services
    pkill -f "chroma run" || true
    pkill -f "npm start" || true
    docker stop agentic-chroma 2>/dev/null || true
    
    print_success "All services stopped"
    echo ""
    print_info "Logs saved in: $LOG_DIR"
    echo ""
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

##############################################################################
# MAIN
##############################################################################

main() {
    clear
    
    print_header "🚀 AGENTIC PERSONAL ASSISTANT - FULL STACK STARTUP"
    
    echo "This script will start all services:"
    echo ""
    echo -e "  ${CYAN}1. Chroma Vector Database${NC}    (port 8000)"
    echo -e "  ${CYAN}2. Backend API Server${NC}        (port 3001)"
    echo -e "  ${CYAN}3. Frontend React App${NC}       (port 5173)"
    echo ""
    
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        exit 0
    fi
    
    echo ""
    
    # ===========================================================================
    # 1. Start Chroma
    # ===========================================================================
    
    print_header "📦 STEP 1: Starting Chroma Vector Database"
    
    if "$PROJECT_ROOT/start-chroma-service.sh"; then
        print_success "Chroma started successfully"
    else
        print_error "Chroma failed to start"
        exit 1
    fi
    
    # Keep Chroma running in background
    echo ""
    
    # ===========================================================================
    # 2. Start Backend
    # ===========================================================================
    
    print_header "🔧 STEP 2: Starting Backend API Server"
    
    # Run backend in background
    bash -c "cd '$PROJECT_ROOT' && ./start-backend-service.sh" &
    BACKEND_PID=$!
    
    # Wait a bit for backend to start
    sleep 10
    
    # Check if backend is running
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        print_success "Backend started successfully"
    else
        print_warning "Backend may still be starting (Ctrl+C if it fails)"
    fi
    
    echo ""
    
    # ===========================================================================
    # 3. Start Frontend
    # ===========================================================================
    
    print_header "🎨 STEP 3: Starting Frontend React App"
    
    # Run frontend in background
    bash -c "cd '$PROJECT_ROOT' && ./start-frontend-service.sh" &
    FRONTEND_PID=$!
    
    # Wait a bit for frontend to start
    sleep 10
    
    # Check if frontend is running
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        print_success "Frontend started successfully"
    else
        print_warning "Frontend may still be starting (Ctrl+C if it fails)"
    fi
    
    echo ""
    
    # ===========================================================================
    # All Services Running
    # ===========================================================================
    
    print_header "✅ ALL SERVICES STARTED"
    
    echo ""
    echo "🎉 Your application is ready!"
    echo ""
    echo "Services running at:"
    echo ""
    echo -e "  ${CYAN}📚 Chroma${NC}         → http://localhost:8000"
    echo -e "  ${CYAN}🔙 Backend${NC}       → http://localhost:3001"
    echo -e "  ${CYAN}🌐 Frontend${NC}      → http://localhost:5173"
    echo ""
    
    echo "View logs:"
    echo ""
    echo -e "  ${CYAN}tail -f $LOG_DIR/chroma.log${NC}"
    echo -e "  ${CYAN}tail -f $LOG_DIR/backend.log${NC}"
    echo -e "  ${CYAN}tail -f $LOG_DIR/frontend.log${NC}"
    echo ""
    
    echo "Next steps:"
    echo ""
    echo "  1. Open browser: http://localhost:5173"
    echo "  2. Upload a PDF document"
    echo "  3. Chat with your document"
    echo "  4. Verify RAG pipeline: python3 verify-rag.py"
    echo ""
    
    echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
    echo ""
    
    # Keep running
    wait
}

# Run main
main
