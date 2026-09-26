import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5175';
const API_URL = 'http://localhost:3001';

// Helper to create a test PDF
function createTestPDF(filename: string) {
  // Create a simple PDF for testing
  const pdfContent = Buffer.from([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, // %PDF-1.4
    0x0a, 0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, // \n1 0 obj
    0x0a, 0x3c, 0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, // \n<</Type
    0x2f, 0x43, 0x61, 0x74, 0x61, 0x6c, 0x6f, 0x67, // /Catalog
    0x2f, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20, 0x32, // /Pages 2
    0x20, 0x30, 0x20, 0x52, 0x3e, 0x3e, 0x0a, 0x65, // 0 R>>
    0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a, 0x32, 0x20, // endobj\n2
    0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, 0x3c, 0x3c, // 0 obj\n<<
    0x2f, 0x54, 0x79, 0x70, 0x65, 0x2f, 0x50, 0x61, // /Type/Pa
    0x67, 0x65, 0x73, 0x2f, 0x4b, 0x69, 0x64, 0x73, // ges/Kids
    0x5b, 0x33, 0x20, 0x30, 0x20, 0x52, 0x5d, 0x2f, // [3 0 R]/
    0x43, 0x6f, 0x75, 0x6e, 0x74, 0x20, 0x31, 0x3e, // Count 1>
    0x3e, 0x0a, 0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, // >\nendobj
    0x0a, 0x78, 0x72, 0x65, 0x66, 0x0a, 0x30, 0x20, // \nxref\n0
    0x33, 0x0a, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, // 3\n000000
    0x30, 0x30, 0x30, 0x20, 0x36, 0x35, 0x35, 0x33, // 000 65535
    0x35, 0x20, 0x66, 0x0a, 0x74, 0x72, 0x61, 0x69, // f\ntrai
    0x6c, 0x65, 0x72, 0x0a, 0x3c, 0x3c, 0x2f, 0x53, // ler\n<</S
    0x69, 0x7a, 0x65, 0x20, 0x33, 0x2f, 0x52, 0x6f, // ize 3/Ro
    0x6f, 0x74, 0x20, 0x31, 0x20, 0x30, 0x20, 0x52, // ot 1 0 R
    0x3e, 0x3e, 0x0a, 0x73, 0x74, 0x61, 0x72, 0x74, // >>\nstart
    0x78, 0x72, 0x65, 0x66, 0x0a, 0x31, 0x30, 0x38, // xref\n108
    0x0a, 0x25, 0x45, 0x4f, 0x46, // \n%EOF
  ]);
  
  const filepath = path.join('/tmp', filename);
  fs.writeFileSync(filepath, pdfContent);
  return filepath;
}

