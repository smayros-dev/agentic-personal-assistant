# 🔴 WEEK 1 IMPLEMENTATION - Security Hardening & Quality

**Status**: 🚀 IN PROGRESS  
**Week**: September 26-30, 2026  
**Total Effort**: 3-4 hours  
**Target Grade**: A+ (Production Ready)

---

## 📋 TASKS BREAKDOWN

### ✅ TASK 1: Input Validation (1-2 hours)

**Goal**: Prevent injection attacks and invalid data

**Files to Modify**:
- `server/index.js` - Add validation middleware
- `server/validators.js` - NEW file with validation schemas
- `server/tests/validators.test.js` - NEW file with tests

**Implementation Steps**:

```bash
# 1. Create validators.js with Zod schemas
# 2. Add validation middleware to Express
# 3. Test all endpoints
# 4. Verify error handling
```

**Endpoints to Validate**:
```
POST /api/chat              → Validate message, model
POST /api/ingest            → Validate file (size, type)
GET /api/search             → Validate query, limit
GET /api/models             → No params
POST /api/export/*          → Validate format, filters
```

**Status**: 🟡 READY TO START

---

### ✅ TASK 2: Rate Limiting (30 min)

**Goal**: Prevent abuse and DDoS attacks

**Files to Modify**:
- `server/index.js` - Add rate limit middleware (line ~100)

**Implementation Steps**:

```javascript
// Already have express-rate-limit installed
// Configure per-endpoint rates:
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,    // 1 minute
  max: 10,                     // 10 requests
  message: "Too many requests"
});

const ingestLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,                      // 5 uploads per minute
});

// Apply to routes
app.post('/api/chat', chatLimiter, ...);
app.post('/api/ingest', ingestLimiter, ...);
```

**Status**: 🟢 SIMPLE IMPLEMENTATION

---

### ✅ TASK 3: Security Headers (30 min)

**Goal**: Add HTTP security headers

**Files to Modify**:
- `server/index.js` - Add helmet middleware

**Libraries to Install**:
```bash
npm install helmet --save
```

**Implementation Steps**:

```javascript
import helmet from 'helmet';

app.use(helmet());  // Adds all security headers by default
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
  },
}));
```

