#!/bin/bash

# Switch Vector Store Configuration
# Usage: ./switch-vectorstore.sh chroma   # or "pinecone"

set -e

TARGET=${1:-}

if [[ -z "$TARGET" ]]; then
  echo "❌ Usage: ./switch-vectorstore.sh <chroma|pinecone>"
  echo ""
  echo "Examples:"
  echo "  ./switch-vectorstore.sh chroma     # Switch to local Chroma"
  echo "  ./switch-vectorstore.sh pinecone   # Switch to cloud Pinecone"
  exit 1
fi

ENV_FILE="server/.env"

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
      sed -i '' "s/^VECTOR_DB=.*/VECTOR_DB=chroma/" "$ENV_FILE"
    else
      echo "VECTOR_DB=chroma" >> "$ENV_FILE"
    fi
    
    # Ensure Chroma settings are uncommented
    sed -i '' 's/^# CHROMA_URL=/CHROMA_URL=/' "$ENV_FILE"
    sed -i '' 's/^# CHROMA_COLLECTION=/CHROMA_COLLECTION=/' "$ENV_FILE"
    sed -i '' 's/^# EMBEDDING_MODEL=/EMBEDDING_MODEL=/' "$ENV_FILE"
    
    # Comment out Pinecone
    sed -i '' 's/^PINECONE_API_KEY=/# PINECONE_API_KEY=/' "$ENV_FILE"
    sed -i '' 's/^PINECONE_INDEX=/ # PINECONE_INDEX=/' "$ENV_FILE"
    
    echo "✅ Switched to Chroma!"
    echo ""
    echo "Next steps:"
    echo "  1. docker-compose up"
    echo "  2. Wait for services to start (~30 seconds)"
    echo "  3. Open http://localhost:5173"
    echo ""
    ;;
    
  pinecone)
    echo "🔄 Switching to Pinecone (cloud)..."
    
    # Set VECTOR_DB
    if grep -q "^VECTOR_DB=" "$ENV_FILE"; then
      sed -i '' "s/^VECTOR_DB=.*/VECTOR_DB=pinecone/" "$ENV_FILE"
    else
      echo "VECTOR_DB=pinecone" >> "$ENV_FILE"
    fi
    
    # Comment out Chroma
    sed -i '' 's/^CHROMA_URL=/# CHROMA_URL=/' "$ENV_FILE"
    sed -i '' 's/^CHROMA_COLLECTION=/# CHROMA_COLLECTION=/' "$ENV_FILE"
    sed -i '' 's/^EMBEDDING_MODEL=/# EMBEDDING_MODEL=/' "$ENV_FILE"
    
    # Ensure Pinecone settings are uncommented
    sed -i '' 's/^# PINECONE_API_KEY=/PINECONE_API_KEY=/' "$ENV_FILE"
    sed -i '' 's/^# PINECONE_INDEX=/PINECONE_INDEX=/' "$ENV_FILE"
    
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
