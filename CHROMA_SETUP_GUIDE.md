# 🐳 Chroma Vector Database Setup Guide

Complete guide to configure and run Chroma for the Agentic Personal Assistant.

---

## ⚡ Quick Start (60 seconds)

```bash
# 1. Make sure you have Docker or Python
# 2. Run the all-in-one script
./scripts/dev.sh

# 3. Open your browser
http://localhost:5173
```

**That's it!** All services auto-start. ✅

---

## 🎯 What is Chroma?

Chroma is a **vector database** that stores:
- ✅ Document embeddings (converted PDF text → numerical vectors)
- ✅ Similarity search (find relevant chunks based on questions)
- ✅ Retrieval-Augmented Generation (RAG) functionality

**Why we need it:**
1. Upload PDF → Extract text
2. Convert text → Embeddings (using Ollama)
3. Store embeddings → Chroma database
4. Query → Find relevant chunks
5. AI → Answer based on document content

---

## 📋 Installation Options

### **Option 1: Docker** (Recommended)

**Install Docker:**
```bash
# macOS
brew install docker

# Or download: https://docs.docker.com/get-docker/
```

**Start Chroma:**
```bash
docker run -p 8000:8000 chromadb/chroma
```

✅ **Pros:** Fast, isolated, no Python dependencies  
❌ **Cons:** Requires Docker installation

---

### **Option 2: Python**

**Install Python & Chroma:**
```bash
# macOS
brew install python3

# Install chromadb
pip3 install chromadb
```

**Start Chroma:**
```bash
chroma run --host localhost --port 8000
```

✅ **Pros:** Lightweight, no additional software  
❌ **Cons:** Requires Python 3.8+

---

## 🚀 Usage

### **Automated (Recommended)**

```bash
./scripts/dev.sh
```

This script:
- ✅ Auto-detects Docker or Python
- ✅ Starts Chroma automatically
- ✅ Starts Backend + Frontend
- ✅ Manages all services
- ✅ Auto-cleanup on Ctrl+C

### **Manual - One Command Per Terminal**

**Terminal 1: Chroma**
```bash
./scripts/start-chroma.sh
# OR
docker run -p 8000:8000 chromadb/chroma
# OR
chroma run --host localhost --port 8000
```

**Terminal 2: Backend**
```bash
cd server
npm start
```

**Terminal 3: Frontend**
```bash
cd client
npm start
```

---

## ✅ Verification

### **Check Chroma is Running**

```bash
# Should return: {}
curl http://localhost:8000/api/v1
```

Or visit: **http://localhost:8000/docs**

### **Check Backend Connection**

```bash
# Should return: {"status": "ok"}
curl http://localhost:3001/health
```

### **Check Frontend**

Open: **http://localhost:5173**

---

## 🔧 Configuration

### **Environment Variables** (`server/.env`)

```env
# Vector Database Type
VECTOR_DB=chroma

# Chroma Connection
CHROMA_URL=http://localhost:8000

# Optional: Pinecone instead (comment out Chroma)
# VECTOR_DB=pinecone
# PINECONE_API_KEY=your-api-key
# PINECONE_INDEX=your-index-name
```

**Already configured?** ✅ Check:
```bash
cat server/.env | grep CHROMA
```

Should show:
```
CHROMA_URL=http://localhost:8000
```

---

## 💾 Data Persistence

### **Chroma Data Location**

**Docker:**
```bash
# Data is lost when container stops
# To persist, use volume mount:
docker run -p 8000:8000 -v chroma-data:/chroma/chroma chromadb/chroma
```

**Python:**
```bash
# Data stored in: ~/.cache/chroma/
# Or set custom path:
export CHROMA_DATA_PATH=/path/to/data
chroma run --host localhost --port 8000
```

### **Backup Data**

```bash
# Copy Chroma data
cp -r ~/.cache/chroma/ ~/chroma-backup/
```

---

## 🆘 Troubleshooting

### **Issue: Port 8000 already in use**

```bash
# Find what's using port 8000
lsof -i :8000

# Kill the process
kill -9 <PID>

# Restart Chroma
./scripts/start-chroma.sh
```

### **Issue: "ChromaConnectionError"**

```bash
# Verify Chroma is running
curl http://localhost:8000/api/v1

# If not responding:
# 1. Check if Docker/Python process is running
# 2. Check logs
# 3. Restart

./scripts/start-chroma.sh
```

### **Issue: PDF upload succeeds but chat fails**

```bash
# Check error message for "Missing CHROMA_URL"
tail -f /tmp/backend.log

# Verify CHROMA_URL is set
grep CHROMA_URL server/.env

# If missing, add it:
echo "CHROMA_URL=http://localhost:8000" >> server/.env

# Restart backend
pkill -f "npm start"
cd server && npm start
```

