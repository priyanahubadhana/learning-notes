import { expect, test, type Page } from '@playwright/test'
import { createNotebook, typeInEditor } from './helpers.ts'

/**
 * BUG-006 (owner, 13 Nov, iPad Safari portrait): the gear at the foot of the
 * left strip fell off the screen when the on-screen keyboard and the format
 * bar took the height, and the strip did not scroll. Why: the strip was as
 * tall as the layout viewport, but the keyboard only shrinks the VISUAL
 * viewport. The strip is now capped to the visible area; the spaces scroll
 * and the gear stays pinned at its foot.
 */
test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true })

const gear = (page: Page) => page.getByTestId('corner-button')

async function start(page: Page, flags = '') {
  await page.goto(flags ? `/?flags=${flags}` : '/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

/** Pretend the on-screen keyboard shrank the visual viewport to `h` px. */
async function fakeKeyboard(page: Page, h: number) {
  await page.evaluate((height) => {
    const vv = window.visualViewport!
    Object.defineProperty(vv, 'height', {
      get: () => height,
      configurable: true,
    })
    vv.dispatchEvent(new Event('resize'))
  }, h)
}

async function gearBottom(page: Page) {
  return gear(page).evaluate((el) => el.getBoundingClientRect().bottom)
}

test('BUG-006 the gear stays inside the visible area on a short screen', async ({
  page,
}) => {
  await start(page)
  await page.setViewportSize({ width: 820, height: 260 })
  await expect(gear(page)).toBeVisible()
  expect(await gearBottom(page)).toBeLessThanOrEqual(260)
  await gear(page).click()
  await expect(page.getByTestId('corner-panel')).toBeVisible()
})

test('BUG-006 with the keyboard up (visual viewport shrinks) the gear stays reachable', async ({
  page,
}) => {
  await start(page)
  const full = await gearBottom(page)
  expect(full).toBeGreaterThan(600)
  await fakeKeyboard(page, 300)
  await expect.poll(() => gearBottom(page)).toBeLessThanOrEqual(300 - 44)
  const box = await gear(page).boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(44)
  // The first tap may only close the open format bar (the outside-tap rule).
  const panel = page.getByTestId('corner-panel')
  await gear(page).click()
  await page.waitForTimeout(500)
  if (!(await panel.isVisible())) await gear(page).click({ timeout: 3000 })
  await expect(panel).toBeVisible()
  // The panel rises from the foot of the visible area, not from under it.
  const bottom = await panel.evaluate((el) => el.getBoundingClientRect().bottom)
  expect(bottom).toBeLessThanOrEqual(300 - 44)
})

test('BUG-006 the strip scrolls when its spaces do not fit above the gear', async ({
  page,
}) => {
  await start(page)
  await fakeKeyboard(page, 200)
  const nav = page.getByRole('navigation', { name: 'Spaces' })
  await expect
    .poll(() =>
      nav.evaluate((el) => {
        const scroller = [...el.querySelectorAll('*')].find(
          (n) => getComputedStyle(n).overflowY === 'auto',
        )
        return !!scroller && scroller.scrollHeight > scroller.clientHeight
      }),
    )
    .toBe(true)
  // Scrolling brings the last space into view (above the pinned gear).
  const last = nav.locator('[data-space]').last()
  await last.scrollIntoViewIfNeeded()
  const l = await last.evaluate((el) => el.getBoundingClientRect())
  const g = await gear(page).evaluate((el) => el.getBoundingClientRect())
  expect(l.bottom).toBeLessThanOrEqual(g.top)
  expect(g.bottom).toBeLessThanOrEqual(200)
})

for (const flags of ['', 'foundation.shell']) {
  const tag = flags ? 'new shell' : 'old shell'
  test(`BUG-006 landscape 1180x820, keyboard up: the gear panel is not cut off at the top (${tag})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1180, height: 820 })
    await start(page, flags)
    await fakeKeyboard(page, 330)
    await expect.poll(() => gearBottom(page)).toBeLessThanOrEqual(330)
    const panel = page.getByTestId('corner-panel')
    await gear(page).click()
    await page.waitForTimeout(500)
    if (!(await panel.isVisible())) await gear(page).click({ timeout: 3000 })
    await expect(panel).toBeVisible()
    const r = await panel.evaluate((el) => el.getBoundingClientRect())
    expect(r.top).toBeGreaterThanOrEqual(0)
    expect(r.bottom).toBeLessThanOrEqual(330)
    // The panel scrolls inside instead of overflowing; Settings is tappable.
    const settings = panel.getByRole('button', { name: 'Settings' }).first()
    await settings.scrollIntoViewIfNeeded()
    const b = await settings.boundingBox()
    expect(b!.y).toBeGreaterThanOrEqual(0)
    expect(b!.y + b!.height).toBeLessThanOrEqual(330)
    await settings.click()
    await expect(panel).toBeHidden()
  })
}

// Same checks on the new shell for the portrait cases above.
test('BUG-006 new shell: the gear stays reachable with the keyboard up', async ({
  page,
}) => {
  await start(page, 'foundation.shell')
  await fakeKeyboard(page, 300)
  await expect.poll(() => gearBottom(page)).toBeLessThanOrEqual(300 - 44)
  const nav = page.getByRole('navigation', { name: 'Spaces' })
  const g = await gear(page).evaluate((el) => el.getBoundingClientRect())
  const n = await nav.evaluate((el) => el.getBoundingClientRect())
  expect(n.bottom).toBeLessThanOrEqual(300)
  expect(g.height).toBeGreaterThanOrEqual(44 - 4)
})
