// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote, tool } from './mainBarHelpers.ts'
import { editableTargetsInRect } from './scribbleProbe.ts'

/**
 * A1: no editable text lies under (or within 8 px of) any button, pill, card
 * or menu of the app, whatever tool is chosen and wherever the page is
 * scrolled. Otherwise iPadOS Scribble could write into the text from a
 * Pencil tap that lands on the control.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

async function longPage(page: Page) {
  await openNote(page, 'pencil')
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Enter')
    await page.keyboard.type(`Line number ${i} of a long page of notes`)
  }
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.evaluate(() => {
    const s = document.querySelector('[data-page-scroller]')!
    s.scrollTop = s.scrollHeight / 2
  })
}

/** Rects of every visible control inside the app's chrome. */
const chromeRects = (page: Page) =>
  page.evaluate(() => {
    const out: {
      name: string
      x: number
      y: number
      width: number
      height: number
    }[] = []
    const sel =
      '[data-chrome] button, [data-pill-root] button, [data-bar] button, [role="menu"] button'
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      if (getComputedStyle(el).visibility === 'hidden') continue
      if (r.bottom < 0 || r.top > innerHeight) continue
      // The page's own content is not chrome.
      if (el.closest('[data-page-scroller]')) continue
      out.push({
        name: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '',
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
      })
    }
    return out
  })

for (const name of ['Text', 'Lasso', 'Pen'] as const) {
  test(`${name}: no editable text under or beside any control`, async ({
    page,
  }) => {
    await longPage(page)
    await tool(page, name).click()
    await page.waitForTimeout(300)
    const rects = await chromeRects(page)
    expect(rects.length).toBeGreaterThan(5)
    for (const r of rects) {
      const found = await editableTargetsInRect(page, r)
      expect(found, `under "${r.name}"`).toEqual([])
    }
  })
}

test('Text: the options pill is clear of editable text too', async ({
  page,
}) => {
  await longPage(page)
  await tool(page, 'Text').click()
  await expect(page.locator('[data-options-pill]')).toBeVisible()
  const pillBox = await page.locator('[data-options-pill]').boundingBox()
  expect(await editableTargetsInRect(page, pillBox!)).toEqual([])
})
