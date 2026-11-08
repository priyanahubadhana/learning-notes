// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { line, savedInk, stroke, type Pt } from './inkHelpers.ts'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Phase Q ink rules (owner, 8 Nov): ink is a layer on top of the text,
 * linked to the line under it; a deleted line hands its ink to the next
 * line; a drawing over many lines belongs to its top line; the Lasso shows
 * the link and re-links moved ink; the Pencil on empty paper makes a box
 * with lines under the ink. Rules 6 and 9 (Lasso ink + text as one piece,
 * copy a line with its ink) are not built yet (plans/paper-page-plan.md).
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

const LINES = ['Line one', 'Line two', 'Line three', 'Line four', 'Line five']

/** A note with five lines, then the Pen. */
async function fiveLines(page: Page) {
  // The caret is at the end of the note's first line.
  await openNote(page, 'computer')
  for (const l of LINES) {
    await page.keyboard.press('Enter')
    await page.keyboard.type(l)
  }
  await expect(page.locator('.bn-editor').first()).toContainText('Line five')
  await page.waitForTimeout(700) // autosave
  await tool(page, 'Pen').click()
  await page.evaluate(() => {
    document.querySelector('[data-page-scroller]')!.scrollTop = 0
  })
  await page.waitForTimeout(600) // the page hold after a tool is chosen
}

/** The block id and box (client px) of the line with this text. */
async function lineAt(page: Page, text: string) {
  return page.evaluate((t) => {
    const content = [
      ...document.querySelectorAll<HTMLElement>('.bn-block-content'),
    ].find((e) => e.textContent === t)!
    const id = content.closest('[data-id]')!.getAttribute('data-id')!
    const r = content.getBoundingClientRect()
    return { id, x: r.x, y: r.y, w: r.width, h: r.height }
  }, text)
}

/** The middle of the painted ink, in client px (null = nothing painted). */
const inkMidY = (page: Page) =>
  page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>(
      '[data-ink-canvas="ink"]',
    )!
    const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let y0 = -1
    let y1 = -1
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (data[(y * c.width + x) * 4 + 3] > 8) {
          if (y0 < 0) y0 = y
          y1 = y
          break
        }
      }
    }
    if (y0 < 0) return null
    const dpr = c.width / c.clientWidth
    return c.getBoundingClientRect().top + (y0 + y1) / 2 / dpr
  })

const chunkOf = async (page: Page, strokeCount = 1) => {
  await expect
    .poll(async () => (await savedInk(page)).strokes.length, { timeout: 8000 })
    .toBe(strokeCount)
  return (await savedInk(page)).chunks.filter((c) => c.strokes.length > 0)
}

test('rules 1-2: the Pen changes only ink; a stroke is linked to the line under it', async ({
  page,
}) => {
  await fiveLines(page)
  const two = await lineAt(page, 'Line two')
  const y = two.y + two.h / 2
  await stroke(page, line([two.x + 20, y], [two.x + 200, y]))
  const [chunk] = await chunkOf(page)
  expect(chunk.blockId).toBe(two.id)
  for (const l of LINES) {
    await expect(page.locator('.bn-editor').first()).toContainText(l)
  }
})

test('rule 7: deleting a line hands its ink to the next line, which it then follows', async ({
  page,
}) => {
  await fiveLines(page)
  const two = await lineAt(page, 'Line two')
  const y = two.y + two.h / 2
  await stroke(page, line([two.x + 260, y], [two.x + 420, y]))
  await chunkOf(page)
  // Delete "Line two" (Text tool, select it, Backspace).
  await tool(page, 'Text').click()
  await page.waitForTimeout(600)
  const editor = page.locator('.bn-editor').first()
  await editor.getByText('Line two', { exact: true }).click()
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home')
  await page.keyboard.press('Backspace')
  await page.keyboard.press('Backspace')
  await expect(editor).not.toContainText('Line two')
  // The ink is still there, now on "Line three" (moved up into its place).
  await expect.poll(() => inkMidY(page)).not.toBeNull()
  const near = async (text: string) => {
    const l = await lineAt(page, text)
    return Math.abs((await inkMidY(page))! - (l.y + l.h / 2)) < l.h
  }
  await expect.poll(() => near('Line three')).toBe(true)
  const kept = (await inkMidY(page))!
  // A new line above pushes "Line three" down, and the ink goes with it.
  await editor.getByText('Line one', { exact: true }).click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('New line')
  await expect
    .poll(async () => (await inkMidY(page))!)
    .toBeGreaterThan(kept + two.h / 2)
})

test('rule 10: a drawing over several lines belongs to its top line', async ({
  page,
}) => {
  await fiveLines(page)
  const one = await lineAt(page, 'Line one')
  const four = await lineAt(page, 'Line four')
  // Starts on line four and goes up over line one.
  const x = one.x + 300
  const pts: Pt[] = line([x, four.y + four.h / 2], [x + 30, one.y + 2], 30)
  await stroke(page, pts)
  const [chunk] = await chunkOf(page)
  expect(chunk.blockId).toBe(one.id)
})

test('rules 5 and 8: the Lasso shows the link and re-links moved ink to the line under it', async ({
  page,
}) => {
  await fiveLines(page)
  const one = await lineAt(page, 'Line one')
  const four = await lineAt(page, 'Line four')
  const y = one.y + one.h / 2
  await stroke(page, line([one.x + 300, y], [one.x + 420, y]))
  const [first] = await chunkOf(page)
  expect(first.blockId).toBe(one.id)
  await tool(page, 'Lasso').click()
  await page.waitForTimeout(600)
  const loop: Pt[] = [
    [one.x + 280, y - 12],
    [one.x + 440, y - 12],
    [one.x + 440, y + 12],
    [one.x + 280, y + 12],
    [one.x + 282, y - 10],
  ]
  await stroke(
    page,
    loop.flatMap((p, i) => (i ? line(loop[i - 1], p, 8) : [p])),
  )
  await expect(page.locator('[data-ink-box]')).toBeVisible()
  // Rule 8: a faint line to the linked text line.
  await expect(page.locator(`[data-ink-link="${one.id}"]`)).toBeAttached()
  // Rule 5: drag it down onto line four.
  const b = (await page.locator('[data-ink-box]').boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, four.y + four.h / 2, { steps: 8 })
  await page.mouse.up()
  await expect
    .poll(async () =>
      (await savedInk(page)).chunks
        .filter((c) => c.strokes.length > 0)
        .map((c) => c.blockId),
    )
    .toEqual([four.id])
})

test('rule 4: the Pencil on empty paper makes a box with lines under the ink', async ({
  page,
}) => {
  await fiveLines(page)
  // Just below the default box (a screen tall while the Pen is out), on
  // the paper's bottom margin.
  await page.evaluate(() => {
    const sc = document.querySelector('[data-page-scroller]')!
    sc.scrollTop = sc.scrollHeight
  })
  await page.waitForTimeout(300)
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const y = main.y + main.height + 12
  const x = sheet.x + sheet.width * 0.3
  await stroke(page, line([x, y], [x + 160, y + 10]))
  const box = page.locator('[data-paper-box]:not([data-paper-box="main"])')
  await expect(box).toHaveCount(1)
  const [chunk] = await chunkOf(page)
  const inBox = await box.evaluate(
    (el, id) => !!el.querySelector(`[data-id="${id}"]`),
    chunk.blockId,
  )
  expect(inBox).toBe(true)
})
