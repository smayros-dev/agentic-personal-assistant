# 🚀 Agentic RAG Application

Une application **Retrieval Augmented Generation (RAG)** agentic complète avec support pour **Chroma** (local) ou **Pinecone** (cloud).

**Stack:** Node.js + Express | React + Vite | Ollama (qwen2:7b) | LangChain

---

## ⚡ Quick Start: Docker Compose (Recommended)

### 1️⃣ Prérequis
- Docker & Docker Compose installés
- ~15 GB d'espace disque (pour models Ollama)
- Internet (première pull des models)

### 2️⃣ Démarrer
```bash
# Cloner/accéder au repo
cd agentic-personal-assistant

# Copier la configuration par défaut
cp server/.env.example server/.env

# OPTION A: Démarrer tous les services (production-like)
docker-compose up

# OPTION B: Démarrer SEULEMENT l'infrastructure pour le développement
# (Serveur + Frontend en local avec hot-reload)
docker-compose -f docker-compose.dev.yml up
# Puis dans d'autres terminaux: npm run dev (server) + npm run dev (client)
# → Voir DEVELOPMENT_MODE.md pour détails
```

### 3️⃣ Utiliser l'app
```bash
# Ouvrir dans le navigateur
open http://localhost:5173

# Ou depuis mobile/autre PC
open http://<YOUR_IP>:5173

# 1. Upload un PDF
# 2. Chat sur le contenu
# 3. Agent recherche automatiquement dans la KB
```

### 4️⃣ Arrêter
```bash
docker-compose down

# Garder les données (vector store + Ollama models)
docker volume ls | grep agentic

# Reset complètement (supprime tout)
docker-compose down -v
```

---

## 🛠️ Local Development (sans Docker)

### Prérequis
- Node.js 20+
- Ollama running locally (`ollama serve`)
- Chroma or Pinecone configured

### Setup
```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Backend
cd server
cp .env.example .env
# Edit .env: choose VECTOR_DB (chroma or pinecone)
npm start

# Frontend (new terminal)
cd client
npm run dev
# Open http://localhost:5173
```

---

## 🔄 Vector Database Configuration

### Default: Chroma (Local)
```bash
# server/.env
VECTOR_DB=chroma
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=agentic-rag
EMBEDDING_MODEL=nomic-embed-text
```

**Pros:**
- ✅ No API key needed
- ✅ Data stays private (local)
- ✅ Works offline
- ✅ Free
- ✅ Perfect for dev/demo

**Cons:**
- ❌ Limited scale (~100K chunks)
- ❌ Need Docker/local machine

### Switch to Pinecone (Cloud)
```bash
# server/.env
VECTOR_DB=pinecone
PINECONE_API_KEY=pcsk_YOUR_KEY_HERE
PINECONE_INDEX=agentic-rag-index
```

**Pros:**
- ✅ Scales to 1M+ chunks
- ✅ Fully managed
- ✅ Web-based dashboard
- ✅ Production-ready

**Cons:**
- ❌ Need cloud account
- ❌ Data on external servers
- ❌ Cost for large scale

### Switcher Script
```bash
# Quick switch between Chroma and Pinecone
./scripts/config/switch-vectorstore.sh chroma     # → Chroma (local)
./scripts/config/switch-vectorstore.sh pinecone   # → Pinecone (cloud)
```

**See:** [`VECTOR_STORE_SETUP.md`](./VECTOR_STORE_SETUP.md) for detailed guide

---

## 📋 Key Features

- ✅ **Local LLM** — Ollama with qwen2:7b (or any model)
- ✅ **Configurable Vector DB** — Chroma (local) or Pinecone (cloud)
- ✅ **PDF Ingestion** — Automatic chunking & embeddings
- ✅ **Agentic RAG** — LangChain agent searches KB automatically
- ✅ **Chat Interface** — React + Vite frontend
- ✅ **Source Attribution** — Citations with page numbers
- ✅ **Session Persistence** — Memory across chats
- ✅ **Rate Limiting** — Built-in protection against abuse
- ✅ **CORS Whitelist** — Secure by default
- ✅ **Docker Ready** — Single `docker-compose up` to start

---

## 📚 API Endpoints

### Health & Config
```bash
GET /healthz
# → { status: "ok", uptime: 123.45 }

GET /api/config
# → { vectorStore: "CHROMA", config: {...} }
```

### Models
```bash
GET /api/models
# → { models: ["qwen2:7b", "mistral", ...] }
```

