# 📋 Implementation Checklist & Validation Guide

## 🎯 What Needs to Be Done Now

This document guides you through validating the implementation and running tests.

---

## ✅ Phase 1: Infrastructure Setup & Validation

### Step 1: Docker Services (5-10 minutes)

**Objective:** Verify Ollama and Chroma are running correctly.

```bash
# In your terminal, from project root:
docker-compose -f docker-compose.dev.yml up

# Expected output (wait ~5-10 minutes):
# ✓ ollama Pulling
# ✓ chroma Pulling
# ✓ ollama Started
# ✓ chroma Started
# ✓ Ollama serving on 127.0.0.1:11434
# ✓ Chroma running on http://localhost:8000
```

**Validation:**
```bash
# In another terminal, check services are healthy:
curl http://localhost:11434/api/tags          # Ollama
curl http://localhost:8000/healthz            # Chroma
```

**Expected Response (Ollama):**
```json
{"models":[{"name":"nomic-embed-text:latest"},{"name":"qwen2:7b"}]}
```

**Expected Response (Chroma):**
```json
{"status":"ok"}
```

### Step 2: Backend Service (2 minutes)

**Objective:** Verify Express server starts and connects to services.

```bash
# In a new terminal:
cd server
npm run dev

# Expected output:
# [Express] Listening on port 3001
# [Health] Ollama connected ✓
# [Health] Chroma connected ✓
```

**Validation:**
```bash
# In another terminal:
curl http://localhost:3001/healthz
```

**Expected Response:**
```json
{"status":"ok","uptime":12.345}
```

### Step 3: Frontend Service (1 minute)

**Objective:** Verify React dev server starts.

```bash
# In a new terminal:
cd client
npm run dev

# Expected output:
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

**Validation:**
1. Open browser: `http://localhost:5173`
2. See React app load
3. See "Model: qwen2:7b" in header
4. See chat interface

---

## ✅ Phase 2: Feature Validation

### Step 1: Check Model Selector

**What to test:**
1. Open app in browser
2. Look for "Model:" dropdown in header
3. Click dropdown → should show installed models
4. Select different model → should persist

**Expected Models:**
- qwen2:7b (default)
- nomic-embed-text (embeddings, not for chat)

**Validation:**
- ✓ Dropdown doesn't show error
- ✓ Can select models
- ✓ Selection persists on reload

### Step 2: Check Session Isolation

**What to test:**
1. Open app in two different browsers (or private windows)
2. Browser A: Type "Hello from A"
3. Browser B: Should see empty chat
4. Browser B: Type "Hello from B"
5. Browser A: Should still see only "Hello from A"

**Validation:**
- ✓ Chat histories are separate
- ✓ Each browser has unique `sessionId`
- ✓ Clear button in one browser doesn't affect other

**Check Session ID:**
```javascript
// In browser console (F12)
console.log(localStorage.getItem('sessionId'))
// Should show different UUID in each browser
```

### Step 3: Check API Endpoints

**What to test:**

```bash
# Get available models
curl http://localhost:3001/api/models

# Expected:
# {"models":["qwen2:7b","nomic-embed-text:latest"]}

# Get server config
curl http://localhost:3001/api/config

# Expected:
# {"provider":"chroma","url":"http://localhost:8000",...}

# Health check
curl http://localhost:3001/healthz

# Expected:
# {"status":"ok","uptime":...}
```

**Validation:**
- ✓ All endpoints respond
- ✓ Status is "ok"
- ✓ No errors in response

### Step 4: Test Chat (Simple)

**What to test:**
1. Type: "Say hello"
2. Click Send
3. Watch response appear

**Validation:**
- ✓ Response appears
- ✓ No errors
- ✓ Can send multiple messages

**Check Server Logs:**
```bash
# In server terminal, should see:
# [morgan] GET /api/chat 200 ...
# [chat] Session: xxx, Model: qwen2:7b
```

---

## ✅ Phase 3: PDF Upload & RAG

### Step 1: Prepare Test PDF

