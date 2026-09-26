# Production Enhancement Roadmap (OPTIMIZED)

**Agentic RAG Application** — Data Durability + Legal Compliance Focus

## Executive Summary

**Your Requirements:**
✅ **Zero data loss tolerance** → PostgreSQL is the foundation  
✅ **2-10 concurrent users** → PostgreSQL adequate, no need for distributed cache  
✅ **Scanned PDFs required** → OCR moves to Phase 1 (was Phase 3)  
✅ **Citations legally required** → Source attribution is non-negotiable  
✅ **Testable architecture** → Ollama can be mocked for CI/CD  

**Outcome:** A **legally compliant, durable, production-ready RAG system** in 3-4 weeks.

---

## 🎯 Revised Timeline & Priorities

### **Phase 0: FOUNDATION (Days 1-4)** — Must-Have for Production

| Task | Why | Effort | Days |
|------|-----|--------|------|
| **PostgreSQL Setup** | Data durability (zero loss) | Medium | 1.5 |
| **Namespace Security** | SessionId→UserId validation | Low | 1 |
| **Error Recovery** | Graceful fallback if Pinecone/Ollama down | Medium | 1.5 |
| **Unit Test Framework** | Ollama mocking + test infrastructure | Low | 0.5 |

**Outcome:** Durable foundation, secure isolation, recoverable errors  
**Blockers:** None  
**Start:** Day 1

---

### **Phase 1: COMPLIANCE + CORE FEATURES (Days 5-12)** — Legal Requirements + UX

| Task | Why | Effort | Days | Dependencies |
|------|-----|--------|------|--------------|
| **Recursive Chunking** | Fix semantic boundaries in docs | Low | 1 | None |
| **Citation Tracking** | Legal requirement: trace all answers to source | Low | 1 | None |
| **OCR for Scanned PDFs** | Support image-based documents | Medium | 2 | Tesseract.js |
| **SSE Token Streaming** | Real-time response display (UX) | Medium | 2 | Ollama test |
| **Document Manager** | Users can view/delete uploaded files | Medium | 1.5 | Phase 0 |

**Outcome:** Production-ready chat with citations, scanned PDF support, modern UX  
**Blockers:** None  
**Start:** Day 5

---

### **Phase 2: OBSERVABILITY + SCALE (Days 13-19)** — Monitoring + Audit Trail

| Task | Why | Effort | Days | Dependencies |
|------|-----|--------|------|--------------|
| **Audit Logging** | Track user actions for compliance | Low | 1-2 | PostgreSQL |
| **Ingestion Progress UI** | Real-time feedback for large PDFs | Medium | 2 | Phase 0 |
| **Hybrid Search** | Better keyword matching (e.g., part numbers) | Medium | 2-3 | Optional |
| **Chat Export** | Users can save/share conversations | Low | 1-2 | Puppeteer |

**Outcome:** Full audit trail, compliance-ready, scalable search  
**Blockers:** PostgreSQL setup (Phase 0)  
**Start:** Day 13

---

### **Phase 3: OPTIMIZATION (Days 20+)** — Performance & Advanced Features

| Task | Why | Effort | Days | Dependencies |
|------|-----|--------|------|--------------|
| **Async Ingestion Queue** | Large batch uploads don't block | High | 3 | Bull/BullMQ |
| **Cross-Encoder Reranking** | Better ranking of retrieval results | High | 3-4 | Model setup |
| **Metrics Dashboard** | Monitor system performance | Medium | 2 | Prometheus |

**Outcome:** Enterprise-grade performance, batch operations, observability  
**Blockers:** Phases 0-2 complete  
**Start:** Day 20+

---

## 🔧 Detailed Implementation: Phase 0 (Foundation)

### Task 0.1: PostgreSQL Chat Memory Store

**Why:** Database restart = lose all chat history = compliance violation

**Implementation:**

```bash
# 1. Install dependencies
npm install --save pg @langchain/community

# 2. Create schema
psql -U postgres -d agentic_rag <<'EOF'
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,  -- 'user' or 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_session FOREIGN KEY(session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),
  UNIQUE(id, user_id)
);

CREATE INDEX idx_session_messages ON chat_messages(session_id, created_at);
CREATE INDEX idx_user_sessions ON sessions(user_id);
EOF
```

