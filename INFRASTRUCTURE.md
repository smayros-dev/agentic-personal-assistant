# 🚀 Infrastructure Setup & Startup Guide

Complete guide to starting all services for the Agentic Personal Assistant.

---

## ⚡ FASTEST WAY: One Command

```bash
./start.sh
```

That's it! Everything starts in the right order. 🎉

---

## 📦 Services Started

| Service | Port | Purpose |
|---------|------|---------|
| **Chroma** | 8000 | Vector database (stores PDF embeddings) |
| **Backend** | 3001 | Node.js API server (processes PDFs, chat) |
| **Frontend** | 5173 | React UI (upload PDFs, chat interface) |

---

## 🎯 Prerequisites

Choose ONE installation method:

### **Option A: Docker** (Recommended)
```bash
brew install docker
```

### **Option B: Python**
```bash
brew install python3
pip3 install chromadb
```

---

## 🚀 Startup Methods

### **Method 1: All Services at Once** ⭐ (RECOMMENDED)

```bash
./start.sh
```

**What it does:**
- ✅ Starts Chroma
- ✅ Starts Backend (waits for Chroma)
- ✅ Starts Frontend (waits for Backend)
- ✅ Shows all URLs and log locations
- ✅ Clean shutdown with Ctrl+C

**Time to ready:** ~60 seconds

---

### **Method 2: Individual Services** (For Development)

**Terminal 1 - Chroma:**
```bash
./start-chroma-service.sh
```

**Terminal 2 - Backend:**
```bash
./start-backend-service.sh
```

**Terminal 3 - Frontend:**
```bash
./start-frontend-service.sh
```

**Benefits:**
- ✅ Monitor each service separately
- ✅ Easy to restart individual services
- ✅ Can see logs in real-time per terminal

---

### **Method 3: Manual** (For Debugging)

**Terminal 1 - Chroma:**
```bash
# Option A: Python
chroma run --host localhost --port 8000

# Option B: Docker
docker run -p 8000:8000 chromadb/chroma
```

**Terminal 2 - Backend:**
```bash
cd server
npm install  # If needed
npm start
```

**Terminal 3 - Frontend:**
```bash
cd client
npm install  # If needed
npm start
```

---

## ✅ Verification

Once all services are running:

```bash
# Check Chroma
curl http://localhost:8000/api/v1
# Should return: {}

# Check Backend
curl http://localhost:3001/health
# Should return health status

# Check Frontend
curl http://localhost:5173
# Should return HTML
```

Or visit in browser: **http://localhost:5173**

---

## 📊 Service Details

### **Chroma Vector Database**

**Start script:** `./start-chroma-service.sh`

**What it does:**
- Auto-detects Docker or Python
- Auto-installs chromadb if needed
- Starts on `http://localhost:8000`
- Stores PDF embeddings

**Installation check:**
```bash
# Python method
python3 -c "import chromadb; print('OK')"

# Docker method
docker image inspect chromadb/chroma
```

---

### **Backend API Server**

**Start script:** `./start-backend-service.sh`

**What it does:**
- Checks Node.js and npm installed
- Installs npm dependencies if needed
- Creates/verifies `.env` configuration
- Starts on `http://localhost:3001`

**Key files:**
- `server/package.json` - Dependencies
- `server/.env` - Configuration
- `server/index.js` - Main server

**Environment variables (in `server/.env`):**
```env
PORT=3001
VECTOR_DB=chroma
CHROMA_URL=http://localhost:8000
API_KEY=dev-key
RATE_LIMIT_MAX=30
```

---

### **Frontend React App**

**Start script:** `./start-frontend-service.sh`

**What it does:**
- Checks Node.js and npm installed
- Installs npm dependencies if needed
- Starts Vite dev server on `http://localhost:5173`

**Key files:**
- `client/package.json` - Dependencies
- `client/src/App.jsx` - Main React component
- `vite.config.js` - Vite configuration

---

## 📝 Logs

All logs are saved to: `/tmp/agentic-assistant-logs/`

```bash
# View Chroma logs
tail -f /tmp/agentic-assistant-logs/chroma.log

# View Backend logs
tail -f /tmp/agentic-assistant-logs/backend.log

# View Frontend logs
tail -f /tmp/agentic-assistant-logs/frontend.log

# View all logs
ls -lah /tmp/agentic-assistant-logs/
```

---

## 🆘 Troubleshooting

### **Problem: Chroma won't start**

```bash
# Check if Docker is installed
docker --version

# Check if Python Chroma is installed
python3 -c "import chromadb"

# Try manual start
chroma run --host localhost --port 8000

# Or with Docker
docker run -p 8000:8000 chromadb/chroma

# Check logs
tail -f /tmp/agentic-assistant-logs/chroma.log
```

### **Problem: Backend won't start**

```bash
# Check Node.js
node --version
npm --version

# Check port 3001
lsof -i :3001

# Install dependencies
cd server
npm install

# Check environment
cat server/.env | grep CHROMA

# Manual start
npm start

# Check logs
tail -f /tmp/agentic-assistant-logs/backend.log
```

### **Problem: Frontend won't start**

