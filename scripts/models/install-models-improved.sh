#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONTAINER_NAME="agentic-ollama-dev"
OLLAMA_API="http://localhost:11434"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Ollama Model Management${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${RED}❌ Ollama container is not running${NC}"
    echo -e "${YELLOW}Starting container...${NC}"
    docker-compose -f docker-compose.dev.yml up -d ollama
    sleep 5
fi

# Check if Ollama API is responsive
if ! curl -s "$OLLAMA_API/api/tags" > /dev/null 2>&1; then
    echo -e "${RED}❌ Ollama API not responding at $OLLAMA_API${NC}"
    echo -e "${YELLOW}Restarting container...${NC}"
    docker-compose -f docker-compose.dev.yml restart ollama
    sleep 5
fi

echo -e "${GREEN}✅ Ollama is ready${NC}"
echo ""

# Get list of currently installed models
echo -e "${BLUE}📋 Currently installed models:${NC}"
curl -s "$OLLAMA_API/api/tags" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('models'):
        for model in data['models']:
            size_gb = model['size'] / (1024**3)
            print(f\"  • {model['name']} ({size_gb:.1f}GB)\")
    else:
        print('  (No models installed)')
except:
    print('  (Could not parse model list)')
" 2>/dev/null || echo "  (Could not list models)"
echo ""

# Function to check if model exists
model_exists() {
    local model=$1
    curl -s "$OLLAMA_API/api/tags" | grep -q "\"name\":\"$model\""
}

# Function to install a model
install_model() {
    local model=$1
    
    if model_exists "$model"; then
        echo -e "${YELLOW}⏭️  Model already installed: $model${NC}"
        return 0
    fi
    
    echo -e "${BLUE}📥 Installing model: $model${NC}"
    echo "   (This may take several minutes...)"
    
    # Use streaming API to show progress
    if curl -s -X POST "$OLLAMA_API/api/pull" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"$model\"}" \
        --max-time 7200 | tail -1 | grep -q "success"; then
        echo -e "${GREEN}✅ Successfully installed: $model${NC}"
    else
        echo -e "${YELLOW}⚠️  Installation may have failed for: $model${NC}"
        return 1
    fi
    echo ""
}

# Parse command line arguments
if [ $# -gt 0 ]; then
    echo -e "${BLUE}Installing custom models:${NC}"
    for model in "$@"; do
        install_model "$model"
    done
else
    echo -e "${YELLOW}No models specified.${NC}"
    echo "Usage: ./scripts/models/install-models-improved.sh <model1> <model2> ..."
    echo ""
    echo "Examples:"
    echo "  ./scripts/models/install-models-improved.sh mistral:7b"
    echo "  ./scripts/models/install-models-improved.sh qwen2:7b llama2:7b"
    echo "  ./scripts/models/install-models-improved.sh nomic-embed-text:latest"
    echo ""
    exit 0
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Final model list:${NC}"
curl -s "$OLLAMA_API/api/tags" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('models'):
        for model in data['models']:
            size_gb = model['size'] / (1024**3)
            print(f\"  • {model['name']} ({size_gb:.1f}GB)\")
    else:
        print('  (No models installed)')
except:
    print('  (Could not parse model list)')
" 2>/dev/null
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
