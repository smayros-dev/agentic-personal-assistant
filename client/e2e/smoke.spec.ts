import { test, expect, openApp, pdfFile, briefingText, uniqueCode, REAL_LLM } from './fixtures';

/**
 * Smoke test that only assumes a working model, so it also runs against a
 * real Ollama model: `E2E_REAL_LLM=1 npx playwright test --grep @smoke`.
 */
test('@smoke upload a PDF and get an answer about it', async ({
  page,
  uploadPDF,
  chatWithAI,
}) => {
  test.setTimeout(REAL_LLM ? 600_000 : 30_000);
  const codename = uniqueCode('SMOKE');
  const fileName = `${codename}.pdf`;

  await openApp(page);
  await uploadPDF(pdfFile(fileName, briefingText(codename)));
  await page.locator('#document-filter').selectOption({ label: fileName });

  const answer = await chatWithAI('What is the project codename in the document?');
  expect(answer.trim().length).toBeGreaterThan(0);
  expect(answer).not.toMatch(/something went wrong|unavailable|chat request failed/i);
});
