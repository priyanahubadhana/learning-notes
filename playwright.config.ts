import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright end-to-end tests: a real browser clicks through the app.
 * Each test gets a fresh browser context, so its IndexedDB starts empty.
 * Run with `npm run test:e2e` (starts the dev server automatically).
 */
const PORT = 5199
const BUILT_PORT = 5198
/** The built app, for tests of what only exists there (offline). */
export const BUILT_APP_URL = `http://localhost:${BUILT_PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1, // a test that passes on retry is reported as flaky
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
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
  webServer: [
    {
      command: `npm run dev -- --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      env: { E2E: '1' },
    },
    {
      command: `npm run build && npm run preview -- --port ${BUILT_PORT} --strictPort`,
      url: BUILT_APP_URL,
      env: { E2E: '1' },
    },
  ],
})
