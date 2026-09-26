#!/bin/bash

# Quick dev startup script
# Usage: ./dev-setup.sh

set -e

echo "🚀 Starting Agentic RAG in Development Mode"
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
  echo "❌ docker-compose not found. Please install Docker & Docker Compose."
  exit 1
fi

# Check if .env exists
if [[ ! -f "server/.env" ]]; then
  echo "📋 Creating server/.env from template..."
  cp server/.env.example server/.env
  echo "✓ server/.env created"
  echo ""
  echo "⚠️  Edit server/.env if needed (Pinecone credentials, etc.)"
  echo ""
fi

# Start infrastructure only
echo "🐳 Starting infrastructure (Ollama + Chroma)..."
echo "    docker-compose -f docker-compose.dev.yml up"
echo ""
docker-compose -f docker-compose.dev.yml up &
INFRA_PID=$!

echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "✅ Infrastructure is starting in the background (PID: $INFRA_PID)"
echo ""
echo "📝 In new terminal windows, run:"
echo ""
echo "   Terminal 2 (Backend - hot reload):"
echo "   $ cd server && npm install && npm run dev"
echo ""
echo "   Terminal 3 (Frontend - hot reload):"
echo "   $ cd client && npm install && npm run dev"
echo ""
echo "   Terminal 4 (Optional - tests/curl):"
echo "   $ curl http://localhost:3001/api/config"
echo ""
echo "🌐 Open: http://localhost:5173"
echo ""
echo "🛑 To stop infrastructure: docker-compose -f docker-compose.dev.yml down"
echo ""

# Keep process alive
wait $INFRA_PID
