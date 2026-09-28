# 🚀 CI/CD & Testing Documentation

## Table of Contents
1. [Local CI/CD Testing](#local-cicd-testing)
2. [Running Tests](#running-tests)
3. [Coverage Reports](#coverage-reports)
4. [GitHub Actions](#github-actions)
5. [Troubleshooting](#troubleshooting)

---

## Local CI/CD Testing

### Overview

The project includes a complete **local CI/CD pipeline** that simulates GitHub Actions:

```bash
./scripts/test/run-ci-local.sh
```

This script runs:
1. ✅ Docker services setup (Ollama, Chroma)
2. ✅ Dependency installation
3. ✅ Linting & format checks (ESLint, Prettier)
4. ✅ Server unit tests (18 tests)
5. ✅ Client unit tests (27 tests)
6. ✅ E2E tests (Playwright)
7. ✅ Coverage reports
8. ✅ Final summary

### Prerequisites

```bash
# Required
Node.js 18+ (check: node --version)
npm 9+ (check: npm --version)
Docker (check: docker --version)

# Recommended
VS Code
Playwright (installed via npm)
```

### Quick Start

```bash
cd /Users/mac-Z16MSMAI/Documents/front/agentic-personal-assistant

# Run complete pipeline
./scripts/test/run-ci-local.sh

# Or run specific tests
npm test              # All unit tests
npm run test:server   # Server only
npm run test:client   # Client only
npm run test:e2e      # E2E only
```

---

## Running Tests

### 1. Unit Tests

#### Server Tests (18 tests)

```bash
cd server
npm test
# or
npm run test:run
```

**What it tests**:
- API endpoints
- Database operations
- Chat functionality
- Document management
- Search functionality
- Export functionality

**Expected output**:
```
✅ Test Files  2 passed (2)
✅ Tests       18 passed (18)
✅ Duration    ~223ms
```

**Test files**:
- `server/tests/server.test.js` - API & core functionality
- `server/tests/features.test.js` - Feature-specific tests

#### Client Tests (27 tests)

```bash
cd client
npm test
# or
npm run test:run
```

**What it tests**:
- Component rendering
- User interactions
- API integration
- State management
- Error handling
- Session persistence

**Expected output**:
```
✅ Test Files  2 passed (2)
✅ Tests       27 passed (27)
✅ Duration    ~919ms
```

**Test files**:
- `client/src/__tests__/App.test.jsx`
- `client/src/__tests__/Chat.test.jsx`

### 2. Watch Mode (Development)

```bash
# Server watch mode
cd server && npm run test:watch

# Client watch mode
cd client && npm run test:watch

# Tests re-run on file changes
# Press 'q' to quit
```

### 3. E2E Tests (Playwright)

```bash
# Requires frontend + backend running
cd client
npm run test:e2e

# Or with UI
npm run test:e2e:ui
```

**What it tests**:
- Full application workflows
- User interactions
- API integration
- Error recovery
- Multi-step processes

**Prerequisites**:
```bash
# Terminal 1: Start backend
cd server && npm run dev

# Terminal 2: Start frontend
cd client && npm run dev

# Terminal 3: Run E2E tests
cd client && npm run test:e2e
```

---

## Coverage Reports

### Generate Coverage

```bash
npm run test:coverage
```

This uses `@vitest/coverage-v8` to generate:
- **Statements**: Lines of code executed
- **Branches**: If/else paths tested
- **Functions**: Function calls covered
- **Lines**: Line-by-line coverage

### View Report

```bash
# Generate and open in browser
npm run test:coverage
open coverage/index.html
```

### Expected Coverage

```
Coverage Summary:
  Statements:  78%
  Branches:    72%
  Functions:   80%
  Lines:       78%
```

### Improving Coverage

1. **Identify uncovered code**:
   ```bash
   npm run test:coverage
   open coverage/index.html
   ```

2. **Add tests** for uncovered lines:
   ```javascript
   // test/myFeature.test.js
   describe('My Feature', () => {
     it('should do something', () => {
       // test code
     });
   });
   ```

3. **Re-run coverage**:
   ```bash
   npm run test:coverage
   ```

---

## GitHub Actions

### Workflow File

Location: `.github/workflows/ci.yml`

### Jobs

#### 1. Lint & Format Check
```yaml
- name: Lint
  run: npm run lint

- name: Format
  run: npm run format:check
```

#### 2. Server Tests
```yaml
- name: Server Tests
  run: npm run test:server
  
- name: Coverage
  run: npm run test:coverage
```

#### 3. Client Tests
```yaml
- name: Client Tests
  run: npm run test:client
  
- name: Coverage
  run: npm run test:coverage
```

#### 4. E2E Tests
```yaml
- name: E2E Tests
  run: npm run test:e2e
```

### Triggering

CI/CD runs automatically on:
- Push to `main` branch
- Pull requests

### Viewing Results

1. Go to: https://github.com/tariqlabs/agentic-personal-assistant
2. Click: **Actions** tab
3. Select: Latest workflow run
4. View: Test results and logs

---

## Troubleshooting

### Tests Failing?

#### Issue: "Module not found"

```bash
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm test
```

#### Issue: "Port already in use"

```bash
# Find process
lsof -i :3001   # Backend
lsof -i :5173   # Frontend
lsof -i :11434  # Ollama

# Kill process
kill -9 <PID>

# Retry
npm test
```

#### Issue: "Docker daemon not running"

```bash
# Check Docker
docker ps

# Start Docker
open -a Docker

# Wait ~30 seconds, then retry
npm test
```

### Coverage Reports Issue?

```bash
# Reinstall coverage tool
npm install --save-dev @vitest/coverage-v8

# Generate report
npm run test:coverage
```

### E2E Tests Hanging?

```bash
# Kill frontend/backend processes
pkill -f "node server/index.js"
pkill -f "vite"

# Retry
npm run test:e2e
```

---

## Test Configuration

### Vitest Config (Unit Tests)

**server/vitest.config.js**:
```javascript
export default {
  environment: 'node',
  globals: true,
  testTimeout: 10000,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'json']
  }
}
```

**client/vitest.config.js**:
```javascript
export default {
  environment: 'jsdom',
  globals: true,
  setupFiles: './vitest.setup.js'
}
```

### Playwright Config (E2E Tests)

**client/playwright.config.ts**:
```typescript
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173'
  }
})
```

---

## Best Practices

### Before Committing

```bash
# 1. Run linting
npm run lint

# 2. Fix formatting
npm run format

# 3. Run all tests
npm test

# 4. Check coverage
npm run test:coverage

# 5. Commit
git commit -m "feat: description"
```

### CI/CD Pipeline

```bash
# 1. Local testing (before push)
./scripts/test/run-ci-local.sh

# 2. GitHub Actions (automatic)
# Triggered by push/PR

# 3. Production deployment
# Only after all tests pass
```

### Writing Tests

```javascript
// ✅ Good
describe('Chat Feature', () => {
  it('should send message and get response', async () => {
    const response = await sendMessage('Hello');
    expect(response).toBeDefined();
  });
});

// ❌ Bad
describe('Chat', () => {
  it('works', () => {
    expect(true).toBe(true);
  });
});
```

---

## Performance Benchmarks

### Test Execution Time

| Test Suite | Time | Status |
|-----------|------|--------|
| Linting | ~10s | ✅ |
| Server Tests | ~1s | ✅ |
| Client Tests | ~1s | ✅ |
| E2E Tests | ~30s | ✅ |
| **Total** | **~2-3 min** | ✅ |

### Coverage Time

```bash
npm run test:coverage
# Time: ~5-10 seconds
```

---

## CI/CD Pipeline Flow

```
1. Developer pushes code
        ↓
2. GitHub Actions triggered
        ↓
3. Checkout code
        ↓
4. Setup Node.js 20+
        ↓
5. Install dependencies
        ↓
6. ├─ Run Linting (ESLint)
   ├─ Run Format Check (Prettier)
   ├─ Run Server Tests (18 tests)
   ├─ Run Client Tests (27 tests)
   └─ Run E2E Tests (Playwright)
        ↓
7. Generate Reports
        ↓
8. Deploy (if all pass)
        ↓
9. ✅ SUCCESS or ❌ FAILURE
```

---

## NPM Scripts Reference

```bash
# Testing
npm test                  # All tests (unit + E2E)
npm run test:run         # Run once
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Server
npm run test:server      # Server tests only
npm run test:server:watch # Server watch mode

# Client
npm run test:client      # Client tests only
npm run test:client:watch # Client watch mode

# E2E
npm run test:e2e         # E2E tests
npm run test:e2e:ui      # E2E with UI

# Linting
npm run lint             # Run ESLint
npm run format           # Format with Prettier
npm run format:check     # Check formatting

# CI/CD
./scripts/test/run-ci-local.sh        # Full pipeline
```

---

## Resources

### Documentation
- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [ESLint Guide](https://eslint.org/)
- [Prettier](https://prettier.io/)

### External Links
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [E2E Testing Guide](https://www.smashingmagazine.com/2021/09/ui-testing-best-practices/)

---

**Last Updated**: 2026-09-26  
**Status**: ✅ Current & Operational  
**Maintainer**: @tariqlabs