```javascript
// server/db.js (NEW)
import pg from "pg";
import { BaseListChatMessageHistory } from "@langchain/core/chat_history";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    "postgresql://postgres:password@localhost:5432/agentic_rag",
  max: 20,
  idleTimeoutMillis: 30000,
});

export class PostgresChatHistory extends BaseListChatMessageHistory {
  constructor(sessionId, userId) {
    super();
    this.sessionId = sessionId;
    this.userId = userId;
  }

  async getMessages() {
    const result = await pool.query(
      "SELECT role, content FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC",
      [this.sessionId]
    );
    return result.rows.map(row => ({
      type: row.role === "user" ? "human" : "ai",
      content: row.content
    }));
  }

  async addMessage(message) {
    await pool.query(
      "INSERT INTO chat_messages (session_id, user_id, role, content) VALUES ($1, $2, $3, $4)",
      [this.sessionId, this.userId, 
       message._getType() === "human" ? "user" : "assistant",
       message.content]
    );
  }

  async addUserMessage(text) {
    await this.addMessage({ content: text, _getType: () => "human" });
  }

  async addAiMessage(text) {
    await this.addMessage({ content: text, _getType: () => "assistant" });
  }

  async clear() {
    await pool.query("DELETE FROM chat_messages WHERE session_id = $1", [this.sessionId]);
  }
}

export { pool };
```

**Test:** Restart server → old chat history still visible ✅

---

### Task 0.2: Namespace Security Validation

**Why:** SessionId alone isn't secure; map to userId

**Implementation:**

```javascript
// server/auth.js (NEW)
export async function validateSessionId(sessionId, userId) {
  const result = await pool.query(
    "SELECT id FROM sessions WHERE id = $1 AND user_id = $2",
    [sessionId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error("Unauthorized: session does not belong to user");
  }

  await pool.query(
    "UPDATE sessions SET last_active = NOW() WHERE id = $1",
    [sessionId]
  );

  return true;
}

export async function createOrGetSession(userId) {
  // Check if user has existing session
  const existing = await pool.query(
    "SELECT id FROM sessions WHERE user_id = $1 ORDER BY last_active DESC LIMIT 1",
    [userId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Create new session
  const newSession = await pool.query(
    "INSERT INTO sessions (id, user_id) VALUES ($1, $2) RETURNING id",
    [crypto.randomUUID(), userId]
  );

  return newSession.rows[0].id;
}
```

```javascript
// server/index.js (Modified /api/chat)
app.post("/api/chat", async (req, res) => {
  const { message, sessionId, model, userId } = req.body;

  // SECURITY: Validate session belongs to user
  try {
    await validateSessionId(sessionId, userId);
  } catch (error) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // Continue normal chat...
});
```

**Test:** 
- Curl with fake sessionId → 403 ✅
- Curl with correct sessionId → 200 ✅

---

### Task 0.3: Error Recovery & Graceful Degradation

**Why:** If Pinecone is down, don't crash → offer fallback

**Implementation:**

```javascript
// server/tools.js (Enhanced with recovery)
async function searchKnowledgeBase(query, sessionId, userId) {
  try {
    // Try Pinecone first
    const index = pinecone.Index(process.env.PINECONE_INDEX).namespace(sessionId);
    const embedding = await embedModel.embedQuery(query);
    
    const results = await Promise.race([
      index.query({ vector: embedding, topK: 5, includeMetadata: true }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Pinecone timeout")), 5000)
      )
    ]);

    return results.matches.map(m => ({
      text: m.metadata.text,
      source: m.metadata.fileName,
      page: m.metadata.pageNumber,
      confidence: m.score
    }));
  } catch (error) {
    logger.error("Pinecone error:", error);

    // FALLBACK: Query recent chat history instead
    const messageHistory = await pool.query(
      "SELECT content FROM chat_messages WHERE session_id = $1 AND role = 'assistant' ORDER BY created_at DESC LIMIT 10",
      [sessionId]
    );

    return messageHistory.rows.map((row, idx) => ({
      text: row.content,
      source: "Chat History (Cache)",
      confidence: 0.5 - idx * 0.05  // Lower confidence for older messages
    }));
  }
}
```

