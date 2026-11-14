import { expect, test, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * Slice fix-scroll (iPad test findings 14 Nov, F2/F3/F4/F6/F8), all behind
 * the new app frame (flag foundation.shell).
 *  F8: turning the iPad sideways and back gives exactly the layout of a fresh load.
 *  F2/F6: every scroll area scrolls from anywhere (rows and empty space) with
 *         ONE shared scroll bar with arrows at both ends.
 *  F4: the Notebooks sidebar has no Review / All cards / All summaries rows.
 */
const ON = '/?flags=foundation.shell,toolbar.v8'
const LAND = { width: 1180, height: 820 }
const PORT = { width: 820, height: 1180 }

test.use({ viewport: LAND, hasTouch: true })

/** What the frame looks like: sizes of the parts that broke after rotation. */
async function frameOf(page: Page) {
  return page.evaluate(() => {
    const box = (sel: string) => {
      const el = document.querySelector<HTMLElement>(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return r.width === 0 && r.height === 0
        ? null
        : { x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height) }
    }
    return {
      top: box('header[data-shell-top]'),
      side: box('aside#sidebar'),
      panel: box('[data-testid="left-panel"]'),
      main: box('main[data-page-scroller]'),
      top2: document.querySelector('[data-bar-scroll]')?.getBoundingClientRect().height ?? 0,
      tools: document.querySelectorAll('[data-bar-scroll] [data-tool]').length,
    }
  })
}

test('F8 rotating landscape, portrait, landscape equals a fresh load', async ({
  page,
}) => {
  await page.goto(ON)
  await expect(page.locator('.sh-frame')).toBeVisible()
  await createNotebook(page, 'Heart', 'Cardiology')
  await expect(page.locator('main[data-page-scroller]')).toBeVisible()
  const settle = () => page.waitForTimeout(1500)
  await settle()
  // The pages panel is open (the owner's state when it broke).
  if ((await page.getByTestId('left-panel').count()) === 0)
    await page.getByTestId('panel-toggle').tap()
  await expect(page.getByTestId('left-panel')).toBeVisible()
  await settle()

  await page.setViewportSize(PORT)
  await settle()
  const rotatedPort = await frameOf(page)
  await page.setViewportSize(LAND)
  await settle()
  const rotatedLand = await frameOf(page)

  await page.reload()
  await expect(page.locator('main[data-page-scroller]')).toBeVisible()
  await settle()
  const freshLand = await frameOf(page)
  await page.setViewportSize(PORT)
  await page.reload()
  await expect(page.locator('main[data-page-scroller]')).toBeVisible()
  await settle()
  const freshPort = await frameOf(page)

  expect(rotatedPort).toEqual(freshPort)
  expect(rotatedLand).toEqual(freshLand)
})

test('F8 a late-reporting window size (iPad Safari right after a turn) is corrected by itself', async ({
  page,
}) => {
  // iPad Safari can report the OLD innerWidth/innerHeight while the new size
  // is already laid out. The frame must read again, not keep the old size.
  await page.addInitScript(() => {
    const w = window as unknown as { __stale?: { w: number; h: number } }
    const iw = Object.getOwnPropertyDescriptor(window, 'innerWidth')
    const ih = Object.getOwnPropertyDescriptor(window, 'innerHeight')
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      get: () => w.__stale?.w ?? (iw?.get ? iw.get.call(window) : 0),
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      get: () => w.__stale?.h ?? (ih?.get ? ih.get.call(window) : 0),
    })
  })
  await page.goto(ON)
  await createNotebook(page, 'Heart', 'Cardiology')
  await expect(page.locator('main[data-page-scroller]')).toBeVisible()
  await page.evaluate(() => {
    ;(window as unknown as { __stale: unknown }).__stale = { w: 1180, h: 820 }
  })
  await page.setViewportSize(PORT)
  await page.waitForTimeout(100)
  // The window now tells the truth, and no further resize event comes.
  await page.evaluate(() => {
    delete (window as unknown as { __stale?: unknown }).__stale
  })
  await page.waitForTimeout(900)
  const rotated = await frameOf(page)
  await page.reload()
  await expect(page.locator('main[data-page-scroller]')).toBeVisible()
  await page.waitForTimeout(1500)
  expect(rotated).toEqual(await frameOf(page))
})
