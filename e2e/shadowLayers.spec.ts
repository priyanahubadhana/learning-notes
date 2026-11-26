// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, typeInEditor } from './helpers.ts'

/**
 * G1 shadow: the soft shadows of the paper sheets and of the page area are
 * painted on their own still layers (the iPad engine without a GPU no longer
 * repaints them on each change). These tests prove the layers sit exactly
 * where the old shadows were, never take a touch, and that the shadow is not
 * drawn twice.
 */

const SHEET = '[data-paper-sheet]'
const SHADOW = '[data-paper-shadow]'
const MAIN = 'main[data-page-scroller]'
const PAGE_SHADOW = '[data-page-shadow]'

/**
 * Whether a computed box-shadow draws anything. Tailwind's `shadow-none`
 * computes to a list of fully transparent layers, so 'none' alone is not the
 * test: a shadow is drawn when some layer's colour is not see-through.
 */
const draws = (bs: string) =>
  bs !== 'none' &&
  (bs.match(/(rgba?|oklab|oklch|lab|lch|color)\([^)]*\)/g) ?? []).some((c) => {
    const inner = c.slice(c.indexOf('(') + 1, -1)
    const alpha = inner.includes('/')
      ? inner.split('/')[1]
      : inner.split(',').length === 4
        ? inner.split(',')[3]
        : '1'
    return Number(alpha.trim()) > 0
  })

type Rect = { x: number; y: number; w: number; h: number }

/** Client rects of every sheet and every sheet shadow box, in order. */
const sheetRects = (page: Page) =>
  page.evaluate(
    ([s, sh]) => {
      const rect = (el: Element) => {
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height }
      }
      const byNum = (sel: string, attr: string) =>
        Array.from(document.querySelectorAll(sel)).sort(
          (a, b) => Number(a.getAttribute(attr)) - Number(b.getAttribute(attr)),
        )
      return {
        sheets: byNum(s, 'data-paper-sheet').map(rect),
        shadows: byNum(sh, 'data-paper-shadow').map(rect),
      }
    },
    [SHEET, SHADOW],
  )

/** Largest difference between two rects, in px. */
const gap = (a: Rect, b: Rect) =>
  Math.max(
    Math.abs(a.x - b.x),
    Math.abs(a.y - b.y),
    Math.abs(a.w - b.w),
    Math.abs(a.h - b.h),
  )

/**
 * Every sheet has a shadow box with its rect (0.5 px); returns the worst gap,
 * or Infinity when the counts differ (so a poll keeps waiting on state).
 */
async function worstSheetGap(page: Page) {
  const { sheets, shadows } = await sheetRects(page)
  if (sheets.length === 0 || sheets.length !== shadows.length) return Infinity
  return Math.max(...sheets.map((s, i) => gap(s, shadows[i])))
}

async function worstPageGap(page: Page) {
  return page.evaluate(
    ([m, p]) => {
      const a = document.querySelector(m)?.getBoundingClientRect()
      const b = document.querySelector(p)?.getBoundingClientRect()
      if (!a || !b || a.width === 0) return Infinity
      return Math.max(
        Math.abs(a.x - b.x),
        Math.abs(a.y - b.y),
        Math.abs(a.width - b.width),
        Math.abs(a.height - b.height),
      )
    },
    [MAIN, PAGE_SHADOW],
  )
}

/** Presses Enter at the end of the text until `n` sheets show. */
async function typeUntilSheets(page: Page, n: number) {
  const sheets = page.locator(SHEET)
  for (let i = 0; i < 400 && (await sheets.count()) < n; i++) {
    for (let j = 0; j < 10; j++) await page.keyboard.press('Enter')
  }
  await expect(page.locator(`[data-paper-sheet="${n}"]`)).toBeAttached()
}

async function startPaper(page: Page, name: string) {
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Shadow text')
  await expect(page.locator('[data-paper-sheet="1"]')).toBeVisible()
  await page.locator('.bn-editor').getByText('Shadow text').click()
  await page.keyboard.press('End')
}

