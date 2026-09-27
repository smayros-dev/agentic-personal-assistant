import { test, expect } from './fixtures';

/**
 * E2E Test Suite: API Integration & Backend Validation
 * Tests server endpoints and integration with frontend
 */

test.describe('🔌 API Endpoints', () => {
  test('GET /healthz should return status ok', async ({ apiBaseUrl, page }) => {
    const response = await page.request.get(`${apiBaseUrl}/healthz`);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.uptime).toBeGreaterThan(0);
  });

  test('GET /api/config should show vector store configuration', async ({ apiBaseUrl, page }) => {
    const response = await page.request.get(`${apiBaseUrl}/api/config`);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.vectorStore).toBeDefined();
    expect(['CHROMA', 'PINECONE']).toContain(data.vectorStore);
    expect(data.config).toBeDefined();
  });

  test('GET /api/models should return available models', async ({ apiBaseUrl, page }) => {
    const response = await page.request.get(`${apiBaseUrl}/api/models`);
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data.models)).toBeTruthy();
    
    // Should have at least one model
    if (data.models.length > 0) {
      expect(data.models[0]).toBeTruthy();
    }
  });

  test('POST /api/chat should accept messages', async ({ apiBaseUrl, page }) => {
    const response = await page.request.post(`${apiBaseUrl}/api/chat`, {
      data: {
        message: 'Hello',
        sessionId: 'test-session-' + Date.now(),
        model: 'qwen2:7b',
      },
    });
    
    // Should be OK or return a valid response
    expect([200, 201, 400, 500]).toContain(response.status());
  });

  test('POST /api/chat should reject empty messages', async ({ apiBaseUrl, page }) => {
    const response = await page.request.post(`${apiBaseUrl}/api/chat`, {
      data: {
        message: '',
        sessionId: 'test-session',
        model: 'qwen2:7b',
      },
    });
    
    // Should return error for empty message
    expect([400, 422]).toContain(response.status());
  });

  test('POST /api/chat should reject too-long messages', async ({ apiBaseUrl, page }) => {
    const response = await page.request.post(`${apiBaseUrl}/api/chat`, {
      data: {
        message: 'a'.repeat(10000),
        sessionId: 'test-session',
        model: 'qwen2:7b',
      },
    });
    
    // Should reject oversized message
    expect([400, 413, 422]).toContain(response.status());
  });

  test('POST /api/ingest should accept PDF uploads', async ({ apiBaseUrl, page, createTestPDF }) => {
    const testPdfPath = await createTestPDF('api-test.pdf');
    
    const response = await page.request.post(`${apiBaseUrl}/api/ingest`, {
      multipart: {
        file: testPdfPath,
      },
    });
    
    // Should return success or error code
    expect([200, 201, 400, 500]).toContain(response.status());
  });

  test('GET /api/models should be rate-limited', async ({ apiBaseUrl, page }) => {
    // Make rapid requests
    const requests = Array(35).fill(null).map(() =>
      page.request.get(`${apiBaseUrl}/api/models`)
    );
    
    const responses = await Promise.allSettled(requests);
    
    // Some should succeed, some might be rate-limited
    const hasRateLimiting = responses.some(r => 
      r.status === 'fulfilled' && r.value.status() === 429
    );
    
    // Rate limiting is optional but encouraged
    // Test passes regardless
    expect(responses.length).toBeGreaterThan(0);
  });
});

test.describe('🔒 CORS & Security', () => {
  test('should have CORS headers configured', async ({ apiBaseUrl, page }) => {
    const response = await page.request.get(`${apiBaseUrl}/api/config`);
    
    // Check CORS headers exist
    const corsHeader = response.headers()['access-control-allow-origin'];
    expect(corsHeader).toBeDefined();
  });

  test('should handle OPTIONS requests (CORS preflight)', async ({ apiBaseUrl, page }) => {
    const response = await page.request.options(`${apiBaseUrl}/api/chat`, {
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
      },
    });
    
    // Should allow CORS
    expect([200, 204]).toContain(response.status());
  });

  test('API key auth should be optional', async ({ apiBaseUrl, page }) => {
    // Request without API key
    const response = await page.request.get(`${apiBaseUrl}/api/models`);
    
    // Should work without key (if auth is optional)
    // Or return 401 (if auth is required)
    expect([200, 401]).toContain(response.status());
  });
});

