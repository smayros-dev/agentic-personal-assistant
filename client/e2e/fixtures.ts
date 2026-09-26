import { test as base, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Custom fixtures for E2E testing
 * Provides helper functions for common operations
 */

type AppFixtures = {
  apiBaseUrl: string;
  createTestPDF: (filename: string) => Promise<string>;
  uploadPDF: (filePath: string) => Promise<void>;
  chatWithAI: (message: string) => Promise<string>;
  waitForModelLoad: () => Promise<void>;
  clearConversation: () => Promise<void>;
};

export const test = base.extend<AppFixtures>({
  apiBaseUrl: async ({}, use) => {
    await use('http://localhost:3001');
  },

  /**
   * Helper to create a test PDF file
   */
  createTestPDF: async ({}, use) => {
    const pdfFiles: string[] = [];

    await use(async (filename: string) => {
      // Create a simple text file (can be converted to PDF in actual tests)
      const testDir = path.join(__dirname, '../test-files');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const filePath = path.join(testDir, filename);

      // Create sample PDF content (mock)
      const content = `
%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< >>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document: ${filename}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000115 00000 n
0000000203 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
280
%%EOF
`;
      fs.writeFileSync(filePath, content);
      pdfFiles.push(filePath);
      return filePath;
    });

    // Cleanup
    for (const file of pdfFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
  },

  /**
   * Helper to upload a PDF file
   */
  uploadPDF: async ({ page }, use) => {
    await use(async (filePath: string) => {
      // Click upload button
      await page.click('input[type="file"]');

      // Wait for file input and select file
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);

      // Wait for upload to complete (check for success message or model response)
      await page.waitForSelector('text=/ingested|uploaded|success/i', {
        timeout: 30000,
      });
    });
  },

  /**
   * Helper to send a chat message and get response
   */
  chatWithAI: async ({ page }, use) => {
    await use(async (message: string) => {
      // Type message
      const inputField = page.locator('textarea, input[type="text"]').first();
      await inputField.fill(message);

      // Submit
      await page.keyboard.press('Enter');

      // Wait for response
      await page.waitForTimeout(2000); // Wait for API call
      const responseText = await page.locator('.message-content').last().textContent();
      return responseText || '';
    });
  },

  /**
   * Helper to wait for model to load
   */
  waitForModelLoad: async ({ page }, use) => {
    await use(async () => {
      // Wait for model dropdown to populate
      await page.waitForSelector('[data-testid="model-selector"]', {
        timeout: 10000,
      });

      // Wait for at least one model to appear
      await page.waitForSelector('option[value], datalist option[value]', {
        timeout: 10000,
      });
    });
  },

  /**
   * Helper to clear conversation
   */
  clearConversation: async ({ page }, use) => {
    await use(async () => {
      // Click clear button if available
      const clearButton = page.locator('button:has-text("Clear")');
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.waitForTimeout(500);
      }
    });
  },
});

export { expect };