/** The top bar button that hides or shows the sidebar (not the phone one). */
const sidebarToggle = (page: Page) =>
  page.locator('button[aria-controls="sidebar"][aria-expanded]:visible').first()

test.describe('wide screen', () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 1336) < 640,
    'the sheets only show on a wide screen',
  )

  test('each sheet shadow box has its sheet rect: 3+ sheets, zoomed, and after a sheet is added while typing', async ({
    page,
  }) => {
    await startPaper(page, 'Shadow sheets')
    await typeUntilSheets(page, 3)
    await expect.poll(() => worstSheetGap(page)).toBeLessThanOrEqual(0.5)
    expect(await page.locator(SHADOW).count()).toBe(
      await page.locator(SHEET).count(),
    )

    // A zoom other than 1, with the app's own control.
    const fit = page.getByRole('button', { name: 'Fit width' })
    await page.getByRole('button', { name: 'Zoom in' }).click()
    await expect(fit).toHaveText('125 %')
    await expect.poll(() => worstSheetGap(page)).toBeLessThanOrEqual(0.5)
    const zoomed = await sheetRects(page)
    expect(zoomed.sheets.length).toBeGreaterThanOrEqual(3)

    // Still zoomed: type on until one more sheet appears.
    const before = zoomed.sheets.length
    await page.locator('.bn-editor').getByText('Shadow text').click()
    await page.keyboard.press('Control+End')
    await typeUntilSheets(page, before + 1)
    await expect.poll(() => worstSheetGap(page)).toBeLessThanOrEqual(0.5)
    expect(await page.locator(SHADOW).count()).toBe(before + 1)

    // Back to 100 %: the boxes follow.
    await fit.click()
    await expect(fit).toHaveText('100 %')
    await expect.poll(() => worstSheetGap(page)).toBeLessThanOrEqual(0.5)
  })

  test('the page shadow has the rect of the page area, also after the sidebar and a resize', async ({
    page,
  }) => {
    await startPaper(page, 'Shadow page')
    await expect.poll(() => worstPageGap(page)).toBeLessThanOrEqual(0.5)
    const first = (await page.locator(MAIN).boundingBox())!

    // Sidebar hidden: the page area grows, the shadow with it.
    const toggle = sidebarToggle(page)
    const was = await toggle.getAttribute('aria-expanded')
    await toggle.click()
    await expect(toggle).not.toHaveAttribute('aria-expanded', was!)
    await expect
      .poll(async () => (await page.locator(MAIN).boundingBox())!.width)
      .not.toBe(first.width)
    await expect.poll(() => worstPageGap(page)).toBeLessThanOrEqual(0.5)

    // And shown again.
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', was!)
    await expect
      .poll(async () => (await page.locator(MAIN).boundingBox())!.width)
      .toBeCloseTo(first.width, 0)
    await expect.poll(() => worstPageGap(page)).toBeLessThanOrEqual(0.5)

    // A smaller window (still wide, not a phone).
    const size = page.viewportSize()!
    await page.setViewportSize({
      width: size.width - 200,
      height: size.height - 100,
    })
    await expect
      .poll(async () => (await page.locator(MAIN).boundingBox())!.height)
      .toBeLessThan(first.height - 50)
    await expect.poll(() => worstPageGap(page)).toBeLessThanOrEqual(0.5)
  })

  test('both layers take no touch, carry the shadow, and the sheet and main do not draw it again', async ({
    page,
  }) => {
    await startPaper(page, 'Shadow hits')
    await typeUntilSheets(page, 2)
    await expect.poll(() => worstSheetGap(page)).toBeLessThanOrEqual(0.5)

    const styles = await page.evaluate(
      ([sh, p, s, m]) => {
        const cs = (el: Element | null) => {
          const c = getComputedStyle(el!)
          return { pe: c.pointerEvents, bs: c.boxShadow }
        }
        return {
          shadows: Array.from(document.querySelectorAll(sh)).map(cs),
          holder: cs(document.querySelector('[data-paper-shadows]')),
          pageShadow: cs(document.querySelector(p)),
          sheets: Array.from(document.querySelectorAll(s)).map(cs),
          main: cs(document.querySelector(m)),
        }
      },
      [SHADOW, PAGE_SHADOW, SHEET, MAIN],
    )
    // The layers: no touch, and the shadow is on them.
    expect(styles.holder.pe).toBe('none')
    expect(styles.shadows.length).toBeGreaterThanOrEqual(2)
    for (const s of styles.shadows) {
      expect(s.pe).toBe('none')
      expect(draws(s.bs), s.bs).toBe(true)
    }
    expect(styles.pageShadow.pe).toBe('none')
    expect(draws(styles.pageShadow.bs), styles.pageShadow.bs).toBe(true)
    // Not drawn twice: the sheet and main carry no shadow of their own.
    for (const s of styles.sheets) expect(draws(s.bs), s.bs).toBe(false)
    expect(draws(styles.main.bs), styles.main.bs).toBe(false)

    // A hit 1 px inside each edge of a sheet lands on that sheet, and a hit
    // inside the page area lands inside main: never on a shadow layer.
    const sheet2 = page.locator('[data-paper-sheet="2"]')
    await sheet2.scrollIntoViewIfNeeded()
    const hits = await sheet2.evaluate((sheet) => {
      const r = sheet.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      const midY = Math.min(Math.max(r.top + r.height / 2, 1), vh - 2)
      const midX = r.left + r.width / 2
      const points: [string, number, number][] = [
        ['left', r.left + 1, midY],
        ['right', r.right - 1, midY],
      ]
      if (r.top >= 0 && r.top < vh) points.push(['top', midX, r.top + 1])
      if (r.bottom > 0 && r.bottom <= vh)
        points.push(['bottom', midX, r.bottom - 1])
      const main = document.querySelector('main[data-page-scroller]')!
      const m = main.getBoundingClientRect()
      points.push(['page', m.left + 20, m.top + m.height / 2])
      // Near the corner, clear of the sidebar's resize handle on main's edge.
      points.push(['page corner', m.left + 16, m.top + 16])
      return points.map(([name, x, y]) => {
        const el = document.elementFromPoint(Math.min(x, vw - 1), y)
        return {
          name,
          inViewport: x >= 0 && x < vw,
          onSheet: !!el && el.closest('[data-paper-sheet]') === sheet,
          inMain: !!el && main.contains(el),
          onShadow:
            !!el &&
            !!el.closest(
              '[data-paper-shadows], [data-paper-shadow], [data-page-shadow]',
            ),
          what: el ? el.outerHTML.slice(0, 80) : 'nothing',
        }
      })
    })
    for (const h of hits) {
      expect(h.onShadow, `${h.name}: ${h.what}`).toBe(false)
      if (h.name.startsWith('page')) expect(h.inMain, h.what).toBe(true)
      else if (h.inViewport)
        expect(h.onSheet, `${h.name}: ${h.what}`).toBe(true)
    }
    expect(
      hits.filter((h) => !h.name.startsWith('page')).length,
    ).toBeGreaterThanOrEqual(2)
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('a phone shows no sheets, so no sheet shadow layer; the page area has no shadow', async ({
    page,
  }) => {
    await page.goto('/')
    await createNotebook(page, 'Paper', 'Shadow phone')
    await typeInEditor(page, 'Phone text')
    // Fit width: the boxes stack in a column, no sheets drawn.
    await expect(page.locator('[data-paper]')).toBeVisible()
    await expect(page.locator('[data-paper-box="main"]')).toContainText(
      'Phone text',
    )
    await expect(page.locator(SHEET)).toHaveCount(0)
    await expect(page.locator('[data-paper-shadows]')).toHaveCount(0)
    await expect(page.locator(SHADOW)).toHaveCount(0)
    // The page layer is there but, as before on a phone, draws no shadow.
    const bs = await page.evaluate(
      ([p, m]) => [
        getComputedStyle(document.querySelector(p)!).boxShadow,
        getComputedStyle(document.querySelector(m)!).boxShadow,
      ],
      [PAGE_SHADOW, MAIN],
    )
    expect(draws(bs[0]), bs[0]).toBe(false)
    expect(draws(bs[1]), bs[1]).toBe(false)
  })
})
