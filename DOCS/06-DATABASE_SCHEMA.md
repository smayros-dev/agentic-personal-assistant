# 💾 Documentation Technique - Schéma Base de Données

## 1. Vue d'Ensemble

### Type de Base de Données
- **SGBDR**: SQLite
- **Mode Journalisation**: WAL (Write-Ahead Logging)
- **Localisation**: `server/data/app.db`
- **Taille Initiale**: 4 KB (auto-croissance)
- **Sauvegarde**: `app.db-shm` (WAL shared memory), `app.db-wal` (WAL log)

### Philosophie de Design
- **Simplicité**: SQLite au lieu de PostgreSQL (pour MVP)
- **Performance**: Indexes sur colonnes critiques
- **Intégrité**: Foreign keys + unique constraints
- **Scalabilité**: Prêt pour migration PostgreSQL (même schéma)

---

## 2. Schéma Relationnel (ERD)

```
┌──────────────────────┐
│    DOCUMENTS         │
├──────────────────────┤
│ id (PK)              │◄────────────┐
│ fileName             │             │
│ fileSize             │             │
│ pageCount            │             │
│ uploadedAt           │             │
│ createdAt            │             │
└──────────────────────┘             │
         ▲                           │
         │                           │
         │ (future FK)               │
┌────────┴──────────────────┐    CHUNKS
│    CONVERSATIONS         │  (future)
├──────────────────────────┤
│ id (PK)                  │
│ sessionId (UK)           │
│ createdAt                │
│ updatedAt                │
└────────┬─────────────────┘
         │ 1:N
         │
┌────────▼──────────────────┐
│      MESSAGES             │
├──────────────────────────┤
│ id (PK)                  │
│ conversationId (FK) ◄────┤
│ role                     │
│ content                  │
│ model                    │
│ createdAt                │
└──────────────────────────┘
```

---

## 3. Définitions des Tables

### TABLE: `documents`

**Description**: Métadonnées des documents PDF uploadés

**SQL**:
```sql
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  fileName TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  pageCount INTEGER NOT NULL,
  uploadedAt TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_uploadedAt ON documents(uploadedAt);
```

**Colonnes**:

| Colonne | Type | Constraint | Description |
|---------|------|-----------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID unique identifier (v4) |
| `fileName` | TEXT | NOT NULL | Nom du fichier original |
| `fileSize` | INTEGER | NOT NULL | Taille en bytes |
| `pageCount` | INTEGER | NOT NULL | Nombre de pages PDF |
| `uploadedAt` | TEXT | NOT NULL | ISO 8601 timestamp upload |
| `createdAt` | TEXT | DEFAULT | ISO 8601 timestamp création (auto) |

**Indexes**:
- `idx_documents_uploadedAt` - Optimise sorting/filtering par date

**Exemple**:
```sql
INSERT INTO documents 
VALUES (
  'doc-abc123',
  'Q1-Report.pdf',
  2048576,
  15,
  '2025-02-15T10:30:00Z',
  '2025-02-15T10:30:00Z'
);
```

---

### TABLE: `conversations`

**Description**: Sessions de conversation utilisateur

**SQL**:
```sql
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL UNIQUE,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_sessionId ON conversations(sessionId);
```

**Colonnes**:

| Colonne | Type | Constraint | Description |
|---------|------|-----------|-------------|
| `id` | TEXT | PRIMARY KEY | Conversation ID (UUID) |
| `sessionId` | TEXT | UNIQUE | Session ID (user-facing) |
| `createdAt` | TEXT | DEFAULT | ISO 8601 création |
| `updatedAt` | TEXT | DEFAULT | ISO 8601 dernière modification |

**Indexes**:
- `sessionId (UNIQUE)` - Accès rapide par session

**Relation**:
- 1 conversation ↔ N messages

**Exemple**:
```sql
INSERT INTO conversations 
VALUES (
  'conv-xyz789',
  'sess-user-123',
  '2025-02-15T10:00:00Z',
  '2025-02-15T10:30:00Z'
);
```

---

### TABLE: `messages`

**Description**: Messages individuels dans les conversations

