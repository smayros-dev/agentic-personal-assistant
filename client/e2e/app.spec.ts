import { test, expect, openApp } from './fixtures';

/**
 * UI E2E tests: app shell, chat composer and session handling.
 * Runs against the server in mock LLM mode (deterministic answers).
 */

const SESSION_KEY = 'agentic-assistant-session-id';

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test.describe('App shell', () => {
  test('loads the homepage', async ({ page }) => {
    await expect(page).toHaveTitle(/Agentic Personal Assistant/i);
    await expect(page.locator('.appTitle')).toHaveText('Agentic Personal Assistant');
    await expect(page.locator('textarea.composerInput')).toBeVisible();
    await expect(page.locator('#pdf-upload')).toBeAttached();
    await expect(page.locator('.emptyState')).toBeVisible();
  });

  test('selects the server default model', async ({ page }) => {
    const select = page.locator('#model-select');
    await expect(select.locator('option')).toHaveText(['mock-llm']);
    await expect(select).toHaveValue('mock-llm');
    await expect(select).toBeEnabled();
  });

  test('offers an "All documents" search scope', async ({ page }) => {
    await expect(page.locator('#document-filter')).toHaveValue('');
    await expect(page.locator('#document-filter option').first()).toHaveText('All documents');
  });

  test('stays usable on a phone-sized viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.appTitle')).toBeVisible();
    await expect(page.locator('textarea.composerInput')).toBeVisible();
  });

  test('composer has an accessible placeholder and takes focus', async ({ page }) => {
    const input = page.locator('textarea.composerInput');
    await expect(input).toHaveAttribute('placeholder', /message/i);
    await input.focus();
    await expect(input).toBeFocused();
  });

  test('does not expose secrets in the page', async ({ page }) => {
    expect(await page.content()).not.toMatch(/pcsk_|lsv2_/i);
  });
});

test.describe('Chat', () => {
  test('ignores empty messages', async ({ page }) => {
    await expect(page.locator('button.sendButton')).toBeDisabled();
    await page.locator('textarea.composerInput').fill('   ');
    await page.keyboard.press('Enter');
    await expect(page.locator('.messageRow')).toHaveCount(0);
  });

  test('sends on Enter and renders the streamed answer', async ({ page, chatWithAI }) => {
    const answer = await chatWithAI('What is 12 * 4?');
    expect(answer).toContain('The result is 12 * 4 = 48.');
    await expect(page.locator('.messageRow.isUser')).toHaveText(['What is 12 * 4?']);
    await expect(page.locator('textarea.composerInput')).toHaveValue('');
  });

  test('keeps the message history across turns', async ({ page, chatWithAI }) => {
    await chatWithAI('What is 1 + 1?');
    await chatWithAI('What is 2 + 2?');
    await expect(page.locator('.messageRow')).toHaveCount(4);
    await expect(page.locator('.messageRow.isAi .messageBubble').last()).toContainText('= 4');
  });

  test('shows the agent steps for an answer', async ({ page, chatWithAI }) => {
    await chatWithAI('What is 3 * 3?');
    const steps = page.locator('.messageRow.isAi .agentSteps').last();
    await expect(steps.locator('summary')).toHaveText('Agent steps (1)');
    await steps.locator('summary').click();
    await expect(steps.locator('.stepName')).toHaveText('Calculated');
    await expect(steps.locator('.stepResult')).toHaveText('3 * 3 = 9');
  });

  test('rejects an over-long message with a validation error', async ({ page }) => {
    await page.locator('textarea.composerInput').fill('a'.repeat(5001));
    await page.keyboard.press('Enter');
    await expect(page.locator('.messageRow.isAi .messageBubble:not(.isTyping)')).toHaveText(
      'Message too long (max 5000 characters)'
    );
    await expect(page.locator('textarea.composerInput')).toBeEnabled();
  });
});

test.describe('Session', () => {
  test('persists the session id and restores history after reload', async ({
    page,
    chatWithAI,
  }) => {
    await chatWithAI('What is 5 + 5?');
    const sessionId = await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY);
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);

    await page.reload();
    await openApp(page);
    expect(await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY)).toBe(sessionId);
    await expect(page.locator('.messageRow')).toHaveCount(2);
    await expect(page.locator('.messageRow.isAi')).toContainText('5 + 5 = 10');
  });

  test('clear conversation starts a new session', async ({ page, chatWithAI }) => {
    await chatWithAI('What is 7 + 7?');
    const before = await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY);

    await page.locator('header button.clearButton').click();
    await expect(page.locator('.messageRow')).toHaveCount(0);
    const after = await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY);
    expect(after).not.toBe(before);

    await page.reload();
    await expect(page.locator('.emptyState')).toBeVisible();
  });
});
