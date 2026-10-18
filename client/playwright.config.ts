import os from 'os';
import path from 'path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration.
 *
 * By default the backend runs with LLM_PROVIDER=mock (deterministic fake LLM
 * and embeddings, see server/mock.js), an isolated SQLite file and a separate
 * Chroma collection, so the suite is fast and needs only Chroma.
 * Set E2E_REAL_LLM=1 to target the real Ollama model (use with --grep @smoke).
 *
 * When servers are already running on 3001/5173 they are reused, so make sure
 * a reused backend was started in the matching mode.
 */
const realLLM = !!process.env.E2E_REAL_LLM;

const serverEnv: Record<string, string> = {
  RATE_LIMIT_MAX: '10000',
  DB_PATH: process.env.DB_PATH || path.join(os.tmpdir(), 'agentic-assistant-e2e.db'),
};
if (!realLLM) {
  serverEnv.LLM_PROVIDER = 'mock';
  // Mock embeddings have their own dimensionality: never mix them with real vectors
  serverEnv.CHROMA_COLLECTION = 'e2e-mock';
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,

  /* Mock answers take milliseconds; real models need minutes on CPU */
  timeout: (realLLM ? 600 : 30) * 1000,
  expect: { timeout: realLLM ? 30_000 : 10_000 },

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,

  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  webServer: [
    {
      command: 'npm run start',
      url: 'http://localhost:3001/healthz',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      cwd: '../server',
      env: serverEnv,
    },
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      cwd: '.',
    },
  ],
});