**SQL**:
```sql
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id)
);

CREATE INDEX idx_messages_conversationId ON messages(conversationId);
CREATE INDEX idx_messages_createdAt ON messages(createdAt);
```

**Colonnes**:

| Colonne | Type | Constraint | Description |
|---------|------|-----------|-------------|
| `id` | TEXT | PRIMARY KEY | Message ID (UUID) |
| `conversationId` | TEXT | FOREIGN KEY | Référence conversation |
| `role` | TEXT | NOT NULL | "user" ou "assistant" |
| `content` | TEXT | NOT NULL | Contenu du message |
| `model` | TEXT | NULL | Model LLM utilisé (null for user) |
| `createdAt` | TEXT | DEFAULT | ISO 8601 création |

**Constraints**:
- FOREIGN KEY: `conversationId` → `conversations.id`
- CHECK (role IN ('user', 'assistant')) - Implicite

**Indexes**:
- `idx_messages_conversationId` - Récupérer messages par conversation
- `idx_messages_createdAt` - Trier par date

**Exemple**:
```sql
INSERT INTO messages 
VALUES (
  'msg-m001',
  'conv-xyz789',
  'user',
  'What is in the document?',
  NULL,
  '2025-02-15T10:00:01Z'
);

INSERT INTO messages 
VALUES (
  'msg-m002',
  'conv-xyz789',
  'assistant',
  'The document contains quarterly earnings...',
  'qwen2:7b',
  '2025-02-15T10:00:05Z'
);
```

---

## 4. Cascade & Intégrité Référentielle

### Foreign Key: Messages → Conversations

```sql
PRAGMA foreign_keys = ON;

-- Suppression CASCADE (optionnel)
DELETE FROM conversations WHERE id = 'conv-xyz789';
-- → Supprime aussi tous les messages associés
```

### Comportement Actuel

```javascript
// Dans chatHistory.js
export function deleteConversation(sessionId) {
  // 1. Find conversation
  const conv = db.prepare('SELECT id FROM conversations WHERE sessionId = ?')
    .get(sessionId)
  
  // 2. Delete associated messages
  db.prepare('DELETE FROM messages WHERE conversationId = ?')
    .run(conv.id)
  
  // 3. Delete conversation
  db.prepare('DELETE FROM conversations WHERE id = ?')
    .run(conv.id)
}
```

---

## 5. Requêtes Courantes

### Créer une Conversation

```sql
INSERT INTO conversations (id, sessionId, createdAt, updatedAt)
VALUES (?, ?, datetime('now'), datetime('now'));
```

### Ajouter un Message

```sql
INSERT INTO messages (id, conversationId, role, content, model, createdAt)
VALUES (?, ?, ?, ?, ?, datetime('now'));

UPDATE conversations 
SET updatedAt = datetime('now')
WHERE id = ?;
```

### Récupérer l'Historique Complet

```sql
SELECT m.* FROM messages m
JOIN conversations c ON m.conversationId = c.id
WHERE c.sessionId = ?
ORDER BY m.createdAt ASC;
```

### Rechercher des Documents

```sql
-- Full-text search
SELECT * FROM documents
WHERE LOWER(fileName) LIKE ?
ORDER BY uploadedAt DESC
LIMIT ? OFFSET ?;

-- Filter par date
SELECT * FROM documents
WHERE uploadedAt >= ? AND uploadedAt <= ?
ORDER BY uploadedAt DESC;

-- Filter par taille
SELECT * FROM documents
WHERE fileSize >= ? AND fileSize <= ?
ORDER BY fileSize DESC;
```

### Statistiques

```sql
-- Nombre total de documents
SELECT COUNT(*) as total FROM documents;

-- Taille totale
SELECT SUM(fileSize) as totalSize FROM documents;

-- Documents par jour
SELECT DATE(uploadedAt) as date, COUNT(*) as count
FROM documents
GROUP BY DATE(uploadedAt)
ORDER BY date DESC;

-- Nombre de conversations
SELECT COUNT(*) as totalConversations FROM conversations;

-- Nombre total de messages
SELECT COUNT(*) as totalMessages FROM messages;
```

---

## 6. Performance & Optimisations

### Indexes