**What to do:**
1. Create a simple text file with content:
   ```
   The capital of France is Paris.
   Paris is located in Western Europe.
   The Eiffel Tower is in Paris.
   ```
2. Convert to PDF (save as `test.pdf`)
3. Or download a sample PDF

### Step 2: Upload PDF

**What to test:**
1. Click "Upload PDF" button (in chat area)
2. Select `test.pdf`
3. Watch progress bar (0% → 100%)
4. See "✓ PDF indexed" message

**Server Logs (Expected):**
```
[ingest] Uploading test.pdf
[ingest] Chunks created: 3
[ingest] Added to vector store
```

**Validation:**
- ✓ File uploads without error
- ✓ Progress bar appears
- ✓ Success message shown
- ✓ No 500 errors

### Step 3: Search Knowledge Base

**What to test:**
1. Type: "Where is Paris located?"
2. Click Send
3. AI should answer based on PDF

**Expected Response:**
Something like: "Based on the document, Paris is located in Western Europe."

**Validation:**
- ✓ Response mentions the PDF
- ✓ Response is accurate
- ✓ Server logs show vector search

**Server Logs (Expected):**
```
[tools] Searching knowledge base for: "Where is Paris located?"
[search] Found 2 relevant chunks
[agent] Generating response...
```

### Step 4: Clear Conversation

**What to test:**
1. Click "Clear" button
2. Chat should reset
3. New `sessionId` generated
4. PDFs should still be in knowledge base

**Validation:**
- ✓ Chat history cleared
- ✓ New session ID in localStorage
- ✓ Can still search knowledge base
- ✓ Upload progress still works

---

## ✅ Phase 4: E2E Test Suite (5-10 minutes)

### Step 1: Install Playwright

```bash
# From client directory (one-time)
cd client
npm install

# Install browsers
npx playwright install
```

### Step 2: Run Tests

```bash
# Run all 90+ tests
npm run test:e2e

# Expected output:
# ✓ app.spec.ts (40+ tests)
# ✓ rag.spec.ts (28+ tests)
# ✓ api.spec.ts (25+ tests)
# Passed: 90+
```

**Duration:** 5-10 minutes depending on machine

### Step 3: View Test Report

```bash
# Open interactive report
npm run test:e2e:report

# Or: View test results JSON
cat playwright-report/index.html
```

### Step 4: Debug If Tests Fail

```bash
# Run single test file
npm run test:e2e -- app.spec.ts

# Run with UI (visual debugging)
npm run test:e2e:ui

# Run with debug (step through)
npm run test:e2e:debug

# Run single test
npm run test:e2e -- -g "should load models"
```

**If Tests Fail:**
1. Check logs: `docker-compose logs`
2. Check if services are slow
3. Increase timeout in `playwright.config.ts`
4. Run debug mode to see what failed

---

## 🔍 Troubleshooting Checklist

### "docker-compose: command not found"
- [ ] Install Docker Desktop
- [ ] Add Docker to PATH
- [ ] Verify: `docker --version`

### "Port 3001 already in use"
- [ ] Find process: `lsof -i :3001`
- [ ] Kill it: `kill -9 <PID>`
- [ ] Or change PORT in `server/.env`

### "Ollama not downloading models"
- [ ] Check disk space (need ~10GB)
- [ ] Check internet connection
- [ ] View logs: `docker-compose logs ollama`
- [ ] Wait longer (first pull is slow)

### "Chroma returns 404"
- [ ] Check if running: `curl http://localhost:8000/healthz`
- [ ] Restart: `docker-compose restart chroma`
- [ ] Check logs: `docker-compose logs chroma`

### "PDF upload fails"
- [ ] Check file size (< 100MB recommended)
- [ ] Check file format (PDF, not image)
- [ ] View server logs: `docker-compose logs server`
- [ ] Check Chroma health: `curl http://localhost:8000/healthz`

