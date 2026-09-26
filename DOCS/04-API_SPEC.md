# 🔌 Documentation Technique - Spécification API REST

## 1. Vue d'Ensemble de l'API

### Base Configuration

```
Base URL: http://localhost:3001 (development)
Protocol: HTTP/REST/JSON
Authentication: API Key (header: X-API-Key)
Rate Limit: 100 requests / 15 minutes
Timeout: 30 seconds
```

### Authentication

Tous les endpoints (sauf `GET /healthz`) nécessitent le header:
```
X-API-Key: your-api-key
```

### Response Format

**Success Response (2xx)**:
```json
{
  "data": {...} || [],
  "status": "success",
  "timestamp": "2025-02-15T10:30:00Z"
}
```

**Error Response (4xx, 5xx)**:
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "status": "error"
}
```

---

## 2. Endpoints - Santé & Configuration

### GET `/healthz`
**Description**: Health check sans authentification  
**Auth**: ❌ Non requis

**Request**:
```bash
curl http://localhost:3001/healthz
```

**Response (200 OK)**:
```json
{
  "status": "ok",
  "timestamp": "2025-02-15T10:30:00Z"
}
```

---

### GET `/api/config`
**Description**: Retrieve API configuration  
**Auth**: ✅ Requis

**Request**:
```bash
curl http://localhost:3001/api/config \
  -H "X-API-Key: test-key"
```

**Response (200 OK)**:
```json
{
  "apiKey": "test-key",
  "cors": "enabled",
  "rateLimit": "100/15min"
}
```

---

## 3. Endpoints - Modèles LLM

### GET `/api/models`
**Description**: List available Ollama models  
**Auth**: ✅ Requis

**Request**:
```bash
curl http://localhost:3001/api/models \
  -H "X-API-Key: test-key"
```

**Response (200 OK)**:
```json
{
  "models": [
    {
      "name": "qwen2:7b",
      "size": "4.4GB",
      "status": "ready"
    },
    {
      "name": "mistral:7b",
      "size": "3.5GB",
      "status": "ready"
    }
  ]
}
```

---

## 4. Endpoints - Chat

### POST `/api/chat`
**Description**: Send message to AI agent  
**Auth**: ✅ Requis

**Request**:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is in the document?",
    "sessionId": "sess-123",
    "model": "qwen2:7b"
  }'
```

**Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | ✅ | Message to send (max 4000 chars) |
| sessionId | string | ✅ | Session identifier |
| model | string | ❌ | LLM model name (default: qwen2:7b) |

**Response (200 OK)**:
```json
{
  "answer": "Based on the document, the key points are...",
  "model": "qwen2:7b",
  "timestamp": "2025-02-15T10:30:00Z"
}
```

**Errors**:
- `400 Bad Request`: message missing or too long
- `503 Service Unavailable`: Ollama not available
- `401 Unauthorized`: Invalid API key

---

### GET `/api/conversations/:sessionId`
**Description**: Get full chat history for session  
**Auth**: ✅ Requis

**Request**:
```bash
curl http://localhost:3001/api/conversations/sess-123 \
  -H "X-API-Key: test-key"
```

**Response (200 OK)**:
```json
{
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "Hello",
      "model": null,
      "createdAt": "2025-02-15T10:00:00Z"
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "content": "Hello! How can I help?",
      "model": "qwen2:7b",
      "createdAt": "2025-02-15T10:00:05Z"
    }
  ]
}
```

---

### GET `/api/conversations`
**Description**: List all conversations  
**Auth**: ✅ Requis

**Response (200 OK)**:
```json
{
  "conversations": [
    {
      "id": "conv-1",
      "sessionId": "sess-123",
      "createdAt": "2025-02-15T10:00:00Z",
      "updatedAt": "2025-02-15T10:30:00Z",
      "messageCount": 12
    }
  ]
}
```

---

### DELETE `/api/conversations/:sessionId`
**Description**: Delete conversation  
**Auth**: ✅ Requis

**Response (200 OK)**:
```json
{
  "ok": true,
  "message": "Conversation deleted successfully"
}
```

---

### GET `/api/conversations/stats/overview`
**Description**: Get conversation statistics  
**Auth**: ✅ Requis

**Response (200 OK)**:
```json
{
  "totalConversations": 5,
  "totalMessages": 42
}
```

---

## 5. Endpoints - Ingestion de Documents

### POST `/api/ingest`
**Description**: Upload and ingest PDF file  
**Auth**: ✅ Requis

**Request**:
```bash
curl -X POST http://localhost:3001/api/ingest \
  -H "X-API-Key: test-key" \
  -F "file=@document.pdf" \
  -F "title=My Document"
```

