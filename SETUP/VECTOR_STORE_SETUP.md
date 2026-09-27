# Vector Store Setup Guide

Ce projet supporte **deux bases de données vectorielles** pour stocker et rechercher les PDFs :

1. **Chroma** (Local) — ✅ Recommandé pour développement & déploiement privé
2. **Pinecone** (Cloud) — Pour scale commercial

## 🚀 Quick Start: Chroma Local (Docker)

### Configuration minimale

```bash
# 1. Copier .env.example → .env
cp server/.env.example server/.env

# 2. Vérifier que VECTOR_DB=chroma dans server/.env
cat server/.env | grep VECTOR_DB
# Output: VECTOR_DB=chroma

# 3. Démarrer avec docker-compose
docker-compose up
# ✓ Ollama démarre sur :11434
# ✓ Chroma démarre sur :8000  
# ✓ Server démarre sur :3001
# ✓ React dev démarre sur :5173

# 4. Uploader un PDF
open http://localhost:5173
# → Click "Upload PDF"
# → Chat sur le contenu

# 5. Vérifier la config
curl http://localhost:3001/api/config
# Output:
# {
#   "vectorStore": "CHROMA",
#   "config": {
#     "provider": "chroma",
#     "chroma": {
#       "url": "http://localhost:8000",
#       "collection": "agentic-rag",
#       "embeddingModel": "nomic-embed-text",
#       "ollamaUrl": "http://localhost:11434"
#     }
#   }
# }
```

### Arrêter et nettoyer

```bash
# Arrêter les services
docker-compose down

# Garder les données (Chroma persistent volume)
docker-compose down  # ✓ Chroma data persiste

# Nettoyer complètement (reset vector DB)
docker-compose down -v
# ⚠️  Cela supprime chroma_data, ollama_data
# Relancer pour réindexer PDFs
```

---

## ☁️ Switch to Pinecone (Cloud)

### 1. Créer un compte Pinecone

```bash
# Aller à https://app.pinecone.io
# Sign up (gratuit)
# Créer un index:
#   Name: agentic-rag-index
#   Dimension: 384  (pour llama-text-embed-v2)
#   Metric: cosine
```

### 2. Configurer .env pour Pinecone

```bash
# server/.env
VECTOR_DB=pinecone

# Trouver votre API key dans Pinecone console
# https://app.pinecone.io → Dashboard → API keys
PINECONE_API_KEY=pcsk_YOUR_REAL_KEY_HERE
PINECONE_INDEX=agentic-rag-index

# Commenter les settings Chroma
# CHROMA_URL=...
# CHROMA_COLLECTION=...
```

### 3. Relancer le serveur

```bash
npm run dev
# or
node server/index.js
```

### 4. Vérifier Pinecone

```bash
curl http://localhost:3001/api/config
# Output:
# {
#   "vectorStore": "PINECONE",
#   "config": {
#     "provider": "pinecone",
#     "pinecone": {
#       "apiKey": "***",
#       "index": "agentic-rag-index"
#     }
#   }
# }
```

---

## 🔄 Comparison Matrix

| Feature | Chroma (Local) | Pinecone (Cloud) |
|---------|--------|--------|
| **Setup** | `docker-compose up` ✅ | API key + config ⚙️ |
| **Cost** | Free | Free tier + $0.10/month per GB |
| **Data Location** | Local/Private | Pinecone servers |
| **Network** | Works offline ✅ | Needs internet |
| **Scale** | ~100K chunks | 1M+ chunks |
| **Embedding Model** | Ollama (local) | llama-text-embed-v2 (cloud) |
| **Deployment** | Self-hosted | Managed |
| **Ideal For** | Dev, Private, Edge | Production, Shared |

---

## 🛠️ Troubleshooting

### Chroma: Connection refused (http://localhost:8000)

```bash
# Vérifier que Chroma est running
docker ps | grep chroma
# Output: agentic-chroma  ...  0.0.0.0:8000->8000/tcp

# Si pas running, démarrer
docker-compose up chroma
```

### Pinecone: UNABLE_TO_GET_ISSUER_CERT_LOCALLY

```
❌ PineconeConnectionError: UNABLE_TO_GET_ISSUER_CERT_LOCALLY
```

**Solution:**
- Vérifier que `PINECONE_API_KEY` est un vrai key (commence avec `pcsk_`, pas `pcsk_zzzzz`)
- Vérifier internet connection
- Si vous n'avez pas créé l'index, créez-le à https://app.pinecone.io

### Ollama embeddings not available

```
❌ Error: Model "nomic-embed-text" not found
```

**Solution:**
```bash
# Pull manually
docker exec agentic-ollama ollama pull nomic-embed-text
# Wait ~5 minutes...
# Restart server
```

---

## 📊 Monitoring

### Logs locaux (Chroma)

```bash
# Voir logs du conteneur Chroma
docker-compose logs chroma -f

# Voir logs du serveur
docker-compose logs server -f

# Tous les logs
docker-compose logs -f
```

### Logs cloud (Pinecone)

```bash
# Dashboard: https://app.pinecone.io
# → Index tab
# → View query stats, index status, etc.
```

---

## 🚀 Production Deployment

### Docker with Chroma (Recommended)

```bash
# Tout inclus: Ollama + Chroma + Server + React
docker-compose up -d

# Données persistent dans volumes:
# - ollama_data:/root/.ollama
# - chroma_data:/chroma/data
```

### Kubernetes with Pinecone

```bash
# Déployer Ollama + Server seulement
# Vector DB = managed Pinecone
helm install agentic ./k8s
```

---

## Environment Variables Reference

```bash
# VECTOR_DB: qui utiliser?
VECTOR_DB=chroma                    # ou "pinecone"

# === CHROMA Settings ===
CHROMA_URL=http://localhost:8000    # URL du serveur Chroma
CHROMA_COLLECTION=agentic-rag       # Nom de la collection
EMBEDDING_MODEL=nomic-embed-text    # Model pour embeddings (via Ollama)

# === PINECONE Settings ===
PINECONE_API_KEY=pcsk_xxxxx         # API key (https://app.pinecone.io)
PINECONE_INDEX=agentic-rag-index    # Nom de l'index Pinecone

# === Ollama (utilisé par les deux) ===
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2:7b               # LLM pour chat

# === Server ===
PORT=3001
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
API_KEY=                            # Optionnel: auth token
```

---

## 📚 Next Steps

1. ✅ Choose your vector DB (Chroma for dev, Pinecone for prod)
2. ✅ Start with `docker-compose up` or `.env` configuration
3. ✅ Upload PDFs and test retrieval
4. 📝 [See PRODUCTION_ROADMAP.md](./PRODUCTION_ROADMAP.md) for next features

---

**Last updated:** 2024
**Supported:** Ollama qwen2:7b, mistral; Chroma 0.4.x; Pinecone v2