### "E2E tests timeout"
- [ ] Check if services are slow (curl http://localhost:3001/healthz)
- [ ] Increase TIMEOUT in playwright.config.ts
- [ ] Run single test to verify
- [ ] Check Docker resource limits

### "React app shows "Loading models..." forever"
- [ ] Check: `curl http://localhost:3001/api/models`
- [ ] Check server logs
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Check CORS in server logs

---

## 📊 Success Criteria Checklist

After completing all phases, verify:

- [ ] **Docker**: Services start without errors
- [ ] **Backend**: Server health check returns "ok"
- [ ] **Frontend**: App loads in browser
- [ ] **Models**: Dropdown shows models
- [ ] **Session**: Two browsers have different session IDs
- [ ] **Chat**: Can send messages and get responses
- [ ] **PDF Upload**: File uploads with progress bar
- [ ] **RAG Search**: Can search knowledge base
- [ ] **E2E Tests**: 90+ tests pass
- [ ] **GitHub Actions**: Workflow passes on push

---

## 📈 Performance Expectations

### First Run Timings
| Step | Duration | Notes |
|------|----------|-------|
| docker-compose up | 5-10 min | Downloads ~2GB Ollama image |
| Backend startup | 10-20 sec | Connects to services |
| Frontend startup | 5-10 sec | Vite dev server |
| Model list load | 2-5 sec | First request from backend |
| First chat response | 10-30 sec | LLM inference time |
| PDF upload (10MB) | 15-30 sec | Chunking + embedding |
| E2E test suite | 5-10 min | All 90+ tests |

### Subsequent Runs
| Step | Duration | Notes |
|------|----------|-------|
| docker-compose up | 5-10 sec | Services already cached |
| Backend startup | 1-2 sec | Services already running |
| Chat response | 5-15 sec | LLM generates response |
| E2E test suite | 3-5 min | Faster (services warm) |

---

## 🎁 Files to Review

| File | Purpose |
|------|---------|
| **START_HERE.md** | Quick overview |
| **IMPLEMENTATION_STATUS.md** | What's been done |
| **E2E_TESTING_GUIDE.md** | Testing reference |
| **DEVELOPMENT_MODE.md** | Dev workflow |
| **VECTOR_STORE_SETUP.md** | Vector DB config |
| **server/vectorstore.js** | Architecture: Pinecone/Chroma abstraction |
| **server/index.js** | Backend routes |
| **client/src/App.jsx** | Frontend UI |
| **client/e2e/*.spec.ts** | Test suites (90+ tests) |

---

## 🚀 Next Steps After Validation

### If Everything Works ✅
1. Commit changes: `git add -A && git commit -m "Phase 1+ complete: E2E tests + Docker"`
2. Push to GitHub: `git push`
3. Wait for GitHub Actions to run tests automatically
4. Proceed to Phase 2 features

### If Something Fails ⚠️
1. Review the troubleshooting section above
2. Check Docker logs: `docker-compose logs [service]`
3. Try single component (e.g., just backend)
4. Ask for help in GitHub Issues
5. Review error messages (they're usually helpful)

### Phase 2 Features (Coming Next)
- [ ] Token streaming (real-time response text)
- [ ] Persistent chat history (survives restarts)
- [ ] Document manager (delete PDFs)
- [ ] Citation tracking (show sources)
- [ ] Hybrid search (keyword + semantic)

---

## 📞 Quick Reference Commands

```bash
# Start services
docker-compose -f docker-compose.dev.yml up

# Start backend (separate terminal)
cd server && npm run dev

# Start frontend (separate terminal)
cd client && npm run dev

# Run E2E tests
cd client && npm run test:e2e

# View test report
cd client && npm run test:e2e:report

# Check health
curl http://localhost:3001/healthz

# List models
curl http://localhost:3001/api/models

# View logs
docker-compose logs -f [ollama|chroma|server]

# Stop everything
docker-compose down

# Clean everything (reset data)
docker-compose down -v
```

---

**Last Updated:** September 26, 2026  
**Status:** Ready for Validation  
**Next Step:** Start Docker and follow Phase 1 above
