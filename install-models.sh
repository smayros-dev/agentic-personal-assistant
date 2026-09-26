#!/bin/bash

# Ollama Model Installation Script
# Automatically install models into Ollama container

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default models to install
DEFAULT_MODELS=("qwen2:7b" "mistral:7b" "nomic-embed-text:latest")

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Ollama Model Installation Automation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo -e "${YELLOW}⚠️  Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if Ollama container is running
CONTAINER_NAME="agentic-ollama-dev"
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo -e "${YELLOW}⚠️  Ollama container ($CONTAINER_NAME) is not running.${NC}"
    echo "Starting Docker Compose services..."
    docker-compose -f docker-compose.dev.yml up ollama -d
    sleep 5
fi

echo -e "${GREEN}✅ Ollama container is running${NC}"
echo ""

# Function to install a model
install_model() {
    local model=$1
    echo -e "${BLUE}📥 Installing model: $model${NC}"
    
    if docker exec "$CONTAINER_NAME" ollama pull "$model"; then
        echo -e "${GREEN}✅ Successfully installed: $model${NC}"
    else
        echo -e "${YELLOW}⚠️  Failed to install: $model${NC}"
        return 1
    fi
    echo ""
}

# Parse command line arguments
if [ $# -gt 0 ]; then
    # Install specific models provided as arguments
    for model in "$@"; do
        install_model "$model"
    done
else
    # Install default models
    echo -e "${YELLOW}No models specified. Installing default models:${NC}"
    for model in "${DEFAULT_MODELS[@]}"; do
        echo "  - $model"
    done
    echo ""
    
    for model in "${DEFAULT_MODELS[@]}"; do
        install_model "$model"
    done
fi

# List installed models
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Installed Models${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

docker exec "$CONTAINER_NAME" ollama list

echo ""
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "  1. Open http://localhost:5175 in your browser"
echo "  2. Refresh the page to see new models in the dropdown"
echo "  3. Select a model and start chatting!"
echo ""
