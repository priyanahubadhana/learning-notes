/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { startInMode } from './helpers.ts'

/** P1.5a: the hidden Pencil check shows on the preview host with ?pencilcheck=1 and lists a pen tap on the bar. */
const HOST = 'build-next.learning-notes-app.pages.dev'
const PORT = Number(process.env.PW_PORT ?? 5199)

test.use({
  viewport: { width: 820, height: 1180 },
  hasTouch: true,
  // .dev is https-only, so the preview host is served from the local build by a route.
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
          { name: 'learning-notes:general.pasteMode', value: '"keep"' },
          { name: 'learning-notes:general.openNotebookAt', value: '"tabs"' },
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

test('PC-1 the panel lists a pen pointerdown on the scroll bar', async ({
  page,
}) => {
  await startInMode(page, 'pencil')
  await page.goto('/?flags=foundation.shell,toolbar.v8&pencilcheck=1')
  await page.locator('aside').waitFor({ state: 'attached' })
  await page.evaluate(() => {
    const box = document.createElement('div')
    box.id = 'hint-list'
    box.style.cssText =
      'position:fixed;left:40%;top:80px;width:200px;height:170px;overflow-y:auto;background:#fff;z-index:5'
    box.innerHTML = '<div style="height:900px">long</div>'
    document.body.appendChild(box)
  })
  const panel = page.locator('[data-pencil-check]')
  await expect(panel).toBeVisible()
  await page.locator('#hint-list').evaluate((el) => {
    el.scrollTop = 100
  })
  const thumb = page.locator('[data-scrollbar-thumb]')
  await expect(thumb).toBeVisible()
  const b = (await thumb.boundingBox())!
  await page.evaluate(
    ({ x, y }) => {
      document.elementFromPoint(x, y)?.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerType: 'pen',
          pointerId: 7,
          clientX: x,
          clientY: y,
          bubbles: true,
          pressure: 0.5,
          buttons: 1,
        }),
      )
    },
    { x: b.x + b.width / 2, y: b.y + b.height / 2 },
  )
  const row = panel
    .locator('[data-row]', { hasText: 'pointerdown pen' })
    .first()
  await expect(row).toBeVisible()
  await expect(row).toContainText('ta=none')
  // The ✕ closes it.
  await panel.getByRole('button', { name: 'Close' }).click()
  await expect(panel).toHaveCount(0)
})

test('PC-2 no panel without the parameter', async ({ page }) => {
  await startInMode(page, 'pencil')
  await page.goto('/?flags=foundation.shell')
  await page.waitForTimeout(500)
  await expect(page.locator('[data-pencil-check]')).toHaveCount(0)
})

test('PC-3 the panel follows the theme, and a drag folds into one row', async ({
  page,
}) => {
  await startInMode(page, 'pencil')
  await page.goto('/?flags=foundation.shell&pencilcheck=1')
  await page.locator('aside').waitFor({ state: 'attached' })
  await page.evaluate(() => {
    const box = document.createElement('div')
    box.style.cssText =
      'position:fixed;left:40%;top:80px;width:200px;height:170px;overflow-y:auto;background:#fff;z-index:5'
    box.id = 'hint-list'
    box.innerHTML = '<div style="height:900px">long</div>'
    document.body.appendChild(box)
  })
  const list = page.locator('#hint-list')
  await list.evaluate((el) => {
    el.scrollTop = 100
  })
  const thumb = page.locator('[data-scrollbar-thumb]')
  await expect(thumb).toBeVisible()
  const b = (await thumb.boundingBox())!
  await page.evaluate(
    ({ x, y }) => {
      const send = (type: string, dy: number) =>
        document.elementFromPoint(x, y + dy)?.dispatchEvent(
          new PointerEvent(type, {
            pointerType: 'pen',
            pointerId: 7,
            clientX: x,
            clientY: y + dy,
            bubbles: true,
          }),
        )
      send('pointerdown', 0)
      for (let i = 1; i <= 30; i++) send('pointermove', i)
      send('pointerup', 30)
    },
    { x: b.x + b.width / 2, y: b.y + b.height / 2 },
  )
  const panel = page.locator('[data-pencil-check]')
  await expect(
    panel.locator('[data-row]', { hasText: 'pointerdown' }),
  ).toHaveCount(1)
  // 30 moves fold into a few rows (a new row only where the target changes).
  const moves = panel.locator('[data-row]', { hasText: 'pointermove x' })
  await expect(moves.first()).toBeVisible()
  expect(await moves.count()).toBeLessThanOrEqual(3)
  const dir = process.env.SHOTS_DIR ?? 'screenshots/p1-5a-pencil-check'
  const bg: string[] = []
  for (const theme of ['day', 'night']) {
    await page.evaluate(
      (v) => document.documentElement.setAttribute('data-theme', v),
      theme,
    )
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    bg.push(await panel.evaluate((el) => getComputedStyle(el).backgroundColor))
    await page.screenshot({ path: `${dir}/${theme}.png` })
  }
  expect(bg[0]).not.toBe(bg[1])
})

test.afterEach(async ({ context }) => {
  // Requests still in flight when the test ends are not an error.
  await context.unrouteAll({ behavior: 'ignoreErrors' })
})
