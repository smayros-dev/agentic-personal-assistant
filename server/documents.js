/**
 * Document management system with SQLite persistence
 * Tracks uploaded documents and their metadata
 */

import db from "./db.js";

/**
 * Add document metadata after ingestion
 * @param {string} id - Unique document ID
 * @param {Object} metadata - Document metadata
 */
export function addDocument(id, metadata) {
  const stmt = db.prepare(`
    INSERT INTO documents (id, fileName, fileSize, pageCount, chunkCount, source, mimeType, uploadedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    metadata.fileName || "Unknown",
    metadata.size || 0,
    metadata.pageCount || 0,
    metadata.chunkCount || 0,
    metadata.source || metadata.fileName || null,
    metadata.mimeType || null,
    new Date().toISOString()
  );

  return getDocument(id);
}

/**
 * Get document by ID
 * @param {string} id - Document ID
 * @returns {Object|null} Document metadata or null
 */
export function getDocument(id) {
  const stmt = db.prepare("SELECT * FROM documents WHERE id = ?");
  return stmt.get(id) || null;
}

/**
 * List all documents
 * @returns {Array} Array of document metadata
 */
export function listDocuments() {
  const stmt = db.prepare("SELECT * FROM documents ORDER BY uploadedAt DESC");
  return stmt.all();
}

/**
 * Compact document list for the agent's list_documents tool
 * @returns {Array<{id, fileName, pageCount, chunkCount, uploadedAt}>}
 */
export function listDocumentsBrief() {
  return db
    .prepare(
      "SELECT id, fileName, pageCount, chunkCount, uploadedAt FROM documents ORDER BY uploadedAt DESC"
    )
    .all();
}

/**
 * Delete document by ID
 * @param {string} id - Document ID
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteDocument(id) {
  const stmt = db.prepare("DELETE FROM documents WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Search documents by query
 * @param {string} query - Search query
 * @returns {Array} Matching documents
 */
export function searchDocuments(query) {
  const lowerQuery = `%${query.toLowerCase()}%`;
  const stmt = db.prepare(`
    SELECT * FROM documents 
    WHERE LOWER(fileName) LIKE ? 
    ORDER BY uploadedAt DESC
  `);
  return stmt.all(lowerQuery);
}

/**
 * Get document statistics
 * @returns {Object} Statistics
 */
export function getDocumentStats() {
  const countStmt = db.prepare("SELECT COUNT(*) as count FROM documents");
  const sizeStmt = db.prepare("SELECT SUM(fileSize) as totalSize FROM documents");
  const sumsStmt = db.prepare(
    "SELECT SUM(chunkCount) as totalChunks, SUM(pageCount) as totalPages FROM documents"
  );

  const count = countStmt.get();
  const size = sizeStmt.get();
  const sums = sumsStmt.get();

  return {
    totalDocuments: count?.count || 0,
    totalSize: size?.totalSize || 0,
    totalChunks: sums?.totalChunks || 0,
    totalPages: sums?.totalPages || 0,
  };
}

/**
 * Clear all documents (for testing)
 */
export function clearDocuments() {
  db.prepare("DELETE FROM documents").run();
}
