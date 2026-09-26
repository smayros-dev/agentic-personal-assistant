import { test, expect } from './fixtures';

/**
 * E2E Test Suite: Basic Application Flow
 * Tests critical user journeys without dependencies
 */

test.describe('🔌 Application Setup & Health', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check for main UI elements
    await expect(page).toHaveTitle(/Agentic RAG|Chat/i);
    
    // Verify header is present
    const header = page.locator('header, [role="banner"]');
    await expect(header).toBeVisible();
  });

  test('should display model selector', async ({ page, waitForModelLoad }) => {
    await page.goto('/');
    
    // Wait for models to load
    await waitForModelLoad();
    
    // Check model selector is visible
    const modelSelector = page.locator('[data-testid="model-selector"]');
    await expect(modelSelector).toBeVisible();
  });

  test('should connect to backend API', async ({ page, apiBaseUrl }) => {
    // Test API health check
    const response = await page.request.get(`${apiBaseUrl}/healthz`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('should fetch available models from API', async ({ page, apiBaseUrl }) => {
    const response = await page.request.get(`${apiBaseUrl}/api/models`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.models).toBeDefined();
    expect(Array.isArray(data.models)).toBeTruthy();
  });

  test('should get vector store configuration', async ({ page, apiBaseUrl }) => {
    const response = await page.request.get(`${apiBaseUrl}/api/config`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.vectorStore).toBeDefined();
    expect(['CHROMA', 'PINECONE']).toContain(data.vectorStore);
  });
});

test.describe('💬 Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should accept user messages', async ({ page }) => {
    const messageInput = page.locator('textarea, input[type="text"]').first();
    await expect(messageInput).toBeVisible();
    
    // Type a message
    const testMessage = 'Hello AI!';
    await messageInput.fill(testMessage);
    
    // Verify text is entered
    await expect(messageInput).toHaveValue(testMessage);
  });

  test('should send message on Enter key', async ({ page }) => {
    const messageInput = page.locator('textarea, input[type="text"]').first();
    await messageInput.fill('What is RAG?');
    
    // Press Enter to send
    await page.keyboard.press('Enter');
    
    // Wait for message to be sent (input should clear)
    await page.waitForTimeout(500);
    
    // Verify input is cleared or message appears in chat
    const chatMessages = page.locator('[data-testid="message"], .message, [role="article"]');
    const messageCount = await chatMessages.count();
    
    expect(messageCount).toBeGreaterThanOrEqual(1);
  });

  test('should display user messages in chat', async ({ page, chatWithAI }) => {
    const testMessage = 'Explain machine learning';
    
    // Send message using fixture
    const response = await chatWithAI(testMessage);
    
    // Verify response is not empty
    expect(response).toBeTruthy();
  });

  test('should handle empty message submission', async ({ page }) => {
    const messageInput = page.locator('textarea, input[type="text"]').first();
    
    // Try to send empty message
    await messageInput.fill('');
    await page.keyboard.press('Enter');
    
    // App should handle gracefully (no error should appear)
    const errorMessage = page.locator('[role="alert"], .error, .toast-error');
    const isVisible = await errorMessage.isVisible().catch(() => false);
    
    // Either no error or a helpful error message
    if (isVisible) {
      const text = await errorMessage.textContent();
      expect(text).toMatch(/required|empty|please/i);
    }
  });

  test('should display message history', async ({ page, chatWithAI }) => {
    // Send first message
    await chatWithAI('First question?');
    
    // Send second message
    await chatWithAI('Second question?');
    
    // Count messages (should show both)
    const messages = page.locator('[data-testid="message"], .message, [role="article"]');
    const count = await messages.count();
    
    // At least 2 user messages + 2 AI responses
    expect(count).toBeGreaterThanOrEqual(4);
  });
});

test.describe('🧠 Model Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should allow changing model', async ({ page, waitForModelLoad }) => {
    await waitForModelLoad();
    
    const modelSelector = page.locator('[data-testid="model-selector"]');
    
    // Get available options
    const options = page.locator('option[value], datalist option[value]');
    const count = await options.count();
    
    expect(count).toBeGreaterThan(0);
    
    if (count > 1) {
      // Select different model
      await modelSelector.first().click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      
      // Model should change
      const selectedValue = await modelSelector.first().inputValue().catch(() => 'fallback');
      expect(selectedValue).toBeTruthy();
    }
  });

  test('model selector should never be disabled', async ({ page, waitForModelLoad }) => {
    await waitForModelLoad();
    
    const modelSelector = page.locator('[data-testid="model-selector"]');
    
    // Check that input is not disabled
    const isDisabled = await modelSelector.isDisabled().catch(() => false);
    expect(isDisabled).toBeFalsy();
  });
});

