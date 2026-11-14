// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode } from './helpers.ts'
import { installRealPen, realPen } from './realPen.ts'

/**
 * P1.5 (first look L11): with a REAL Apple Pencil the ⋯ menu closed when its
 * own scroll bar was pressed, and the rest of the press landed on the page
 * behind. Why the older tests missed it: they sent made-up pen events and never
 * pressed a menu's own bar. These use the browser's own input (realPen.ts).
 *  PR-1 a Pencil press on a menu's or panel's own bar (track, thumb, arrow)
 *       scrolls its list; the menu stays open and nothing behind is touched.
 *  PR-2 a Pencil drag inside a list, menu or panel scrolls it like a finger
 *       and does not choose a row; a Pencil tap still chooses.
 *  PR-3 on the note page the Pencil still writes: a drag there never scrolls.
 */
const ON = '/?flags=foundation.shell'
const TRAY = '[data-bar="tray"]'

test.use({ viewport: { width: 820, height: 600 }, hasTouch: true })

/** The tool bar ⋯ menu, open and overflowing (a short iPad window). */
async function openMenu(page: Page) {
  await installRealPen(page)
  await startInMode(page, 'pencil')
  await page.goto(ON)
  await createNotebook(page, 'Heart', 'Cardiology')
  await page.getByRole('button', { name: 'Toolbar menu' }).first().click()
  const edit = page.getByRole('button', { name: /^Edit toolbar/ }).first()
  await expect(edit).toBeVisible()
  await expect(page.locator('[data-scrollbar-root]')).toHaveCount(1)
  // Every click that lands outside the bar and the menu: "the tap fell through".
  await page.evaluate(() => {
    const w = window as unknown as { __stray: string[] }
    w.__stray = []
    window.addEventListener(
      'click',
      (e) => {
        const el = e.target as Element
        if (!el.closest('.sbar, [data-bar="tray"]')) w.__stray.push(el.tagName)
      },
      true,
    )
  })
  return { tray: page.locator(TRAY), edit }
}

const stray = (page: Page) =>
  page.evaluate(() => (window as unknown as { __stray: string[] }).__stray)
const box = async (page: Page, sel: string) =>
  (await page.locator(sel).first().boundingBox())!
const scrollTop = (page: Page, sel: string) =>
  page
    .locator(sel)
    .first()
    .evaluate((el) => Math.round(el.scrollTop))

test('PR-1 a real Pencil tap on the ⋯ menu bar track scrolls the menu, which stays open', async ({
  page,
}) => {
  const { tray, edit } = await openMenu(page)
  const t = await box(page, '[data-scrollbar-track]')
  await realPen(page, [{ x: t.x + t.width / 2, y: t.y + t.height * 0.85 }])
  await expect.poll(() => scrollTop(page, TRAY)).toBeGreaterThan(20)
  await expect(tray).toBeVisible()
  await expect(edit).toBeAttached()
  expect(await stray(page)).toEqual([])
})

test('PR-1 a real Pencil drag of the ⋯ menu bar thumb scrolls the menu, which stays open', async ({
  page,
}) => {
  const { tray } = await openMenu(page)
  const t = await box(page, '[data-scrollbar-thumb]')
  const at = { x: t.x + t.width / 2, y: t.y + t.height / 2 }
  await realPen(page, [
    at,
    { x: at.x, y: at.y + 40 },
    { x: at.x, y: at.y + 80 },
  ])
  await expect.poll(() => scrollTop(page, TRAY)).toBeGreaterThan(20)
  await expect(tray).toBeVisible()
  expect(await stray(page)).toEqual([])
})

test('PR-1 a real Pencil tap on the ⋯ menu bar arrow scrolls the menu one step; nothing behind is clicked', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const { tray } = await openMenu(page)
  // Room for two steps, so a tap that counted twice would show.
  await tray.evaluate((el) => {
    const filler = document.createElement('div')
    filler.style.height = '3000px'
    el.appendChild(filler)
  })
  const a = await box(page, '[data-scrollbar-arrow="down"]')
  const step = await tray.evaluate((el) => el.clientHeight)
  await realPen(page, [{ x: a.x + a.width / 2, y: a.y + a.height / 2 }])
  await expect.poll(() => scrollTop(page, TRAY)).toBeGreaterThan(20)
  expect(await scrollTop(page, TRAY)).toBeLessThanOrEqual(step)
  await expect(tray).toBeVisible()
  expect(await stray(page)).toEqual([])
})

test('PR-1 a finger tap on the ⋯ menu bar arrow and track also keeps the menu open', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const { tray } = await openMenu(page)
  const a = await box(page, '[data-scrollbar-arrow="down"]')
  await page.touchscreen.tap(a.x + a.width / 2, a.y + a.height / 2)
  await expect.poll(() => scrollTop(page, TRAY)).toBeGreaterThan(20)
  await expect(tray).toBeVisible()
  await tray.evaluate((el) => (el.scrollTop = 0))
  const t = await box(page, '[data-scrollbar-track]')
  await page.touchscreen.tap(t.x + t.width / 2, t.y + t.height * 0.85)
  await expect.poll(() => scrollTop(page, TRAY)).toBeGreaterThan(20)
  await expect(tray).toBeVisible()
  expect(await stray(page)).toEqual([])
})