```javascript
// server/agent.js (Ollama recovery)
async function runAgent(sessionId, message, userId, model = "qwen2:7b") {
  try {
    const ollamaResponse = await fetch(
      `${process.env.OLLAMA_BASE_URL}/api/generate`,
      {
        method: "POST",
        body: JSON.stringify({ model, prompt: message, stream: false })
      }
    );

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama returned ${ollamaResponse.status}`);
    }

    const data = await ollamaResponse.json();
    return data.response;
  } catch (error) {
    logger.error("Ollama error:", error);

    // FALLBACK: Return helpful message
    return `I'm sorry, the AI service is temporarily unavailable. 
    
    Here's what I can do:
    1. Search your uploaded documents (I can still read them)
    2. Show you the chat history
    3. Try again in a moment
    
    Error: ${error.message}`;
  }
}
```

**Test:**
- Kill Pinecone connection → chat still works (uses cache) ✅
- Kill Ollama → returns friendly error message ✅

---

### Task 0.4: Unit Test Framework Setup

**Why:** Need mocked Ollama for CI/CD (can't require real Ollama in tests)

**Implementation:**

```bash
npm install --save-dev vitest @vitest/ui nock
```

```javascript
// server/__tests__/agent.test.js
import { describe, it, expect, beforeEach, vi } from "vitest";
import nock from "nock";
import { runAgent } from "../agent.js";

describe("Agent with Ollama Mocking", () => {
  beforeEach(() => {
    // Mock Ollama API
    nock("http://localhost:11434")
      .post("/api/generate")
      .reply(200, {
        response: "The capital of France is Paris."
      });
  });

  it("should generate response from mocked Ollama", async () => {
    const result = await runAgent(
      "test-session",
      "What is the capital of France?",
      "user-123",
      "qwen2:7b"
    );

    expect(result).toContain("Paris");
  });

  it("should handle Ollama timeout gracefully", async () => {
    nock("http://localhost:11434")
      .post("/api/generate")
      .delayConnection(10000)  // Simulate timeout
      .reply(408);

    const result = await runAgent(
      "test-session",
      "Test",
      "user-123"
    );

    expect(result).toContain("temporarily unavailable");
  });
});
```

```json
// server/package.json (add test script)
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui"
  }
}
```

**Test:** `npm run test:run` → All tests pass without real Ollama ✅

---

## 🎯 Phase 1: Compliance + Core Features

### 1.1: Citation Tracking (Legal Requirement)

```javascript
// server/tools.js (Enhanced)
async function searchKnowledgeBase(query, sessionId) {
  const results = await pinecone.query(...);
  
  return results.matches.map(m => ({
    text: m.metadata.text,
    source: {
      fileName: m.metadata.fileName,
      pageNumber: m.metadata.pageNumber || "N/A",
      section: m.metadata.section || "General",
      ingestedAt: m.metadata.ingestedAt
    },
    confidence: m.score
  }));
}
```

```javascript
// server/agent.js (Modified system prompt)
const SYSTEM_PROMPT = `
You are a helpful assistant. When answering questions, ALWAYS cite your sources.

Use this format:
"[Answer text] [source: filename, page X, section Y]"

Examples:
- "The policy expires in 2025 [source: insurance_policy.pdf, page 3, Coverage Terms]"
- "Contact support@company.com [source: contact_info.pdf, page 1, Support]"

If you're unsure about the source, say so: "[...uncertain source]"
`;
```

**Verification Test:**
```bash
Query: "What is the return policy?"
Response: "Items can be returned within 30 days [source: policy.pdf, page 2, Returns]"
✅ Citation present and verifiable
```

---

### 1.2: Recursive Chunking

```javascript
// server/ingest.js
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
  chunkSize: 1200,
  chunkOverlap: 200,
  separators: [
    "\n## ",     // Markdown h2
    "\n### ",    // Markdown h3
    "\n#### ",   // Markdown h4
    "\n\n",      // Paragraphs
    "\n",        // Lines
    " "          // Words (fallback)
  ]
});

async function ingestPDF(file, sessionId, userId) {
  // Extract text from PDF
  const text = await extractPDFText(file.path);
  
  // Split into chunks
  const chunks = await splitter.splitText(text);
  
  // Embed and store with metadata
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedModel.embedQuery(chunks[i]);
    await pinecone.upsert({
      id: `${sessionId}-${file.originalname}-${i}`,
      values: embedding,
      metadata: {
        sessionId,
        userId,
        fileName: file.originalname,
        chunkIndex: i,
        totalChunks: chunks.length,
        text: chunks[i],
        ingestedAt: new Date().toISOString()
      }
    });
  }
}
```

---

### 1.3: OCR for Scanned PDFs (CRITICAL for Your Use Case)

```bash
npm install --save tesseract.js pdfjs-dist
```

```javascript
// server/ocr.js (NEW)
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

