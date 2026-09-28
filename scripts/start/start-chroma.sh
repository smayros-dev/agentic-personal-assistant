#!/usr/bin/env bash
#
# Chroma Vector Database launcher - Windows/Git Bash, macOS, Linux
#
# Runs Chroma in the foreground (Ctrl+C to stop).
# Persistence: ./chroma_data

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
. "$PROJECT_ROOT/scripts/lib/common.sh"

CHROMA_DATA="$PROJECT_ROOT/chroma_data"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🐳 Chroma Vector Database Launcher  ($(pa_os_label))${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# Already running?
if pa_chroma_ok; then
    echo -e "${GREEN}✅ Chroma is already running on $PA_CHROMA_URL${NC}"
    echo ""
    echo "You can now:"
    echo -e "  1. Start the backend:  ${BLUE}cd server && npm run dev${NC}"
    echo -e "  2. Start the frontend: ${BLUE}cd client && npm run dev${NC}"
    echo ""
    exit 0
fi

# Method 1: chromadb CLI (pip) - preferred
if CHROMA_BIN="$(pa_chroma_bin)" && [ -n "$CHROMA_BIN" ]; then
    echo -e "${YELLOW}🐍 chromadb CLI found: $CHROMA_BIN${NC}"
    echo -e "${BLUE}Running: chroma run --path ./chroma_data --port 8000${NC}"
    echo ""
    exec "$CHROMA_BIN" run --host localhost --port 8000 --path "$CHROMA_DATA"
fi

# Method 2: Docker
if command -v docker >/dev/null 2>&1; then
    if ! pa_docker_running; then
        echo -e "${YELLOW}⚠️  Docker installed but the daemon is not running${NC}"
        echo "  $(pa_docker_hint)"
        echo ""
    else
        echo -e "${GREEN}🐳 Docker found${NC}"
        echo -e "${BLUE}Running: docker run -p 8000:8000 chromadb/chroma${NC}"
        echo ""
        exec docker run --rm -p 8000:8000 \
            -v "$CHROMA_DATA:/chroma/data" \
            -e IS_PERSISTENT=TRUE \
            -e PERSIST_DIRECTORY=/chroma/data \
            -e ANONYMIZED_TELEMETRY=false \
            chromadb/chroma
    fi
fi

# Nothing available
echo -e "${RED}❌ No usable Chroma installation found${NC}"
echo ""
echo "Install one of the following:"
echo ""
echo -e "${YELLOW}Option 1 - Python (Recommended)${NC}"
case "$PA_OS" in
  macos)   echo "  brew install python3 && pip3 install chromadb" ;;
  windows) echo "  pip install chromadb        (Python: https://python.org)" ;;
  *)       echo "  sudo apt install python3-pip && pip3 install chromadb" ;;
esac
echo ""
echo -e "${YELLOW}Option 2 - Docker${NC}"
echo "  $(pa_docker_hint)"
echo "  docker pull chromadb/chroma"
echo ""
echo "Then re-run: ./scripts/start/start-chroma.sh"
echo ""

exit 1
