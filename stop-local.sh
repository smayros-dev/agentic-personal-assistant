#!/usr/bin/env bash
#
# Cross-platform local stopper (Windows/Git Bash, macOS, Linux)
#
#   Stops: backend (3001), frontend (5173), chroma (8000)
#   Keeps: Ollama  (pass --all to stop it too)
#
# Usage:  ./stop-local.sh [--all]
#         Windows/PowerShell: .\stop-local.ps1

set -u

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
. "$PROJECT_DIR/scripts/lib/common.sh"

STOP_ALL=0
[ "${1:-}" = "--all" ] && STOP_ALL=1

echo ""
hr
echo "  Agentic RAG - stop services  ($(pa_os_label))"
hr
echo ""

info "Stopping backend (nodemon)..."
pa_kill_pattern "nodemon"
pa_kill_pattern "npm run dev"
pa_kill_port 3001

info "Stopping frontend (vite)..."
pa_kill_pattern "vite"
pa_kill_port 5173

info "Stopping Chroma..."
pa_kill_chroma
pa_kill_port 8000

if [ "$STOP_ALL" = "1" ]; then
  info "Stopping Ollama..."
  pa_kill_pattern "ollama serve"
else
  ok "Ollama left running (use --all to stop it)"
fi

echo ""
hr
printf "  Result:"
for probe in "backend:3001/healthz" "frontend:5173" "chroma:8000"; do
  name="${probe%%:*}"; rest="${probe#*:}"; port="${rest%%/*}"; path="${rest#*/}"
  if [ "$path" = "$rest" ]; then url="http://localhost:$port"; else url="http://localhost:$rest"; fi
  if pa_http_ok "$url"; then printf " %s=still-up" "$name"; else printf " %s=stopped" "$name"; fi
done
echo ""
hr
