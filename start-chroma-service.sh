#!/bin/bash

##############################################################################
#
#  🐳 CHROMA VECTOR DATABASE - Startup Script
#
#  Robustly starts Chroma with proper error handling and verification
#
#  Usage: ./start-chroma-service.sh
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

CHROMA_PORT=8000
CHROMA_URL="http://localhost:$CHROMA_PORT"

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
# CHECK: Is Chroma already running?
##############################################################################

check_already_running() {
    print_step "Checking if Chroma is already running on port $CHROMA_PORT..."
    
    if curl -s "$CHROMA_URL/api/v1" > /dev/null 2>&1; then
        print_success "Chroma is already running!"
        print_info "URL: $CHROMA_URL"
        
        # Get Chroma info
        COLLECTIONS=$(curl -s "$CHROMA_URL/api/v1/collections" | grep -o '"name"' | wc -l)
        if [ $COLLECTIONS -gt 0 ]; then
            print_info "Collections in Chroma: $COLLECTIONS"
        fi
        
        return 0  # Already running
    fi
    
    return 1  # Not running
}

##############################################################################
# CHECK: Port availability
##############################################################################

check_port_available() {
    print_step "Checking if port $CHROMA_PORT is available..."
    
    if lsof -Pi :$CHROMA_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        PID=$(lsof -Pi :$CHROMA_PORT -sTCP:LISTEN -t)
        print_warning "Port $CHROMA_PORT is in use by process $PID"
        print_info "Killing process..."
        
        kill -9 $PID 2>/dev/null || true
        sleep 2
        
        if lsof -Pi :$CHROMA_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_error "Could not free port $CHROMA_PORT"
            return 1
        fi
        print_success "Port freed"
    fi
    
    return 0
}

##############################################################################
# DETECT: Python or Docker
##############################################################################

detect_chroma_method() {
    print_step "Detecting Chroma installation method..."
    
    # Method 1: Python
    if command -v python3 &> /dev/null; then
        if python3 -c "import chromadb" 2>/dev/null; then
            print_success "Found Python with chromadb installed"
            echo "python"
            return 0
        fi
    fi
    
    # Method 2: Docker
    if command -v docker &> /dev/null; then
        if docker ps --filter "image=chromadb/chroma" 2>/dev/null | grep -q chromadb; then
            print_success "Found Docker with Chroma image already running"
            echo "docker"
            return 0
        fi
        
        # Check if image exists
        if docker image inspect chromadb/chroma >/dev/null 2>&1; then
            print_success "Found Docker with Chroma image available"
            echo "docker"
            return 0
        fi
    fi
    
    return 1
}

##############################################################################
# INSTALL: Chroma if needed
##############################################################################

install_chroma() {
    print_warning "Chroma is not installed!"
    echo ""
    echo "Install one of:"
    echo ""
    echo "  Option 1 - Python (Recommended):"
    echo "    brew install python3"
    echo "    pip3 install chromadb"
    echo ""
    echo "  Option 2 - Docker:"
    echo "    brew install docker"
    echo "    docker pull chromadb/chroma"
    echo ""
    
    exit 1
}

##############################################################################
# START: Chroma via Python
##############################################################################

start_chroma_python() {
    print_step "Starting Chroma via Python..."
    
    # Create log directory
    mkdir -p /tmp/agentic-assistant-logs
    LOG_FILE="/tmp/agentic-assistant-logs/chroma.log"
    
    print_info "Log file: $LOG_FILE"
    
    # Start Chroma
    chroma run --host localhost --port $CHROMA_PORT > "$LOG_FILE" 2>&1 &
    CHROMA_PID=$!
    
    print_info "Chroma PID: $CHROMA_PID"
    print_info "Waiting for Chroma to start..."
    
    # Wait for Chroma to be ready
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$CHROMA_URL/api/v1" > /dev/null 2>&1; then
            print_success "Chroma started successfully!"
            print_info "URL: $CHROMA_URL"
            return 0
        fi
        
        attempt=$((attempt + 1))
        printf "."
        sleep 1
    done
    
    echo ""
    print_error "Chroma failed to start (timeout after ${max_attempts}s)"
    print_info "Last logs:"
    tail -20 "$LOG_FILE"
    
    return 1
}