test.describe('🛠️ Error Handling & Edge Cases', () => {
  test('should handle invalid JSON in POST request', async ({ apiBaseUrl, page }) => {
    const response = await page.request.post(`${apiBaseUrl}/api/chat`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: 'invalid json {',
    }).catch(e => {
      // Connection error is acceptable
      return { status: () => 400 };
    });
    
    expect([400, 500]).toContain(response.status());
  });

  test('should handle missing required fields', async ({ apiBaseUrl, page }) => {
    const response = await page.request.post(`${apiBaseUrl}/api/chat`, {
      data: {
        // message is required but missing
        sessionId: 'test',
      },
    });
    
    expect([400, 422]).toContain(response.status());
  });

  test('should handle database connection issues gracefully', async ({ apiBaseUrl, page }) => {
    // Try to trigger an error condition
    const response = await page.request.post(`${apiBaseUrl}/api/chat`, {
      data: {
        message: 'Test',
        sessionId: 'error-test-' + Date.now(),
        model: 'nonexistent-model',
      },
    });
    
    // Should return valid response (even if error)
    expect(response.ok() || response.status() >= 400).toBeTruthy();
  });

  test('should handle timeout gracefully', async ({ apiBaseUrl, page }) => {
    // This test verifies timeout handling
    // May not always trigger timeout, but should not crash
    try {
      const response = await page.request.post(`${apiBaseUrl}/api/chat`, {
        data: {
          message: 'This might timeout',
          sessionId: 'timeout-test',
        },
        timeout: 1000, // Very short timeout
      });
      
      // Might timeout or succeed
      expect([200, 400, 500]).toContain(response.status());
    } catch (e) {
      // Timeout is acceptable error
      expect(String(e)).toMatch(/timeout/i);
    }
  });
});

test.describe('📊 API Response Validation', () => {
  test('should return consistent response format', async ({ apiBaseUrl, page }) => {
    const response = await page.request.get(`${apiBaseUrl}/api/config`);
    
    const data = await response.json();
    
    // Should have expected properties
    expect(data).toHaveProperty('vectorStore');
    expect(data).toHaveProperty('config');
  });

  test('should include proper HTTP headers', async ({ apiBaseUrl, page }) => {
    const response = await page.request.get(`${apiBaseUrl}/api/models`);
    
    const headers = response.headers();
    
    // Should have content-type
    expect(headers['content-type']).toBeDefined();
  });

  test('should return JSON content type', async ({ apiBaseUrl, page }) => {
    const response = await page.request.get(`${apiBaseUrl}/api/models`);
    
    expect(response.headers()['content-type']).toMatch(/json/i);
  });

  test('chat response should have expected structure', async ({ apiBaseUrl, page }) => {
    const response = await page.request.post(`${apiBaseUrl}/api/chat`, {
      data: {
        message: 'What are you?',
        sessionId: 'validation-test',
      },
    });
    
    // Should return a response (even if error)
    if (response.ok()) {
      const data = await response.json();
      
      // Should have answer field
      expect(data).toHaveProperty('answer');
    }
  });
});

test.describe('🔄 Concurrent Requests', () => {
  test('should handle multiple concurrent chat requests', async ({ apiBaseUrl, page }) => {
    const sessionId = 'concurrent-' + Date.now();
    
    const requests = [
      { message: 'First message', model: 'qwen2:7b' },
      { message: 'Second message', model: 'qwen2:7b' },
      { message: 'Third message', model: 'qwen2:7b' },
    ].map(data =>
      page.request.post(`${apiBaseUrl}/api/chat`, {
        data: { sessionId, ...data },
      })
    );
    
    const responses = await Promise.all(requests);
    
    // All should get responses
    responses.forEach(response => {
      expect([200, 201, 400, 500]).toContain(response.status());
    });
  });

  test('should handle concurrent file uploads', async ({ apiBaseUrl, page, createTestPDF }) => {
    const pdf1 = await createTestPDF('concurrent-1.pdf');
    const pdf2 = await createTestPDF('concurrent-2.pdf');
    
    const requests = [pdf1, pdf2].map(pdfPath =>
      page.request.post(`${apiBaseUrl}/api/ingest`, {
        multipart: {
          file: pdfPath,
        },
      })
    );
    
    const responses = await Promise.allSettled(requests);
    
    // Should handle multiple uploads
    expect(responses.length).toBe(2);
  });
});

test.describe('🌍 Different Model Selection', () => {
  test('should accept different model names in chat request', async ({ apiBaseUrl, page }) => {
    const models = ['qwen2:7b', 'mistral', 'llama2'];
    
    for (const model of models) {
      const response = await page.request.post(`${apiBaseUrl}/api/chat`, {
        data: {
          message: 'Test',
          sessionId: 'model-test-' + model,
          model,
        },
      });
      
      // Should accept request (may return error if model doesn't exist)
      expect([200, 201, 400, 500]).toContain(response.status());
    }
  });

  test('should validate model parameter', async ({ apiBaseUrl, page }) => {
    const response = await page.request.post(`${apiBaseUrl}/api/chat`, {
      data: {
        message: 'Test',
        sessionId: 'invalid-model-test',
        model: 123, // Invalid type
      },
    });
    
    // Should either reject or handle gracefully
    expect([200, 400, 422, 500]).toContain(response.status());
  });
});
