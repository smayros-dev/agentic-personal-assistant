# Quick Wins Implementation Guide

## Overview

These are the easiest-to-implement features that will have the most immediate impact on the project.

---

## 🥇 Quick Win #1: SQLite Persistence

### Why?
- **Problem**: All data lost on restart
- **Impact**: Users can recover their work
- **Effort**: 2-3 days
- **Value**: Critical for MVP

### Implementation Steps

#### Step 1: Install Dependencies
```bash
npm install -S sqlite3 better-sqlite3
npm install -D @types/better-sqlite3
```

#### Step 2: Create Database Module
```javascript
// server/db/index.js
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'app.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export default db;
```

#### Step 3: Create Schema
```sql
-- server/db/schema.sql
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  fileName TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  pageCount INTEGER NOT NULL,
  uploadedAt TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_uploadedAt (uploadedAt)
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessionId (sessionId)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id),
  INDEX idx_conversationId (conversationId)
);
```

#### Step 4: Update Document Manager
```javascript
// server/documents.js
import db from './db/index.js';

export function addDocument(doc) {
  const stmt = db.prepare(`
    INSERT INTO documents (id, fileName, fileSize, pageCount, uploadedAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(doc.id, doc.fileName, doc.fileSize, doc.pageCount, doc.uploadedAt);
  return doc;
}

export function getDocuments() {
  const stmt = db.prepare('SELECT * FROM documents ORDER BY uploadedAt DESC');
  return stmt.all();
}

export function deleteDocument(id) {
  const stmt = db.prepare('DELETE FROM documents WHERE id = ?');
  return stmt.run(id);
}
```

#### Step 5: Update Chat Service
```javascript
// server/chat.js
import db from './db/index.js';
import { v4 as uuid } from 'uuid';

export async function saveMessage(sessionId, role, content, model) {
  let convId = db.prepare(
    'SELECT id FROM conversations WHERE sessionId = ? LIMIT 1'
  ).get(sessionId)?.id;

  if (!convId) {
    convId = uuid();
    db.prepare(`
      INSERT INTO conversations (id, sessionId, createdAt, updatedAt)
      VALUES (?, ?, datetime('now'), datetime('now'))
    `).run(convId, sessionId);
  }

  const msgId = uuid();
  db.prepare(`
    INSERT INTO messages (id, conversationId, role, content, model, createdAt)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(msgId, convId, role, content, model);

  // Update conversation timestamp
  db.prepare(`
    UPDATE conversations SET updatedAt = datetime('now') WHERE id = ?
  `).run(convId);

  return { id: msgId, role, content };
}

export function getConversation(sessionId) {
  const convId = db.prepare(
    'SELECT id FROM conversations WHERE sessionId = ? LIMIT 1'
  ).get(sessionId)?.id;

  if (!convId) return [];

  return db.prepare(`
    SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC
  `).all(convId);
}
```

### Testing
```bash
npm run test  # Tests should still pass with DB backing
```

---

## 🥈 Quick Win #2: Advanced Document Search

### Why?
- **Problem**: Can't filter/sort documents effectively
- **Impact**: Better UX, easier document management
- **Effort**: 1-2 days
- **Value**: Immediate UX improvement

### Implementation Steps

#### Step 1: Add Search Endpoint
```javascript
// server/index.js
app.get('/api/documents/search', (req, res) => {
  const { q, sortBy = 'date', order = 'desc', fromDate, toDate } = req.query;

  let query = 'SELECT * FROM documents WHERE 1=1';
  const params = [];

  if (q) {
    query += ' AND fileName LIKE ?';
    params.push(`%${q}%`);
  }

  if (fromDate) {
    query += ' AND uploadedAt >= ?';
    params.push(fromDate);
  }

  if (toDate) {
    query += ' AND uploadedAt <= ?';
    params.push(toDate);
  }

  // Add sorting
  const sortMap = { date: 'uploadedAt', name: 'fileName', size: 'fileSize' };
  const sortCol = sortMap[sortBy] || 'uploadedAt';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${sortCol} ${sortOrder}`;

  const stmt = db.prepare(query);
  const results = stmt.all(...params);

  res.json({ documents: results, count: results.length });
});
```

#### Step 2: Update Frontend Search
```jsx
// client/src/components/DocumentManager.jsx
const [filters, setFilters] = useState({
  query: '',
  sortBy: 'date',
  order: 'desc',
  fromDate: '',
  toDate: '',
});

const handleSearch = async (e) => {
  e.preventDefault();
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v)
  );
  
  const res = await fetch(`/api/documents/search?${params}`);
  const data = await res.json();
  setDocuments(data.documents);
};