##############################################################################
# START: Chroma via Docker
##############################################################################

start_chroma_docker() {
    print_step "Starting Chroma via Docker..."
    
    # Create log directory
    mkdir -p /tmp/agentic-assistant-logs
    LOG_FILE="/tmp/agentic-assistant-logs/chroma-docker.log"
    
    print_info "Log file: $LOG_FILE"
    
    # Pull latest image
    print_step "Pulling latest Chroma image..."
    docker pull chromadb/chroma >> "$LOG_FILE" 2>&1
    
    # Start Chroma
    docker run \
        --rm \
        -p $CHROMA_PORT:$CHROMA_PORT \
        --name agentic-chroma \
        chromadb/chroma \
        > "$LOG_FILE" 2>&1 &
    
    CHROMA_PID=$!
    print_info "Docker Chroma PID: $CHROMA_PID"
    print_info "Waiting for Chroma to start..."
    
    # Wait for Chroma to be ready
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$CHROMA_URL/api/v1" > /dev/null 2>&1; then
            print_success "Chroma started successfully!"
            print_info "URL: $CHROMA_URL"
            return 0
        fi
        
        attempt=$((attempt + 1))
        printf "."
        sleep 1
    done
    
    echo ""
    print_error "Chroma failed to start (timeout after ${max_attempts}s)"
    print_info "Last logs:"
    tail -20 "$LOG_FILE"
    
    return 1
}

##############################################################################
# VERIFY: Chroma is working
##############################################################################

verify_chroma() {
    print_step "Verifying Chroma installation..."
    
    # Test 1: Health check
    if ! curl -s "$CHROMA_URL/api/v1" > /dev/null 2>&1; then
        print_error "Chroma health check failed"
        return 1
    fi
    print_success "Health check passed"
    
    # Test 2: Collections
    if curl -s "$CHROMA_URL/api/v1/collections" > /dev/null 2>&1; then
        print_success "Collections endpoint working"
    fi
    
    # Test 3: Version (optional)
    VERSION=$(curl -s "$CHROMA_URL/api/v1" 2>/dev/null || echo "unknown")
    print_info "Chroma version info: $VERSION"
    
    return 0
}

##############################################################################
# MAIN
##############################################################################

main() {
    clear
    
    print_header "🐳 CHROMA VECTOR DATABASE STARTUP"
    
    # Check if already running
    if check_already_running; then
        echo ""
        print_success "Chroma is ready to use!"
        echo ""
        echo "You can now:"
        echo "  • Start Backend: cd server && npm start"
        echo "  • Start Frontend: cd client && npm start"
        echo "  • Or use: ./start.sh (to start everything)"
        echo ""
        exit 0
    fi
    
    echo ""
    
    # Check port availability
    if ! check_port_available; then
        exit 1
    fi
    
    echo ""
    
    # Detect installation method
    CHROMA_METHOD=$(detect_chroma_method)
    
    if [ -z "$CHROMA_METHOD" ]; then
        install_chroma
    fi
    
    echo ""
    
    # Start Chroma
    if [ "$CHROMA_METHOD" = "python" ]; then
        start_chroma_python || exit 1
    elif [ "$CHROMA_METHOD" = "docker" ]; then
        start_chroma_docker || exit 1
    fi
    
    echo ""
    
    # Verify Chroma
    if ! verify_chroma; then
        exit 1
    fi
    
    echo ""
    print_header "✅ CHROMA IS READY"
    echo ""
    echo "Configuration:"
    echo ""
    echo -e "  ${CYAN}CHROMA_URL${NC}        → $CHROMA_URL"
    echo -e "  ${CYAN}CHROMA_PORT${NC}       → $CHROMA_PORT"
    echo ""
    echo "Next steps:"
    echo ""
    echo "  1. Keep this terminal open (Chroma is running here)"
    echo "  2. Open another terminal and run:"
    echo "     cd server && npm start"
    echo "  3. Open another terminal and run:"
    echo "     cd client && npm start"
    echo ""
    echo "  OR simply run: ./start.sh (to start everything at once)"
    echo ""
    
    # Keep Chroma running in foreground
    wait
}

# Run main
main
