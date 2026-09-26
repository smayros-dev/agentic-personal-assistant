# 🤖 Ollama Model Installation Automation

This guide explains how to automatically install and manage models in Ollama.

---

## 🚀 Quick Start

### Option 1: Using NPM Scripts (Easiest)

```bash
# Install default models (qwen2:7b, mistral:7b, neural-chat:7b)
npm run install:models:default

# List all installed models
npm run list:models

# Install custom models
npm run install:models:custom mistral:7b llama2:7b
```

### Option 2: Using the Bash Script Directly

```bash
# Install default models
./install-models.sh

# Install specific models
./install-models.sh mistral:7b llama2:7b

# Install multiple models at once
./install-models.sh mistral:7b llama2:7b neural-chat:7b dolphin-mixtral:latest
```

### Option 3: Using Docker Exec (Advanced)

```bash
# Install a single model
docker exec -it agentic-ollama-dev ollama pull mistral:7b

# List installed models
docker exec agentic-ollama-dev ollama list
```

---

## 📚 Available Models

### Small & Fast (Recommended for Development)

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| **qwen2:7b** | 3.8GB | ⚡ Very Fast | ⭐⭐⭐ |
| **mistral:7b** | 3.8GB | ⚡ Very Fast | ⭐⭐⭐⭐ |
| **neural-chat:7b** | 3.8GB | ⚡ Very Fast | ⭐⭐⭐⭐ |
| **llama2:7b** | 3.5GB | ⚡ Very Fast | ⭐⭐⭐ |

### Medium (Good Balance)

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| **mistral:13b** | 7.4GB | 🚀 Fast | ⭐⭐⭐⭐ |
| **neural-chat:13b** | 7.4GB | 🚀 Fast | ⭐⭐⭐⭐⭐ |
| **llama2:13b** | 7.3GB | 🚀 Fast | ⭐⭐⭐⭐ |

### Large & Powerful (Production)

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| **dolphin-mixtral** | 12GB | 🐢 Slow | ⭐⭐⭐⭐⭐ |
| **mistral:large** | 26GB | 🐢 Slow | ⭐⭐⭐⭐⭐ |

### Embedding Models (For Vector DB)

| Model | Size | Purpose |
|-------|------|---------|
| **nomic-embed-text:latest** | 274MB | Text embeddings for Chroma |
| **mxbai-embed-large:latest** | 1.4GB | High-quality embeddings |

---

## 🎯 Recommended Setup

For optimal performance with your Agentic RAG:

```bash
# Install 1 chat model + 1 embedding model
npm run install:models mistral:7b nomic-embed-text:latest

# Or install multiple options
npm run install:models mistral:7b llama2:7b neural-chat:7b nomic-embed-text:latest
```

---

## 🔄 Batch Installation

Install multiple models in one command:

```bash
# All recommended models
npm run install:models mistral:7b llama2:7b neural-chat:7b nomic-embed-text:latest

# Ultra-light setup (for slower machines)
npm run install:models qwen2:7b nomic-embed-text:latest

# Full-featured setup (requires ~50GB disk space)
npm run install:models mistral:7b llama2:13b neural-chat:13b dolphin-mixtral nomic-embed-text:latest mxbai-embed-large:latest
```

---

## 📋 Verify Installation

After installation, verify models are available:

```bash
# List all installed models
npm run list:models

# Or via Docker
docker exec agentic-ollama-dev ollama list
```

**Expected Output:**
```
NAME                           	ID          	SIZE  	MODIFIED
mistral:latest                 	a90719f7e04d	3.5 GB	3 minutes ago
qwen2:7b                       	78e26419b446	3.8 GB	2 minutes ago
neural-chat:latest             	ea319d3ccc09	3.8 GB	1 minute ago
nomic-embed-text:latest        	0a9b67672fe3	274 MB	30 seconds ago
```

---

## 🌐 Using Models in the Web UI

1. **Open the Application**
   ```
   http://localhost:5175
   ```

2. **Refresh the Page**
   - New models will appear in the "Model:" dropdown

3. **Select a Model**
   - Click dropdown and choose your preferred model
   - Selection persists in browser localStorage

4. **Start Chatting**
   - Type your question and send
   - AI will respond using selected model

---

## ⚙️ Customization

### Auto-Install on Docker Startup

Modify `docker-compose.dev.yml` to auto-install models:

```yaml
ollama:
  image: ollama/ollama:latest
  ports:
    - "11434:11434"
  volumes:
    - ollama_data:/root/.ollama
    - ./ollama-startup.sh:/ollama-startup.sh
  environment:
    - OLLAMA_MODELS=mistral:7b,llama2:7b,nomic-embed-text:latest
  entrypoint: "/ollama-startup.sh"
```

Then modify `ollama-startup.sh`:

```bash
#!/bin/bash
ollama serve &
sleep 10

# Auto-pull models from env var
if [ ! -z "$OLLAMA_MODELS" ]; then
  IFS=',' read -ra MODELS <<< "$OLLAMA_MODELS"
  for model in "${MODELS[@]}"; do
    echo "Pulling $model..."
    ollama pull "$model"
  done
fi

wait
```

### Environment Variable Configuration

```bash
# Set default models via env var
export OLLAMA_MODELS="mistral:7b,llama2:7b,nomic-embed-text:latest"

# Then run docker-compose
docker-compose -f docker-compose.dev.yml up
```

---

## 🐛 Troubleshooting

### "Could not connect to Ollama server"

```bash
# Restart Ollama container
docker-compose -f docker-compose.dev.yml restart ollama

# Wait a few seconds, then try again
sleep 10
npm run list:models
```

### Model Installation Fails

```bash
# Check Ollama logs
docker-compose -f docker-compose.dev.yml logs ollama

# Check disk space
df -h

# Restart Docker
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up ollama -d
```

### Models Not Showing in Dropdown

```bash
# Verify models are installed
npm run list:models

# Refresh browser (Ctrl+Shift+R for hard refresh)
# Open DevTools > Console > Check for errors
# Clear localStorage: localStorage.clear()
# Reload page
```

---

## 📊 Disk Space Requirements

- **Default models**: ~8GB
- **Medium setup**: ~15GB
- **Full setup**: ~50GB+

Check available space:
```bash
df -h
```

Free space if needed:
```bash
# Remove all models
docker exec agentic-ollama-dev ollama rm -a

# Or remove specific model
docker exec agentic-ollama-dev ollama rm mistral:7b
```

---

## 🎓 Learning Resources

- **Ollama Official Library**: https://ollama.ai/library
- **Model Details**: Visit https://ollama.ai/library/[model-name]
- **API Documentation**: https://github.com/ollama/ollama/blob/main/docs/api.md

---

## 📝 Example Workflows

### Workflow 1: Development (Minimal)

```bash
# Install smallest models for fast iteration
npm run install:models qwen2:7b nomic-embed-text:latest
```

### Workflow 2: Production (Balanced)

```bash
# Install production-grade models
npm run install:models mistral:7b llama2:13b neural-chat:7b nomic-embed-text:latest
```

### Workflow 3: Multi-Model (Comparison)

```bash
# Install multiple models for A/B testing
npm run install:models mistral:7b llama2:7b neural-chat:7b dolphin-mixtral nomic-embed-text:latest
```

---

## 🔐 Security Notes

- All model downloads happen locally (no external API keys needed)
- Models stored in Docker volume (`ollama_data`)
- No data sent to external servers (offline-capable)
- Container isolation ensures security

---

**Last Updated:** September 26, 2026  
**Status:** ✅ Ready to Use  
**Version:** 1.0
