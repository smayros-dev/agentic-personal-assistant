# 🚀 Development Scripts

All-in-one scripts to manage the Agentic Personal Assistant services.

---

## 📋 Available Scripts

### 1. **start-chroma.sh** - Start Vector Database Only
```bash
./scripts/start-chroma.sh
```

**What it does:**
- ✅ Checks if Chroma is already running
- ✅ Auto-detects Docker or Python
- ✅ Automatically installs chromadb if missing
- ✅ Starts Chroma vector database on `http://localhost:8000`

**Requirements:**
- Docker: `brew install docker` OR
- Python: `brew install python3` then `pip3 install chromadb`

**Usage:**
```bash
./scripts/start-chroma.sh
# Keep this terminal running while using the app
```

---

### 2. **dev.sh** - Start Everything (Recommended ⭐)
```bash
./scripts/dev.sh
```

**What it does:**
- ✅ Starts Chroma vector database
- ✅ Starts Backend server (port 3001)
- ✅ Starts Frontend (port 5173)
- ✅ Manages all processes together
- ✅ Auto-cleans up on Ctrl+C

**Usage:**
```bash
./scripts/dev.sh
# Press Ctrl+C to stop everything
```

**Output logs:**
```bash
tail -f /tmp/chroma.log     # Vector database logs
tail -f /tmp/backend.log    # Backend server logs
tail -f /tmp/frontend.log   # Frontend dev server logs
```

---

### 3. **start-all.sh** - Start in Separate Terminals
```bash
./scripts/start-all.sh
```

**What it does:**
- ✅ Opens separate terminal windows for each service
- ✅ Useful for macOS development
- ✅ Each service has its own terminal

**Usage:**
```bash
./scripts/start-all.sh
# Each service opens in a new terminal tab
```

---

## 🎯 Quick Start

### **Option A: Single Command (Easiest)**
```bash
./scripts/dev.sh
```
Then open in browser:
- Frontend: http://localhost:5173

### **Option B: Manual Control**
```bash
# Terminal 1: Start Chroma
./scripts/start-chroma.sh

# Terminal 2: Start Backend
cd server && npm start

# Terminal 3: Start Frontend
cd client && npm start
```

---

## ✅ Service Checklist

When all services are running, verify:

| Service | URL | Status |
|---------|-----|--------|
| **Chroma** | http://localhost:8000/api/v1 | Should return `{}` |
| **Backend** | http://localhost:3001/health | Should return health status |
| **Frontend** | http://localhost:5173 | Should show UI |

### Quick health check:
```bash
curl http://localhost:8000/api/v1      # Chroma
curl http://localhost:3001/health      # Backend  
curl http://localhost:5173             # Frontend
```

---

## 🔧 Troubleshooting

### Chroma won't start
```bash
# Check if port 8000 is in use
lsof -i :8000

# If in use, kill the process
kill -9 <PID>

# Then try again
./scripts/start-chroma.sh
```

### Backend won't start
```bash
# Check if port 3001 is in use
lsof -i :3001

# Install dependencies if needed
cd server && npm install && npm start
```

### Frontend won't start
```bash
# Check if port 5173 is in use
lsof -i :5173

# Install dependencies if needed
cd client && npm install && npm start
```

### Chroma Python installation fails
```bash
# Install via pip directly
pip3 install chromadb

# Or use Docker instead
docker run -p 8000:8000 chromadb/chroma
```

---

## 📊 Environment Variables

Key environment variables (set in `server/.env`):

```env
# Vector Database
VECTOR_DB=chroma
CHROMA_URL=http://localhost:8000

# Optional: Pinecone (instead of Chroma)
# VECTOR_DB=pinecone
# PINECONE_API_KEY=your-key
# PINECONE_INDEX=your-index

# API Security
API_KEY=your-api-key-here

# Rate Limiting
RATE_LIMIT_MAX=30
RATE_LIMIT_WINDOW_MS=60000
```

---

## 🎓 Development Tips

### View logs in real-time
```bash
# Chroma logs
tail -f /tmp/chroma.log

# Backend logs
tail -f /tmp/backend.log

# Frontend logs
tail -f /tmp/frontend.log
```

### Restart a single service (while dev.sh is running)
```bash
# Find the PID
ps aux | grep "npm start"

# Kill it
kill <PID>

# It will automatically restart
```

### Clear all services
```bash
pkill -f "npm start"
pkill -f "chroma run"
pkill -f "docker run"
```

---

## 📚 File Structure

```
scripts/
├── start-chroma.sh    # Chroma only
├── dev.sh             # All services (recommended)
├── start-all.sh       # Separate terminals
└── README.md          # This file
```

---

## 🚀 Next Steps

Once all services are running:

1. ✅ Open http://localhost:5173
2. ✅ Upload a PDF document
3. ✅ Chat with the document using AI
4. ✅ Check logs to verify everything works

---

**Questions?** Check the main [README.md](../README.md) or project documentation.