export async function extractTextFromPDF(filePath) {
  const pdf = await pdfjsLib.getDocument(filePath).promise;
  let fullText = "";
  let hasImages = false;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    
    // Try extracting text first
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(" ");
    
    if (pageText.trim().length < 50) {
      // Page is mostly images (likely scanned) → use OCR
      hasImages = true;
      
      const viewport = page.getViewport({ scale: 2 });
      const canvas = await page.render({ canvasContext: {} }).promise;
      
      const result = await Tesseract.recognize(canvas, "eng");
      fullText += `\n[Page ${pageNum} - OCR'd]\n${result.data.text}`;
    } else {
      // Normal text extraction
      fullText += `\n[Page ${pageNum}]\n${pageText}`;
    }
  }

  return { text: fullText, isScanned: hasImages };
}
```

```javascript
// server/ingest.js (Modified)
async function ingestPDF(file, sessionId, userId) {
  const { text, isScanned } = await extractTextFromPDF(file.path);
  
  const chunks = await splitter.splitText(text);
  
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedModel.embedQuery(chunks[i]);
    
    await pinecone.upsert({
      id: `${sessionId}-${file.originalname}-${i}`,
      values: embedding,
      metadata: {
        // ... existing metadata ...
        isScanned,  // Mark OCR'd content
        confidenceLevel: isScanned ? "medium" : "high"
      }
    });
  }
  
  // Log ingestion
  await pool.query(
    "INSERT INTO ingestion_log (session_id, user_id, file_name, chunks_count, is_scanned) VALUES ($1, $2, $3, $4, $5)",
    [sessionId, userId, file.originalname, chunks.length, isScanned]
  );
}
```

**Test:**
- Upload regular PDF → extracted normally
- Upload scanned PDF (image) → OCR applied
- Both indexed and searchable ✅

---

### 1.4: SSE Token Streaming

```javascript
// server/index.js (/api/chat endpoint)
app.post("/api/chat", async (req, res) => {
  const { message, sessionId, model, userId } = req.body;
  
  // Validate session
  await validateSessionId(sessionId, userId);
  
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  try {
    // Get retrieval context
    const context = await searchKnowledgeBase(message, sessionId);
    const contextStr = context.map(c => 
      `[${c.source.fileName}] ${c.text}`
    ).join("\n");
    
    // Build prompt with context + citations
    const prompt = `
Context from documents:
${contextStr}

User question: ${message}

Respond with citations in format: [source: filename, page X]
    `;
    
    // Stream response from Ollama
    const response = await fetch(
      `${process.env.OLLAMA_BASE_URL}/api/generate`,
      {
        method: "POST",
        body: JSON.stringify({
          model,
          prompt,
          stream: true  // Enable streaming
        })
      }
    );
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let fullResponse = "";
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");
      
      for (const line of lines) {
        if (!line) continue;
        const json = JSON.parse(line);
        
        if (json.response) {
          fullResponse += json.response;
          
          // Send token to client
          res.write(`data: ${JSON.stringify({
            token: json.response,
            done: json.done
          })}\n\n`);
        }
      }
    }
    
    // Save to chat history
    await new PostgresChatHistory(sessionId, userId).addAiMessage(fullResponse);
    
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    logger.error("Chat error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});
```

```jsx
// client/src/App.jsx (SSE streaming)
async function sendMessage(message) {
  const eventSource = new EventSource(
    `${API_BASE}/api/chat?message=${encodeURIComponent(message)}&sessionId=${sessionId}&userId=${userId}&model=${selectedModel}`,
    { withCredentials: true }
  );
  
  let fullResponse = "";
  const messageId = Date.now();
  
  setChatMessages(prev => [
    ...prev,
    { id: messageId, role: "assistant", content: "", streaming: true }
  ]);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.token) {
      fullResponse += data.token;
      
      setChatMessages(prev => {
        const newMessages = [...prev];
        const lastIdx = newMessages.length - 1;
        newMessages[lastIdx] = {
          ...newMessages[lastIdx],
          content: fullResponse
        };
        return newMessages;
      });
    }
    
    if (data.done || event.data === "[DONE]") {
      eventSource.close();
      setChatMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].streaming = false;
        return newMessages;
      });
    }
  };
}
```

---

### 1.5: Document Manager

```javascript
// server/index.js
app.get("/api/documents", async (req, res) => {
  const { sessionId, userId } = req.query;
  
  await validateSessionId(sessionId, userId);
  
  const result = await pool.query(`
    SELECT DISTINCT 
      file_name,
      COUNT(*) as chunk_count,
      SUM(file_size) as total_size,
      MAX(ingested_at) as last_modified,
      is_scanned
    FROM ingestion_log
    WHERE session_id = $1
    GROUP BY file_name, is_scanned
    ORDER BY last_modified DESC
  `, [sessionId]);
  
  res.json({
    documents: result.rows.map(row => ({
      id: row.file_name,
      name: row.file_name,
      chunks: row.chunk_count,
      size: Math.round(row.total_size / 1024),  // KB
      uploadedAt: row.last_modified,
      isScanned: row.is_scanned
    }))
  });
});

