import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright end-to-end tests: a real browser clicks through the app.
 * Each test gets a fresh browser context, so its IndexedDB starts empty.
 * Run with `npm run test:e2e`. The tests use the built app under the live
 * site's security rules, so they check what users actually get.
 */
const PORT = 5199

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1, // a test that passes on retry is reported as flaky
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    actionTimeout: 10_000, // a stuck click names itself
    serviceWorkers: 'block', // offline.spec.ts turns it on
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      expect: { timeout: 15_000 }, // WebKit starts the app more slowly
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    env: { E2E: '1' },
  },
})
