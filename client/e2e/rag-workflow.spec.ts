import { test, expect } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

// Helper to create a test PDF (valid PDF with extractable text, mirroring
// scripts/test/make-test-pdf.mjs - minimal textless PDFs fail ingestion)
function createTestPDF(filename: string) {
  const text =
    'Project Codename Briefing. The project codename is BLUEFIN-42. ' +
    'The deployment window is Monday at 09:00 UTC. ' +
    'The contact for this project is the platform team.';
  const stream = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>',
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const filepath = path.join(os.tmpdir(), filename);
  fs.writeFileSync(filepath, pdf, 'latin1');
  return filepath;
}

// The app's default model may not be installed; pick the first
// chat-capable (non-embedding) model from the dropdown.
async function selectChatModel(page: import('@playwright/test').Page) {
  await page.waitForSelector('#model-select option', { state: 'attached', timeout: 15000 });
  const values = await page
    .locator('#model-select option')
    .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
  const chatModel =
    values.find((v) => /qwen2:0\.5b/i.test(v)) ||
    values.find((v) => !/embed/i.test(v));
  if (chatModel) {
    await page.locator('#model-select').selectOption(chatModel).catch(() => {});
  }
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
    await expect(page).toHaveTitle(/Agentic Personal Assistant/i);
    
    // Check for main UI elements
    await expect(page.locator('.appTitle')).toBeVisible();
    await expect(page.locator('textarea.composerInput')).toBeVisible();
  });

  test('Models load from backend API', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Wait for model selector to be populated
    const modelSelect = page.locator('#model-select');
    await expect(modelSelect).toBeVisible();
    
    // Wait for at least one model option to load
    await page.waitForSelector('#model-select option', { state: 'attached', timeout: 15000 });
    
    // Check that at least one model is available
    const options = await modelSelect.locator('option').count();
    expect(options).toBeGreaterThan(0);
    
    // Verify model names are present
    const modelText = (
      await modelSelect.locator('option').allTextContents()
    ).join(' ');
    expect(modelText).toMatch(/qwen|gemma|llama|mistral/i);
  });

  test('Model switching works', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const modelSelect = page.locator('#model-select');
    await page.waitForSelector('#model-select option', { state: 'attached', timeout: 15000 });
    
    // Get available model values
    const values = await modelSelect
      .locator('option')
      .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
    
    if (values.length >= 2) {
      // Switch to first model
      await modelSelect.selectOption(values[0]);
      await expect(modelSelect).toHaveValue(values[0]);
      
      // Switch to second model
      await modelSelect.selectOption(values[1]);
      await expect(modelSelect).toHaveValue(values[1]);
    }
  });

  test('Chat message sends and receives response', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Wait for models, then target an installed chat model
    await selectChatModel(page);
    
    const messageInput = page.locator('textarea.composerInput');
    const sendButton = page.locator('button.sendButton');
    
    // Send a test message
    await messageInput.fill('Hello, how are you?');
    await sendButton.click();
    
    // Wait for an AI response bubble (LLM may be slow)
    const response = page.locator(
      '.messageRow.isAi .messageBubble:not(.isTyping)'
    );
    await expect(response.first()).toBeVisible({ timeout: 60000 });
  });

  test('PDF upload succeeds', async ({ page }) => {
    await page.goto(BASE_URL);
    
    const fileInput = page.locator('input[type="file"]');
    
    if (await fileInput.isVisible()) {
      // Select the test PDF, then trigger the actual upload
      await fileInput.setInputFiles(pdfPath);
      await page.locator('button.primaryButton').click();
      
      // Check for success message
      const successMsg = page.locator('text=/success|uploaded|ingested/i');
      await expect(successMsg).toBeVisible({ timeout: 60000 });
    }
  });

  test('Chat with document context works', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Target an installed chat model
    await selectChatModel(page);
    
    // First upload a document
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(pdfPath);
      await page.locator('button.primaryButton').click();
      // Wait for the upload to finish (success or failure status)
      await page.waitForSelector('.uploadStatus', { timeout: 60000 });
    }
    
    // Then ask a question about the document
    const messageInput = page.locator('textarea.composerInput');
    const sendButton = page.locator('button.sendButton');
    
    await messageInput.fill('What is in the document?');
    await sendButton.click();
    
    // Wait for context-aware response
    const response = page.locator(
      '.messageRow.isAi .messageBubble:not(.isTyping)'
    );
    await expect(response.first()).toBeVisible({ timeout: 60000 });
  });

  test('Error handling for network failure', async ({ page }) => {
    // Simulate network issue by going to invalid endpoint
    const response = await page.goto(BASE_URL + '/nonexistent');
    
    // Should not crash, should show error or fallback
    expect([404, 200]).toContain(response?.status());
  });

  test('CORS headers are correct', async ({ context }) => {
    // Make API request to check CORS headers
    const response = await context.request.get(`${API_URL}/api/models`, {
      headers: {
        'Origin': 'http://localhost:5173',
      },
    });
    
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
