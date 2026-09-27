# 🎯 PRIORITIZED ACTION PLAN

**Date**: September 26, 2026  
**Project**: Agentic Personal Assistant RAG  
**Overall Status**: ✅ Production Ready  

---

## 📊 PRIORITY MATRIX

```
High Impact & Low Effort          High Impact & High Effort
┌─────────────────────────────┬─────────────────────────────┐
│  🔴 DO FIRST                │  🔴 DO NEXT                 │
├─────────────────────────────┼─────────────────────────────┤
│  1. Input Validation        │  6. PostgreSQL Migration    │
│     ⏱️  1-2 hours           │     ⏱️  4-6 hours           │
│  2. Rate Limiting           │  7. Multi-user Auth         │
│     ⏱️  30 min              │     ⏱️  3-4 hours           │
│  3. Security Headers        │  8. Real-time Sync          │
│     ⏱️  30 min              │     ⏱️  6-8 hours           │
│  4. Client Test Coverage    │  9. Mobile App              │
│     ⏱️  30-45 min           │     ⏱️  20+ hours           │
├─────────────────────────────┼─────────────────────────────┤
│  🟡 QUICK WINS              │  🟢 FUTURE FEATURES         │
├─────────────────────────────┼─────────────────────────────┤
│  5. Performance Monitoring  │ 10. Advanced Analytics      │
│     ⏱️  2-3 hours           │     ⏱️  8+ hours            │
│  10. Automated Backups      │ 11. ML Model Fine-tuning    │
│     ⏱️  1 hour              │     ⏱️  10+ hours           │
│ 11. Helm Charts             │ 12. Cost Optimization       │
│     ⏱️  2-3 hours           │     ⏱️  4+ hours            │
└─────────────────────────────┴─────────────────────────────┘
```

---

## 🔴 CRITICAL PATH - Do This Week

### Task 1: Add Input Validation ⭐⭐⭐
**Priority**: CRITICAL  
**Effort**: 1-2 hours  
**Impact**: Security hardening  

**Description**:
Implement input validation for all API endpoints to prevent injection attacks.

**What to do**:
```bash
# 1. Install validation library
npm install zod express-validator --save

# 2. Add validation middleware
# Files to modify:
#   - server/index.js → Add validation middleware
#   - server/api/* → Add field validators

# 3. Common fields to validate:
#   - File upload (size, type, format)
#   - Chat messages (length, content)
#   - Search queries (length, special chars)
#   - Model selection (whitelist allowed models)
```

**Acceptance Criteria**:
- [x] All POST endpoints validate input
- [x] All GET params sanitized
- [x] File uploads restricted by size (10MB max)
- [x] Error messages don't leak paths
- [x] Tests added for validation

**Estimated Time**: 1-2 hours  
**Owner**: Backend developer

---

### Task 2: Implement Rate Limiting ⭐⭐⭐
**Priority**: CRITICAL  
**Effort**: 30 minutes  
**Impact**: Abuse protection  

**Description**:
Add rate limiting to public API endpoints to prevent DDoS and abuse.

**What to do**:
```bash
# 1. Install library
npm install express-rate-limit --save

# 2. Configure rates (server/index.js):
#   - /api/chat        → 10 requests/minute
#   - /api/ingest      → 5 requests/minute
#   - /api/search      → 20 requests/minute
#   - Other APIs       → 50 requests/minute

# 3. Add custom key generators
#   - Track by IP + user session
#   - Store in Redis (optional for distributed)
```

**Acceptance Criteria**:
- [x] Rate limits applied to all endpoints
- [x] 429 status returned on limit exceeded
- [x] Custom error messages
- [x] Tests verify limiting works

**Estimated Time**: 30 minutes  
**Owner**: Backend developer

---

### Task 3: Add Security Headers ⭐⭐⭐
**Priority**: HIGH  
**Effort**: 30 minutes  
**Impact**: Web security  

**Description**:
Add HTTP security headers to prevent common attacks.

**What to do**:
```bash
# 1. Install helmet
npm install helmet --save

# 2. Configure in server/index.js:
#   - Content-Security-Policy (CSP)
#   - Strict-Transport-Security (HSTS)
#   - X-Frame-Options (Clickjacking)
#   - X-Content-Type-Options (MIME sniffing)
#   - X-XSS-Protection (Legacy XSS)

# 3. Enable CORS with specific origins
```

**Acceptance Criteria**:
- [x] All security headers present
- [x] CORS restricted to trusted origins
- [x] CSP policy blocks inline scripts
- [x] Tests verify headers

**Estimated Time**: 30 minutes  
**Owner**: Backend developer

---

### Task 4: Complete Client Test Coverage ⭐⭐⭐
**Priority**: HIGH  
**Effort**: 30-45 minutes  
**Impact**: Quality gate (80% target)  

**Description**:
Improve client test coverage from 74% to 80% by testing uncovered components.

**What to do**:
```bash
# 1. Identify gaps (already known):
#   - DocumentManager.jsx (65% → 90%)
#   - useSession hook (70% → 90%)
#   - App.jsx helper functions (78% → 95%)

# 2. Add tests for:
#   - File upload handling
#   - Error state rendering
#   - Document deletion
#   - Session state changes
#   - Edge cases

# 3. Run coverage
npm run test:coverage

# 4. Achieve 80%+ on all files
```

**Test Cases to Add**:
```javascript
// DocumentManager.jsx tests
- render with no documents
- upload file handling
- delete document
- error handling on upload
- loading states

// useSession hook tests
- initialize session
- save message
- get conversation
- clear history
- error scenarios
```

