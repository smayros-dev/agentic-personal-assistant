/**
 * Input Validation Schemas
 * Using Zod for runtime type checking and validation
 * 
 * All API endpoints validate their inputs against these schemas
 * to prevent injection attacks and invalid data
 */

import { z } from 'zod';

/**
 * ============================================================================
 * CHAT ENDPOINT VALIDATION
 * ============================================================================
 */

export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long (max 5000 characters)'),
  
  sessionId: z
    .string()
    .uuid('Invalid session ID format')
    .optional(),
  
  model: z
    .string()
    .trim()
    .min(1, 'Model cannot be empty')
    .max(100, 'Model name too long')
    .regex(/^[a-zA-Z0-9:._/-]+$/, 'Invalid model name format'),
  
  conversationId: z
    .string()
    .uuid('Invalid conversation ID format')
    .optional(),
});

/**
 * ============================================================================
 * FILE UPLOAD VALIDATION
 * ============================================================================
 */

export const fileUploadSchema = z.object({
  filename: z
    .string()
    .trim()
    .max(255, 'Filename too long'),
  
  size: z
    .number()
    .min(1, 'File cannot be empty')
    .max(10 * 1024 * 1024, 'File too large (max 10MB)'),
  
  mimetype: z
    .enum(['application/pdf'], { message: 'Only PDF files allowed' }),
});

/**
 * ============================================================================
 * SEARCH ENDPOINT VALIDATION
 * ============================================================================
 */

export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, 'Search query cannot be empty')
    .max(500, 'Search query too long'),
  
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a number')
    .transform(Number)
    .pipe(z.number().min(1, 'Limit must be at least 1').max(100, 'Limit max is 100'))
    .optional()
    .default('10'),
  
  offset: z
    .string()
    .regex(/^\d+$/, 'Offset must be a number')
    .transform(Number)
    .pipe(z.number().min(0, 'Offset must be >= 0'))
    .optional()
    .default('0'),
  
  searchType: z
    .enum(['simple', 'semantic', 'faceted'])
    .optional()
    .default('simple'),
});

export const advancedSearchSchema = z.object({
  keywords: z
    .string()
    .trim()
    .min(1, 'Keywords cannot be empty')
    .max(500, 'Keywords too long')
    .optional(),
  
  filters: z
    .object({
      fileType: z.string().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      minSize: z.number().min(0).optional(),
      maxSize: z.number().min(0).optional(),
    })
    .optional(),
  
  limit: z.number().min(1).max(100).optional().default(10),
  offset: z.number().min(0).optional().default(0),
});

/**
 * ============================================================================
 * DATE RANGE SEARCH VALIDATION
 * ============================================================================
 */

export const dateRangeSchema = z.object({
  fromDate: z
    .string()
    .datetime('Invalid start date format'),
  
  toDate: z
    .string()
    .datetime('Invalid end date format'),
  
  limit: z.number().min(1).max(100).optional().default(10),
  offset: z.number().min(0).optional().default(0),
}).refine(data => new Date(data.fromDate) <= new Date(data.toDate), {
  message: 'Start date must be before end date',
  path: ['fromDate'],
});

/**
 * ============================================================================
 * FILE SIZE RANGE VALIDATION
 * ============================================================================
 */

export const fileSizeRangeSchema = z.object({
  minSize: z
    .number()
    .min(0, 'Min size must be >= 0'),
  
  maxSize: z
    .number()
    .min(0, 'Max size must be >= 0'),
  
  limit: z.number().min(1).max(100).optional().default(10),
  offset: z.number().min(0).optional().default(0),
}).refine(data => data.minSize <= data.maxSize, {
  message: 'Min size must be less than max size',
  path: ['minSize'],
});

/**
 * ============================================================================
 * EXPORT VALIDATION
 * ============================================================================
 */

export const exportFormatSchema = z.enum(['json', 'csv', 'text'], {
  message: 'Format must be json, csv, or text',
});

export const exportDocumentsSchema = z.object({
  format: exportFormatSchema,
  
  filters: z
    .object({
      minDate: z.string().datetime().optional(),
      maxDate: z.string().datetime().optional(),
      minSize: z.number().min(0).optional(),
      maxSize: z.number().min(0).optional(),
    })
    .optional(),
});

export const exportConversationsSchema = z.object({
  format: exportFormatSchema,
  
  conversationIds: z
    .array(z.string().uuid('Invalid conversation ID'))
    .optional(),
  
  includeMessages: z.boolean().optional().default(true),
});

/**
 * ============================================================================
 * DOCUMENT OPERATIONS VALIDATION
 * ============================================================================
 */

export const documentIdSchema = z.object({
  documentId: z
    .string()
    .uuid('Invalid document ID format'),
});

export const conversationIdSchema = z.object({
  conversationId: z
    .string()
    .uuid('Invalid conversation ID format'),
});

/**
 * ============================================================================
 * MODEL SELECTION VALIDATION
 * ============================================================================
 */

export const modelSelectionSchema = z.object({
  model: z
    .string()
    .trim()
    .min(1, 'Model cannot be empty')
    .max(100, 'Model name too long')
    .regex(/^[a-zA-Z0-9:._/-]+$/, 'Invalid model name format'),
});

/**
 * ============================================================================
 * VALIDATION ERROR FORMATTING
 * ============================================================================
 */

/**
 * Format Zod validation errors for API responses
 * Hides internal paths, shows only user-friendly messages
 * 
 * @param {ZodError} error - Validation error from Zod
 * @returns {Object} Formatted error details
 */
export function formatValidationError(error) {
  const issues = error.issues.map(issue => ({
    field: issue.path.join('.') || 'general',
    message: issue.message,
  }));

  return {
    type: 'VALIDATION_ERROR',
    message: 'Request validation failed',
    details: issues,
  };
}

/**
 * ============================================================================
 * MIDDLEWARE HELPER
 * ============================================================================
 */

/**
 * Create validation middleware for Express
 * 
 * @param {ZodSchema} schema - Zod schema to validate against
 * @param {string} source - Where to get data ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
export function createValidationMiddleware(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = source === 'query' ? req.query : source === 'params' ? req.params : req.body;
      const validated = schema.parse(data);
      
      // Store validated data back in request
      if (source === 'body') req.body = validated;
      else if (source === 'query') req.query = validated;
      else if (source === 'params') req.params = validated;
      
      next();
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json(formatValidationError(error));
      }
      next(error);
    }
  };
}
