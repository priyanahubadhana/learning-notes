/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, pageAction, startInMode } from './helpers.ts'

/**
 * F8: the bar slot keeps the tool bar's height before the bar draws (see
 * src/editor/BarRoom.tsx), but never where no bar shows. Each case opens a
 * PAGE with the tool bar's file held back 4 s and watches every frame:
 * whether the kept space ever showed, how tall the slot got, and whether the
 * page below ever moved.
 */
const ON = 'foundation.shell,toolbar.v8'

/** Records, from the first frame, the room, the slot height and main's tops. */
const SAMPLER = () => {
  const seen = { room: false, slot: 0, tops: [] as number[] }
  ;(window as unknown as { __barRoom: typeof seen }).__barRoom = seen
  const tick = () => {
    if (document.querySelector('[data-bar-room]')) seen.room = true
    const slot = document.querySelector('[data-bar-slot]')
    if (slot)
      seen.slot = Math.max(
        seen.slot,
        Math.round(slot.getBoundingClientRect().height),
      )
    const main = document.querySelector('main[data-page-scroller]')
    if (main) {
      const top = Math.round(main.getBoundingClientRect().top)
      if (seen.tops[seen.tops.length - 1] !== top) seen.tops.push(top)
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/** Opens a page with the settings `keys`, reloads with the bar's file held, and returns what was seen. */
async function watchPage(
  page: Page,
  keys: Record<string, unknown> = {},
  setup?: (page: Page) => Promise<void>,
) {
  await startInMode(page, 'touch')
  await page.goto(`/?flags=${ON}`)
  await createNotebook(page, 'Heart', 'First')
  await setup?.(page)
  await page.evaluate(
    ([entries, prefix]) => {
      for (const [k, v] of Object.entries(entries))
        localStorage.setItem(prefix + k, JSON.stringify(v))
    },
    [keys, 'learning-notes:'] as const,
  )
  await page.route('**/assets/ToolbarV8*.js', async (route) => {
    await new Promise((ok) => setTimeout(ok, 4000))
    await route.continue()
  })
  await page.addInitScript(SAMPLER)
  await page.reload()
  await expect(page.locator('main[data-page-scroller]')).toBeVisible()
  await page.waitForTimeout(6000)
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __barRoom: { room: boolean; slot: number; tops: number[] }
        }
      ).__barRoom,
  )
}

test('a page with the bar turned off never keeps room', async ({ page }) => {
  const seen = await watchPage(page, { 'advanced.barPlacement': 'floating' })
  expect(seen.room).toBe(false)
  expect(seen.slot).toBe(0)
  expect(seen.tops.length).toBe(1)
})

test('a page with a floating bar never keeps room', async ({ page }) => {
  const seen = await watchPage(page, { 'advanced.barPlacement': 'free' })
  expect(seen.room).toBe(false)
  // A bar that shows elsewhere leaves only the slot's own 4 px padding.
  expect(seen.slot).toBeLessThanOrEqual(4)
})

test('a page with the bar at the bottom never keeps room at the top', async ({
  page,
}) => {
  const seen = await watchPage(page, { 'advanced.barPlacement': 'bottom' })
  expect(seen.room).toBe(false)
  expect(seen.slot).toBeLessThanOrEqual(4)
})

test('a page with the bar on auto-hide never keeps room', async ({ page }) => {
  const seen = await watchPage(page, { 'advanced.barAutoHide': 'on' })
  expect(seen.room).toBe(false)
})

test('a page with the ribbon open never keeps room', async ({ page }) => {
  const seen = await watchPage(page, { 'toolbar.ribbon': true })
  expect(seen.room).toBe(false)
})

test('a page with the default bar: the room shows and the page never moves', async ({
  page,
}) => {
  const seen = await watchPage(page)
  expect(seen.room).toBe(true)
  expect(seen.tops.length).toBe(1)
})

test.describe('phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('the page below the bar never moves while the bar loads', async ({
    page,
  }) => {
    const seen = await watchPage(page)
    expect(seen.tops.length).toBe(1)
  })
})

test('a locked page: the kept room is gone at the end (pins today: it can show first, then go)', async ({
  page,
}) => {
  // The lock is stored with the page (read after the first paint), so the
  // room cannot know it yet. Logged in DECISIONS "Decisions to review".
  await watchPage(page, {}, async (p) => {
    await pageAction(p, 'Lock editing')
    // The setup must really have locked the page (a missed menu tap would
    // leave an editable page, where the bar shows and the slot is not empty).
    await expect(p.getByTestId('edit-lock-bar')).toBeVisible()
  })
  await expect(page.getByTestId('edit-lock-bar')).toBeVisible()
  expect(await page.locator('[data-bar-room]').count()).toBe(0)
})

test('Home, Settings and Library keep no room', async ({ page }) => {
  await startInMode(page, 'touch')
  for (const hash of ['#/', '#/settings', '#/library']) {
    await page.goto(`/?flags=${ON}${hash}`)
    await expect(page.locator('main[data-page-scroller]')).toBeVisible()
    for (const wait of [0, 1500]) {
      await page.waitForTimeout(wait)
      expect(await page.locator('[data-bar-room]').count()).toBe(0)
      expect(
        await page
          .locator('[data-bar-slot]')
          .evaluate((s) => Math.round(s.getBoundingClientRect().height)),
      ).toBe(0)
    }
  }
})
