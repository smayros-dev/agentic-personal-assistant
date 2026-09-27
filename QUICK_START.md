# 🚀 Quick Start Guide

Get the Agentic Personal Assistant running in **60 seconds**.

---

## ⚡ The Fastest Way

### **ONE COMMAND** (Requires Docker or Python)

```bash
./scripts/dev.sh
```

Then open: **http://localhost:5173**

That's it! 🎉

---

## 🔧 Prerequisites

Choose ONE:

### **Option 1: Docker** (Recommended)
```bash
brew install docker
```

### **Option 2: Python**
```bash
brew install python3
pip3 install chromadb
```

---

## 📋 What Gets Started

When you run `./scripts/dev.sh`:

```
✅ Chroma Vector Database    → http://localhost:8000
✅ Backend API Server        → http://localhost:3001  
✅ Frontend React App        → http://localhost:5173
```

---

## 🎯 What to Do Next

1. **Open the app:**
   ```
   http://localhost:5173
   ```

2. **Upload a PDF:**
   - Click "Upload Document" button
   - Select any PDF file
   - Wait for ✅ confirmation

3. **Chat with your document:**
   - Type a question in the chat box
   - AI will answer based on your PDF content

4. **View logs (optional):**
   ```bash
   tail -f /tmp/backend.log    # See API requests
   tail -f /tmp/frontend.log   # See React errors
   tail -f /tmp/chroma.log     # See vector DB activity
   ```

---

## ⏹️ Stop Everything

Press **Ctrl+C** in the terminal running `./scripts/dev.sh`

---

## 🆘 Troubleshooting

### **Port already in use?**
```bash
# Kill existing processes
pkill -f "npm start"
pkill -f "chroma run"

# Then try again
./scripts/dev.sh
```

### **Chroma won't start?**
```bash
# Verify Python/Docker installation
which python3          # or
which docker

# Install chromadb if needed
pip3 install chromadb

# Then restart
./scripts/dev.sh
```

### **Services not responding?**
```bash
# Check health
curl http://localhost:8000/api/v1    # Chroma
curl http://localhost:3001/health    # Backend
curl http://localhost:5173           # Frontend
```

---

## 📚 Full Documentation

- **Setup Details:** See [scripts/README.md](./scripts/README.md)
- **Architecture:** See [README.md](./README.md)
- **API Documentation:** Check `server/index.js`
- **Frontend Code:** Check `client/src/App.jsx`

---

## 🎓 Project Structure

```
agentic-personal-assistant/
├── client/              # React frontend (port 5173)
├── server/              # Node.js backend (port 3001)
├── scripts/             # Helper scripts
│   ├── dev.sh          # ⭐ Start everything
│   ├── start-chroma.sh # Start Chroma only
│   └── README.md       # Full script docs
├── QUICK_START.md      # This file
└── README.md           # Full documentation
```

---

## ✅ Verification Checklist

After running `./scripts/dev.sh`:

- [ ] Chroma responds to `curl http://localhost:8000/api/v1`
- [ ] Backend responds to `curl http://localhost:3001/health`
- [ ] Frontend loads at `http://localhost:5173`
- [ ] No errors in `/tmp/backend.log`
- [ ] Can upload a PDF without errors
- [ ] Can chat and get AI responses

---

## 💡 Tips

- **Keep terminal visible** - Shows live logs while you work
- **Read logs** - They explain what's happening
- **Clean shutdown** - Always press Ctrl+C, don't just close the terminal
- **Restart often** - Many issues resolve with a restart

---

**Ready?** Run this now:

```bash
./scripts/dev.sh
```

Then open: **http://localhost:5173**

Enjoy! 🎉

