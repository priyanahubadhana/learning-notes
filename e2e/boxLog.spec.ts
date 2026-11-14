/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { startInMode } from './helpers.ts'

/** 2B.2: the quiet box recorder on the preview address. */
const HOST = 'build-next.learning-notes-app.pages.dev'
const PORT = Number(process.env.PW_PORT ?? 5199)

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
          {
            name: 'learning-notes:firstUse.seen',
            value: '["lasso","writePad","layers","paperBox"]',
          },
        ],
      },
    ],
  },
})

test.beforeEach(async ({ context }) => {
  // .dev is https-only, so the preview address is served from the local build.
  await context.route(`https://${HOST}/**`, async (route) => {
    const url = route
      .request()
      .url()
      .replace(`https://${HOST}`, `http://localhost:${PORT}`)
    await route.fulfill({ response: await route.fetch({ url }) })
  })
})

test.afterEach(async ({ context }) => {
  await context.unrouteAll({ behavior: 'ignoreErrors' })
})

test('BL-1 a pen tap on a box is logged without its text, kept after reload, and Copy works', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await startInMode(page, 'pencil')
  await page.goto('/?boxlog=1')
  await page.locator('aside').waitFor({ state: 'attached' })
  // The recorder loads lazily: wait for it before the tap.
  await expect(page.locator('[data-diag-panel]')).toBeVisible()
  await page.evaluate(() => {
    const box = document.createElement('div')
    box.setAttribute('data-paper-box', '')
    box.style.cssText =
      'position:fixed;left:30%;top:120px;width:260px;height:80px;background:#fff'
    box.innerHTML = '<p id="bx">my private words</p>'
    document.body.appendChild(box)
    document.getElementById('bx')!.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'pen',
        pointerId: 3,
        bubbles: true,
        clientX: 200,
        clientY: 150,
        pressure: 0.4,
      }),
    )
  })
  const panel = page.locator('[data-diag-panel]')
  const row = panel.locator('[data-box-row]', { hasText: 'pointerdown pen' })
  await expect(row).toBeVisible()
  await expect(panel).not.toContainText('private')
  await panel.getByRole('button', { name: 'Copy' }).click()
  await expect(panel.getByRole('button', { name: 'Copied' })).toBeVisible()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('pointerdown')
  expect(clip).not.toContain('private')
  // Kept on the device: still there after a reload.
  await page.waitForTimeout(1300)
  await page.reload()
  await expect(
    page.locator('[data-diag-panel] [data-box-row]', {
      hasText: 'pointerdown pen',
    }),
  ).toBeVisible()
  await page
    .locator('[data-diag-panel]')
    .getByRole('button', { name: 'Close' })
    .click()
  await expect(page.locator('[data-diag-panel]')).toHaveCount(0)
})

test('BL-2 no panel without ?boxlog=1', async ({ page }) => {
  await startInMode(page, 'pencil')
  await page.goto('/')
  await page.waitForTimeout(500)
  await expect(page.locator('[data-diag-panel]')).toHaveCount(0)
})
