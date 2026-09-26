# 🧪 E2E Testing Guide with Playwright

Comprehensive end-to-end testing suite for the Agentic RAG application.

---

## 📋 Test Coverage

### Application Setup & Health (5 tests)
- ✅ Load homepage
- ✅ Display model selector
- ✅ Connect to backend API
- ✅ Fetch available models
- ✅ Get vector store configuration

### Chat Functionality (6 tests)
- ✅ Accept user messages
- ✅ Send message on Enter key
- ✅ Display user messages
- ✅ Handle empty messages
- ✅ Display message history
- ✅ Persist conversation state

### Model Selection (2 tests)
- ✅ Allow changing model
- ✅ Model selector never disabled

### Session & State Management (3 tests)
- ✅ Persist session ID in localStorage
- ✅ Reuse session on page reload
- ✅ Clear conversation

### Error Handling (3 tests)
- ✅ Handle API connection failures
- ✅ Display error for oversized input
- ✅ Recover after network error

### UI & UX (4 tests)
- ✅ Responsive on mobile
- ✅ Responsive on tablet
- ✅ Display focus indicators
- ✅ Proper contrast for readability

### Cross-Browser (3 tests)
- ✅ Chrome compatibility
- ✅ Firefox compatibility
- ✅ Safari compatibility

### PDF Upload & Ingestion (5 tests)
- ✅ Display file upload input
- ✅ Accept PDF file selection
- ✅ Reject non-PDF files
- ✅ Show upload progress
- ✅ Show success message

### Knowledge Base Search (4 tests)
- ✅ Search with query
- ✅ Return context from documents
- ✅ Handle empty KB gracefully
- ✅ Include source citations

### AI Agent Interactions (5 tests)
- ✅ Generate coherent responses
- ✅ Handle follow-up questions
- ✅ Handle multi-turn conversations
- ✅ Handle special characters
- ✅ Handle rapid messages

### Data Privacy & Security (4 tests)
- ✅ No exposed API keys
- ✅ HTTPS in production
- ✅ No sensitive data in localStorage
- ✅ CORS properly configured

### Performance (3 tests)
- ✅ Load page within 3 seconds
- ✅ Chat response within 30 seconds
- ✅ No memory leaks

### Accessibility (5 tests)
- ✅ Proper heading hierarchy
- ✅ Alt text on images
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Color contrast

### API Endpoints (7 tests)
- ✅ GET /healthz
- ✅ GET /api/config
- ✅ GET /api/models
- ✅ POST /api/chat
- ✅ POST /api/ingest
- ✅ Rate limiting
- ✅ Error handling

### CORS & Security (3 tests)
- ✅ CORS headers configured
- ✅ OPTIONS preflight requests
- ✅ API key authentication (optional)

### Edge Cases (4 tests)
- ✅ Invalid JSON in POST
- ✅ Missing required fields
- ✅ Database connection issues
- ✅ Timeout handling

### API Response Validation (4 tests)
- ✅ Consistent response format
- ✅ Proper HTTP headers
- ✅ JSON content type
- ✅ Chat response structure

### Concurrent Requests (2 tests)
- ✅ Multiple concurrent chat requests
- ✅ Concurrent file uploads

### Model Selection (2 tests)
- ✅ Accept different model names
- ✅ Validate model parameter

---

## 🚀 Quick Start

### Installation

```bash
cd client
npm install

# Playwright automatically downloads browsers
npx playwright install
```

### Running Tests

```bash
# Run all tests
npm run test:e2e

# Run with UI (visual runner)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# Run headed (show browser)
npm run test:e2e:headed

# Run specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# View HTML report
npm run test:e2e:report
```

---

## 📦 Prerequisites

Before running tests, ensure services are running:

### Option A: Docker (Recommended)
```bash
# Start infrastructure + services
docker-compose up
# or for dev mode
docker-compose -f docker-compose.dev.yml up
```

### Option B: Local Development
```bash
# Terminal 1: Backend
cd server && npm run dev

# Terminal 2: Frontend
cd client && npm run dev

# Terminal 3: Run tests
npm run test:e2e
```

### Option C: Ollama + Chroma Only
```bash
# Terminal 1: Infrastructure
docker-compose -f docker-compose.dev.yml up

# Terminal 2: Backend (local)
cd server && npm run dev

# Terminal 3: Frontend (local)
cd client && npm run dev

# Terminal 4: Run tests
npm run test:e2e
```

---

## 🏗️ Test Organization

```
client/
├── e2e/
│   ├── fixtures.ts         # Custom test fixtures & helpers
│   ├── app.spec.ts         # UI/UX and basic functionality tests
│   ├── rag.spec.ts         # RAG-specific tests (PDF, KB, agent)
│   ├── api.spec.ts         # Backend API integration tests
│   └── test-files/         # Generated test PDFs (cleanup after)
├── playwright.config.ts    # Playwright configuration
└── package.json           # Scripts and dependencies
```

---

## 🔍 Test Details

### Fixtures (Custom Helpers)

Located in `e2e/fixtures.ts`:

