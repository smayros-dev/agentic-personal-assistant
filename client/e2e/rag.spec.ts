import { test, expect, openApp, pdfFile, briefingText, uniqueCode } from './fixtures';

/**
 * UI E2E tests for the RAG workflow: upload, scoped questions with citations,
 * memory panel and document deletion. Runs in mock LLM mode, where the agent
 * answers with the first retrieved passage.
 */

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test('upload shows the ingested document in the list and search scope', async ({
  page,
  uploadPDF,
}) => {
  const codename = uniqueCode('UP');
  await uploadPDF(pdfFile(`${codename}.pdf`, briefingText(codename)));

  await expect(page.locator('.uploadStatus')).toHaveText(
    'Uploaded and ingested successfully (1 pages, 1 chunks).'
  );
  await expect(page.locator('.document-manager')).toContainText(`${codename}.pdf`);
  await expect(page.locator('#document-filter option', { hasText: `${codename}.pdf` })).toBeAttached();
});

test('answers a scoped question with steps and a page citation', async ({
  page,
  uploadPDF,
  chatWithAI,
}) => {
  const codename = uniqueCode('RAG');
  const fileName = `${codename}.pdf`;
  await uploadPDF(pdfFile(fileName, briefingText(codename)));
  await page.locator('#document-filter').selectOption({ label: fileName });

  const answer = await chatWithAI('What is the project codename?');
  expect(answer).toContain(`The project codename is ${codename}`);

  const bubble = page.locator('.messageRow.isAi .messageBubble').last();
  await expect(bubble.locator('.agentSteps summary')).toHaveText('Agent steps (1)');
  await expect(bubble.locator('.citationChip')).toHaveText([`[1] ${fileName} · p.1`]);
});

test('a stated fact appears in the memory panel', async ({ page, chatWithAI }) => {
  const name = uniqueCode('Ada');
  const answer = await chatWithAI(`My name is ${name}`);
  expect(answer).toContain('Saved memory');

  const panel = page.locator('details.memoryPanel');
  await panel.locator('summary').click();
  await expect(panel.locator('.memoryContent', { hasText: name })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await panel
    .locator('.memoryItem', { hasText: name })
    .locator('button.memoryDelete')
    .click();
  await expect(panel.locator('.memoryContent', { hasText: name })).toHaveCount(0);
});

test('deleting a document removes it from the UI', async ({ page, uploadPDF }) => {
  const codename = uniqueCode('RM');
  const fileName = `${codename}.pdf`;
  await uploadPDF(pdfFile(fileName, briefingText(codename)));

  page.once('dialog', (dialog) => dialog.accept());
  const deleteButton = page.getByRole('button', { name: 'Delete', exact: true });
  const row = page
    .locator('.document-manager div')
    .filter({ hasText: fileName })
    .filter({ has: deleteButton })
    .last();
  await row.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(page.locator('.document-manager')).not.toContainText(fileName);
  await expect(page.locator('#document-filter option', { hasText: fileName })).toHaveCount(0);
});
