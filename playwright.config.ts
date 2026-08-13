import { defineConfig, devices } from '@playwright/test'

/**
 * E2E config for Enchanted Style.
 *
 * NOTE: browsers are NOT installed in this workspace — the download was skipped
 * deliberately. Before the first run:
 *
 *   npx playwright install chromium
 *
 * There is no `webServer` block on purpose: a dev server is already running in
 * this environment and Playwright must not start or stop it. Point the suite at
 * whatever port is live:
 *
 *   PLAYWRIGHT_BASE_URL=http://localhost:1215 npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:1215',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
})