**Parameters**:

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| file | file | ✅ | PDF file (max 10MB) |
| title | string | ❌ | Document title |

**Response (200 OK)**:
```json
{
  "documentId": "doc-abc123",
  "fileName": "document.pdf",
  "fileSize": 2048576,
  "pageCount": 15,
  "chunksCreated": 28,
  "timestamp": "2025-02-15T10:30:00Z"
}
```

**Errors**:
- `400 Bad Request`: File not PDF or too large
- `413 Payload Too Large`: File exceeds 10MB
- `503 Service Unavailable`: Vector store unavailable

---

## 6. Endpoints - Documents

### GET `/api/documents`
**Description**: List all documents  
**Auth**: ✅ Requis

**Response (200 OK)**:
```json
{
  "documents": [
    {
      "id": "doc-1",
      "fileName": "Q1-Report.pdf",
      "fileSize": 2048576,
      "pageCount": 15,
      "uploadedAt": "2025-02-15T10:00:00Z",
      "createdAt": "2025-02-15T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/documents/:id`
**Description**: Get specific document  
**Auth**: ✅ Requis

**Response (200 OK)**:
```json
{
  "document": {
    "id": "doc-1",
    "fileName": "Q1-Report.pdf",
    "fileSize": 2048576,
    "pageCount": 15,
    "uploadedAt": "2025-02-15T10:00:00Z"
  }
}
```

**Errors**:
- `404 Not Found`: Document doesn't exist

---

### DELETE `/api/documents/:id`
**Description**: Delete document  
**Auth**: ✅ Requis

**Response (200 OK)**:
```json
{
  "ok": true,
  "message": "Document deleted successfully"
}
```

---

### GET `/api/documents/stats/overview`
**Description**: Get document statistics  
**Auth**: ✅ Requis

**Response (200 OK)**:
```json
{
  "totalDocuments": 15,
  "totalSize": 31457280,
  "totalChunks": 342
}
```

---

## 7. Endpoints - Recherche Avancée

### POST `/api/documents/search/advanced`
**Description**: Advanced search with filters and pagination  
**Auth**: ✅ Requis

**Request**:
```bash
curl -X POST http://localhost:3001/api/documents/search/advanced \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "quarterly",
    "sortBy": "uploadedAt",
    "sortOrder": "DESC",
    "limit": 20,
    "offset": 0
  }'
```

**Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| query | string | "" | Search term |
| sortBy | string | "uploadedAt" | Sort field |
| sortOrder | string | "DESC" | ASC or DESC |
| limit | number | 50 | Results per page |
| offset | number | 0 | Pagination offset |

**Response (200 OK)**:
```json
{
  "results": [
    {
      "id": "doc-1",
      "fileName": "Q1-Report.pdf",
      "fileSize": 2048576,
      "pageCount": 15,
      "uploadedAt": "2025-02-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### POST `/api/documents/search/by-date`
**Description**: Search by date range  
**Auth**: ✅ Requis

**Request**:
```bash
curl -X POST http://localhost:3001/api/documents/search/by-date \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-02-01T00:00:00Z",
    "endDate": "2025-02-28T23:59:59Z"
  }'
```

**Response (200 OK)**:
```json
{
  "results": [...],
  "count": 8
}
```

---

### POST `/api/documents/search/by-size`
**Description**: Search by file size range  
**Auth**: ✅ Requis

**Request**:
```bash
curl -X POST http://localhost:3001/api/documents/search/by-size \
  -H "X-API-Key: test-key" \
  -H "Content-Type: application/json" \
  -d '{
    "minSize": 1000000,
    "maxSize": 5000000
  }'
```

**Response (200 OK)**:
```json
{
  "results": [...],
  "count": 5
}
```

---

### GET `/api/documents/search/facets`
**Description**: Get search facets for filtering  
**Auth**: ✅ Requis

**Response (200 OK)**:
```json
{
  "dates": [
    {
      "date": "2025-02-15",
      "count": 3
    }
  ],
  "sizes": [
    {
      "sizeRange": "1-5MB",
      "count": 8
    }
  ],
  "pages": [
    {
      "pageRange": "10-19 pages",
      "count": 6
    }
  ]
}
```

---

### GET `/api/documents/search/suggestions`
**Description**: Get autocomplete suggestions  
**Auth**: ✅ Requis

**Request**:
```bash
curl "http://localhost:3001/api/documents/search/suggestions?prefix=quar&limit=10" \
  -H "X-API-Key: test-key"
