import { defineConfig, devices } from '@playwright/test'

/**
 * E2E config for Enchanted Style.
 *
 * Locally, point the suite at an existing server. CI starts an isolated Next
 * server because a test list is not proof that the customer journey renders.
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
  webServer: process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 1215',
    url: 'http://127.0.0.1:1215',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:1215',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'], browserName: 'chromium' },
    },
  ],
})
