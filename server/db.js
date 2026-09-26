import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(process.cwd(), 'data', 'app.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Create database connection
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

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
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_uploadedAt (uploadedAt)
    )
  `);

  // Conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL UNIQUE,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sessionId (sessionId)
    )
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
      FOREIGN KEY (conversationId) REFERENCES conversations(id),
      INDEX idx_conversationId (conversationId),
      INDEX idx_createdAt (createdAt)
    )
  `);
}

// Initialize schema on startup
initializeSchema();

export default db;