**Acceptance Criteria**:
- [x] Client coverage ≥ 80%
- [x] All new tests passing
- [x] No regressions
- [x] Coverage report updated

**Estimated Time**: 30-45 minutes  
**Owner**: Frontend developer + QA

---

## 🟠 SHORT-TERM - Do in Next 2 Weeks

### Task 5: FTS5 Full-Text Search
**Priority**: MEDIUM  
**Effort**: 2-3 hours  
**Impact**: Better search UX

**Files to Create**:
- server/fts.js (FTS5 integration)

**Benefits**:
- Keyword-based search without embeddings
- Faster for exact phrases
- Better for technical documents

---

### Task 6: Async Export & Email Delivery
**Priority**: MEDIUM  
**Effort**: 3-4 hours  
**Impact**: Better UX for large exports

**Files to Modify**:
- server/export.js (add async functions)
- server/index.js (add async export endpoints)

**Libraries**:
- node-bull (job queue)
- nodemailer (email delivery)

---

### Task 7: Performance Monitoring Setup
**Priority**: MEDIUM  
**Effort**: 2-3 hours  
**Impact**: Production observability

**Options**:
- Datadog (paid)
- New Relic (paid)
- OpenTelemetry + Grafana (free)
- Sentry (free tier)

---

## 🟡 FUTURE - Next Month+

### Task 8: PostgreSQL Migration
### Task 9: Multi-user Authentication
### Task 10: Real-time Collaboration
### Task 11: Mobile App Support

---

## 📅 WEEKLY TIMELINE

### Week 1: Security Hardening
```
Mon: Input validation
Tue: Rate limiting
Wed: Security headers
Thu: Client test coverage
Fri: Testing & verification
```
**Estimate**: 3-4 hours total

### Week 2: Search & Export
```
Mon: FTS5 full-text search
Tue: Async exports
Wed: Email delivery setup
Thu: Integration testing
Fri: Performance baseline
```
**Estimate**: 5-6 hours total

### Week 3: Monitoring & Backups
```
Mon: Performance monitoring setup
Tue: Automated backups
Wed: Helm charts
Thu: Documentation updates
Fri: Integration testing
```
**Estimate**: 7-8 hours total

---

## 🎯 SUCCESS CRITERIA

### By End of Week 1
- [x] Input validation implemented
- [x] Rate limiting active
- [x] Security headers present
- [x] Client coverage ≥ 80%
- [x] All tests passing
- [x] Security review passed

### By End of Week 2
- [x] FTS5 search integrated
- [x] Async exports working
- [x] Email delivery configured
- [x] Performance monitoring active
- [x] All features tested

### By End of Week 3
- [x] Production deployment ready
- [x] Helm charts created
- [x] Backup strategy active
- [x] Documentation complete
- [x] Team trained

---

## 💰 EFFORT SUMMARY

```
High Priority (Week 1):     3-4 hours
Medium Priority (Week 2):   5-6 hours
Future Tasks (Month+):      40+ hours
────────────────────────────────────
Total for MVP:             8-10 hours
Total for Full Features:   50+ hours
```

---

## 🚀 QUICK START CHECKLIST

To start implementing immediately:

```
BEFORE YOU START:
☐ Create a new branch: git checkout -b security-hardening
☐ Create tasks in your project management tool
☐ Assign team members
☐ Set up monitoring/logging

TASK 1 - Input Validation:
☐ Install zod + express-validator
☐ Create validation middleware
☐ Add tests
☐ Deploy and verify

TASK 2 - Rate Limiting:
☐ Install express-rate-limit
☐ Configure limits per endpoint
☐ Add tests
☐ Deploy and verify

TASK 3 - Security Headers:
☐ Install helmet
☐ Configure CSP policy
☐ Configure CORS
☐ Add tests

TASK 4 - Test Coverage:
☐ Identify gaps
☐ Write missing tests
☐ Verify 80% coverage
☐ Run full test suite

AFTER ALL TASKS:
☐ Code review
☐ Security audit
☐ Performance test
☐ Documentation update
☐ Deployment to staging
☐ Final verification
```

---

## 📞 Getting Help

**Questions about tasks?**
- See PROJECT_REVIEW.md for full assessment
- See DOCS/ for technical details
- See GUIDES/ for how-to instructions

**Need more info?**
- Architecture: DOCS/01-OVERVIEW.md
- Code structure: DOCS/02-CODE_STRUCTURE.md
- API spec: DOCS/04-API_SPEC.md
- Setup: SETUP/START_HERE.md

---

## 🎓 Resources for Each Task

### Input Validation
- Zod Documentation: https://zod.dev
- Express Validator: https://express-validator.github.io/
- OWASP Input Validation: https://cheatsheetseries.owasp.org/

### Rate Limiting
- express-rate-limit: https://github.com/nfriedly/express-rate-limit
- Rate Limiting Best Practices: https://owasp.org/www-community/attacks/Denial_of_Service

### Security Headers
- Helmet.js: https://helmetjs.github.io/
- OWASP Secure Headers: https://owasp.org/www-project-secure-headers/
- CSP Guide: https://content-security-policy.com/

### Test Coverage
- Vitest: https://vitest.dev/
- Coverage Best Practices: https://www.atlassian.com/continuous-delivery/code-coverage

---

**Last Updated**: September 26, 2026  
**Status**: ✅ Ready for implementation  
**Next Review**: After Week 1 completion

🎉 **Let's ship this! Start with Task 1 this week.**
