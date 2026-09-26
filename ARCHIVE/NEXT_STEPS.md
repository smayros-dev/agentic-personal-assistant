# 🚀 Next Steps - Start Backend & Frontend

Your Docker infrastructure is running:
- ✅ Ollama (LLM) on port 11434
- ✅ Chroma (Vector DB) on port 8000

## You Now Need to Start:

### In a NEW Terminal (Terminal 1):
```bash
cd server
npm run dev
```

Expected output:
```
[Express] Listening on port 3001
[Health] Connected to Ollama
[Health] Connected to Chroma
```

### In Another NEW Terminal (Terminal 2):
```bash
cd client
npm run dev
```

Expected output:
```
➜  Local:   http://localhost:5173/
```

### Then Open in Browser:
```
http://localhost:5173
```

## What You Should See:

1. React app loads
2. Header shows "Model: qwen2:7b"
3. Chat interface ready
4. "Upload PDF" button visible
5. Model dropdown functional

## Validation Checklist:

- [ ] Backend starts (Port 3001)
- [ ] Frontend starts (Port 5173)
- [ ] Browser shows React app
- [ ] Model dropdown shows "qwen2:7b"
- [ ] Can type in chat
- [ ] Upload button responsive

## Quick Test:

1. Type: "Hello, say hi!"
2. Click Send
3. Watch AI respond (might take 10-30 seconds first time)

## If Something Goes Wrong:

- Backend issues: `curl http://localhost:3001/healthz`
- Frontend issues: Check browser console (F12)
- Ollama issues: `curl http://localhost:11434/api/tags`
- Chroma issues: `curl http://localhost:8000/healthz`

## Next: Run E2E Tests

After validating manually, run:
```bash
cd client
npm run test:e2e
npm run test:e2e:report
```

---

**Good luck! You're almost there!** 🎉
