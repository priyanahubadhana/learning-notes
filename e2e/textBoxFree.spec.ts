// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Text box v2 (owner, 11 Nov): one tap with the Text tool makes a SMALL box
 * exactly where tapped; it grows with the text up to a little before the right
 * margin and then wraps; a user-set width is kept; an empty box disappears.
 */
test.use({ viewport: { width: 1336, height: 1100 }, hasTouch: true })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const box = async (l: Locator) => (await l.boundingBox())!

async function start(page: Page, name: string) {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
}

async function tapBlank(page: Page, fx: number, dy: number) {
  const sheet = await box(page.locator('[data-paper-sheet="1"]'))
  const main = await box(page.locator('[data-paper-box="main"]'))
  const x = sheet.x + sheet.width * fx
  const y = main.y + main.height + dy
  await page.mouse.click(x, y)
  return { x, y, sheet }
}

test('one tap makes a small box exactly where tapped; empty ones disappear', async ({
  page,
}) => {
  await start(page, 'Small')
  const at = await tapBlank(page, 0.4, 70)
  const b = page.locator(EXTRA)
  await expect(b).toHaveCount(1)
  await expect(b.locator('.bn-editor')).toBeFocused()
  const r = await box(b)
  expect(Math.abs(r.x - at.x)).toBeLessThan(14)
  expect(r.width).toBeLessThan(60)
  expect(r.y).toBeLessThan(at.y + 4)
  expect(r.y + r.height).toBeGreaterThan(at.y - 4)
  // Left empty and tapped away: it disappears.
  const main = await box(page.locator('[data-paper-box="main"]'))
  await page.mouse.click(main.x + 40, main.y + 10)
  await expect(page.locator(EXTRA)).toHaveCount(0, { timeout: 8000 })
})

