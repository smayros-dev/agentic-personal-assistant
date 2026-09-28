#!/bin/bash

##############################################################################
#
#  🐳 CHROMA VECTOR DATABASE - Startup Script
#
#  Robustly starts Chroma with proper error handling and verification
#
#  Usage: ./scripts/start/start-chroma-service.sh
#
##############################################################################

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
. "$PROJECT_ROOT/scripts/lib/common.sh"

CHROMA_PORT=8000
CHROMA_URL="http://localhost:$CHROMA_PORT"
CHROMA_DATA="$PROJECT_ROOT/chroma_data"

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
    
    if pa_chroma_ok; then
        print_success "Chroma is already running!"
        print_info "URL: $CHROMA_URL"
        return 0  # Already running
    fi
    
    return 1  # Not running
}

##############################################################################
# CHECK: Port availability
##############################################################################

check_port_available() {
    print_step "Checking if port $CHROMA_PORT is available..."

    if pa_port_busy "$CHROMA_PORT"; then
        PID="$(pa_pid_on_port "$CHROMA_PORT")"
        print_warning "Port $CHROMA_PORT is in use by process $PID"
        print_info "Killing process..."
        pa_kill_port "$CHROMA_PORT" || return 1
        print_success "Port freed"
    fi

    return 0
}

##############################################################################
# DETECT: Python or Docker
##############################################################################

detect_chroma_method() {
    print_step "Detecting Chroma installation method..."

    # Method 1: Python (chromadb CLI)
    if pa_chroma_bin >/dev/null 2>&1; then
        print_success "Found chromadb CLI ($(pa_chroma_bin))"
        echo "python"
        return 0
    fi
    if pa_python_has chromadb; then
        print_success "Found Python with chromadb installed"
        echo "python"
        return 0
    fi

    # Method 2: Docker
    if command -v docker &> /dev/null && pa_docker_running; then
        if docker ps --filter "image=chromadb/chroma" 2>/dev/null | grep -q chromadb; then
            print_success "Found Docker with Chroma image already running"
            echo "docker"
            return 0
        fi
        if docker image inspect chromadb/chroma >/dev/null 2>&1; then
            print_success "Found Docker with Chroma image available"
            echo "docker"
            return 0
        fi
        echo "docker"
        return 0
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
    case "$PA_OS" in
      macos)   echo "    brew install python3 && pip3 install chromadb" ;;
      windows) echo "    pip install chromadb        (Python from https://python.org)" ;;
      *)       echo "    sudo apt install python3-pip && pip3 install chromadb" ;;
    esac
    echo ""
    echo "  Option 2 - Docker:"
    echo "    $(pa_docker_hint)"
    echo "    docker pull chromadb/chroma"
    echo ""
    echo "  Then re-run: ./scripts/start/start-chroma-service.sh"
    echo ""
    
    exit 1
}

##############################################################################
# START: Chroma via Python
##############################################################################

start_chroma_python() {
    print_step "Starting Chroma via Python..."
    
    local CHROMA_BIN
    CHROMA_BIN="$(pa_chroma_bin)" || { print_error "chroma CLI not found"; return 1; }
    
    # Create log directory
    LOG_DIR="$(pa_log_dir)"
    LOG_FILE="$LOG_DIR/chroma.log"
    
    print_info "Log file: $LOG_FILE"
    print_info "Persistence: $CHROMA_DATA"
    
    # Start Chroma
    "$CHROMA_BIN" run --host localhost --port "$CHROMA_PORT" --path "$CHROMA_DATA" > "$LOG_FILE" 2>&1 &
    CHROMA_PID=$!
    
    print_info "Chroma PID: $CHROMA_PID"
    print_info "Waiting for Chroma to start..."
    
    # Wait for Chroma to be ready
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if pa_chroma_ok; then
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
    
    if ! pa_docker_running; then
        print_error "Docker daemon is not running"
        print_info "$(pa_docker_hint)"
        return 1
    fi
    
    # Create log directory
    LOG_DIR="$(pa_log_dir)"
    LOG_FILE="$LOG_DIR/chroma-docker.log"
    
    print_info "Log file: $LOG_FILE"
    
    # Pull latest image
    print_step "Pulling latest Chroma image..."
    docker pull chromadb/chroma >> "$LOG_FILE" 2>&1
    
    # Start Chroma
    docker run \
        --rm \
        -p $CHROMA_PORT:$CHROMA_PORT \
        -v "$CHROMA_DATA:/chroma/data" \
        -e IS_PERSISTENT=TRUE \
        -e PERSIST_DIRECTORY=/chroma/data \
        -e ANONYMIZED_TELEMETRY=false \
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
        if pa_chroma_ok; then
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
    if ! pa_chroma_ok; then
        print_error "Chroma health check failed"
        return 1
    fi
    print_success "Health check passed"
    
    # Test 2: heartbeat info
    VERSION=$(curl -s "$CHROMA_URL/api/v2/heartbeat" 2>/dev/null || echo "unknown")
    print_info "Chroma heartbeat: $VERSION"
    
    return 0
}

##############################################################################
# MAIN
##############################################################################

main() {
    clear 2>/dev/null || true
    
    print_header "🐳 CHROMA VECTOR DATABASE STARTUP"
    
    # Check if already running
    if check_already_running; then
        echo ""
        print_success "Chroma is ready to use!"
        echo ""
        echo "You can now:"
        echo "  • Start Backend: cd server && npm run dev"
        echo "  • Start Frontend: cd client && npm run dev"
        echo "  • Or use: ./start-local.sh (to start everything)"
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
    echo "     cd server && npm run dev"
    echo "  3. Open another terminal and run:"
    echo "     cd client && npm run dev"
    echo ""
    echo "  OR simply run: ./start-local.sh (to start everything at once)"
    echo ""
    
    # Keep Chroma running in foreground
    wait
}

# Run main
main
