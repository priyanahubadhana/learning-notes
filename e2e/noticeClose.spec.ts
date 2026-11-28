import { expect, test, type Page } from './frameFixture.ts'

/**
 * P1.12 (owner idea I1): a notice with Undo or an action gets a small close
 * ✕ on the leading edge; Undo / the action stays on the trailing edge. The
 * ✕ closes the notice WITHOUT doing the action. Switch: foundation.shell.
 */
async function openParts(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/design-tokens')
  await expect(page.getByTestId('shell-said')).toHaveAttribute('data-ready', '')
  await page.waitForFunction(() => performance.now() > 1000)
}

test('toast: the ✕ closes the notice and does not undo', async ({ page }) => {
  await openParts(page)
  await page.getByTestId('toast-undo').click()
  const toast = page.getByTestId('shell-toast')
  await expect(toast).toBeVisible()
  const close = toast.getByRole('button', { name: 'Close' })
  await close.click()
  await expect(toast).toBeHidden()
  await expect(page.getByTestId('shell-said')).not.toHaveText('Undone')
})

test('toast: ✕ and Undo are on opposite sides, 44 px tap areas, 44 px apart', async ({
  page,
}) => {
  await openParts(page)
  await page.getByTestId('toast-undo').click()
  const toast = page.getByTestId('shell-toast')
  const x = await toast.getByRole('button', { name: 'Close' }).boundingBox()
  const u = await toast.getByRole('button', { name: 'Undo' }).boundingBox()
  const t = await toast.boundingBox()
  expect(x && u && t).toBeTruthy()
  expect(x!.width).toBeGreaterThanOrEqual(44)
  expect(x!.height).toBeGreaterThanOrEqual(44)
  // Leading edge ✕, then the message, then Undo on the trailing edge.
  expect(x!.x).toBeLessThan(u!.x)
  expect(u!.x - (x!.x + x!.width)).toBeGreaterThanOrEqual(44)
  expect(x!.x - t!.x).toBeLessThan(16)
  expect(t!.x + t!.width - (u!.x + u!.width)).toBeLessThan(16)
  // It does not grow taller (the 44 px Undo already sets 58).
  expect(t!.height).toBeLessThanOrEqual(58)
})

test('banner: the ✕ is on the leading edge, the action on the trailing edge, and ✕ closes without the action', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 })
  await page.addInitScript(() => localStorage.setItem('attn.backupFails', '2'))
  await page.goto('/?flags=foundation.shell')
  const banner = page.getByTestId('attention-banner')
  await expect(banner).toHaveAttribute('data-code', 'backups')
  const x = await banner.getByRole('button', { name: 'Close' }).boundingBox()
  const a = await banner
    .getByRole('button', { name: 'Open backups' })
    .boundingBox()
  const b = await banner.boundingBox()
  expect(x!.width).toBeGreaterThanOrEqual(44)
  expect(x!.height).toBeGreaterThanOrEqual(44)
  expect(a!.x - (x!.x + x!.width)).toBeGreaterThanOrEqual(44)
  expect(b!.height).toBeLessThanOrEqual(48)
  await banner.getByRole('button', { name: 'Close' }).click()
  await expect(banner).toHaveCount(0)
  // The action did not run: Settings did not open.
  await page.waitForTimeout(400)
  await expect(
    page.getByRole('heading', { name: 'Settings', level: 1 }),
  ).toBeHidden()
})

test('banner: it stays fixed at the top of the screen, also after a scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 500 })
  await page.addInitScript(() => localStorage.setItem('attn.backupFails', '2'))
  await page.goto('/?flags=foundation.shell')
  const banner = page.getByTestId('attention-banner')
  await expect(banner).toBeVisible()
  expect(await banner.evaluate((el) => getComputedStyle(el).position)).toBe(
    'fixed',
  )
  expect(Math.abs((await banner.boundingBox())!.y)).toBeLessThan(2)
  // Scroll the page and every scroll container (works on every browser).
  await page.evaluate(() => {
    window.scrollTo(0, 400)
    for (const el of Array.from(document.querySelectorAll('*')))
      if (el.scrollHeight > el.clientHeight + 1) el.scrollTop = 400
  })
  await page.waitForTimeout(300)
  expect(Math.abs((await banner.boundingBox())!.y)).toBeLessThan(2)
})
