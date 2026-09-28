#!/usr/bin/env bash
#
# Cross-platform local starter (Windows/Git Bash, macOS, Linux)
#
#   Infra (native, no Docker):
#     Ollama  -> http://localhost:11434
#     Chroma  -> http://localhost:8000   (persisted in ./chroma_data)
#   App (one dedicated terminal each):
#     Backend  -> http://localhost:3001
#     Frontend -> http://localhost:5173
#
# Usage:  ./start-local.sh
#         Windows/PowerShell: .\start-local.ps1

set -u

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
. "$PROJECT_DIR/scripts/lib/common.sh"

echo ""
hr
echo "  Agentic RAG - local startup  ($(pa_os_label), native / no Docker)"
hr
echo ""

# ---------------------------------------------------------------
echo "[1/4] Infrastructure"
# ---------------------------------------------------------------
if pa_http_ok "$PA_OLLAMA_URL/api/tags"; then
  ok "Ollama already running"
else
  info "Starting Ollama..."
  pa_ollama_start
  pa_wait_for "$PA_OLLAMA_URL/api/tags" "Ollama" 30
fi

if pa_chroma_ok; then
  ok "Chroma already running"
else
  pa_chroma_start "$PROJECT_DIR/chroma_data"
  pa_wait_chroma 30
fi

echo ""
echo "[2/4] Backend  ->  $PA_BACKEND_URL"
if pa_http_ok "$PA_BACKEND_URL/healthz"; then
  ok "Backend already running"
else
  warn "Press Enter to start the backend terminal..."
  read -r _
  pa_open_terminal "Backend" "$PROJECT_DIR/server" "npm run dev"
fi

echo ""
echo "[3/4] Frontend  ->  $PA_FRONTEND_URL"
if pa_http_ok "$PA_FRONTEND_URL"; then
  ok "Frontend already running"
else
  warn "Press Enter to start the frontend terminal..."
  read -r _
  sleep 2
  pa_open_terminal "Frontend" "$PROJECT_DIR/client" "npm run dev"
fi

echo ""
echo "[4/4] Health checks"
pa_wait_for "$PA_OLLAMA_URL/api/tags" "Ollama  " 30
pa_wait_chroma 30
pa_wait_for "$PA_BACKEND_URL/healthz" "Backend " 45
pa_wait_for "$PA_FRONTEND_URL" "Frontend" 45

echo ""
hr
echo "  Application is up"
echo "    Frontend : $PA_FRONTEND_URL"
echo "    Backend  : $PA_BACKEND_URL  (/healthz)"
echo "    Chroma   : $PA_CHROMA_URL  (./chroma_data)"
echo "    Ollama   : $PA_OLLAMA_URL"
echo ""
echo "  Stop: ./stop-local.sh   (Windows: .\\stop-local.ps1)"
hr
