import { test as base, expect, type Page } from '@playwright/test';

/**
 * Shared E2E fixtures.
 *
 * The default suite runs against a server started with LLM_PROVIDER=mock
 * (deterministic fake LLM + embeddings, see server/mock.js), so answers are
 * predictable. Tests tagged @smoke only assume a working model and are the
 * ones run against a real Ollama model (E2E_REAL_LLM=1).
 */

export const API_URL = process.env.E2E_API_URL || 'http://localhost:3001';
export const REAL_LLM = !!process.env.E2E_REAL_LLM;

/** Unique token so tests sharing one server don't see each other's data. */
export const uniqueCode = (prefix: string) =>
  `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

/**
 * Builds a small but valid one-page PDF with extractable text
 * (mirrors scripts/test/make-test-pdf.mjs).
 */
export function buildTestPdf(text: string): Buffer {
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
  return Buffer.from(pdf, 'latin1');
}

export const briefingText = (codename: string) =>
  `Project Briefing. The project codename is ${codename}. ` +
  'The deployment window is Monday at 09:00 UTC.';

type PdfFile = { name: string; mimeType: string; buffer: Buffer };

export const pdfFile = (name: string, text: string): PdfFile => ({
  name,
  mimeType: 'application/pdf',
  buffer: buildTestPdf(text),
});

/**
 * Opens the app and waits until React has mounted and the model list loaded,
 * so typing doesn't race the first render.
 */
export async function openApp(page: Page) {
  await page.goto('/');
  await expect(page.locator('#model-select option').first()).toBeAttached();
  await expect(page.locator('#model-select option', { hasText: 'Loading models' })).toHaveCount(0);
}

type AppFixtures = {
  apiBaseUrl: string;
  /** Uploads a PDF through the UI and waits for the success status. */
  uploadPDF: (file: PdfFile) => Promise<void>;
  /** Sends a message through the composer and returns the final AI bubble text. */
  chatWithAI: (message: string) => Promise<string>;
};

const lastAiBubble = (page: Page, index: number) =>
  page.locator('.messageRow.isAi .messageBubble:not(.isTyping)').nth(index);

export const test = base.extend<AppFixtures>({
  apiBaseUrl: async ({}, use) => {
    await use(API_URL);
  },

  uploadPDF: async ({ page }, use) => {
    await use(async (file) => {
      await page.locator('#pdf-upload').setInputFiles(file);
      await page.locator('.uploadPanel button.primaryButton').click();
      await expect(page.locator('.uploadStatus')).toContainText(/ingested successfully/i, {
        timeout: REAL_LLM ? 120_000 : 15_000,
      });
    });
  },

  chatWithAI: async ({ page }, use) => {
    await use(async (message) => {
      const answered = await page.locator('.messageRow.isAi .messageBubble:not(.isTyping)').count();
      await page.locator('textarea.composerInput').fill(message);
      await page.keyboard.press('Enter');
      const bubble = lastAiBubble(page, answered);
      await bubble.waitFor({ state: 'visible', timeout: REAL_LLM ? 240_000 : 15_000 });
      return (await bubble.textContent()) || '';
    });
  },
});

export { expect };