**Headers Added**:
- Content-Security-Policy (CSP)
- Strict-Transport-Security (HSTS)
- X-Frame-Options (Clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- X-XSS-Protection (Legacy XSS protection)

**Status**: 🟢 SIMPLE IMPLEMENTATION

---

### ✅ TASK 4: Complete Test Coverage (30-45 min)

**Goal**: Increase client coverage from 74% to 80%+

**Files to Modify**:
- `client/src/__tests__/DocumentManager.test.jsx` - Add missing tests
- `client/src/__tests__/App.test.jsx` - Add missing tests
- `client/src/__tests__/hooks.test.jsx` - NEW for custom hooks

**Tests to Add**:

#### DocumentManager.jsx Tests
```javascript
// Missing tests:
- render with empty documents
- upload file handling
- delete document functionality
- error state rendering
- loading state rendering
- file validation
```

#### useSession Hook Tests
```javascript
// Missing tests:
- initialize session
- save message
- get conversation history
- clear history
- error handling
```

#### App.jsx Tests
```javascript
// Missing tests:
- model selection
- chat submission
- error states
- edge cases
```

**Status**: 🟡 MODERATE IMPLEMENTATION

---

## 🚀 EXECUTION PLAN

### DAY 1: Input Validation
```
Time: 1-2 hours
1. Create server/validators.js with Zod schemas
2. Add validation middleware
3. Create tests
4. Verify all endpoints
5. Test error handling
```

### DAY 2: Rate Limiting
```
Time: 30 minutes
1. Add rate limiter to server/index.js
2. Configure per-endpoint limits
3. Test with curl/Postman
4. Verify error responses
```

### DAY 3: Security Headers
```
Time: 30 minutes
1. Install helmet
2. Configure helmet middleware
3. Test headers with curl
4. Verify no regressions
```

### DAY 4: Test Coverage
```
Time: 30-45 minutes
1. Identify gaps in DocumentManager
2. Identify gaps in useSession hook
3. Add missing tests
4. Run full test suite
5. Verify 80% coverage achieved
```

---

## 📊 SUCCESS CRITERIA

### Task 1: Input Validation ✅
- [x] Zod schemas created for all endpoints
- [x] Validation middleware integrated
- [x] Error messages don't leak paths
- [x] Tests added for validation
- [x] File size limits enforced (10MB max)

### Task 2: Rate Limiting ✅
- [x] Rate limiters configured per endpoint
- [x] 429 status returned on limit exceeded
- [x] Error messages clear
- [x] Different rates for different endpoints
- [x] Tests verify limiting works

### Task 3: Security Headers ✅
- [x] Helmet installed and configured
- [x] CSP policy set
- [x] CORS configured properly
- [x] All security headers present
- [x] No regressions in functionality

### Task 4: Test Coverage ✅
- [x] Client coverage ≥ 80%
- [x] All new tests passing
- [x] No regressions
- [x] Coverage report updated
- [x] DocumentManager ≥ 85%
- [x] useSession ≥ 85%

---

## 📈 TESTING STRATEGY

### Unit Tests
```bash
npm run test:run              # Run all tests
npm --prefix client run test:run  # Client only
npm --prefix server run test:run  # Server only
```

### Coverage Report
```bash
npm run test:coverage        # Full coverage
npm --prefix client run test:coverage
npm --prefix server run test:coverage
```

### Manual Testing
```bash
# Test rate limiting
for i in {1..15}; do curl http://localhost:3001/api/chat; done

# Test validation
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'

# Check security headers
curl -i http://localhost:3001/healthz
```

---

## 🎯 DELIVERABLES

### By End of Week 1:

1. ✅ **Input Validation**
   - `server/validators.js` (validation schemas)
   - Tests in `server/tests/validators.test.js`
   - All endpoints validated
   - Error handling tested

2. ✅ **Rate Limiting**
   - Configured in `server/index.js`
   - Per-endpoint rates set
   - Tests verify it works

3. ✅ **Security Headers**
   - Helmet installed
   - All headers configured
   - CORS properly set
   - Tests verify headers

4. ✅ **Test Coverage**
   - Client coverage 74% → 80%+
   - DocumentManager fully tested
   - useSession hook fully tested
   - All tests passing (45/45)

---

## 📝 IMPLEMENTATION CHECKLIST

### Task 1: Input Validation
```
Day 1 Morning:
☐ Create server/validators.js
☐ Add Zod schemas for chat endpoint
☐ Add validation middleware
☐ Test with invalid data
☐ Add error handling

Day 1 Afternoon:
☐ Add schemas for ingest endpoint
☐ Add schemas for search endpoints
☐ Add schemas for export endpoints
☐ Create tests in validators.test.js
☐ Verify all endpoints validate
```

### Task 2: Rate Limiting
```
Day 2:
☐ Install helmet (already installed)
☐ Add rate limit configuration
☐ Test chat endpoint (10 req/min)
☐ Test ingest endpoint (5 req/min)
☐ Test search endpoints (20 req/min)
☐ Verify 429 errors
```

### Task 3: Security Headers
```
Day 3:
☐ Install helmet
☐ Configure CSP
☐ Configure HSTS
☐ Configure X-Frame-Options
☐ Test headers with curl -i
☐ Verify no regressions
```

### Task 4: Test Coverage
```
Day 4 Morning:
☐ Identify DocumentManager gaps
☐ Write upload file tests
☐ Write delete document tests
☐ Write error handling tests
☐ Write loading state tests

Day 4 Afternoon:
☐ Identify useSession hook gaps
☐ Write initialization tests
☐ Write message save tests
☐ Write history retrieval tests
☐ Write error tests
☐ Verify 80% coverage
☐ Run full test suite
☐ Verify 45/45 passing
```

---

## 📚 RESOURCES

### Input Validation
- Zod docs: https://zod.dev
- Express best practices: https://expressjs.com

### Rate Limiting
- express-rate-limit: https://github.com/nfriedly/express-rate-limit
- OWASP: https://owasp.org/www-community/attacks/Denial_of_Service

### Security Headers
- Helmet.js: https://helmetjs.github.io/
- OWASP: https://owasp.org/www-project-secure-headers/
- CSP: https://content-security-policy.com/

### Test Coverage
- Vitest: https://vitest.dev/
- Testing best practices: https://testing-library.com/

---

## 🚀 HOW TO START

### Step 1: Set Up
```bash
cd /Users/mac-Z16MSMAI/Documents/front/agentic-personal-assistant
git checkout -b week1-security-hardening
```

### Step 2: Install Dependencies
```bash
npm install helmet --save
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

### Step 3: Start Implementation
```bash
# Day 1: Input Validation
# Create server/validators.js
# Follow the task breakdown above

# Day 2: Rate Limiting
# Add rate limiting to server/index.js

# Day 3: Security Headers
# Configure helmet

# Day 4: Test Coverage
# Add missing tests
```

### Step 4: Verify
```bash
npm test
npm run test:coverage
bash run-ci-local.sh
```

### Step 5: Commit
```bash
git add .
git commit -m "feat: add security hardening and improve test coverage

- Add input validation for all API endpoints (Zod schemas)
- Implement rate limiting per endpoint
- Add security headers (helmet)
- Improve client test coverage (74% → 80%)

Fixes all Priority 1 tasks from ACTION_PLAN.md"
git push origin week1-security-hardening
```

---

## 📞 SUPPORT

**Need help?**
- See ACTION_PLAN.md for task descriptions
- See PROJECT_REVIEW.md for architecture details
- See DOCS/04-API_SPEC.md for endpoint details
- See GUIDES/TESTING_AND_CI.md for testing procedures

---

**Week 1 Starts**: September 26, 2026  
**Week 1 Ends**: September 30, 2026  
**Target**: ✅ All Priority 1 tasks complete

🚀 **Let's ship these improvements!**