```typescript
// Create a test PDF
const pdfPath = await createTestPDF('document.pdf');

// Upload PDF via UI
await uploadPDF(pdfPath);

// Send chat message and get response
const response = await chatWithAI('What is this document?');

// Wait for models to load
await waitForModelLoad();

// Clear conversation
await clearConversation();
```

### Test Files

#### `app.spec.ts` (40+ tests)
- Application setup and health
- Chat functionality
- Model selection
- Session management
- Error handling
- UI/UX
- Cross-browser compatibility

#### `rag.spec.ts` (28+ tests)
- PDF upload and ingestion
- Knowledge base search
- AI agent interactions
- Data privacy & security
- Performance
- Accessibility

#### `api.spec.ts` (25+ tests)
- API endpoint validation
- CORS & security
- Error handling & edge cases
- Response format validation
- Concurrent requests
- Model selection

---

## 📊 Test Results

### HTML Report
After tests run, view detailed results:
```bash
npm run test:e2e:report
```

Creates `playwright-report/index.html` with:
- Pass/fail overview
- Execution time per test
- Screenshots on failure
- Video recordings
- Detailed trace files

### CI/CD Integration
```bash
# In GitHub Actions, GitLab CI, etc.
npm run test:e2e --reporter=junit

# Creates junit.xml for CI/CD dashboard
```

---

## 🐛 Debugging

### Debug Mode
```bash
npm run test:e2e:debug

# Opens Playwright Inspector
# Step through tests interactively
# Pause on breakpoints
```

### Headed Mode (See Browser)
```bash
npm run test:e2e:headed

# Shows browser window while tests run
# Useful for watching actual interaction
```

### UI Mode (Visual Runner)
```bash
npm run test:e2e:ui

# Interactive test explorer
# Run tests, pause, inspect state
# Excellent for development
```

### Screenshots & Videos
```bash
# Playwright config captures:
# - Screenshots on failure
# - Videos on failure (test-results/)
# View in HTML report
```

---

## ✅ Best Practices

### Writing Tests
1. **Use custom fixtures** for common operations (chat, upload, etc.)
2. **Realistic scenarios** - test actual user flows
3. **Wait for elements** - use Playwright's built-in waits
4. **Avoid hard waits** - prefer element-based waits
5. **Clean up after tests** - delete temp files in teardown

### Test Isolation
- Each test should be independent
- Use `test.beforeEach()` for setup
- Use `test.afterEach()` for cleanup
- Don't rely on test execution order

### Handling Timing
```typescript
// ✅ GOOD: Wait for element
await page.waitForSelector('[data-testid="message"]');

// ✅ GOOD: Wait for network
await page.waitForLoadState('networkidle');

// ❌ AVOID: Hard wait
await page.waitForTimeout(5000);
```

### Assertions
```typescript
// ✅ GOOD: Specific assertions
await expect(button).toBeEnabled();
await expect(page).toHaveURL(/login/);

// ❌ AVOID: Vague assertions
expect(somethingTruthy).toBeTruthy();
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      ollama:
        image: ollama/ollama:latest
        ports:
          - 11434:11434
      chroma:
        image: chromadb/chroma:latest
        ports:
          - 8000:8000

    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      
      - run: npm ci --prefix client
      - run: npm ci --prefix server
      
      - run: npm run dev --prefix server &
      - run: npm run dev --prefix client &
      
      - run: npx playwright install
      - run: npm run test:e2e --prefix client
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: client/playwright-report/
```

---

## 📝 Common Issues & Solutions

### Tests Timeout
```
Error: Timeout waiting for element
```
**Solution:** Increase timeout in playwright.config.ts
```typescript
use: {
  navigationTimeout: 30000,
  actionTimeout: 10000,
}
```

### Services Not Running
```
Error: connect ECONNREFUSED 127.0.0.1:3001
```
**Solution:** Start services before running tests
```bash
# Option 1: docker-compose
docker-compose up

# Option 2: Local dev
cd server && npm run dev &
cd client && npm run dev &
```

### Browser Not Found
```
Error: Chromium executable not found
```
**Solution:** Install browsers
```bash
npx playwright install
```

### File Upload Issues
```
Error: File not found
```
**Solution:** Use `createTestPDF` fixture or provide full path

---

## 🎯 Test Metrics

Typical test execution times:
- **Unit tests:** <100ms per test
- **E2E tests:** 1-5 seconds per test
- **Full suite:** 5-10 minutes (depends on hardware)
- **With videos/traces:** 10-15 minutes

---

## 🚀 Advanced Topics

### Visual Regression Testing
```bash
npm install -D @playwright/test
# Add visual comparison tests
```

### API Mocking
```typescript
// Mock API responses for deterministic tests
await page.route('**/api/chat', route => {
  route.abort('blockedbytest');
});
```

### Performance Testing
```typescript
// Measure performance metrics
const startTime = Date.now();
await page.goto('/');
const loadTime = Date.now() - startTime;
expect(loadTime).toBeLessThan(3000);
```

---

## 📚 Resources

- [Playwright Docs](https://playwright.dev/)
- [Playwright API](https://playwright.dev/docs/api/class-playwright)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)

---

**Last Updated:** 2024  
**Test Count:** 90+ tests  
**Coverage:** End-to-end, API, UI, Performance, Accessibility  
**Status:** Production-ready ✅