### Chat
```bash
POST /api/chat
Content-Type: application/json
{
  "message": "What is RAG?",
  "sessionId": "user-123",
  "model": "qwen2:7b"
}

# → { answer: "Retrieval Augmented Generation is..." }
```

### File Upload
```bash
POST /api/ingest
(multipart/form-data)
file: <PDF file>

# → { success: true, message: "Ingested 42 chunks" }
```

---

## 🛠️ Development vs Production Modes

### Production Mode: `docker-compose.yml`
```bash
docker-compose up
# Démarre: Ollama + Chroma + Server (Docker) + Frontend (npm dev)
# 👍 Recommandé pour: Testing complet, démos, CI/CD
```

### Development Mode: `docker-compose.dev.yml`
```bash
docker-compose -f docker-compose.dev.yml up
# Démarre: Ollama + Chroma (Docker seulement)
# Dans d'autres terminaux:
#   cd server && npm run dev    (hot-reload)
#   cd client && npm run dev    (hot-reload)
# 👍 Recommandé pour: Développement actif, debugging
```

**Voir [`DEVELOPMENT_MODE.md`](./DEVELOPMENT_MODE.md) pour le workflow complet**

---

## 🏗️ Architecture

```
┌─────────────────┐
│  React Frontend │  (5173)
│  (Vite dev)     │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Express Server │  (3001)
│  • /api/chat    │
│  • /api/ingest  │
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌────────┐  ┌──────────┐
│ Ollama │  │  Chroma  │
│  LLM   │  │ Vector DB│
└────────┘  └──────────┘
  (11434)      (8000)
  qwen2:7b   agentic-rag
  (local)    (local)
```

---

## 📊 Performance Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| PDF ingest (10 MB) | ~15-30s | Depends on chunking strategy |
| Vector search | <500ms | Top-5 similarity search |
| LLM response | 10-30s | Depends on qwen2:7b speed |
| Full chat cycle | 15-60s | Search + LLM generation |

**Hardware:** MacBook Air M2 / 8GB RAM / local WiFi

---

## 🐛 Troubleshooting

### Ollama not responding
```bash
# Check if Ollama container is running
docker ps | grep ollama

# Or manually start
ollama serve
```

### Chroma connection refused
```bash
# Ensure Chroma is running
docker ps | grep chroma

# Or restart
docker-compose up chroma
```

### Pinecone auth error
```bash
# Verify API key (must start with pcsk_)
grep PINECONE_API_KEY server/.env

# Get real key from https://app.pinecone.io
```

### Model selector empty
```bash
# Check server logs
docker-compose logs server | grep models

# Ensure Ollama has models
curl http://localhost:11434/api/tags
```

---

## 📚 Documentation

- [`VECTOR_STORE_SETUP.md`](./VECTOR_STORE_SETUP.md) — Detailed vector DB guide
- [`PRODUCTION_ROADMAP.md`](./PRODUCTION_ROADMAP.md) — Feature roadmap (OCR, streaming, citations, etc.)
- [`PINECONE_SETUP.md`](./PINECONE_SETUP.md) — Legacy Pinecone-only guide

---

## 🚀 Production Deployment

### Docker + Chroma (Recommended)
```bash
docker-compose -f docker-compose.yml up -d

# Persistence: chroma_data + ollama_data volumes
```

### Kubernetes + Pinecone
```bash
# Use Pinecone for vector storage (managed)
# Deploy Ollama + Server as K8s pods
kubectl apply -f k8s/

# Set VECTOR_DB=pinecone in ConfigMap
```

### Cloud (AWS/GCP)
```bash
# Use ECR/Artifact Registry for server image
# Use Pinecone for vector DB (no infra to manage)
# Use serverless LLM if preferred (Claude, GPT, etc.)
```

---

## 📦 Dependencies

**Backend:**
- express, cors, morgan, multer
- langchain, @langchain/community, @langchain/textsplitters
- ollama (local embedding model)
- @langchain/pinecone (optional, for Pinecone backend)

**Frontend:**
- react, react-dom
- vite (dev server)
- axios (HTTP client)

**Infrastructure:**
- Docker, Docker Compose
- Ollama (LLM engine)
- Chroma (vector DB)

---

## 📝 License

MIT

---

## 🤝 Contributing

Issues and PRs welcome!

---

**Last Updated:** 2024  
**Version:** 1.0.0  
**Status:** Production-ready ✅