return (
  <div>
    <form onSubmit={handleSearch}>
      <input
        type="text"
        placeholder="Search..."
        value={filters.query}
        onChange={(e) => setFilters({...filters, query: e.target.value})}
      />
      <select
        value={filters.sortBy}
        onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
      >
        <option value="date">Date</option>
        <option value="name">Name</option>
        <option value="size">Size</option>
      </select>
      <button type="submit">Search</button>
    </form>
  </div>
);
```

### Testing
```javascript
describe('Advanced Search', () => {
  it('should filter by name', () => {
    // Test implementation
  });

  it('should sort by different fields', () => {
    // Test implementation
  });

  it('should filter by date range', () => {
    // Test implementation
  });
});
```

---

## 🥉 Quick Win #3: Export Functionality

### Why?
- **Problem**: Can't get data out of system
- **Impact**: Portability, data ownership
- **Effort**: 1-2 days
- **Value**: User confidence

### Implementation Steps

#### Step 1: Add Export Endpoints
```javascript
// server/export.js
import { json2csv } from 'json2csv';
import PDFDocument from 'pdfkit';

export function exportDocumentsAsCSV(documents) {
  const csv = json2csv({ data: documents });
  return csv;
}

export function exportChatHistoryAsMarkdown(messages) {
  let md = '# Chat History\n\n';
  for (const msg of messages) {
    md += `**${msg.role}**: ${msg.content}\n\n`;
  }
  return md;
}

export function exportChatHistoryAsPDF(messages) {
  const doc = new PDFDocument();
  doc.fontSize(16).text('Chat History', { underline: true });
  doc.moveDown();

  for (const msg of messages) {
    doc.fontSize(12).text(`${msg.role.toUpperCase()}:`, { bold: true });
    doc.fontSize(10).text(msg.content);
    doc.moveDown();
  }

  return doc;
}
```

#### Step 2: Add Export Routes
```javascript
// server/index.js
app.get('/api/export/documents', (req, res) => {
  const { format = 'csv' } = req.query;
  const docs = documentManager.listDocuments();

  if (format === 'csv') {
    const csv = exportDocumentsAsCSV(docs);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="documents.csv"');
    res.send(csv);
  } else if (format === 'json') {
    res.json(docs);
  }
});

app.get('/api/export/chat/:sessionId', (req, res) => {
  const { format = 'md' } = req.query;
  const messages = getConversation(req.params.sessionId);

  if (format === 'md') {
    const md = exportChatHistoryAsMarkdown(messages);
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="chat.md"');
    res.send(md);
  } else if (format === 'pdf') {
    const doc = exportChatHistoryAsPDF(messages);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="chat.pdf"');
    doc.pipe(res);
  }
});
```

#### Step 3: Add Frontend Export Buttons
```jsx
// client/src/components/DocumentManager.jsx
const handleExportDocuments = async (format) => {
  const res = await fetch(`/api/export/documents?format=${format}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `documents.${format}`;
  a.click();
};

const handleExportChat = async (format) => {
  const res = await fetch(`/api/export/chat/${sessionId}?format=${format}`);
  const blob = await res.blob();
  // Same download logic
};

return (
  <div>
    <button onClick={() => handleExportDocuments('csv')}>Export as CSV</button>
    <button onClick={() => handleExportChat('md')}>Export Chat as Markdown</button>
    <button onClick={() => handleExportChat('pdf')}>Export Chat as PDF</button>
  </div>
);
```

---

## 📊 Implementation Priority

| Feature | Effort | Impact | Priority | Timeline |
|---------|--------|--------|----------|----------|
| SQLite Persistence | 3 days | Critical | 1 | Week 1 |
| Advanced Search | 1-2 days | High | 2 | Week 1 |
| Export Functionality | 1-2 days | Medium | 3 | Week 1 |

---

## 🎯 Success Criteria

- [ ] Data persists after server restart
- [ ] Search filters work correctly
- [ ] Export generates valid files
- [ ] All tests pass (45+ tests)
- [ ] No performance regression
- [ ] No breaking changes to API

---

## 📦 Dependencies to Add

```bash
npm install -S better-sqlite3 json2csv pdfkit
npm install -D @types/better-sqlite3
```

---

## 📚 Resources

- SQLite: https://www.sqlite.org/
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- json2csv: https://www.npmjs.com/package/json2csv
- PDFKit: https://pdfkit.org/

---

## ✅ Next Steps After Quick Wins

1. User Authentication (Week 2)
2. Real-time Updates with WebSockets (Week 3)
3. Admin Dashboard (Week 4)