app.delete("/api/documents/:fileId", async (req, res) => {
  const { sessionId, userId } = req.body;
  
  await validateSessionId(sessionId, userId);
  
  // Delete from Pinecone
  const index = pinecone.Index(process.env.PINECONE_INDEX).namespace(sessionId);
  await index.deleteMany({
    filter: { fileName: req.params.fileId }
  });
  
  // Mark as deleted in audit log
  await pool.query(
    "INSERT INTO audit_log (session_id, user_id, action, document_name) VALUES ($1, $2, $3, $4)",
    [sessionId, userId, "DELETE_DOCUMENT", req.params.fileId]
  );
  
  res.json({ success: true, deleted: req.params.fileId });
});
```

---

## 📊 Success Criteria After Each Phase

### ✅ Phase 0 Complete
- [ ] PostgreSQL running, schemas created
- [ ] Server restart → chat history persists
- [ ] SessionId→UserId validation enforced (403 on invalid)
- [ ] Pinecone down → fallback to chat history
- [ ] Ollama down → friendly error message
- [ ] Unit tests run with mocked Ollama

### ✅ Phase 1 Complete
- [ ] All responses include [source: filename] citations
- [ ] Code blocks, tables stay intact (recursive chunking)
- [ ] Scanned PDFs extract via OCR + indexed
- [ ] Chat responses stream token-by-token
- [ ] Users can view and delete uploaded documents

### ✅ Phase 2 Complete
- [ ] All user actions logged to PostgreSQL
- [ ] Large PDF ingestion shows real-time progress
- [ ] Keyword searches rank exact matches higher
- [ ] Users can export chats as JSON/PDF

---

## 📦 Dependencies to Add

```bash
# Phase 0
npm install --save pg @langchain/community
npm install --save-dev vitest @vitest/ui nock

# Phase 1
npm install --save tesseract.js pdfjs-dist

# Phase 2
npm install --save bull redis  # If needed for queue
```

---

## 🚀 Quick Start (Phase 0)

```bash
# 1. Install PostgreSQL
brew install postgresql  # macOS
# or Docker: docker run -e POSTGRES_PASSWORD=password -p 5432:5432 postgres

# 2. Create database
createdb agentic_rag

# 3. Install dependencies
npm install --save pg @langchain/community

# 4. Create .env
echo "DATABASE_URL=postgresql://postgres:password@localhost:5432/agentic_rag" >> server/.env

# 5. Run migrations
psql -U postgres -d agentic_rag < server/schema.sql

# 6. Start server
npm run dev:server
```

---

## 📋 Checklist Before Production

- [ ] PostgreSQL schema created + tested
- [ ] All API endpoints validated with sessionId→userId
- [ ] Error recovery tested (Pinecone down, Ollama down)
- [ ] Unit tests passing (`npm run test:run`)
- [ ] Citations present in all responses
- [ ] OCR working on scanned PDFs
- [ ] SSE streaming working (tokens appear live)
- [ ] Document manager showing uploads
- [ ] Audit log recording user actions
- [ ] Database backup strategy in place

---

## Next Steps

1. **Start Phase 0 immediately** (Foundation is critical)
2. **Set up PostgreSQL** (don't skip this)
3. **Run tests with mocked Ollama** (verify setup)
4. **Move to Phase 1** after Phase 0 passing tests

---

Last Updated: 2026-09-26  
Estimated Total Timeline: **3-4 weeks** to production-ready  
Risk Level: **Low** (PostgreSQL + error recovery handles most failures)
