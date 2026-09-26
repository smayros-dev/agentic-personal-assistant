/**
 * Document management system with SQLite persistence
 * Tracks uploaded documents and their metadata
 */

import db from './db.js';
import { v4 as uuid } from 'uuid';

/**
 * Add document metadata after ingestion
 * @param {string} id - Unique document ID
 * @param {Object} metadata - Document metadata
 */
export function addDocument(id, metadata) {
  const stmt = db.prepare(`
    INSERT INTO documents (id, fileName, fileSize, pageCount, uploadedAt)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    metadata.fileName || 'Unknown',
    metadata.size || 0,
    metadata.pageCount || 0,
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
  const stmt = db.prepare('SELECT * FROM documents WHERE id = ?');
  return stmt.get(id) || null;
}

/**
 * List all documents
 * @returns {Array} Array of document metadata
 */
export function listDocuments() {
  const stmt = db.prepare(
    'SELECT * FROM documents ORDER BY uploadedAt DESC'
  );
  return stmt.all();
}

/**
 * Delete document by ID
 * @param {string} id - Document ID
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteDocument(id) {
  const stmt = db.prepare('DELETE FROM documents WHERE id = ?');
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
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM documents');
  const sizeStmt = db.prepare('SELECT SUM(fileSize) as totalSize FROM documents');
  const chunksStmt = db.prepare('SELECT SUM(pageCount) as totalChunks FROM documents');
  
  const count = countStmt.get();
  const size = sizeStmt.get();
  const chunks = chunksStmt.get();
  
  return {
    totalDocuments: count?.count || 0,
    totalSize: size?.totalSize || 0,
    totalChunks: chunks?.totalChunks || 0,
  };
}

/**
 * Clear all documents (for testing)
 */
export function clearDocuments() {
  db.prepare('DELETE FROM documents').run();
}

