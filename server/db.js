import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// DB_PATH lets tests use an in-memory database (":memory:") instead of the dev DB.
const dbPath = process.env.DB_PATH || path.join(process.cwd(), "data", "app.db");

// Ensure data directory exists
if (dbPath !== ":memory:") {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

// Create database connection
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");

// Initialize schema
function initializeSchema() {
  // Documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      fileName TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      pageCount INTEGER NOT NULL,
      uploadedAt TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for documents
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_documents_uploadedAt ON documents(uploadedAt);
  `);

  // Conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL UNIQUE,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for conversations
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversations_sessionId ON conversations(sessionId);
  `);

  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversationId) REFERENCES conversations(id)
    )
  `);

  // Create indexes for messages
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages(conversationId);
    CREATE INDEX IF NOT EXISTS idx_messages_createdAt ON messages(createdAt);
  `);

  // Long-term memories the agent keeps about the user
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      sourceSessionId TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_memories_createdAt ON memories(createdAt);
  `);

  // Columns added after the initial schema (existing databases are migrated in place)
  ensureColumn("documents", "chunkCount", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("documents", "source", "TEXT");
  ensureColumn("documents", "mimeType", "TEXT");
  ensureColumn("messages", "metadata", "TEXT"); // JSON: { citations, steps }
}

function ensureColumn(table, column, definition) {
  const columns = db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((c) => c.name);
  if (!columns.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Initialize schema on startup
initializeSchema();

/** Wipes all tables. Only allowed against a test database. */
export function resetDatabaseForTests() {
  if (process.env.NODE_ENV !== "test" && dbPath !== ":memory:") {
    throw new Error("resetDatabaseForTests can only run against a test database");
  }
  db.exec(
    "DELETE FROM messages; DELETE FROM conversations; DELETE FROM documents; DELETE FROM memories;"
  );
}

export default db;