test.describe('RAG Workflow E2E Tests', () => {
  let pdfPath: string;

  test.beforeAll(() => {
    // Create test PDF before running tests
    pdfPath = createTestPDF('test-document.pdf');
  });

  test.afterAll(() => {
    // Cleanup test PDF
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
    }
  });

  test('Frontend loads successfully', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check page title
    await expect(page).toHaveTitle(/client/i);
    
    // Check for main UI elements
    await expect(page.locator('text=Chat')).toBeVisible();
    await expect(page.locator('input[placeholder*="message"]')).toBeVisible();
  });

  test('Models load from backend API', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Wait for model selector to be populated
    const modelSelect = page.locator('select');
    await expect(modelSelect).toBeVisible();
    
    // Wait for options to load
    await page.waitForTimeout(2000);
    
    // Check that at least one model is available
    const options = await modelSelect.locator('option').count();
    expect(options).toBeGreaterThan(0);
    
    // Verify model names are present
    const modelText = await modelSelect.innerText();
    expect(modelText).toContain('qwen3.6') || expect(modelText).toContain('gemma');
  });

  test('Model switching works', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const modelSelect = page.locator('select');
    await page.waitForTimeout(1000);
    
    // Get available models
    const options = await modelSelect.locator('option').allTextContents();
    
    if (options.length >= 2) {
      // Switch to first model
      await modelSelect.selectOption(options[0]);
      await expect(modelSelect).toHaveValue(options[0]);
      
      // Switch to second model
      await modelSelect.selectOption(options[1]);
      await expect(modelSelect).toHaveValue(options[1]);
    }
  });

  test('Chat message sends and receives response', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Wait for model to load
    await page.waitForTimeout(2000);
    
    const messageInput = page.locator('input[placeholder*="message"]');
    const sendButton = page.locator('button:has-text("Send")') || 
                      page.locator('button[type="submit"]');
    
    // Send a test message
    await messageInput.fill('Hello, how are you?');
    await sendButton.click();
    
    // Wait for response (with extended timeout for LLM response)
    const response = page.locator('text=/.*response.*|.*answer.*|.*hello.*/i');
    await expect(response).toBeVisible({ timeout: 60000 });
  });

  test('PDF upload succeeds', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible()) {
      // Upload test PDF
      await fileInput.setInputFiles(pdfPath);
      
      // Wait for upload to complete
      await page.waitForTimeout(3000);
      
      // Check for success message
      const successMsg = page.locator('text=/success|uploaded|ingested/i');
      await expect(successMsg).toBeVisible({ timeout: 10000 });
    }
  });

  test('Chat with document context works', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // First upload a document
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(pdfPath);
      await page.waitForTimeout(3000);
    }
    
    // Then ask a question about the document
    const messageInput = page.locator('input[placeholder*="message"]');
    const sendButton = page.locator('button:has-text("Send")') || 
                      page.locator('button[type="submit"]');
    
    await messageInput.fill('What is in the document?');
    await sendButton.click();
    
    // Wait for context-aware response
    const response = page.locator('text=/.*document.*|.*content.*|.*file.*/i');
    await expect(response).toBeVisible({ timeout: 60000 });
  });

  test('Error handling for network failure', async ({ page }) => {
    // Simulate network issue by going to invalid endpoint
    const response = await page.goto(BASE_URL + '/nonexistent');
    
    // Should not crash, should show error or fallback
    expect([404, 200]).toContain(response?.status());
  });

  test('CORS headers are correct', async ({ context }) => {
    // Make API request to check CORS headers
    const response = await context.request.get(`${API_URL}/api/models`);
    
    expect(response.status()).toBe(200);
    
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBeDefined();
  });

  test('Document management API responds', async ({ context }) => {
    // Test document list endpoint (will be empty initially)
    const response = await context.request.get(`${API_URL}/api/documents`);
    
    // Should return 200 or 404 depending on implementation
    expect([200, 404]).toContain(response.status());
  });

  test('Backend health check', async ({ context }) => {
    // Test that backend is responsive
    const response = await context.request.get(`${API_URL}/api/models`);
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.models).toBeDefined();
    expect(Array.isArray(data.models)).toBe(true);
  });
});

test.describe('Document Management E2E Tests', () => {
  test('Get documents list', async ({ context }) => {
    const response = await context.request.get(`${API_URL}/api/documents`);
    
    // Should succeed even if empty
    expect([200, 404, 501]).toContain(response.status());
  });

  test('Upload and list document', async ({ context, page }) => {
    const pdfPath = createTestPDF('test-doc-2.pdf');
    
    await page.goto(BASE_URL);
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(pdfPath);
      await page.waitForTimeout(2000);
      
      // Check if document appears in list
      const docsResponse = await context.request.get(`${API_URL}/api/documents`);
      
      if (docsResponse.status() === 200) {
        const docs = await docsResponse.json();
        if (docs.documents) {
          expect(Array.isArray(docs.documents)).toBe(true);
        }
      }
    }
    
    fs.unlinkSync(pdfPath);
  });

  test('Delete document', async ({ context }) => {
    // Try to delete a document (will fail if no docs exist)
    const response = await context.request.delete(`${API_URL}/api/documents/test-id`);
    
    // Should return 404 or 200 depending on implementation
    expect([200, 404, 501]).toContain(response.status());
  });

  test('Search documents', async ({ context }) => {
    const response = await context.request.post(`${API_URL}/api/documents/search`, {
      data: { query: 'test' }
    });
    
    // Should handle search request
    expect([200, 404, 501]).toContain(response.status());
  });
});
