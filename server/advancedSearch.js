/**
 * Advanced search functionality for documents
 * Includes full-text search, filtering, and faceting
 */

import db from './db.js';

/**
 * Advanced search with filters
 * @param {Object} options - Search options
 * @param {string} options.query - Search query
 * @param {string} options.sortBy - Sort field (uploadedAt, fileName, fileSize)
 * @param {string} options.sortOrder - Sort order (ASC, DESC)
 * @param {number} options.limit - Result limit (default 50)
 * @param {number} options.offset - Pagination offset
 * @returns {Object} Results and metadata
 */
export function advancedSearch(options = {}) {
  const {
    query = '',
    sortBy = 'uploadedAt',
    sortOrder = 'DESC',
    limit = 50,
    offset = 0,
  } = options;

  // Build WHERE clause
  let whereClause = 'WHERE 1=1';
  const params = [];

  if (query && query.trim()) {
    whereClause += ' AND LOWER(fileName) LIKE ?';
    params.push(`%${query.toLowerCase()}%`);
  }

  // Validate sort field
  const validSortFields = ['uploadedAt', 'fileName', 'fileSize', 'pageCount'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'uploadedAt';
  const sortDir = sortOrder === 'ASC' ? 'ASC' : 'DESC';

  // Get total count
  const countStmt = db.prepare(`
    SELECT COUNT(*) as total FROM documents ${whereClause}
  `);
  const { total } = countStmt.get(...params);

  // Get paginated results
  const resultsStmt = db.prepare(`
    SELECT * FROM documents
    ${whereClause}
    ORDER BY ${sortField} ${sortDir}
    LIMIT ? OFFSET ?
  `);

  const results = resultsStmt.all(...params, limit, offset);

  return {
    results,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

/**
 * Search by date range
 * @param {Object} options - Options
 * @param {string} options.startDate - ISO date string
 * @param {string} options.endDate - ISO date string
 * @returns {Array} Matching documents
 */
export function searchByDateRange(options = {}) {
  const { startDate, endDate } = options;

  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required');
  }

  const stmt = db.prepare(`
    SELECT * FROM documents
    WHERE uploadedAt >= ? AND uploadedAt <= ?
    ORDER BY uploadedAt DESC
  `);

  return stmt.all(startDate, endDate);
}

/**
 * Search by file size range
 * @param {Object} options - Options
 * @param {number} options.minSize - Minimum size in bytes
 * @param {number} options.maxSize - Maximum size in bytes
 * @returns {Array} Matching documents
 */
export function searchByFileSizeRange(options = {}) {
  const { minSize = 0, maxSize = Infinity } = options;

  const stmt = db.prepare(`
    SELECT * FROM documents
    WHERE fileSize >= ? AND fileSize <= ?
    ORDER BY fileSize DESC
  `);

  return stmt.all(minSize, maxSize);
}

/**
 * Get search facets (metadata for filtering)
 * @returns {Object} Facet data
 */
export function getSearchFacets() {
  // Date facets
  const dateStmt = db.prepare(`
    SELECT 
      DATE(uploadedAt) as date,
      COUNT(*) as count
    FROM documents
    GROUP BY DATE(uploadedAt)
    ORDER BY date DESC
  `);
  const datesByDay = dateStmt.all();

  // Size facets (in MB ranges)
  const sizeStmt = db.prepare(`
    SELECT 
      CASE 
        WHEN fileSize < 1000000 THEN '< 1MB'
        WHEN fileSize < 5000000 THEN '1-5MB'
        WHEN fileSize < 10000000 THEN '5-10MB'
        ELSE '> 10MB'
      END as sizeRange,
      COUNT(*) as count
    FROM documents
    GROUP BY sizeRange
    ORDER BY sizeRange
  `);
  const sizeRanges = sizeStmt.all();

  // Page count facets
  const pageStmt = db.prepare(`
    SELECT 
      CASE 
        WHEN pageCount < 5 THEN '1-4 pages'
        WHEN pageCount < 10 THEN '5-9 pages'
        WHEN pageCount < 20 THEN '10-19 pages'
        ELSE '20+ pages'
      END as pageRange,
      COUNT(*) as count
    FROM documents
    GROUP BY pageRange
    ORDER BY pageRange
  `);
  const pageRanges = pageStmt.all();

  return {
    dates: datesByDay,
    sizes: sizeRanges,
    pages: pageRanges,
  };
}

/**
 * Get suggestions for autocomplete
 * @param {string} prefix - Search prefix
 * @param {number} limit - Max suggestions
 * @returns {Array} Suggested file names
 */
export function getSearchSuggestions(prefix = '', limit = 10) {
  if (!prefix || prefix.length < 1) {
    return [];
  }

  const stmt = db.prepare(`
    SELECT DISTINCT fileName
    FROM documents
    WHERE LOWER(fileName) LIKE ?
    ORDER BY uploadedAt DESC
    LIMIT ?
  `);

  const results = stmt.all(`${prefix.toLowerCase()}%`, limit);
  return results.map(r => r.fileName);
}

/**
 * Export search results as JSON
 * @param {Object} options - Search options (same as advancedSearch)
 * @returns {Object} Export data with metadata
 */
export function exportSearchResults(options = {}) {
  const { results } = advancedSearch(options);

  return {
    exportedAt: new Date().toISOString(),
    query: options.query || '',
    resultCount: results.length,
    results,
  };
}

/**
 * Get similar documents (by size or page count)
 * @param {string} documentId - Document ID
 * @param {string} similarityType - 'size' or 'pages'
 * @returns {Array} Similar documents
 */
export function getSimilarDocuments(documentId, similarityType = 'size') {
  const docStmt = db.prepare('SELECT * FROM documents WHERE id = ?');
  const doc = docStmt.get(documentId);

  if (!doc) {
    return [];
  }

  let query;
  if (similarityType === 'size') {
    // Find documents with similar file size (within 20% tolerance)
    const tolerance = doc.fileSize * 0.2;
    query = `
      SELECT * FROM documents 
      WHERE id != ? 
      AND fileSize BETWEEN ? AND ?
      ORDER BY fileSize
      LIMIT 5
    `;
    return db.prepare(query).all(
      documentId,
      doc.fileSize - tolerance,
      doc.fileSize + tolerance
    );
  } else if (similarityType === 'pages') {
    // Find documents with similar page count
    query = `
      SELECT * FROM documents 
      WHERE id != ? 
      AND pageCount BETWEEN ? AND ?
      ORDER BY pageCount
      LIMIT 5
    `;
    return db.prepare(query).all(
      documentId,
      Math.max(1, doc.pageCount - 2),
      doc.pageCount + 2
    );
  }

  return [];
}
