# Quick Start Guide — New Features

## 🚀 Getting Started

### Prerequisites
1. **Node.js** v18+ installed
2. **Ollama** running locally: `ollama serve`
3. **Pinecone** account with an index created (get credentials from https://app.pinecone.io)

### Setup (5 minutes)

```bash
# 1. Clone and install
git clone <repo-url>
cd agentic-personal-assistant
npm run install:all

# 2. Create server/.env with your Pinecone credentials
cp server/.env.example server/.env
# Edit server/.env and replace:
#   PINECONE_API_KEY=<your key>
#   PINECONE_INDEX=<your index>

# 3. Start dev server
npm run dev
# Server runs on http://localhost:3001
# Client runs on http://localhost:5173
```

---

## ✨ New Features You Can Use

### 1️⃣ Multi-User Support (Sessions)

**Problem Fixed:** Previously, all users shared the same conversation. This is now fixed!

**How It Works:**
- Each browser/device gets a unique session ID (stored in localStorage)
- Your conversations are completely private to your browser
- Clearing browser data starts a new session

**Try It:**
1. Open http://localhost:5173 in Browser A
2. Ask a question: "What is my favorite color?"
3. Open http://localhost:5173 in Browser B
4. Browser B has an empty chat ✅

---

### 2️⃣ Switch AI Models

**What It Is:** You can now pick from any Ollama model you have installed.

**How To Use:**
1. Look for the **"Model:"** dropdown in the top-left header
2. Click to see available models:
   - `qwen3.6:latest`
   - `gemma4:12b`
   - (any other models you've pulled with Ollama)
3. Select a different model → your next message uses that model
4. Your selected model is **remembered** (persisted in localStorage)

**Try It:**
```bash
# Install another model (takes a few minutes)
ollama pull gemma4:12b

# Refresh browser → should see it in dropdown
```

---

### 3️⃣ Upload Progress Indicator

**What It Is:** Watch PDF uploads in real-time with a progress bar.

**How To Use:**
1. Click **"Choose PDF"** → select a file
2. Click **"Upload"** → watch the progress bar
   - Shows percentage: "Uploading... 45%"
   - Visual progress bar fills from left to right
3. When done: "Uploaded and ingested successfully."

**Why It Helps:** For large PDFs (10+ MB), you know it's working instead of wondering if it hung.

---

### 4️⃣ Clear Conversation

**What It Is:** One-click button to reset your chat and start fresh.

**How To Use:**
1. Look for **"Clear conversation"** button in the top-right header
2. Click it → chat clears, new session ID generated
3. Next message starts a completely fresh conversation

**When To Use:**
- Starting a new topic
- Clearing sensitive conversation history
- Troubleshooting an agent stuck in bad state

---

## 🔒 Security Features

### Rate Limiting (Built-in)
- Max 30 requests per minute per IP
- Excessive requests get a 429 error
- Prevents abuse/DoS

### CORS Protection
- Only allowed origins can access the API
- Defaults to `http://localhost:5173` for development
- Configure via `CORS_ORIGIN` in `server/.env`

### API Key Authentication (Optional)
- If you set `API_KEY` in `server/.env`, clients must include it
- Pass via `x-api-key` header:
  ```bash
  curl -H "x-api-key: YOUR_KEY" http://localhost:3001/api/chat
  ```

---

## 🛠️ Environment Configuration

### Essential Variables

```env
# Pinecone (get from https://app.pinecone.io)
PINECONE_API_KEY=pcsk_xxxxx
PINECONE_INDEX=your-index-name

# Ollama (local LLM)
OLLAMA_MODEL=qwen3.6:latest        # Default model to use
OLLAMA_BASE_URL=http://localhost:11434

# Server
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### Optional Security

```env
# If set, clients must send this header:
API_KEY=my-secret-key

# Rate limiting (requests per window)
RATE_LIMIT_MAX=30                  # Max requests
RATE_LIMIT_WINDOW_MS=60000         # Per 60 seconds
```

### Client-Side (for non-localhost)

```bash
# In client/.env (optional, defaults to localhost:3001)
VITE_API_URL=https://api.example.com
```

---

## 📊 API Reference

### New Endpoints

#### List Available Models
```bash
GET http://localhost:3001/api/models

# Response:
{
  "models": ["qwen3.6:latest", "gemma4:12b"]
}
```

#### Health Check
```bash
GET http://localhost:3001/api/healthz

# Response:
{
  "status": "ok",
  "uptime": 123.456
}
```

### Enhanced Endpoints

#### Chat with Session & Model
```bash
POST http://localhost:3001/api/chat

# Body:
{
  "message": "Hello",
  "sessionId": "uuid-here",        // Auto-generated per browser
  "model": "gemma4:12b"            // Optional; uses default if omitted
}

# Response:
{
  "answer": "Hello! How can I help?"
}
```

---

## 🐛 Troubleshooting

### "Ollama is unavailable"
**Solution:** Start Ollama in another terminal:
```bash
ollama serve
```

### "The language model (Ollama) is unavailable"
**Same as above** — this is the 503 error you get if Ollama is down.

### "Missing PINECONE_API_KEY"
**Solution:** 
1. Get your key from https://app.pinecone.io
2. Add to `server/.env`:
   ```
   PINECONE_API_KEY=pcsk_xxxxx
   PINECONE_INDEX=your-index
   ```
3. Restart dev server

### Conversation shared between browsers
**This is fixed!** If you're still seeing shared conversations:
1. Clear browser localStorage: 
   - Chrome DevTools → Application → localStorage → delete `agentic-assistant-session-id`
2. Refresh page

### Model dropdown is empty
**Solutions:**
1. Make sure Ollama is running: `ollama serve`
2. Verify you have models: `ollama list`
3. If needed, pull a model: `ollama pull gemma4:12b`
4. Refresh browser

---

## 📈 Performance Tips

1. **Large PDFs:** Upload progress bar shows you it's working (don't close tab)
2. **Model Switching:** Slightly slower first time you use a new model (caching on first use)
3. **Sessions:** Using the same session ID (browser) maintains conversation history
4. **Rate Limiting:** Don't send >30 requests/minute or you'll get 429 errors

---

## ✅ Testing Checklist

Verify everything works:

- [ ] Two browsers have separate conversations (sessions)
- [ ] Model dropdown shows available models
- [ ] Can switch models and chat continues
- [ ] Upload progress bar shows during PDF upload
- [ ] "Clear conversation" button works
- [ ] `curl http://localhost:3001/healthz` returns status
- [ ] 31 rapid requests get 429 on the 31st (rate limiting)

---

## 📚 For Developers

See `TASKS.md` for:
- Complete list of improvements
- Technical implementation details
- File changes summary
- Remaining work (tests + CI)

See `IMPROVEMENTS.md` for:
- Feature verification steps
- Configuration guide
- Test results

---

**Status:** ✅ 20/22 features implemented  
**Ready for:** Development, testing, production deployment  
**Last Updated:** 2026-09-26