### **Issue: "ChromaDB is not responding"**

```bash
# Option 1: Chroma crashed - restart it
./scripts/start-chroma.sh

# Option 2: Chroma overloaded - increase resources
# If using Docker:
docker run -p 8000:8000 \
  --memory=2g \
  --cpus=2 \
  chromadb/chroma

# Option 3: Check Chroma logs
# Docker: docker logs <container_id>
# Python: Check /tmp/chroma.log
```

### **Issue: Python/Docker not installed**

```bash
# Option A: Install Docker
brew install docker

# Option B: Install Python
brew install python3
pip3 install chromadb

# Then try:
./scripts/dev.sh
```

---

## 📊 Monitoring Chroma

### **View Chroma Logs**

```bash
# If using dev.sh:
tail -f /tmp/chroma.log

# If using Docker:
docker logs <container_id>

# If using Python:
# Logs printed to console
```

### **Chroma API Endpoints**

```bash
# Health check
curl http://localhost:8000/api/v1

# List collections
curl http://localhost:8000/api/v1/collections

# Get collection details
curl http://localhost:8000/api/v1/collections/<collection_id>
```

### **Performance Metrics**

Monitor resource usage:

```bash
# Docker
docker stats

# macOS system
top -p <chroma_pid>
```

---

## 🎯 PDF Upload Workflow

Once Chroma is running:

1. **Upload PDF** → Frontend sends file to Backend
2. **Parse PDF** → Extract text pages
3. **Split Chunks** → Convert to smaller pieces (1000 chars)
4. **Embed** → Convert text to vectors (using Ollama)
5. **Store** → Save in Chroma vector DB
6. **Chat** → User asks question
7. **Search** → Query Chroma for relevant chunks
8. **Generate** → LLM combines chunks + question
9. **Response** → Send answer to user

---

## 🚀 Advanced Configuration

### **Switch to Pinecone** (Cloud)

```env
VECTOR_DB=pinecone
PINECONE_API_KEY=your-api-key
PINECONE_INDEX=your-index-name
```

### **Use Different Embedding Model**

```env
# Current (Local Ollama):
EMBEDDING_MODEL=nomic-embed-text

# Alternative:
EMBEDDING_MODEL=bge-large
```

### **Adjust Chunk Size**

Edit `server/vectorstore.js`:
```javascript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,        // Larger = fewer chunks, less precise
  chunkOverlap: 200,      // Larger = more overlap, slower
});
```

---

## ✅ Checklist

Before going to production:

- [ ] Chroma starts without errors
- [ ] Can upload PDF without errors
- [ ] PDF chunks appear in Chroma
- [ ] Chat searches Chroma successfully
- [ ] Answers are based on document content
- [ ] Response time is acceptable (< 5 seconds)
- [ ] No memory leaks (check with `docker stats`)
- [ ] Error handling works (try invalid PDFs)
- [ ] Security headers active (run: `curl -I http://localhost:3001`)

---

## 📚 Resources

- **Chroma Docs:** https://docs.trychroma.com/
- **LangChain Docs:** https://js.langchain.com/
- **Ollama Docs:** https://ollama.ai/
- **RAG Concepts:** https://docs.langchain.com/oss/javascript/langgraph/

---

## 🎓 Key Files

| File | Purpose |
|------|---------|
| `server/.env` | Chroma URL configuration |
| `server/vectorstore.js` | Chroma integration code |
| `server/ingest.js` | PDF → Chroma pipeline |
| `server/index.js` | API endpoints |
| `scripts/start-chroma.sh` | Auto-start Chroma |
| `scripts/dev.sh` | Start everything |

---

## ❓ FAQ

**Q: Can I use Chroma with multiple users?**  
A: Yes, but each user's documents will be in same collection. For production, use separate databases per user or use Chroma's native multi-user features.

**Q: How much data can Chroma store?**  
A: Depends on available disk space. For 1000 PDFs (~1-5MB each), ~10GB disk needed.

**Q: Is Chroma production-ready?**  
A: Yes for small/medium deployments. For enterprise, consider Pinecone/Weaviate.

**Q: Can I run Chroma in the cloud?**  
A: Yes - Docker, Kubernetes, or managed services. See: https://docs.trychroma.com/deployment

**Q: What if Chroma crashes?**  
A: Data is safe (persisted to disk). Just restart it. PDF uploads will continue working.

---

**Ready?** Run:
```bash
./scripts/dev.sh
```

Then open: **http://localhost:5173**

Enjoy! 🎉
