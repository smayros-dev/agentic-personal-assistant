#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🐳 Chroma Vector Database Launcher                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Chroma is already running
check_chroma_running() {
    if curl -s http://localhost:8000/api/v1 > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# If Chroma is already running, inform user
if check_chroma_running; then
    echo -e "${GREEN}✅ Chroma is already running on http://localhost:8000${NC}"
    echo ""
    echo "You can now:"
    echo -e "  1. Start the backend: ${BLUE}cd server && npm start${NC}"
    echo -e "  2. Start the frontend: ${BLUE}cd client && npm start${NC}"
    echo ""
    exit 0
fi

# Check for Docker first
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}🐳 Docker found!${NC}"
    echo ""
    echo "Starting Chroma with Docker..."
    echo ""
    
    # Check if image exists locally
    if docker images chromadb/chroma:latest &> /dev/null | grep -q chromadb; then
        echo -e "${GREEN}✅ Chroma Docker image found${NC}"
    else
        echo -e "${YELLOW}⬇️  Pulling Chroma Docker image (this may take a minute)...${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Running: docker run -p 8000:8000 chromadb/chroma${NC}"
    echo ""
    
    docker run --rm -p 8000:8000 chromadb/chroma
    exit 0
fi

# Check for Python/pip
if command -v python3 &> /dev/null; then
    echo -e "${YELLOW}🐍 Python found!${NC}"
    echo ""
    
    # Check if chromadb is installed
    if python3 -c "import chromadb" 2>/dev/null; then
        echo -e "${GREEN}✅ Chroma Python package found${NC}"
        echo ""
        echo "Starting Chroma..."
        echo ""
        
        chroma run --host localhost --port 8000
        exit 0
    else
        echo -e "${YELLOW}⬇️  Chroma not installed via pip${NC}"
        echo ""
        echo "Installing chromadb..."
        echo ""
        echo -e "${BLUE}Running: pip3 install chromadb${NC}"
        
        if pip3 install chromadb; then
            echo ""
            echo -e "${GREEN}✅ Installation complete!${NC}"
            echo ""
            echo "Starting Chroma..."
            echo ""
            
            chroma run --host localhost --port 8000
            exit 0
        else
            echo -e "${RED}❌ Failed to install chromadb${NC}"
            exit 1
        fi
    fi
fi

# Neither Docker nor Python found
echo -e "${RED}❌ Neither Docker nor Python found${NC}"
echo ""
echo "Please install one of the following:"
echo ""
echo -e "${YELLOW}Option 1: Install Docker${NC}"
echo "  macOS: brew install docker"
echo "  Or download: https://docs.docker.com/get-docker/"
echo ""
echo -e "${YELLOW}Option 2: Install Python & chromadb${NC}"
echo "  macOS: brew install python3"
echo "  Then: pip3 install chromadb"
echo ""

exit 1