| Index | Table | Colonne(s) | Utilité |
|-------|-------|-----------|---------|
| `idx_documents_uploadedAt` | documents | uploadedAt | Tri/filter par date |
| `idx_conversations_sessionId` | conversations | sessionId | Lookup par session |
| `idx_messages_conversationId` | messages | conversationId | Récupérer messages |
| `idx_messages_createdAt` | messages | createdAt | Tri chronologique |

### Explain Query Plan

```bash
# Vérifier utilisation des indexes
sqlite3 server/data/app.db

sqlite> .headers on
sqlite> .mode column
sqlite> EXPLAIN QUERY PLAN 
        SELECT * FROM documents 
        WHERE uploadedAt >= '2025-02-01' 
        ORDER BY uploadedAt DESC;
        
-- Output:
-- SEARCH TABLE documents USING idx_documents_uploadedAt (uploadedAt>?)
```

### Statistiques WAL

```bash
# Vérifier taille WAL
ls -lh server/data/app.db*

# Exemple:
# -rw-r--r--  1 user  staff   4,0K  2025-02-15 app.db
# -rw-r--r--  1 user  staff    32K  2025-02-15 app.db-shm
# -rw-r--r--  1 user  staff    72K  2025-02-15 app.db-wal

# WAL checkpoint
sqlite3 server/data/app.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

---

## 7. Migrations Futures

### Migration Vers PostgreSQL

Le schéma est compatible PostgreSQL. Migration:

```sql
-- PostgreSQL DDL (identique, sauf types)
CREATE TABLE documents (
  id VARCHAR(36) PRIMARY KEY,
  fileName VARCHAR(255) NOT NULL,
  fileSize BIGINT NOT NULL,
  pageCount INTEGER NOT NULL,
  uploadedAt TIMESTAMP WITH TIME ZONE NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes (même)
CREATE INDEX idx_documents_uploadedAt ON documents(uploadedAt);
```

### Extension: Authentification Utilisateur

```sql
-- Future table
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link conversations to users
ALTER TABLE conversations 
ADD COLUMN user_id VARCHAR(36) 
REFERENCES users(id) ON DELETE CASCADE;
```

### Extension: Versioning de Documents

```sql
-- Future table
CREATE TABLE document_versions (
  id VARCHAR(36) PRIMARY KEY,
  document_id VARCHAR(36) NOT NULL,
  version_number INTEGER NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id),
  UNIQUE(document_id, version_number)
);
```

---

## 8. Sauvegarde & Restauration

### Backup SQLite

```bash
# Copie simple
cp server/data/app.db server/data/app.db.backup

# Export SQL
sqlite3 server/data/app.db ".dump" > database.sql

# Restaurer
sqlite3 server/data/app.db < database.sql
```

### Export JSON (via API)

```bash
# Backup complet
curl http://localhost:3001/api/export/database/full \
  -H "X-API-Key: test-key" \
  -o database-backup.json

# Restaurer (import custom)
# À implémenter si besoin
```

---

## 9. Maintenabilité

### Monitoring Requis

```bash
# Taille database
sqlite3 server/data/app.db "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();"

# Fragmentationement
sqlite3 server/data/app.db "PRAGMA freelist_count;"

# Integrity check
sqlite3 server/data/app.db "PRAGMA integrity_check;"
```

### Maintenance Tasks

```bash
# VACUUM (défrag + compact)
sqlite3 server/data/app.db "VACUUM;"

# ANALYZE (update statistics)
sqlite3 server/data/app.db "ANALYZE;"

# WAL checkpoint (merge logs)
sqlite3 server/data/app.db "PRAGMA wal_checkpoint(RESTART);"
```

---

## 10. Schéma Complet (SQL)

```sql
-- Creation Script
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  fileName TEXT NOT NULL,
  fileSize INTEGER NOT NULL,
  pageCount INTEGER NOT NULL,
  uploadedAt TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_uploadedAt ON documents(uploadedAt);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL UNIQUE,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_sessionId ON conversations(sessionId);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversationId TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  model TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversationId) REFERENCES conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages(conversationId);
CREATE INDEX IF NOT EXISTS idx_messages_createdAt ON messages(createdAt);
```

---

**Document Version**: 1.0  
**Dernière mise à jour**: Février 2025
