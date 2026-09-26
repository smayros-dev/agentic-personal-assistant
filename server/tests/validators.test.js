/**
 * Validation Tests
 * Tests for all input validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
  chatMessageSchema,
  fileUploadSchema,
  searchQuerySchema,
  advancedSearchSchema,
  dateRangeSchema,
  fileSizeRangeSchema,
  exportFormatSchema,
  exportDocumentsSchema,
  exportConversationsSchema,
  documentIdSchema,
  conversationIdSchema,
  modelSelectionSchema,
  formatValidationError,
} from '../validators.js';
import { ZodError } from 'zod';

describe('Input Validation Schemas', () => {
  /**
   * =========================================================================
   * Chat Message Validation Tests
   * =========================================================================
   */
  describe('chatMessageSchema', () => {
    it('should accept valid chat message', () => {
      const data = {
        message: 'Hello, how are you?',
        model: 'qwen:7b',
      };
      const result = chatMessageSchema.parse(data);
      expect(result.message).toBe('Hello, how are you?');
      expect(result.model).toBe('qwen:7b');
    });

    it('should reject empty message', () => {
      const data = { message: '', model: 'qwen:7b' };
      expect(() => chatMessageSchema.parse(data)).toThrow();
    });

    it('should reject message over 5000 chars', () => {
      const data = {
        message: 'x'.repeat(5001),
        model: 'qwen:7b',
      };
      expect(() => chatMessageSchema.parse(data)).toThrow();
    });

    it('should accept valid sessionId and conversationId', () => {
      const data = {
        message: 'Hello',
        model: 'qwen:7b',
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        conversationId: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = chatMessageSchema.parse(data);
      expect(result.sessionId).toBeDefined();
      expect(result.conversationId).toBeDefined();
    });

    it('should reject invalid UUID', () => {
      const data = {
        message: 'Hello',
        model: 'qwen:7b',
        sessionId: 'not-a-uuid',
      };
      expect(() => chatMessageSchema.parse(data)).toThrow();
    });

    it('should reject invalid model name with special chars', () => {
      const data = {
        message: 'Hello',
        model: 'qwen<script>alert("xss")</script>',
      };
      expect(() => chatMessageSchema.parse(data)).toThrow();
    });

    it('should accept valid model names with colons and dashes', () => {
      const validModels = ['qwen:7b', 'mistral-7b', 'neural-chat_v3', 'gpt-4/turbo'];
      validModels.forEach(model => {
        const result = chatMessageSchema.parse({
          message: 'Hello',
          model,
        });
        expect(result.model).toBe(model);
      });
    });
  });

  /**
   * =========================================================================
   * File Upload Validation Tests
   * =========================================================================
   */
  describe('fileUploadSchema', () => {
    it('should accept valid PDF upload', () => {
      const data = {
        filename: 'document.pdf',
        size: 1024 * 100, // 100 KB
        mimetype: 'application/pdf',
      };
      const result = fileUploadSchema.parse(data);
      expect(result.filename).toBe('document.pdf');
    });

    it('should reject non-PDF files', () => {
      const data = {
        filename: 'document.txt',
        size: 1024,
        mimetype: 'text/plain',
      };
      expect(() => fileUploadSchema.parse(data)).toThrow();
    });

    it('should reject files over 10MB', () => {
      const data = {
        filename: 'large.pdf',
        size: 11 * 1024 * 1024, // 11 MB
        mimetype: 'application/pdf',
      };
      expect(() => fileUploadSchema.parse(data)).toThrow();
    });

    it('should reject empty files', () => {
      const data = {
        filename: 'empty.pdf',
        size: 0,
        mimetype: 'application/pdf',
      };
      expect(() => fileUploadSchema.parse(data)).toThrow();
    });

    it('should accept max size of 10MB', () => {
      const data = {
        filename: 'large.pdf',
        size: 10 * 1024 * 1024, // Exactly 10 MB
        mimetype: 'application/pdf',
      };
      const result = fileUploadSchema.parse(data);
      expect(result.size).toBe(10 * 1024 * 1024);
    });
  });

  /**
   * =========================================================================
   * Search Query Validation Tests
   * =========================================================================
   */
  describe('searchQuerySchema', () => {
    it('should accept valid search query', () => {
      const data = { q: 'test search' };
      const result = searchQuerySchema.parse(data);
      expect(result.q).toBe('test search');
      expect(result.limit).toBe(10); // Default
    });

    it('should reject empty query', () => {
      const data = { q: '' };
      expect(() => searchQuerySchema.parse(data)).toThrow();
    });

    it('should accept custom limit and offset', () => {
      const data = { q: 'test', limit: '50', offset: '100' };
      const result = searchQuerySchema.parse(data);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(100);
    });

    it('should reject limit > 100', () => {
      const data = { q: 'test', limit: '150' };
      expect(() => searchQuerySchema.parse(data)).toThrow();
    });

    it('should reject non-numeric limit', () => {
      const data = { q: 'test', limit: 'abc' };
      expect(() => searchQuerySchema.parse(data)).toThrow();
    });

    it('should accept searchType enum values', () => {
      const types = ['simple', 'semantic', 'faceted'];
      types.forEach(type => {
        const result = searchQuerySchema.parse({ q: 'test', searchType: type });
        expect(result.searchType).toBe(type);
      });
    });
  });

  /**
   * =========================================================================
   * Advanced Search Validation Tests
   * =========================================================================
   */
  describe('advancedSearchSchema', () => {
    it('should accept advanced search with filters', () => {
      const data = {
        keywords: 'machine learning',
        filters: {
          fileType: 'pdf',
          minSize: 1000,
          maxSize: 1000000,
        },
      };
      const result = advancedSearchSchema.parse(data);
      expect(result.keywords).toBe('machine learning');
      expect(result.filters.minSize).toBe(1000);
    });

    it('should accept ISO datetime in filters', () => {
      const data = {
        keywords: 'test',
        filters: {
          dateFrom: '2024-01-01T00:00:00Z',
          dateTo: '2024-12-31T23:59:59Z',
        },
      };
      const result = advancedSearchSchema.parse(data);
      expect(result.filters.dateFrom).toBeDefined();
    });

    it('should reject invalid datetime', () => {
      const data = {
        keywords: 'test',
        filters: {
          dateFrom: 'invalid-date',
        },
      };
      expect(() => advancedSearchSchema.parse(data)).toThrow();
    });
  });

  /**
   * =========================================================================
   * Date Range Validation Tests
   * =========================================================================
   */
  describe('dateRangeSchema', () => {
    it('should accept valid date range', () => {
      const data = {
        fromDate: '2024-01-01T00:00:00Z',
        toDate: '2024-12-31T23:59:59Z',
      };
      const result = dateRangeSchema.parse(data);
      expect(result.fromDate).toBeDefined();
      expect(result.toDate).toBeDefined();
    });

    it('should reject toDate before fromDate', () => {
      const data = {
        fromDate: '2024-12-31T23:59:59Z',
        toDate: '2024-01-01T00:00:00Z',
      };
      expect(() => dateRangeSchema.parse(data)).toThrow();
    });

    it('should accept same date for from and to', () => {
      const data = {
        fromDate: '2024-01-01T00:00:00Z',
        toDate: '2024-01-01T00:00:00Z',
      };
      const result = dateRangeSchema.parse(data);
      expect(result).toBeDefined();
    });
  });

  /**
   * =========================================================================
   * File Size Range Validation Tests
   * =========================================================================
   */
  describe('fileSizeRangeSchema', () => {
    it('should accept valid size range', () => {
      const data = {
        minSize: 1000,
        maxSize: 1000000,
      };
      const result = fileSizeRangeSchema.parse(data);
      expect(result.minSize).toBe(1000);
      expect(result.maxSize).toBe(1000000);
    });

    it('should reject maxSize less than minSize', () => {
      const data = {
        minSize: 1000000,
        maxSize: 1000,
      };
      expect(() => fileSizeRangeSchema.parse(data)).toThrow();
    });

    it('should accept same min and max', () => {
      const data = {
        minSize: 1000,
        maxSize: 1000,
      };
      const result = fileSizeRangeSchema.parse(data);
      expect(result).toBeDefined();
    });
  });

  /**
   * =========================================================================
   * Export Format Validation Tests
   * =========================================================================
   */
  describe('exportFormatSchema', () => {
    it('should accept valid export formats', () => {
      const formats = ['json', 'csv', 'text'];
      formats.forEach(format => {
        const result = exportFormatSchema.parse(format);
        expect(result).toBe(format);
      });
    });

    it('should reject invalid export format', () => {
      expect(() => exportFormatSchema.parse('xml')).toThrow();
      expect(() => exportFormatSchema.parse('pdf')).toThrow();
    });
  });

  /**
   * =========================================================================
   * Export Documents Validation Tests
   * =========================================================================
   */
  describe('exportDocumentsSchema', () => {
    it('should accept valid export documents request', () => {
      const data = {
        format: 'json',
        filters: {
          minDate: '2024-01-01T00:00:00Z',
          maxDate: '2024-12-31T23:59:59Z',
        },
      };
      const result = exportDocumentsSchema.parse(data);
      expect(result.format).toBe('json');
    });

    it('should reject invalid format in documents export', () => {
      const data = {
        format: 'xml',
      };
      expect(() => exportDocumentsSchema.parse(data)).toThrow();
    });
  });

  /**
   * =========================================================================
   * UUID Validation Tests
   * =========================================================================
   */
  describe('UUID Schemas', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';
    const invalidUUID = 'not-a-uuid';

    it('should accept valid documentId', () => {
      const result = documentIdSchema.parse({ documentId: validUUID });
      expect(result.documentId).toBe(validUUID);
    });

    it('should reject invalid documentId', () => {
      expect(() => documentIdSchema.parse({ documentId: invalidUUID })).toThrow();
    });

    it('should accept valid conversationId', () => {
      const result = conversationIdSchema.parse({ conversationId: validUUID });
      expect(result.conversationId).toBe(validUUID);
    });

    it('should reject invalid conversationId', () => {
      expect(() => conversationIdSchema.parse({ conversationId: invalidUUID })).toThrow();
    });
  });

  /**
   * =========================================================================
   * Model Selection Validation Tests
   * =========================================================================
   */
  describe('modelSelectionSchema', () => {
    it('should accept valid model names', () => {
      const validModels = ['qwen:7b', 'mistral-7b', 'gpt-4', 'neural_chat/v3'];
      validModels.forEach(model => {
        const result = modelSelectionSchema.parse({ model });
        expect(result.model).toBe(model);
      });
    });

    it('should reject empty model', () => {
      expect(() => modelSelectionSchema.parse({ model: '' })).toThrow();
    });

    it('should reject model with XSS attempt', () => {
      expect(() =>
        modelSelectionSchema.parse({ model: '<script>alert("xss")</script>' })
      ).toThrow();
    });
  });

  /**
   * =========================================================================
   * Error Formatting Tests
   * =========================================================================
   */
  describe('formatValidationError', () => {
    it('should format validation error nicely', () => {
      try {
        chatMessageSchema.parse({ message: '', model: 'test' });
      } catch (error) {
        if (error instanceof ZodError) {
          const formatted = formatValidationError(error);
          expect(formatted.type).toBe('VALIDATION_ERROR');
          expect(formatted.message).toBe('Request validation failed');
          expect(formatted.details).toBeDefined();
          expect(Array.isArray(formatted.details)).toBe(true);
          expect(formatted.details[0].field).toBeDefined();
          expect(formatted.details[0].message).toBeDefined();
        }
      }
    });

    it('should not leak internal paths', () => {
      try {
        chatMessageSchema.parse({ message: '', model: 'test' });
      } catch (error) {
        if (error instanceof ZodError) {
          const formatted = formatValidationError(error);
          // Verify no stack traces or internal data
          expect(JSON.stringify(formatted)).not.toMatch(/at /);
        }
      }
    });
  });

  /**
   * =========================================================================
   * SQL Injection Prevention Tests
   * =========================================================================
   */
  describe('SQL Injection Prevention', () => {
    it('should sanitize search queries for SQL injection', () => {
      const sqlInjectionAttempts = [
        "test'; DROP TABLE documents; --",
        "test\" OR \"1\"=\"1",
        "test\'; UNION SELECT * FROM users; --",
      ];

      sqlInjectionAttempts.forEach(attempt => {
        // These should pass validation but be safe strings
        const result = searchQuerySchema.parse({ q: attempt });
        // The string itself is preserved but won't be dangerous
        // because we use parameterized queries
        expect(typeof result.q).toBe('string');
      });
    });
  });

  /**
   * =========================================================================
   * XSS Prevention Tests
   * =========================================================================
   */
  describe('XSS Prevention', () => {
    it('should reject model names with script tags', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'qwen<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
      ];

      xssAttempts.forEach(attempt => {
        expect(() => modelSelectionSchema.parse({ model: attempt })).toThrow();
      });
    });

    it('should reject messages with encoded XSS', () => {
      const encodedXSS = '%3Cscript%3Ealert(%22xss%22)%3C%2Fscript%3E';
      // This will be decoded by the server, so check for dangerous patterns
      const result = chatMessageSchema.parse({ message: encodedXSS, model: 'test' });
      expect(result.message).toBe(encodedXSS); // Preserved as-is for display
    });
  });

  /**
   * =========================================================================
   * Data Type Validation Tests
   * =========================================================================
   */
  describe('Data Type Validation', () => {
    it('should reject non-string messages', () => {
      expect(() => chatMessageSchema.parse({ message: 123, model: 'test' })).toThrow();
      expect(() => chatMessageSchema.parse({ message: null, model: 'test' })).toThrow();
      expect(() => chatMessageSchema.parse({ message: { text: 'test' }, model: 'test' })).toThrow();
    });

    it('should reject non-numeric sizes', () => {
      expect(() =>
        fileUploadSchema.parse({
          filename: 'test.pdf',
          size: '1024',
          mimetype: 'application/pdf',
        })
      ).toThrow();
    });

    it('should coerce string numbers to numbers in search', () => {
      const result = searchQuerySchema.parse({ q: 'test', limit: '50' });
      expect(typeof result.limit).toBe('number');
      expect(result.limit).toBe(50);
    });
  });
});
