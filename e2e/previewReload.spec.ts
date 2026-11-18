import { expect, test, type Page } from '@playwright/test'

/**
 * Re-test 18 Nov, bug 2: on the preview host a plain reload must keep the
 * "Test a phase" switch and the other saved settings. The preview host is
 * served from the local build by a route (.dev is https-only).
 */
const HOST = 'build-next.learning-notes-app.pages.dev'
const PORT = Number(process.env.PW_PORT ?? 5199)
const FLAGS_KEY = 'learning-notes:flags'

test.use({
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
  baseURL: `https://${HOST}`,
  ignoreHTTPSErrors: true,
  storageState: {
    cookies: [],
    origins: [
      {
        origin: `https://${HOST}`,
        localStorage: [
          { name: 'learning-notes:devicePicker.done', value: 'true' },
          { name: 'learning-notes:onboarding.done', value: 'true' },
          { name: 'learning-notes:toolbar.lastToolOffered', value: 'true' },
          { name: 'learning-notes:accountGate.off', value: '1' },
        ],
      },
    ],
  },
})

test.beforeEach(async ({ context }) => {
  await context.route(`https://${HOST}/**`, async (route) => {
    const url = route
      .request()
      .url()
      .replace(`https://${HOST}`, `http://localhost:${PORT}`)
    await route.fulfill({ response: await route.fetch({ url }) })
  })
})

const read = (page: Page) =>
  page.evaluate(
    (k) => ({
      flags: JSON.parse(localStorage.getItem(k) ?? 'null') as string[] | null,
      marker: localStorage.getItem('learning-notes:preview-phase'),
      probe: localStorage.getItem('learning-notes:probe'),
    }),
    FLAGS_KEY,
  )

test('RB-2 a plain reload keeps the test phase, the user choices and other saved settings', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('main')).toBeAttached({ timeout: 45_000 })
  const first = await read(page)
  // The phase under test went on once and was remembered.
  expect(first.marker).toBe('phase2b')
  expect(first.flags).toContain('textbox.v2')
  // The user turns one switch off and saves another setting.
  await page.evaluate((k) => {
    const list = (JSON.parse(localStorage.getItem(k)!) as string[]).filter(
      (id) => id !== 'page.menus',
    )
    localStorage.setItem(k, JSON.stringify(list))
    localStorage.setItem('learning-notes:probe', '"kept"')
  }, FLAGS_KEY)
  for (let n = 0; n < 2; n++) {
    await page.reload()
    await expect(page.locator('main')).toBeAttached({ timeout: 45_000 })
    const after = await read(page)
    expect(after.marker).toBe('phase2b')
    expect(after.probe).toBe('"kept"')
    expect(after.flags).toContain('textbox.v2')
    expect(after.flags).not.toContain('page.menus')
  }
})