```

**Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| prefix | string | "" | Search prefix |
| limit | number | 10 | Max suggestions |

**Response (200 OK)**:
```json
{
  "suggestions": [
    "Quarterly Report.pdf",
    "Quarterly Earnings.pdf",
    "Quarterly Review.pdf"
  ]
}
```

---

### GET `/api/documents/:id/similar`
**Description**: Find similar documents  
**Auth**: ✅ Requis

**Request**:
```bash
curl "http://localhost:3001/api/documents/doc-123/similar?similarityType=size" \
  -H "X-API-Key: test-key"
```

**Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| similarityType | string | "size" | "size" or "pages" |

**Response (200 OK)**:
```json
{
  "similar": [
    {
      "id": "doc-2",
      "fileName": "similar-doc.pdf",
      "fileSize": 2100000,
      "pageCount": 16
    }
  ]
}
```

---

## 8. Endpoints - Export

### GET `/api/export/documents/json`
**Description**: Export documents as JSON  
**Auth**: ✅ Requis

**Response (200 OK with download)**:
```json
{
  "exportedAt": "2025-02-15T10:30:00Z",
  "format": "JSON",
  "type": "documents",
  "stats": {
    "totalDocuments": 15,
    "totalSize": 31457280,
    "totalPages": 342
  },
  "data": [...]
}
```

---

### GET `/api/export/documents/csv`
**Description**: Export documents as CSV  
**Auth**: ✅ Requis

**Response (200 OK with download)**:
```csv
ID,File Name,File Size (bytes),Page Count,Uploaded At
doc-001,"Q1-Report.pdf",2048576,15,2025-02-15T10:00:00Z
doc-002,"Budget.pdf",1024000,8,2025-02-14T14:20:00Z
```

---

### GET `/api/export/documents/text`
**Description**: Export documents as text report  
**Auth**: ✅ Requis

**Response (200 OK with download)**:
```
═══════════════════════════════════════════════════════
           DOCUMENT EXPORT REPORT
═══════════════════════════════════════════════════════

STATISTICS:
  • Total Documents: 15
  • Total Size: 30.0 MB
  • Total Pages: 342

DOCUMENTS:
1. Q1-Report.pdf
   ID: doc-001
   ...
```

---

### GET `/api/export/conversations/json`
**Description**: Export all conversations as JSON  
**Auth**: ✅ Requis

**Response (200 OK)**:
```json
{
  "exportedAt": "2025-02-15T10:30:00Z",
  "format": "JSON",
  "type": "conversations",
  "data": [...]
}
```

---

### GET `/api/export/conversations/:sessionId/json`
**Description**: Export specific conversation with messages  
**Auth**: ✅ Requis

**Response (200 OK)**:
```json
{
  "exportedAt": "2025-02-15T10:30:00Z",
  "format": "JSON",
  "type": "conversation_transcript",
  "sessionId": "sess-123",
  "messageCount": 12,
  "messages": [...]
}
```

---

### GET `/api/export/conversations/:sessionId/text`
**Description**: Export conversation as text transcript  
**Auth**: ✅ Requis

**Response (200 OK)**:
```
═══════════════════════════════════════════════════════
             CONVERSATION TRANSCRIPT
═══════════════════════════════════════════════════════

Session ID: sess-123
Exported: 2025-02-15T10:30:00Z
Total Messages: 12

[1] USER - Feb 15, 2025, 3:45 PM
What's in the Q1 report?

[2] ASSISTANT - Feb 15, 2025, 3:46 PM
Based on the Q1 report, the key points are...
```

---

### GET `/api/export/database/full`
**Description**: Full database backup  
**Auth**: ✅ Requis

**Response (200 OK)**:
```json
{
  "exportedAt": "2025-02-15T10:30:00Z",
  "format": "JSON",
  "type": "full_database_dump",
  "version": "1.0",
  "stats": {
    "documents": { "count": 15, "totalSize": 31457280 },
    "conversations": { "count": 5, "totalMessages": 42 }
  },
  "documents": [...],
  "conversations": [...]
}
```

---

## 9. Error Codes

| Code | Status | Description |
|------|--------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid API key |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| BAD_REQUEST | 400 | Invalid parameters |
| PAYLOAD_TOO_LARGE | 413 | File or request too large |
| TOO_MANY_REQUESTS | 429 | Rate limit exceeded |
| SERVICE_UNAVAILABLE | 503 | Ollama or vector store down |
| INTERNAL_SERVER_ERROR | 500 | Server error (details logged) |

---

## 10. Rate Limiting

```
Limit: 100 requests per 15 minutes
Applied to: All endpoints except /healthz
Headers:
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1645441800
```

---

**Document Version**: 1.0  
**Dernière mise à jour**: Février 2025