test('it grows with the text, stops before the right margin, then wraps', async ({
  page,
}) => {
  await start(page, 'Grow')
  const at = await tapBlank(page, 0.3, 70)
  const b = page.locator(EXTRA)
  await expect(b.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Hi')
  const w1 = (await box(b)).width
  await page.keyboard.type(' there my friend')
  const w2 = (await box(b)).width
  expect(w2).toBeGreaterThan(w1 + 20)
  await page.keyboard.type(
    ' and a lot more words follow so that this line has to wrap onto the next row of the paper',
  )
  await page.waitForTimeout(500)
  const r = await box(b)
  // A little before the right margin (15 mm of a 210 mm sheet).
  const margin = at.sheet.x + at.sheet.width * (1 - 15 / 210)
  expect(r.x + r.width).toBeLessThan(margin)
  expect(r.x + r.width).toBeGreaterThan(margin - 80)
  expect(r.height).toBeGreaterThan(40) // soft-wrapped: a second line
  const paragraphs = await b.locator('.bn-block-outer').count()
  expect(paragraphs).toBe(1) // still one paragraph
})

test('a width the user sets is kept', async ({ page }) => {
  await start(page, 'Width')
  await tapBlank(page, 0.2, 70)
  const b = page.locator(EXTRA)
  await expect(b.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Wide')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  // Select the box with a frame tap, then drag its east handle.
  await b.hover()
  const band = await box(b.locator('[data-box-band="bottom"]'))
  await page.mouse.click(band.x + band.width / 2, band.y + band.height / 2)
  const east = b.locator('[data-resize-handle="e"]')
  await expect(east).toBeVisible()
  const h = await box(east)
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(h.x + h.width / 2 + 150, h.y + h.height / 2, {
    steps: 6,
  })
  await page.mouse.up()
  await page.waitForTimeout(400)
  const wide = (await box(b)).width
  expect(wide).toBeGreaterThan(150)
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.locator(EXTRA)).toBeVisible()
  expect(Math.abs((await box(page.locator(EXTRA))).width - wide)).toBeLessThan(
    6,
  )
})

test('boxes never overlap: a second box taps below the first', async ({
  page,
}) => {
  await start(page, 'Slide')
  await tapBlank(page, 0.3, 70)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('First box with some text')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await tapBlank(page, 0.3, 160)
  await expect(page.locator(EXTRA)).toHaveCount(2)
  await expect(page.locator(EXTRA + ' .bn-editor').nth(1)).toBeFocused()
  await page.keyboard.type('Second')
  await page.waitForTimeout(600)
  const boxes = page.locator(EXTRA)
  await expect(boxes).toHaveCount(2)
  const a = await box(boxes.nth(0))
  const c = await box(boxes.nth(1))
  const overlap = !(
    a.x + a.width <= c.x ||
    c.x + c.width <= a.x ||
    a.y + a.height <= c.y ||
    c.y + c.height <= a.y
  )
  expect(overlap).toBe(false)
})

test('a double tap on blank paper does not make a second box', async ({
  page,
}) => {
  await start(page, 'Double')
  const sheet = await box(page.locator('[data-paper-sheet="1"]'))
  const main = await box(page.locator('[data-paper-box="main"]'))
  await page.mouse.dblclick(
    sheet.x + sheet.width * 0.5,
    main.y + main.height + 90,
  )
  await page.waitForTimeout(500)
  expect(await page.locator(EXTRA).count()).toBeLessThanOrEqual(1)
})

test('a tap inside a box puts the caret there at once (1a)', async ({
  page,
}) => {
  await start(page, 'Caret')
  await tapBlank(page, 0.3, 70)
  const b = page.locator(EXTRA)
  await expect(b.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('alpha beta gamma')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  const p = await page.evaluate(() => {
    const ed = document.querySelector(
      '[data-paper-box]:not([data-paper-box="main"]) .bn-editor',
    )!
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    const n = w.nextNode()!
    const r = document.createRange()
    r.setStart(n, 6)
    r.setEnd(n, 7)
    const q = r.getBoundingClientRect()
    return { x: q.left + 1, y: q.top + q.height / 2 }
  })
  await page.mouse.click(p.x, p.y)
  await expect(b.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('X')
  await expect(b.locator('.bn-editor')).toContainText('alpha Xbeta gamma')
})

test('with a box selected, a tap on empty paper only deselects (2a)', async ({
  page,
}) => {
  await start(page, 'Deselect')
  await tapBlank(page, 0.3, 70)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('Keep me')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  const b = page.locator(EXTRA)
  await b.hover()
  const band = await box(b.locator('[data-box-band="bottom"]'))
  await page.mouse.click(band.x + band.width / 2, band.y + band.height / 2)
  await expect(b).toHaveAttribute('data-picked', '')
  await expect(b.locator('[data-box-bar]')).toBeVisible()
  // One tap on empty paper: deselected, no new box.
  await tapBlank(page, 0.7, 260)
  await expect(b).not.toHaveAttribute('data-picked', '')
  await page.waitForTimeout(500)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  // The next tap makes a box.
  await page.waitForTimeout(800)
  await tapBlank(page, 0.7, 260)
  await expect(page.locator(EXTRA)).toHaveCount(2)
})

test('while typing only the text bar shows; the box bar waits until you stop (3b)', async ({
  page,
}) => {
  await start(page, 'OneBar')
  await tapBlank(page, 0.3, 70)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('Some words')
  await page.waitForTimeout(500)
  const b = page.locator(EXTRA)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await b.hover()
  const band = await box(b.locator('[data-box-band="bottom"]'))
  await page.mouse.click(band.x + band.width / 2, band.y + band.height / 2)
  await expect(b.locator('[data-box-bar]')).toBeVisible()
  await b.locator('.bn-editor').click()
  await expect(b).toHaveAttribute('data-typing', '')
  await expect(b.locator('[data-box-bar]')).toHaveCount(0)
})

test('smart guides: a dragged box shows a thin magenta line and snaps onto another box', async ({
  page,
}) => {
  await start(page, 'Guides')
  await tapBlank(page, 0.3, 70)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('First box')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.waitForTimeout(700)
  await tapBlank(page, 0.5, 170)
  await expect(page.locator(EXTRA)).toHaveCount(2)
  await expect(page.locator(EXTRA + ' .bn-editor').nth(1)).toBeFocused()
  await page.keyboard.type('Second box')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  const a = page.locator(EXTRA).nth(0)
  const b = page.locator(EXTRA).nth(1)
  await b.hover()
  const band = await box(b.locator('[data-box-band="bottom"]'))
  await page.mouse.click(band.x + band.width / 2, band.y + band.height / 2)
  await expect(b).toHaveAttribute('data-picked', '')
  const ra = await box(a)
  const rb = await box(b)
  const g = await box(b.locator('[data-box-grip]'))
  const gx = g.x + g.width / 2
  const gy = g.y + g.height / 2
  await page.mouse.move(gx, gy)
  await page.mouse.down()
  await page.mouse.move(gx + (ra.x - rb.x) + 2, gy + 20, { steps: 10 })
  await expect(
    page.locator('[data-smart-guides] [data-guide]').first(),
  ).toBeVisible()
  const line = await box(
    page.locator('[data-smart-guides] [data-guide]').first(),
  )
  expect(line.width).toBeLessThanOrEqual(2)
  await page.mouse.up()
  await page.waitForTimeout(500)
  await expect(page.locator('[data-smart-guides]')).toHaveCount(0)
  const after = await box(b)
  expect(Math.abs(after.x - ra.x)).toBeLessThan(2)
})
