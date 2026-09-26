# CI/CD Local Testing Guide

## Overview

Run the complete GitHub Actions CI/CD pipeline locally in Docker to validate all tests and linting before pushing to GitHub.

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- npm

## Files

- **`run-ci-local.sh`** - Main CI pipeline simulation script
- **`docker-compose.ci.yml`** - Docker services for CI (Ollama, Chroma)

## Quick Start

### Option 1: Run Complete Pipeline (Recommended)

```bash
./run-ci-local.sh
```

This will:
1. ✅ Start Docker services (Ollama, Chroma)
2. ✅ Install dependencies
3. ✅ Run linting & format checks
4. ✅ Run server unit tests (18 tests)
5. ✅ Run client unit tests (27 tests)
6. ✅ Run E2E tests (Playwright)
7. ✅ Generate coverage reports
8. ✅ Display final report

### Option 2: Run Specific Jobs

#### Just Unit Tests (Fast - ~2 minutes)
```bash
# Start services
docker-compose -f docker-compose.ci.yml up -d ollama chroma

# Run tests
npm run test              # Both server + client
npm run test:server       # Server only
npm run test:client       # Client only

# Cleanup
docker-compose -f docker-compose.ci.yml down
```

#### Just Linting
```bash
npm run lint
npm run lint:fix          # Auto-fix issues
```

#### Just E2E Tests
```bash
# Start services
docker-compose -f docker-compose.ci.yml up -d ollama chroma

# Start backend
cd server && npm start &

# Start frontend
cd client && npm run dev &

# Run tests
cd client && npm run test:e2e
npm run test:e2e:headed   # With browser UI
npm run test:e2e:ui       # Playwright UI mode

# Cleanup
kill %1 %2   # Kill background processes
```

## Docker Services

The CI pipeline uses two Docker services:

### Ollama Service
- **Image**: `ollama/ollama:latest`
- **Port**: `11434`
- **Health Check**: `/api/tags` endpoint
- **Purpose**: Local LLM inference

### Chroma Service
- **Image**: `chromadb/chroma:latest`
- **Port**: `8000`
- **Health Check**: `/api/v1/heartbeat` endpoint
- **Purpose**: Vector database for RAG

## Environment Variables

```
NODE_ENV=test
CI=true
VECTOR_DB=chroma
CHROMA_URL=http://chroma:8000
CHROMA_COLLECTION=agentic-rag
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen2:7b
CORS_ORIGIN=http://localhost:5173
```

## Test Results

### Server Tests
```
Test Files: 2 passed
Tests: 18 passed
Categories:
  - Health check endpoints
  - CORS configuration
  - Error handling
  - Rate limiting
  - Document management
  - Chat routes
  - PDF ingestion
```

### Client Tests
```
Test Files: 2 passed
Tests: 27 passed
Categories:
  - Session management
  - Model selection
  - Error handling
  - Message validation
  - Document utilities
  - Data processing
```

### E2E Tests
```
Playwright Test Suite
Categories:
  - Frontend health checks
  - API endpoints
  - RAG workflow
  - Chat interactions
```

## Coverage Reports

After running tests, coverage reports are generated:

```
server/coverage/          # Server coverage (HTML report)
client/coverage/          # Client coverage (HTML report)
```

View HTML reports:
```bash
open server/coverage/index.html
open client/coverage/index.html
```

## Troubleshooting

### Docker Services Won't Start
```bash
# Check if ports are in use
lsof -i :11434   # Ollama
lsof -i :8000    # Chroma

# Kill conflicting processes
kill -9 <PID>

# Or use different ports in docker-compose.ci.yml
```

### Tests Fail Due to Missing Dependencies
```bash
# Clean install
rm -rf node_modules server/node_modules client/node_modules
npm run install:all
```

### Linting Errors Won't Auto-Fix
```bash
# Manual fix
cd server && npm run lint:fix
cd client && npm run lint:fix
```

### Backend/Frontend Won't Start During E2E
```bash
# Check port availability
lsof -i :3001    # Backend
lsof -i :5173    # Frontend

# Check logs
tail -f /tmp/backend.log
tail -f /tmp/frontend.log
```

## CI/CD Pipeline Structure

```
┌─────────────────────────────────────────┐
│      Setup - Docker Services            │
│  (Ollama 11434, Chroma 8000)            │
└──────────────┬──────────────────────────┘
               │
        ┌──────▼──────┐
        │ Dependencies │
        └──────┬──────┘
               │
        ┌──────▼─────────────────────────────┐
        │  Job 1: Lint & Format Check       │
        │  - eslint server & client         │
        │  - prettier format                │
        └──────┬──────────────────────────┬──┘
               │                          │
     ┌─────────▼──────────┐    ┌──────────▼──────────┐
     │ Job 2: Server     │    │ Job 3: Client       │
     │ Unit Tests        │    │ Unit Tests          │
     │ (18 tests)        │    │ (27 tests)          │
     └────────┬──────────┘    └──────┬──────────────┘
              │                      │
              └──────────┬───────────┘
                         │
                  ┌──────▼─────────────┐
                  │ Job 4: E2E Tests  │
                  │ (Playwright)      │
                  └──────┬────────────┘
                         │
                  ┌──────▼──────────────┐
                  │ Job 5: Summary     │
                  │ Report & Cleanup   │
                  └───────────────────┘
```

## GitHub Actions Comparison

| Feature | Local Script | GitHub Actions |
|---------|-------------|-----------------|
| Services | Docker Compose | GitHub Services |
| Isolation | Local machine | GitHub Runner |
| Duration | ~5-10 min | ~10-15 min |
| Cost | Free | Free |
| Access | Full control | Limited access |
| Cleanup | Manual | Automatic |

## Next Steps

After validating locally:
1. ✅ Fix any failing tests
2. ✅ Commit changes: `git add . && git commit -m "fix: ..."`
3. ✅ Push to GitHub: `git push origin <branch>`
4. ✅ GitHub Actions will automatically run the full pipeline
5. ✅ Monitor workflow status in GitHub UI

## Useful Commands

```bash
# View running Docker containers
docker ps

# View Docker logs
docker logs agentic-ollama-ci
docker logs agentic-chroma-ci

# Stop all services
docker-compose -f docker-compose.ci.yml down

# Remove all CI data
docker-compose -f docker-compose.ci.yml down -v

# View test output in detail
npm run test:run -- --reporter=verbose

# Generate HTML coverage report
npm run test:coverage
```

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review test output carefully
3. Check GitHub Actions logs for comparison
4. Ensure Docker is running and healthy

---

**Last Updated**: 2026-09-26
**Script Version**: 1.0
