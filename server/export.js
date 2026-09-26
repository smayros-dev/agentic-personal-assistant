/**
 * Export functionality for documents, conversations, and search results
 * Supports JSON, CSV, and text formats
 */

import { listDocuments, getDocumentStats } from './documents.js';
import { getAllConversations, getConversation } from './chatHistory.js';
import { advancedSearch } from './advancedSearch.js';

/**
 * Export documents as JSON
 * @param {Array} documents - Documents to export
 * @returns {Object} JSON-ready object
 */
export function exportDocumentsAsJSON(documents) {
  return {
    exportedAt: new Date().toISOString(),
    format: 'JSON',
    type: 'documents',
    stats: {
      totalDocuments: documents.length,
      totalSize: documents.reduce((sum, d) => sum + (d.fileSize || 0), 0),
      totalPages: documents.reduce((sum, d) => sum + (d.pageCount || 0), 0),
    },
    data: documents,
  };
}

/**
 * Export documents as CSV
 * @param {Array} documents - Documents to export
 * @returns {string} CSV string
 */
export function exportDocumentsAsCSV(documents) {
  const headers = ['ID', 'File Name', 'File Size (bytes)', 'Page Count', 'Uploaded At'];
  const rows = documents.map(doc => [
    doc.id,
    `"${doc.fileName.replace(/"/g, '""')}"`, // Escape quotes in CSV
    doc.fileSize || 0,
    doc.pageCount || 0,
    doc.uploadedAt,
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  return csv;
}

/**
 * Export documents as plain text
 * @param {Array} documents - Documents to export
 * @returns {string} Plain text report
 */
export function exportDocumentsAsText(documents) {
  const stats = {
    totalDocuments: documents.length,
    totalSize: documents.reduce((sum, d) => sum + (d.fileSize || 0), 0),
    totalPages: documents.reduce((sum, d) => sum + (d.pageCount || 0), 0),
  };

  let text = '═══════════════════════════════════════════════════════\n';
  text += '           DOCUMENT EXPORT REPORT\n';
  text += '═══════════════════════════════════════════════════════\n\n';
  text += `Export Date: ${new Date().toISOString()}\n\n`;

  text += 'STATISTICS:\n';
  text += `  • Total Documents: ${stats.totalDocuments}\n`;
  text += `  • Total Size: ${formatBytes(stats.totalSize)}\n`;
  text += `  • Total Pages: ${stats.totalPages}\n\n`;

  text += 'DOCUMENTS:\n';
  text += '─────────────────────────────────────────────────────\n';

  documents.forEach((doc, index) => {
    text += `\n${index + 1}. ${doc.fileName}\n`;
    text += `   ID: ${doc.id}\n`;
    text += `   Size: ${formatBytes(doc.fileSize || 0)}\n`;
    text += `   Pages: ${doc.pageCount || 0}\n`;
    text += `   Uploaded: ${new Date(doc.uploadedAt).toLocaleString()}\n`;
  });

  text += '\n═══════════════════════════════════════════════════════\n';
  return text;
}

/**
 * Export conversations as JSON
 * @param {Array} conversations - Conversations to export
 * @returns {Object} JSON-ready object
 */
export function exportConversationsAsJSON(conversations) {
  return {
    exportedAt: new Date().toISOString(),
    format: 'JSON',
    type: 'conversations',
    stats: {
      totalConversations: conversations.length,
      totalMessages: conversations.reduce((sum, c) => sum + (c.messageCount || 0), 0),
    },
    data: conversations,
  };
}

/**
 * Export conversations as CSV
 * @param {Array} conversations - Conversations to export
 * @returns {string} CSV string
 */
export function exportConversationsAsCSV(conversations) {
  const headers = ['Session ID', 'Created At', 'Updated At', 'Message Count'];
  const rows = conversations.map(conv => [
    conv.sessionId,
    conv.createdAt,
    conv.updatedAt,
    conv.messageCount || 0,
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  return csv;
}

/**
 * Export full conversation with messages as JSON
 * @param {string} sessionId - Session ID
 * @param {Array} messages - Messages in conversation
 * @returns {Object} JSON-ready object
 */
export function exportConversationWithMessagesAsJSON(sessionId, messages) {
  return {
    exportedAt: new Date().toISOString(),
    format: 'JSON',
    type: 'conversation_transcript',
    sessionId,
    messageCount: messages.length,
    messages,
  };
}

/**
 * Export conversation as plain text transcript
 * @param {string} sessionId - Session ID
 * @param {Array} messages - Messages in conversation
 * @returns {string} Plain text transcript
 */
export function exportConversationAsText(sessionId, messages) {
  let text = '═══════════════════════════════════════════════════════\n';
  text += '             CONVERSATION TRANSCRIPT\n';
  text += '═══════════════════════════════════════════════════════\n\n';
  text += `Session ID: ${sessionId}\n`;
  text += `Exported: ${new Date().toISOString()}\n`;
  text += `Total Messages: ${messages.length}\n\n`;

  text += '─────────────────────────────────────────────────────\n';

  messages.forEach((msg, index) => {
    const timestamp = new Date(msg.createdAt).toLocaleString();
    const role = msg.role.toUpperCase();
    text += `\n[${index + 1}] ${role} - ${timestamp}\n`;
    if (msg.model) {
      text += `Model: ${msg.model}\n`;
    }
    text += `\n${msg.content}\n`;
    text += '─────────────────────────────────────────────────────\n';
  });

  return text;
}

/**
 * Export search results as JSON
 * @param {Object} searchResults - Search results object
 * @returns {Object} JSON-ready object
 */
export function exportSearchResultsAsJSON(searchResults) {
  return {
    exportedAt: new Date().toISOString(),
    format: 'JSON',
    type: 'search_results',
    query: searchResults.query || '',
    pagination: searchResults.pagination || {},
    results: searchResults.results || [],
  };
}

/**
 * Export search results as CSV
 * @param {Array} results - Search result documents
 * @returns {string} CSV string
 */
export function exportSearchResultsAsCSV(results) {
  const headers = ['File Name', 'Size (bytes)', 'Pages', 'Uploaded At', 'Relevance'];
  const rows = results.map((doc, index) => [
    `"${doc.fileName.replace(/"/g, '""')}"`,
    doc.fileSize || 0,
    doc.pageCount || 0,
    doc.uploadedAt,
    (100 - (index * 5)).toFixed(0), // Simple relevance score
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  return csv;
}

/**
 * Export full database dump as JSON
 * @returns {Object} Complete database state
 */
export function exportFullDatabaseAsJSON() {
  const documents = listDocuments();
  const conversations = getAllConversations();

  return {
    exportedAt: new Date().toISOString(),
    format: 'JSON',
    type: 'full_database_dump',
    version: '1.0',
    stats: {
      documents: {
        count: documents.length,
        totalSize: documents.reduce((sum, d) => sum + (d.fileSize || 0), 0),
      },
      conversations: {
        count: conversations.length,
        totalMessages: conversations.reduce((sum, c) => sum + (c.messageCount || 0), 0),
      },
    },
    documents,
    conversations,
  };
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Create file name for export
 * @param {string} type - Export type
 * @param {string} format - File format (json, csv, txt)
 * @returns {string} File name
 */
export function generateExportFileName(type, format) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const extension = format === 'json' ? 'json' : format === 'csv' ? 'csv' : 'txt';
  return `${type}-export-${timestamp}.${extension}`;
}
