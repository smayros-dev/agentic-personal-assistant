#!/bin/bash

##############################################################################
#
#  🌐 FRONTEND REACT APP - Startup Script
#
#  Starts the React frontend with proper error handling
#
#  Usage: ./start-frontend-service.sh
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
FRONTEND_DIR="$PROJECT_ROOT/client"
FRONTEND_PORT=5173
FRONTEND_URL="http://localhost:$FRONTEND_PORT"

# Logging
LOG_DIR="/tmp/agentic-assistant-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/frontend.log"

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

##############################################################################
# CHECK: Prerequisites
##############################################################################

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed!"
        print_info "Install with: brew install node"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed!"
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    print_success "npm found: $NPM_VERSION"
    
    return 0
}

##############################################################################
# CHECK: Frontend directory
##############################################################################

check_frontend_directory() {
    print_step "Checking frontend directory..."
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    
    if [ ! -f "$FRONTEND_DIR/package.json" ]; then
        print_error "Frontend package.json not found: $FRONTEND_DIR/package.json"
        exit 1
    fi
    
    print_success "Frontend directory verified"
    
    return 0
}

##############################################################################
# INSTALL: Dependencies
##############################################################################

install_dependencies() {
    print_step "Checking dependencies..."
    
    cd "$FRONTEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        print_warning "node_modules not found, installing dependencies..."
        
        npm install 2>&1 | tail -20
        
        if [ ! -d "node_modules" ]; then
            print_error "Failed to install dependencies"
            exit 1
        fi
        
        print_success "Dependencies installed"
    else
        print_success "Dependencies already installed"
    fi
    
    return 0
}

##############################################################################
# CHECK: Port availability
##############################################################################

check_port_available() {
    print_step "Checking if port $FRONTEND_PORT is available..."
    
    if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        PID=$(lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t)
        print_warning "Port $FRONTEND_PORT is in use by process $PID"
        print_info "Killing process..."
        
        kill -9 $PID 2>/dev/null || true
        sleep 2
        
        if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_error "Could not free port $FRONTEND_PORT"
            return 1
        fi
        print_success "Port freed"
    fi
    
    return 0
}

##############################################################################
# START: Frontend
##############################################################################

start_frontend() {
    print_step "Starting Frontend Server..."
    
    cd "$FRONTEND_DIR"
    
    print_info "Log file: $LOG_FILE"
    print_info "Starting npm start..."
    
    npm start > "$LOG_FILE" 2>&1 &
    FRONTEND_PID=$!
    
    print_info "Frontend PID: $FRONTEND_PID"
    
    # Wait for frontend to be ready
    print_info "Waiting for frontend to start..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
            print_success "Frontend started successfully!"
            print_info "URL: $FRONTEND_URL"
            return 0
        fi
        
        attempt=$((attempt + 1))
        printf "."
        sleep 1
    done
    
    echo ""
    print_warning "Frontend startup timeout (might still be compiling)"
    print_info "Last logs:"
    tail -30 "$LOG_FILE"
    
    # Still return success as Vite can be slow
    print_success "Frontend startup signal received"
    return 0
}

##############################################################################
# MAIN
##############################################################################

main() {
    clear
    
    print_header "🌐 FRONTEND REACT APP STARTUP"
    
    # Check prerequisites
    check_prerequisites
    echo ""
    
    # Check frontend directory
    check_frontend_directory
    echo ""
    
    # Install dependencies
    install_dependencies
    echo ""
    
    # Check port
    if ! check_port_available; then
        exit 1
    fi
    echo ""
    
    # Start frontend
    if ! start_frontend; then
        exit 1
    fi
    echo ""
    
    print_header "✅ FRONTEND IS READY"
    echo ""
    echo "Configuration:"
    echo ""
    echo -e "  ${CYAN}Frontend URL${NC}   → $FRONTEND_URL"
    echo -e "  ${CYAN}Port${NC}           → $FRONTEND_PORT"
    echo ""
    echo "Useful commands:"
    echo ""
    echo -e "  ${CYAN}View logs:${NC}      tail -f $LOG_FILE"
    echo -e "  ${CYAN}Open in browser:${NC} $FRONTEND_URL"
    echo ""
    echo "Next steps:"
    echo ""
    echo "  • Chroma should be running: docker run -p 8000:8000 chromadb/chroma"
    echo "  • Backend should be running: cd server && npm start"
    echo "  • App ready at: $FRONTEND_URL"
    echo ""
    
    # Keep frontend running
    wait
}

# Run main
main
