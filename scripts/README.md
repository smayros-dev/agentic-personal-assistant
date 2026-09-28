# 🚀 Scripts

Cross-platform scripts (Windows/Git Bash, macOS, Linux) for the Agentic Personal Assistant.
Shared helpers live in [`lib/common.sh`](lib/common.sh) (`pa_*` functions: OS detection, Python/Chroma/Ollama helpers, port checks, log dirs).

---

## 📌 Entry points (repository root)

| Command | What it does |
|---------|--------------|
| `./start-local.sh` | **Canonical starter** - Ollama, Chroma, Backend, Frontend (dedicated terminal per service). Windows: `.\start-local.ps1` |
| `./stop-local.sh` | Stops the services started above (keeps Ollama unless `--all`). Windows: `.\stop-local.ps1` |
| `./start.sh` | Legacy alias → delegates to `start-local.sh` |
| `./scripts/start-all.sh` | Legacy alias → delegates to `start-local.sh` |
| `./scripts/dev.sh` | **All-in-one terminal**: starts everything in background with logs, `Ctrl+C` stops all |

---

## 📂 Layout

```
scripts/
├── lib/common.sh                  # Shared helpers sourced by every script
├── start/                         # Individual service launchers
│   ├── start-chroma-service.sh    # Chroma (native, persisted in ./chroma_data)
│   ├── start-chroma.sh            # Chroma, foreground (Ctrl+C to stop)
│   ├── start-backend-service.sh   # Backend  (http://localhost:3001)
│   └── start-frontend-service.sh  # Frontend (http://localhost:5173)
├── config/
│   ├── switch-vectorstore.sh      # switch-vectorstore.sh chroma|pinecone
│   └── setup-pinecone.sh          # Interactive Pinecone key setup
├── test/
│   ├── e2e-tests.sh               # API + RAG end-to-end suite (curl based)
│   ├── make-test-pdf.mjs          # Generates a text-bearing test PDF
│   ├── verify-rag.py              # RAG pipeline verification (Python)
│   ├── run-ci-local.sh            # Simulates the GitHub Actions pipeline
│   └── check-ci-setup.sh          # Checks CI prerequisites
├── models/
│   ├── install-models.sh          # Pull Ollama models
│   ├── install-models-improved.sh # Pull models with size/verification checks
│   └── ollama-startup.sh          # Container entrypoint: wait + pull models
├── docker/
│   └── dev-setup.sh               # Docker-based dev environment (optional)
├── dev.sh                         # All-in-one background starter (see above)
├── start-all.sh                   # Legacy alias → start-local.sh
├── invoke-sh.ps1                  # PowerShell helper to run a .sh via Git Bash
└── README.md                      # This file
```

---

## 🎯 Common workflows

```bash
# Start everything (one terminal per service)
./start-local.sh

# Start everything in a single terminal (logs in $TMPDIR/agentic-assistant-logs)
./scripts/dev.sh

# Stop everything
./stop-local.sh

# Run the end-to-end test suite (backend must be up)
./scripts/test/e2e-tests.sh

# Switch the vector store
./scripts/config/switch-vectorstore.sh chroma
./scripts/config/switch-vectorstore.sh pinecone
```

Windows (PowerShell):

```powershell
.\start-local.ps1
.\stop-local.ps1
.\scripts\invoke-sh.ps1 -Script scripts/test/e2e-tests.sh
```

---

## ✅ Health checks

| Service | URL | Expected |
|---------|-----|----------|
| Chroma | http://localhost:8000 | responds (API v2) |
| Backend | http://localhost:3001/healthz | `{"status":"ok",...}` |
| Frontend | http://localhost:5173 | UI loads |
| Ollama | http://localhost:11434/api/tags | model list |

```bash
curl http://localhost:3001/healthz
curl http://localhost:11434/api/tags
```

---

## 🔧 Troubleshooting

```bash
# Port already in use
./stop-local.sh                  # clean shutdown
# Windows (if a terminal was closed abruptly):
#   netstat -ano | findstr :3001   then  taskkill /PID <pid> /F

# Logs (background mode)
tail -f "$(cygpath -u "$TEMP" 2>/dev/null || echo "${TMPDIR:-/tmp}")"/agentic-assistant-logs/backend.log

# Run any script from PowerShell if execution policy blocks .ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1
```

> **Windows note:** Controlled Folder Access can block `bash.exe`/`sed.exe` writes inside `Documents`. The scripts fall back to PowerShell for in-place edits (`pa_sed_i`), or you can allow-list Git Bash in Windows Security.

---

## 📚 More documentation

- [QUICK_START.md](../QUICK_START.md)
- [README.md](../README.md)
- [INFRASTRUCTURE.md](../INFRASTRUCTURE.md)
