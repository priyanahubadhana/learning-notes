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

async function start(page: Page) {
  await page.goto('/')
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
  await expect.poll(() => gearBottom(page)).toBeLessThanOrEqual(300)
  const box = await gear(page).boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(44)
  await gear(page).click()
  await expect(page.getByTestId('corner-panel')).toBeVisible()
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
        return !!scroller && scroller.scrollHeight >= scroller.clientHeight
      }),
    )
    .toBe(true)
})