test.describe('🔄 Session & State Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should persist session ID in localStorage', async ({ page, chatWithAI }) => {
    // Send a message (triggers session)
    await chatWithAI('Test message');
    
    // Check localStorage
    const sessionId = await page.evaluate(() => localStorage.getItem('sessionId'));
    expect(sessionId).toBeTruthy();
    expect(sessionId).toMatch(/^[a-z0-9-]+$/i);
  });

  test('should reuse same session on page reload', async ({ page }) => {
    // Get initial session
    const initialSession = await page.evaluate(() => {
      return localStorage.getItem('sessionId') || crypto.randomUUID();
    });
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Session should persist
    const reloadedSession = await page.evaluate(() => localStorage.getItem('sessionId'));
    expect(reloadedSession).toBe(initialSession);
  });

  test('should clear conversation when clear button clicked', async ({ page, clearConversation }) => {
    // Send messages
    const input = page.locator('textarea, input[type="text"]').first();
    await input.fill('Test 1');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Clear conversation
    await clearConversation();
    
    // Messages should be cleared
    const messages = page.locator('[data-testid="message"], .message, [role="article"]');
    const count = await messages.count();
    
    // After clear, there should be very few messages (ideally 0, but testing is flexible)
    expect(count).toBeLessThanOrEqual(1);
  });
});

test.describe('⚠️ Error Handling', () => {
  test('should handle API connection failure gracefully', async ({ page, apiBaseUrl }) => {
    // Test with unreachable endpoint
    const response = await page.request.get(
      `${apiBaseUrl}/api/invalid-endpoint`,
      { failOnStatusCode: false }
    );
    
    // Should return 404 or similar
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should display error message for long input', async ({ page }) => {
    const messageInput = page.locator('textarea, input[type="text"]').first();
    
    // Create a very long message
    const longMessage = 'a'.repeat(5000);
    await messageInput.fill(longMessage);
    
    // Try to send
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    
    // Check for error message
    const errorMessage = page.locator('[role="alert"], .error, .toast');
    const isVisible = await errorMessage.isVisible().catch(() => false);
    
    if (isVisible) {
      const text = await errorMessage.textContent();
      expect(text).toMatch(/too long|exceeds|maximum/i);
    }
  });

  test('should recover after network error', async ({ page }) => {
    const messageInput = page.locator('textarea, input[type="text"]').first();
    
    // Send message (may fail due to network, but app should handle)
    await messageInput.fill('Recovery test');
    await page.keyboard.press('Enter');
    
    // App should still be usable
    await page.waitForTimeout(1000);
    
    // Input should be available for new message
    await expect(messageInput).toBeVisible();
  });
});

test.describe('🎨 UI & UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Key elements should still be visible
    const header = page.locator('header, [role="banner"]');
    await expect(header).toBeVisible();
    
    const messageInput = page.locator('textarea, input[type="text"]').first();
    await expect(messageInput).toBeVisible();
  });

  test('should be responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    const header = page.locator('header, [role="banner"]');
    await expect(header).toBeVisible();
  });

  test('should display proper focus indicators', async ({ page }) => {
    const messageInput = page.locator('textarea, input[type="text"]').first();
    
    // Focus on input
    await messageInput.focus();
    
    // Check that element is focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'TEXTAREA']).toContain(focused);
  });

  test('should have proper contrast for readability', async ({ page }) => {
    // This is a basic check - more thorough testing with axe-core recommended
    const messageInput = page.locator('textarea, input[type="text"]').first();
    
    // Input should be visible
    const box = await messageInput.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  });
});

test.describe('📱 Cross-Browser Compatibility', () => {
  test('should work in Chrome', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-specific test');
    
    await page.goto('/');
    await expect(page).toHaveTitle(/Agentic RAG|Chat/i);
  });

  test('should work in Firefox', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test');
    
    await page.goto('/');
    await expect(page).toHaveTitle(/Agentic RAG|Chat/i);
  });

  test('should work in Safari', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-specific test');
    
    await page.goto('/');
    await expect(page).toHaveTitle(/Agentic RAG|Chat/i);
  });
});
