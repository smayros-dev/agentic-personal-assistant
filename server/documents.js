/**
 * Simple document management system
 * Tracks uploaded documents and their metadata
 */

// In-memory store for document metadata
// In production, this would be a database
const documents = new Map();

/**
 * Add document metadata after ingestion
 * @param {string} id - Unique document ID
 * @param {Object} metadata - Document metadata
 */
export function addDocument(id, metadata) {
  documents.set(id, {
    id,
    ...metadata,
    uploadedAt: new Date().toISOString(),
  });
}

/**
 * Get document by ID
 * @param {string} id - Document ID
 * @returns {Object|null} Document metadata or null
 */
export function getDocument(id) {
  return documents.get(id) || null;
}

/**
 * List all documents
 * @returns {Array} Array of document metadata
 */
export function listDocuments() {
  return Array.from(documents.values()).sort((a, b) => 
    new Date(b.uploadedAt) - new Date(a.uploadedAt)
  );
}

/**
 * Delete document by ID
 * @param {string} id - Document ID
 * @returns {boolean} True if deleted, false if not found
 */
export function deleteDocument(id) {
  return documents.delete(id);
}

/**
 * Search documents by query
 * @param {string} query - Search query
 * @returns {Array} Matching documents
 */
export function searchDocuments(query) {
  const lowerQuery = query.toLowerCase();
  return Array.from(documents.values()).filter(doc => 
    doc.fileName?.toLowerCase().includes(lowerQuery) ||
    doc.source?.toLowerCase().includes(lowerQuery) ||
    doc.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get document statistics
 * @returns {Object} Statistics
 */
export function getDocumentStats() {
  const docs = Array.from(documents.values());
  return {
    totalDocuments: docs.length,
    totalSize: docs.reduce((sum, doc) => sum + (doc.size || 0), 0),
    totalChunks: docs.reduce((sum, doc) => sum + (doc.chunkCount || 0), 0),
  };
}

/**
 * Clear all documents (for testing)
 */
export function clearDocuments() {
  documents.clear();
}
