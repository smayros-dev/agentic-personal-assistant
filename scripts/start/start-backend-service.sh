#!/bin/bash

##############################################################################
#
#  🔙 BACKEND API SERVER - Startup Script
#
#  Starts the Node.js backend server with proper error handling
#
#  Usage: ./scripts/start/start-backend-service.sh
#
##############################################################################

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
. "$PROJECT_ROOT/scripts/lib/common.sh"

BACKEND_DIR="$PROJECT_ROOT/server"
BACKEND_PORT=3001
BACKEND_URL="http://localhost:$BACKEND_PORT"

# Logging
LOG_DIR="$(pa_log_dir)"
LOG_FILE="$LOG_DIR/backend.log"

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
        print_info "Install from https://nodejs.org (macOS: brew install node, Windows: winget install OpenJS.NodeJS.LTS)"
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
# CHECK: Backend directory
##############################################################################

check_backend_directory() {
    print_step "Checking backend directory..."
    
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    if [ ! -f "$BACKEND_DIR/package.json" ]; then
        print_error "Backend package.json not found: $BACKEND_DIR/package.json"
        exit 1
    fi
    
    print_success "Backend directory verified"
    
    return 0
}

##############################################################################
# INSTALL: Dependencies
##############################################################################

install_dependencies() {
    print_step "Checking dependencies..."
    
    cd "$BACKEND_DIR"
    
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
# CHECK: Environment
##############################################################################

check_environment() {
    print_step "Checking environment configuration..."
    
    ENV_FILE="$BACKEND_DIR/.env"
    
    if [ ! -f "$ENV_FILE" ]; then
        print_warning "Environment file not found, creating .env..."
        
        cat > "$ENV_FILE" << 'EOF'
# Backend Configuration
PORT=3001
NODE_ENV=development

# Vector Database
VECTOR_DB=chroma
CHROMA_URL=http://localhost:8000

# Optional: Pinecone
# VECTOR_DB=pinecone
# PINECONE_API_KEY=your-key
# PINECONE_INDEX=your-index

# API Security
API_KEY=dev-key

# Rate Limiting
RATE_LIMIT_MAX=30
RATE_LIMIT_WINDOW_MS=60000

# Ollama
OLLAMA_URL=http://localhost:11434

# Logging
LOG_LEVEL=info
EOF
        
        print_success "Environment file created"
    else
        print_success "Environment file found"
        
        # Check critical settings
        if grep -q "CHROMA_URL" "$ENV_FILE"; then
            print_success "CHROMA_URL configured"
        else
            print_warning "CHROMA_URL not configured, adding..."
            echo "CHROMA_URL=http://localhost:8000" >> "$ENV_FILE"
        fi
    fi
    
    return 0
}

##############################################################################
# CHECK: Port availability
##############################################################################

check_port_available() {
    print_step "Checking if port $BACKEND_PORT is available..."

    if pa_port_busy "$BACKEND_PORT"; then
        PID="$(pa_pid_on_port "$BACKEND_PORT")"
        print_warning "Port $BACKEND_PORT is in use by process $PID"
        print_info "Killing process..."
        pa_kill_port "$BACKEND_PORT" || return 1
        print_success "Port freed"
    fi

    return 0
}

##############################################################################
# START: Backend
##############################################################################

start_backend() {
    print_step "Starting Backend Server..."
    
    cd "$BACKEND_DIR"
    
    print_info "Log file: $LOG_FILE"
    print_info "Starting npm start..."
    
    npm start > "$LOG_FILE" 2>&1 &
    BACKEND_PID=$!
    
    print_info "Backend PID: $BACKEND_PID"
    
    # Wait for backend to be ready
    print_info "Waiting for backend to start..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if pa_http_ok "$BACKEND_URL/healthz"; then
            print_success "Backend started successfully!"
            print_info "URL: $BACKEND_URL"
            return 0
        fi
        
        attempt=$((attempt + 1))
        printf "."
        sleep 1
    done
    
    echo ""
    print_error "Backend failed to start (timeout after ${max_attempts}s)"
    print_info "Last logs:"
    tail -30 "$LOG_FILE"
    
    return 1
}

##############################################################################
# MAIN
##############################################################################

main() {
    clear 2>/dev/null || true
    
    print_header "🔙 BACKEND API SERVER STARTUP"
    
    # Check prerequisites
    check_prerequisites
    echo ""
    
    # Check backend directory
    check_backend_directory
    echo ""
    
    # Install dependencies
    install_dependencies
    echo ""
    
    # Check environment
    check_environment
    echo ""
    
    # Check port
    if ! check_port_available; then
        exit 1
    fi
    echo ""
    
    # Start backend
    if ! start_backend; then
        exit 1
    fi
    echo ""
    
    print_header "✅ BACKEND IS READY"
    echo ""
    echo "Configuration:"
    echo ""
    echo -e "  ${CYAN}Backend URL${NC}    → $BACKEND_URL"
    echo -e "  ${CYAN}Port${NC}            → $BACKEND_PORT"
    echo -e "  ${CYAN}Environment${NC}     → development"
    echo ""
    echo "Useful commands:"
    echo ""
    echo -e "  ${CYAN}View logs:${NC}      tail -f $LOG_FILE"
    echo -e "  ${CYAN}Health check:${NC}   curl $BACKEND_URL/healthz"
    echo ""
    echo "Next steps:"
    echo ""
    echo "  • Frontend: cd client && npm run dev"
    echo "  • Or use: ./start-local.sh (to start all services)"
    echo ""
    
    # Keep backend running
    wait
}

# Run main
main