test('PR-2 a real Pencil drag inside the ⋯ menu scrolls it like a finger and chooses nothing', async ({
  page,
}) => {
  const { tray } = await openMenu(page)
  const b = (await tray.boundingBox())!
  const x = b.x + b.width / 2
  // Start on a row near the bottom and drag up: the list follows the tip.
  await realPen(page, [
    { x, y: b.y + b.height - 60 },
    { x, y: b.y + b.height - 120 },
    { x, y: b.y + b.height - 180 },
  ])
  await expect.poll(() => scrollTop(page, TRAY)).toBeGreaterThan(80)
  await expect(tray).toBeVisible()
  // And back down again.
  const top = await scrollTop(page, TRAY)
  await realPen(page, [
    { x, y: b.y + 80 },
    { x, y: b.y + 140 },
  ])
  await expect.poll(() => scrollTop(page, TRAY)).toBeLessThan(top)
  await expect(tray).toBeVisible()
})

test('PR-2 a real Pencil tap on a ⋯ menu row still chooses it', async ({
  page,
}) => {
  const { tray, edit } = await openMenu(page)
  const b = (await edit.boundingBox())!
  await realPen(page, [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }])
  await expect(tray).toBeHidden()
})

test.describe('the pages panel and the note page', () => {
  test.use({ viewport: { width: 820, height: 1180 } })

  /** The pages panel open over the page, its list made long. */
  async function openPanel(page: Page) {
    await installRealPen(page)
    await startInMode(page, 'pencil')
    await page.goto(ON)
    await createNotebook(page, 'Heart', 'Cardiology')
    await page.getByTestId('panel-toggle').click()
    const panel = page.getByTestId('left-panel')
    await expect(panel).toBeVisible()
    await panel.evaluate((el) => {
      const list = el.querySelector<HTMLElement>('[role="tabpanel"]')!
      list.setAttribute('data-test-list', '')
      const filler = document.createElement('div')
      filler.style.height = '4000px'
      list.appendChild(filler)
    })
    await expect(page.locator('[data-scrollbar-root]')).toHaveCount(1)
    return panel
  }

  test('PR-1 a real Pencil on the pages panel bar (track, thumb) scrolls its list; the panel stays open', async ({
    page,
  }) => {
    const panel = await openPanel(page)
    const t = await box(page, '[data-scrollbar-track]')
    await realPen(page, [{ x: t.x + t.width / 2, y: t.y + t.height * 0.7 }])
    await expect
      .poll(() => scrollTop(page, '[data-test-list]'))
      .toBeGreaterThan(200)
    await expect(panel).toBeVisible()
    const before = await scrollTop(page, '[data-test-list]')
    const th = await box(page, '[data-scrollbar-thumb]')
    const at = { x: th.x + th.width / 2, y: th.y + th.height / 2 }
    await realPen(page, [at, { x: at.x, y: at.y - 100 }])
    await expect
      .poll(() => scrollTop(page, '[data-test-list]'))
      .toBeLessThan(before)
    await expect(panel).toBeVisible()
  })

  test('PR-2 a real Pencil drag inside the pages panel scrolls its list', async ({
    page,
  }) => {
    const panel = await openPanel(page)
    const b = (await panel.boundingBox())!
    const x = b.x + b.width / 2
    await realPen(page, [
      { x, y: b.y + b.height - 100 },
      { x, y: b.y + b.height - 300 },
    ])
    await expect
      .poll(() => scrollTop(page, '[data-test-list]'))
      .toBeGreaterThan(100)
    await expect(panel).toBeVisible()
  })

  test('PR-3 on the note page a real Pencil drag never scrolls the page; the page bar still works with the Pencil', async ({
    page,
  }) => {
    await installRealPen(page)
    await startInMode(page, 'pencil')
    await page.goto(ON)
    await createNotebook(page, 'Heart', 'Cardiology')
    const main = page.locator('main[data-page-scroller]')
    await main.evaluate((el) => {
      const filler = document.createElement('div')
      filler.style.height = '5000px'
      el.appendChild(filler)
      el.scrollTop = 600
    })
    await expect(page.locator('[data-pagebar-root]')).toBeVisible()
    const b = (await main.boundingBox())!
    const x = b.x + b.width / 2
    await realPen(page, [
      { x, y: b.y + 700 },
      { x, y: b.y + 500 },
      { x, y: b.y + 300 },
    ])
    expect(await main.evaluate((el) => Math.round(el.scrollTop))).toBe(600)
    // The page's own bar: a Pencil drags its thumb.
    const th = await box(page, '[data-pagebar-thumb]')
    const at = { x: th.x + th.width / 2, y: th.y + th.height / 2 }
    await realPen(page, [at, { x: at.x, y: at.y + 120 }])
    await expect
      .poll(() => main.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(900)
  })
})