```bash
# Check Node.js
node --version

# Check port 5173
lsof -i :5173

# Install dependencies
cd client
npm install

# Manual start
npm start

# Check logs
tail -f /tmp/agentic-assistant-logs/frontend.log
```

### **Problem: Port already in use**

```bash
# Find what's using the port
lsof -i :8000    # Chroma
lsof -i :3001    # Backend
lsof -i :5173    # Frontend

# Kill the process
kill -9 <PID>

# Restart services
./start.sh
```

### **Problem: Services not communicating**

```bash
# Test each service
curl http://localhost:8000/api/v1      # Chroma
curl http://localhost:3001/health      # Backend
curl http://localhost:5173             # Frontend

# Check if backend can reach Chroma
grep CHROMA_URL server/.env

# Check if frontend can reach backend
# Look at client network requests in browser DevTools
```

---

## 🎯 First Time Usage

1. **Start everything:**
   ```bash
   ./start.sh
   ```

2. **Wait for all services to start** (~60 seconds)

3. **Open browser:**
   ```
   http://localhost:5173
   ```

4. **Upload a PDF:**
   - Click "Upload Document"
   - Select a PDF file
   - Wait for ✅ confirmation

5. **Chat with PDF:**
   - Type your question
   - Get AI-powered answers based on your PDF

6. **Verify RAG pipeline:**
   ```bash
   python3 verify-rag.py
   ```

---

## 🔧 Development Tips

### **Hot Reload**
- Frontend: Automatically hot-reloads on code changes (Vite)
- Backend: Need to restart (`npm start` in server dir)
- Chroma: No reload needed (just stores data)

### **View Network Requests**
```bash
# In browser DevTools: Network tab
# Shows all API calls between Frontend and Backend

# Or use curl to test backend directly
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "session_id": "test"}'
```

### **Database State**
```bash
# View what's in Chroma
python3 << 'EOF'
import chromadb
client = chromadb.HttpClient(host="localhost", port=8000)
for col in client.list_collections():
    print(f"Collection: {col.name}")
    items = col.get()
    print(f"  Documents: {len(items['ids'])}")
EOF
```

### **Reset Everything**

```bash
# Stop all services
pkill -f "npm start"
pkill -f "chroma"
docker stop agentic-chroma 2>/dev/null || true

# Clear logs
rm -rf /tmp/agentic-assistant-logs

# Clear Chroma data (if using Python)
rm -rf ~/.cache/chroma

# Or reset Docker volume
docker volume rm chroma-data 2>/dev/null || true

# Restart fresh
./start.sh
```

---

## 📚 Scripts Reference

| Script | Purpose | Use Case |
|--------|---------|----------|
| `start.sh` | Start all services | First time setup, production-like |
| `start-chroma-service.sh` | Start Chroma only | Debugging Chroma issues |
| `start-backend-service.sh` | Start Backend only | Debugging Backend issues |
| `start-frontend-service.sh` | Start Frontend only | Debugging Frontend issues |
| `verify-rag.py` | Test RAG pipeline | Verify PDF upload works |

---

## 🎓 Architecture

```
┌─────────────────────────────────────────────────────┐
│        Frontend (React)                              │
│        http://localhost:5173                         │
│  - Upload PDF interface                              │
│  - Chat interface                                    │
└────────────────────┬────────────────────────────────┘
                     │ HTTP
                     │ REST API
                     ▼
┌─────────────────────────────────────────────────────┐
│        Backend (Node.js)                             │
│        http://localhost:3001                         │
│  - PDF parsing                                       │
│  - LLM integration                                   │
│  - Vector DB interface                              │
└────────────────────┬────────────────────────────────┘
                     │ HTTP
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│        Chroma Vector Database                        │
│        http://localhost:8000                         │
│  - Stores PDF embeddings                            │
│  - Similarity search                                │
└─────────────────────────────────────────────────────┘
```

---

## ✨ What's Next

After everything is running:

1. **Upload a PDF** - Test the upload system
2. **Chat with it** - Ask questions about the PDF
3. **Run RAG verification** - `python3 verify-rag.py`
4. **Check logs** - View what's happening
5. **Explore the code** - Understand the architecture
6. **Deploy to production** - See deployment guides

---

## 📖 Additional Resources

- [Chroma Setup Guide](./CHROMA_SETUP_GUIDE.md) - Detailed Chroma configuration
- [Quick Start](./QUICK_START.md) - 60-second startup
- [RAG Pipeline Verification](./VERIFY_RAG_PIPELINE.md) - Test your setup
- [PDF Upload Verification](./PDF_UPLOAD_SUCCESS_REPORT.md) - PDF upload status
- [Architecture Index](./CHROMA_SETUP_INDEX.md) - Document navigation

---

## 🎊 Summary

**Everything you need to know:**

| Task | Command |
|------|---------|
| Start all services | `./start.sh` |
| Start Chroma only | `./start-chroma-service.sh` |
| View logs | `tail -f /tmp/agentic-assistant-logs/*` |
| Test setup | `python3 verify-rag.py` |
| Open app | Browser → http://localhost:5173 |
| Stop everything | Ctrl+C in terminal |

---

**Ready?** Run:

```bash
./start.sh
```

Then open: **http://localhost:5173**

Enjoy! 🚀
