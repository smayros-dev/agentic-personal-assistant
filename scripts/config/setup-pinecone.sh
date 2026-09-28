#!/bin/bash

# Quick Pinecone Setup Helper (Windows/Git Bash, macOS, Linux)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
. "$PROJECT_ROOT/scripts/lib/common.sh"

echo "════════════════════════════════════════════════════════════════"
echo "  🔑 Agentic RAG - Pinecone Setup Helper"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "To enable PDF uploads, you need to:"
echo ""
echo "1️⃣  Go to: https://app.pinecone.io"
echo "    - Sign up / Log in"
echo "    - Go to API Keys section"
echo "    - Copy your API key (starts with 'pcsk_')"
echo ""
echo "2️⃣  Create a Pinecone Index:"
echo "    - Click 'Indexes' in sidebar"
echo "    - Click 'Create Index'"
echo "    - Name: agentic-rag-index"
echo "    - Dimension: 384"
echo "    - Metric: cosine"
echo "    - Wait 1-2 minutes for creation"
echo ""
echo "3️⃣  Update server/.env file:"
echo "    Replace the placeholder values with your real credentials"
echo ""
read -p "Do you have your Pinecone API key ready? (y/n): " ready

if [ "$ready" = "y" ]; then
    echo ""
    read -p "Enter your Pinecone API Key (pcsk_...): " api_key
    
    if [[ $api_key == pcsk_* ]]; then
        # Update .env file (portable, incl. Windows Controlled Folder Access)
        pa_sed_i "$PROJECT_ROOT/server/.env" "s/PINECONE_API_KEY=.*/PINECONE_API_KEY=$api_key/"
        echo ""
        echo "✅ Updated server/.env with your API key"
        echo ""
        echo "Now restarting server..."
        echo ""
        cd "$PROJECT_ROOT/server"
        npm run dev
    else
        echo "❌ Invalid API key format (must start with 'pcsk_')"
        exit 1
    fi
else
    echo ""
    echo "❌ Setup incomplete. Please get your Pinecone API key first."
    echo "   Visit: https://app.pinecone.io"
    exit 1
fi
