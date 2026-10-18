import { test as base, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Builds a small but valid PDF with extractable text, mirroring
 * scripts/test/make-test-pdf.mjs. Minimal PDFs without text/resources
 * are rejected by the ingest endpoint.
 */
function buildTestPdf(): string {
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
  return pdf;
}

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
      const testDir = path.join(__dirname, '../test-files');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const filePath = path.join(testDir, filename);
      fs.writeFileSync(filePath, buildTestPdf(), 'latin1');
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
      // The app's default model ("qwen3.6:latest") may not be installed on
      // this machine. Pick the first chat-capable model from the dropdown so
      // the request targets a model that actually exists (embedding models
      // cannot answer chat prompts).
      const select = page.locator('#model-select');
      await page.waitForSelector('#model-select option', {
        state: 'attached',
        timeout: 15000,
      });
      const values = await select
        .locator('option')
        .evaluateAll((opts) =>
          opts.map((o) => (o as HTMLOptionElement).value)
        );
      // Prefer the small CI test model when available (fast on runners),
      // otherwise any non-embedding chat-capable model.
      const chatModel =
        values.find((v) => /qwen2:0\.5b/i.test(v)) ||
        values.find((v) => !/embed/i.test(v));
      if (chatModel) {
        await select.selectOption(chatModel).catch(() => {});
      }

      const aiBubbles = page.locator(
        '.messageRow.isAi .messageBubble:not(.isTyping)'
      );
      const previousAiCount = await aiBubbles.count();

      const inputField = page.locator('textarea.composerInput');
      await inputField.fill(message);
      await page.keyboard.press('Enter');

      // Wait for a new AI bubble (the "Thinking..." placeholder is excluded)
      await aiBubbles.nth(previousAiCount).waitFor({
        state: 'visible',
        timeout: 60000,
      });
      const responseText = await aiBubbles
        .nth(previousAiCount)
        .textContent();
      return responseText || '';
    });
  },

  /**
   * Helper to wait for model to load
   */
  waitForModelLoad: async ({ page }, use) => {
    await use(async () => {
      // Wait for the real model dropdown to appear
      await page.waitForSelector('#model-select', {
        timeout: 15000,
      });

      // Options are not "visible" in headless Chromium - wait for attachment
      await page.waitForSelector('#model-select option', {
        state: 'attached',
        timeout: 15000,
      });
    });
  },

  /**
   * Helper to clear conversation
   */
  clearConversation: async ({ page }, use) => {
    await use(async () => {
      const clearButton = page
        .locator('button.clearButton, button:has-text("Clear")')
        .first();
      if (await clearButton.isVisible().catch(() => false)) {
        await clearButton.click();
        await page.waitForTimeout(500);
      }
    });
  },
});

export { expect };
