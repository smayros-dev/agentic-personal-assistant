#!/usr/bin/env bash
#
# Start everything in background (logs in $TMPDIR/agentic-assistant-logs)
# Works on Windows/Git Bash, macOS and Linux (native, no Docker required).
#
# For dedicated terminal windows prefer: ./start-local.sh

echo -e "\033[0;34m╔════════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[0;34m║     🚀 Development Mode - All Services (background)       ║\033[0m"
echo -e "\033[0;34m╚════════════════════════════════════════════════════════════╝\033[0m"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
. "$PROJECT_ROOT/scripts/lib/common.sh"

LOG_DIR="$(pa_log_dir)"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

cleanup() {
    echo ""
    warn "Stopping all services..."
    pa_kill_pattern "nodemon"
    pa_kill_pattern "npm run dev"
    pa_kill_pattern "vite"
    pa_kill_port 3001 || true
    pa_kill_port 5173 || true
    pa_kill_chroma
    pa_kill_port 8000 || true
    ok "All services stopped"
}
trap cleanup EXIT INT TERM

cd "$PROJECT_ROOT" || exit 1

echo "[1/3] Infrastructure"
if pa_chroma_ok; then
    ok "Chroma already running"
else
    pa_chroma_start "$PROJECT_ROOT/chroma_data"
    pa_wait_chroma 30 || exit 1
fi
echo ""

echo "[2/3] Backend"
if pa_http_ok "$PA_BACKEND_URL/healthz"; then
    ok "Backend already running"
else
    ( cd "$PROJECT_ROOT/server" && npm run dev > "$BACKEND_LOG" 2>&1 ) &
    disown 2>/dev/null || true
    pa_wait_for "$PA_BACKEND_URL/healthz" "Backend" 45 || exit 1
fi
echo ""

echo "[3/3] Frontend"
if pa_http_ok "$PA_FRONTEND_URL"; then
    ok "Frontend already running"
else
    ( cd "$PROJECT_ROOT/client" && npm run dev > "$FRONTEND_LOG" 2>&1 ) &
    disown 2>/dev/null || true
    pa_wait_for "$PA_FRONTEND_URL" "Frontend" 45 || exit 1
fi
echo ""

hr
echo "  Services running:"
echo "    Chroma   : $PA_CHROMA_URL"
echo "    Backend  : $PA_BACKEND_URL"
echo "    Frontend : $PA_FRONTEND_URL"
echo ""
echo "  Logs: $LOG_DIR/{backend,frontend,chroma}.log"
echo "  Press Ctrl+C to stop all services"
hr

wait
