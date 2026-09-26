/**
 * Chat history management with SQLite persistence
 * Stores and retrieves conversations and messages
 */

import db from './db.js';
import { v4 as uuid } from 'uuid';

/**
 * Save message to database
 * @param {string} sessionId - Session ID
 * @param {string} role - Message role (user/assistant)
 * @param {string} content - Message content
 * @param {string} model - Model name
 * @returns {Object} Saved message
 */
export function saveMessage(sessionId, role, content, model) {
  // Get or create conversation
  let convStmt = db.prepare(
    'SELECT id FROM conversations WHERE sessionId = ?'
  );
  let conversation = convStmt.get(sessionId);
  
  let conversationId;
  if (!conversation) {
    conversationId = uuid();
    const insertConvStmt = db.prepare(`
      INSERT INTO conversations (id, sessionId, createdAt, updatedAt)
      VALUES (?, ?, datetime('now'), datetime('now'))
    `);
    insertConvStmt.run(conversationId, sessionId);
  } else {
    conversationId = conversation.id;
  }

  // Save message
  const messageId = uuid();
  const insertMsgStmt = db.prepare(`
    INSERT INTO messages (id, conversationId, role, content, model, createdAt)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `);
  insertMsgStmt.run(messageId, conversationId, role, content, model);

  // Update conversation timestamp
  const updateConvStmt = db.prepare(
    'UPDATE conversations SET updatedAt = datetime("now") WHERE id = ?'
  );
  updateConvStmt.run(conversationId);

  return {
    id: messageId,
    role,
    content,
    model,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get conversation history for a session
 * @param {string} sessionId - Session ID
 * @returns {Array} Array of messages
 */
export function getConversation(sessionId) {
  const stmt = db.prepare(`
    SELECT m.* FROM messages m
    JOIN conversations c ON m.conversationId = c.id
    WHERE c.sessionId = ?
    ORDER BY m.createdAt ASC
  `);
  return stmt.all(sessionId);
}

/**
 * Get all conversations
 * @returns {Array} Array of conversations
 */
export function getAllConversations() {
  const stmt = db.prepare(`
    SELECT c.*, 
           COUNT(m.id) as messageCount
    FROM conversations c
    LEFT JOIN messages m ON c.id = m.conversationId
    GROUP BY c.id
    ORDER BY c.updatedAt DESC
  `);
  return stmt.all();
}

/**
 * Delete conversation and its messages
 * @param {string} sessionId - Session ID
 * @returns {boolean} True if deleted
 */
export function deleteConversation(sessionId) {
  const convStmt = db.prepare('SELECT id FROM conversations WHERE sessionId = ?');
  const conversation = convStmt.get(sessionId);
  
  if (!conversation) return false;

  // Delete messages
  db.prepare('DELETE FROM messages WHERE conversationId = ?').run(conversation.id);
  
  // Delete conversation
  const result = db.prepare('DELETE FROM conversations WHERE id = ?').run(conversation.id);
  return result.changes > 0;
}

/**
 * Get conversation statistics
 * @returns {Object} Statistics
 */
export function getConversationStats() {
  const convCount = db.prepare('SELECT COUNT(*) as count FROM conversations').get();
  const msgCount = db.prepare('SELECT COUNT(*) as count FROM messages').get();
  
  return {
    totalConversations: convCount?.count || 0,
    totalMessages: msgCount?.count || 0,
  };
}

/**
 * Clear all conversations (for testing)
 */
export function clearConversations() {
  db.prepare('DELETE FROM messages').run();
  db.prepare('DELETE FROM conversations').run();
}
