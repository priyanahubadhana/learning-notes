// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import {
  createNotebook,
  rowAction,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Owner bug batch 10 Nov, builder B: items 6/9 (safe edge, empty boxes go),
 * 7 (page scroll bar), 10 (hint only on the focused empty line), 14 (caret
 * colour).
 */
const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'

async function start(page: import('@playwright/test').Page, name: string) {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
}

test('a tap near the sheet edge makes no box; a deliberate tap does; an empty box goes', async ({
  page,
}) => {
  await start(page, 'Edge')
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const y = main.y + main.height + 60
  await page.mouse.click(sheet.x + sheet.width - 6, y) // ~6 mm from the edge
  await page.mouse.click(sheet.x + 6, y)
  await page.waitForTimeout(300)
  await expect(page.locator(EXTRA)).toHaveCount(0)
  // A tap that moved (the end of a scroll) makes no box either.
  await page.mouse.move(sheet.x + sheet.width * 0.5, y)
  await page.mouse.down()
  await page.mouse.move(sheet.x + sheet.width * 0.5, y - 40, { steps: 4 })
  await page.mouse.up()
  await expect(page.locator(EXTRA)).toHaveCount(0)
  // A deliberate tap inside makes one, with the caret.
  await page.mouse.click(sheet.x + sheet.width * 0.5, y)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect(page.locator(EXTRA).locator('.bn-editor')).toBeFocused()
  // Left empty, it is removed when the caret goes back to the page text.
  await page.locator('[data-paper-box="main"] .bn-editor').click()
  await expect(page.locator(EXTRA)).toHaveCount(0)
})

test('the hint shows only on the focused empty line', async ({ page }) => {
  await start(page, 'Hint')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowUp')
  const after = (nth: number) =>
    page.evaluate((n) => {
      const empties = Array.from(
        document.querySelectorAll('.bn-block-content'),
      ).filter((el) => el.querySelector('.ProseMirror-trailingBreak'))
      return getComputedStyle(empties[n], '::after').content
    }, nth)
  // Caret is on the first empty line: it shows the hint, the other does not.
  await expect.poll(() => after(0)).toContain('Enter text')
  expect(await after(1)).toBe('none')
  // Focus leaves the editor: no hint anywhere.
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  expect(await after(0)).toBe('none')
})

test('the caret is the accent colour', async ({ page }) => {
  await start(page, 'Caret')
  const colour = await page.evaluate(
    () => getComputedStyle(document.querySelector('.bn-editor')!).caretColor,
  )
  const accent = await page.evaluate(() => {
    const el = document.createElement('i')
    el.style.color = 'var(--color-accent)'
    document.body.append(el)
    const c = getComputedStyle(el).color
    el.remove()
    return c
  })
  expect(colour).toBe(accent)
})

test('the page scroll bar: track, thumb, and one sheet per arrow tap', async ({
  page,
}) => {
  await start(page, 'Bar')
  await page.keyboard.press('End')
  for (let i = 0; i < 130; i++) await page.keyboard.press('Enter')
  await expect(page.locator('[data-paper-sheet="2"]')).toBeVisible()
  const scroller = page.locator('[data-page-scroller]')
  await scroller.evaluate((el) => (el.scrollTop = 0))
  const bar = page.locator('[data-pagebar-root]')
  await expect(bar).toBeVisible()
  await expect(page.locator('[data-pagebar-thumb]')).toBeVisible()
  // The bar sits beside the paper, not on it.
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const b = (await bar.boundingBox())!
  expect(b.x).toBeGreaterThanOrEqual(sheet.x + sheet.width - 1)
  // Down: the second sheet's top is the page top.
  await page.locator('[data-pagebar-arrow="down"]').click()
  await expect
    .poll(async () => {
      const s2 = (await page.locator('[data-paper-sheet="2"]').boundingBox())!
      const sc = (await scroller.boundingBox())!
      return Math.abs(s2.y - sc.y - 16) < 6
    })
    .toBe(true)
  await page.locator('[data-pagebar-arrow="up"]').click()
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollTop))
    .toBeLessThan(5)
  // Dragging the thumb scrolls the page.
  const th = (await page.locator('[data-pagebar-thumb]').boundingBox())!
  await page.mouse.move(th.x + th.width / 2, th.y + th.height / 2)
  await page.mouse.down()
  await page.mouse.move(th.x + th.width / 2, th.y + th.height / 2 + 80, {
    steps: 5,
  })
  await page.mouse.up()
  expect(await scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(100)
  // B3-13: a tap on the track jumps the thumb so its centre is under the tap.
  await scroller.evaluate((el) => (el.scrollTop = 0))
  const tr = (await page.locator('[data-pagebar-track]').boundingBox())!
  const tapY = tr.y + tr.height * 0.8
  await page.mouse.click(tr.x + tr.width / 2, tapY)
  await expect
    .poll(async () => {
      const t2 = (await page.locator('[data-pagebar-thumb]').boundingBox())!
      return Math.abs(t2.y + t2.height / 2 - tapY)
    })
    .toBeLessThan(6)
})

test('item 5: rows of a long list block never sit in the gap between sheets', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await rowAction(page, 'Biology', 'Add page')
  await page.getByRole('menuitem', { name: 'From template…' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Lesson\s*Detailed/ })
    .click()
  const list = page.getByRole('region', { name: /^Cards on this page/ })
  await expect(list).toBeVisible()
  // Give the list 90 rows by hand (the block's React content is not ours).
  await list.evaluate((section) => {
    const ul = document.createElement('ul')
    for (let i = 0; i < 90; i++) {
      const li = document.createElement('li')
      li.setAttribute('data-page-row', '')
      li.textContent = 'Row ' + i
      li.style.cssText = 'height:40px'
      ul.append(li)
    }
    section.append(ul)
  })
  await page.waitForTimeout(1200)
  const bad = await page.evaluate(() => {
    const sheets = Array.from(
      document.querySelectorAll('[data-paper-sheet]'),
    ).map((s) => s.getBoundingClientRect())
    const rows = Array.from(document.querySelectorAll('li[data-page-row]'))
    let n = 0
    for (const li of rows) {
      const r = li.getBoundingClientRect()
      for (let i = 0; i + 1 < sheets.length; i++) {
        // inside the gap, or within the sheet's last 10 mm
        const limit = sheets[i].bottom - (15 * sheets[i].width) / 210 + 1
        if (r.bottom > limit && r.top < sheets[i + 1].top) n++
      }
    }
    return { n, sheets: sheets.length, rows: rows.length }
  })
  expect(bad.sheets).toBeGreaterThan(1)
  expect(bad.n).toBe(0)
})
