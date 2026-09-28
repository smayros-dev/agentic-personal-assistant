#!/usr/bin/env bash

# Switch Vector Store Configuration (Windows/Git Bash, macOS, Linux)
# Usage: ./scripts/config/switch-vectorstore.sh chroma   # or "pinecone"

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
. "$PROJECT_ROOT/scripts/lib/common.sh"

TARGET=${1:-}

if [[ -z "$TARGET" ]]; then
  echo "❌ Usage: ./scripts/config/switch-vectorstore.sh <chroma|pinecone>"
  echo ""
  echo "Examples:"
  echo "  ./scripts/config/switch-vectorstore.sh chroma     # Switch to local Chroma"
  echo "  ./scripts/config/switch-vectorstore.sh pinecone   # Switch to cloud Pinecone"
  exit 1
fi

ENV_FILE="$PROJECT_ROOT/server/.env"

# Check if .env exists
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ server/.env not found. Please run: cp server/.env.example server/.env"
  exit 1
fi

case "$TARGET" in
  chroma)
    echo "🔄 Switching to Chroma (local)..."
    
    # Set VECTOR_DB
    if grep -q "^VECTOR_DB=" "$ENV_FILE"; then
      pa_sed_i "$ENV_FILE" "s/^VECTOR_DB=.*/VECTOR_DB=chroma/"
    else
      echo "VECTOR_DB=chroma" >> "$ENV_FILE"
    fi
    
    # Ensure Chroma settings are uncommented
    pa_sed_i "$ENV_FILE" 's/^# CHROMA_URL=/CHROMA_URL=/'
    pa_sed_i "$ENV_FILE" 's/^# CHROMA_COLLECTION=/CHROMA_COLLECTION=/'
    pa_sed_i "$ENV_FILE" 's/^# EMBEDDING_MODEL=/EMBEDDING_MODEL=/'
    
    # Comment out Pinecone
    pa_sed_i "$ENV_FILE" 's/^PINECONE_API_KEY=/# PINECONE_API_KEY=/'
    pa_sed_i "$ENV_FILE" 's/^PINECONE_INDEX=/# PINECONE_INDEX=/'
    
    echo "✅ Switched to Chroma!"
    echo ""
    echo "Next steps:"
    echo "  1. ./start-local.sh        (or: .\\start-local.ps1 on Windows)"
    echo "  2. Wait for services to start (~30 seconds)"
    echo "  3. Open http://localhost:5173"
    echo ""
    ;;
    
  pinecone)
    echo "🔄 Switching to Pinecone (cloud)..."
    
    # Set VECTOR_DB
    if grep -q "^VECTOR_DB=" "$ENV_FILE"; then
      pa_sed_i "$ENV_FILE" "s/^VECTOR_DB=.*/VECTOR_DB=pinecone/"
    else
      echo "VECTOR_DB=pinecone" >> "$ENV_FILE"
    fi
    
    # Comment out Chroma
    pa_sed_i "$ENV_FILE" 's/^CHROMA_URL=/# CHROMA_URL=/'
    pa_sed_i "$ENV_FILE" 's/^CHROMA_COLLECTION=/# CHROMA_COLLECTION=/'
    pa_sed_i "$ENV_FILE" 's/^EMBEDDING_MODEL=/# EMBEDDING_MODEL=/'
    
    # Ensure Pinecone settings are uncommented
    pa_sed_i "$ENV_FILE" 's/^# PINECONE_API_KEY=/PINECONE_API_KEY=/'
    pa_sed_i "$ENV_FILE" 's/^# PINECONE_INDEX=/PINECONE_INDEX=/'
    
    echo "✅ Switched to Pinecone!"
    echo ""
    echo "Next steps:"
    echo "  1. Get your API key from https://app.pinecone.io"
    echo "  2. Update PINECONE_API_KEY in server/.env"
    echo "  3. npm run dev"
    echo ""
    ;;
    
  *)
    echo "❌ Unknown option: $TARGET"
    echo "Use: chroma or pinecone"
    exit 1
    ;;
esac

echo "Current VECTOR_DB setting:"
grep "^VECTOR_DB=" "$ENV_FILE"
