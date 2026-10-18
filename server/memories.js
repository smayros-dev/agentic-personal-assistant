/**
 * Long-term memory with SQLite persistence
 * Durable facts and preferences the agent has learned about the user,
 * shared across all chat sessions.
 */

import db from "./db.js";
import { v4 as uuid } from "uuid";
import { MEMORY_CATEGORIES } from "./validators.js";

export { MEMORY_CATEGORIES };

const MAX_MEMORY_LENGTH = 500;

/**
 * Add a memory, skipping exact (case-insensitive) duplicates
 * @returns {{ memory: Object, created: boolean }}
 */
export function addMemory({ content, category = "general", sourceSessionId = null }) {
  const text = String(content ?? "").trim();
  if (!text) throw new Error("Memory cannot be empty");
  if (text.length > MAX_MEMORY_LENGTH) {
    throw new Error(`Memory too long (max ${MAX_MEMORY_LENGTH} characters)`);
  }

  const existing = db.prepare("SELECT * FROM memories WHERE LOWER(content) = LOWER(?)").get(text);
  if (existing) return { memory: existing, created: false };

  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO memories (id, content, category, sourceSessionId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    text,
    MEMORY_CATEGORIES.includes(category) ? category : "general",
    sourceSessionId,
    now,
    now
  );

  return { memory: getMemory(id), created: true };
}

/**
 * List memories, newest first
 */
export function listMemories({ limit = 100 } = {}) {
  return db
    .prepare("SELECT * FROM memories ORDER BY createdAt DESC, rowid DESC LIMIT ?")
    .all(limit);
}

/**
 * Keyword search: matches memories containing any query word of 3+ characters.
 * Falls back to the most recent memories when the query has no usable words.
 */
export function searchMemories(query, { limit = 10 } = {}) {
  const words = String(query ?? "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 3);

  if (words.length === 0) return listMemories({ limit });

  const where = words.map(() => "LOWER(content) LIKE ?").join(" OR ");
  return db
    .prepare(`SELECT * FROM memories WHERE ${where} ORDER BY createdAt DESC, rowid DESC LIMIT ?`)
    .all(...words.map((w) => `%${w}%`), limit);
}

export function getMemory(id) {
  return db.prepare("SELECT * FROM memories WHERE id = ?").get(id) || null;
}

export function deleteMemory(id) {
  return db.prepare("DELETE FROM memories WHERE id = ?").run(id).changes > 0;
}

/** @returns {number} number of memories deleted */
export function clearMemories() {
  return db.prepare("DELETE FROM memories").run().changes;
}

export function countMemories() {
  return db.prepare("SELECT COUNT(*) as count FROM memories").get().count;
}
