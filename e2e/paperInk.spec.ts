// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { inkClientBox, line, savedInk, stroke, type Pt } from './inkHelpers.ts'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Phase Q ink rules (owner, 8 Nov): ink is a layer on top of the text,
 * linked to the line under it; a deleted line hands its ink to the next
 * line; a drawing over many lines belongs to its top line; the Lasso shows
 * the link and re-links moved ink; the Pencil on empty paper makes a box
 * with lines under the ink; ink dropped on bare paper gets a box; ink and
 * lines move as one piece; copying a line copies its ink.
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

const LINES = ['Line one', 'Line two', 'Line three', 'Line four', 'Line five']

/** A note with five lines, then the Pen. */
async function fiveLines(page: Page, keys: Record<string, unknown> = {}) {
  // The caret is at the end of the note's first line.
  await openNote(page, 'computer', keys)
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
const inkMidY = async (page: Page) => {
  const b = await inkClientBox(page)
  return b && (b.y0 + b.y1) / 2
}

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
    const box = document.querySelector('[data-paper-box="main"]')!
    // The bottom of the default box, 120 px above the foot of the screen.
    sc.scrollTop +=
      box.getBoundingClientRect().bottom -
      (sc.getBoundingClientRect().bottom - 120)
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

/**
 * Chooses the Lasso, then draws a loop round the box `at` gives (client px,
 * measured once the tool is chosen) and waits for the selection.
 */
async function lassoRound(
  page: Page,
  at: () => Promise<[number, number, number, number]>,
) {
  await tool(page, 'Lasso').click()
  await page.waitForTimeout(600)
  const [x0, y0, x1, y1] = await at()
  const loop: Pt[] = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0 + 2, y0 + 2],
  ]
  await stroke(
    page,
    loop.flatMap((p, i) => (i ? line(loop[i - 1], p, 8) : [p])),
  )
  await expect(page.locator('[data-ink-box]')).toBeVisible()
}

/** Drags the Lasso selection by its middle to (client) y. */
async function dragSelectionTo(page: Page, y: number) {
  const b = (await page.locator('[data-ink-box]').boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, y, { steps: 10 })
  await page.mouse.up()
}

test('rule 5: ink the Lasso drops on empty paper gets a new box with a line', async ({
  page,
}) => {
  await fiveLines(page)
  // Scroll so "Line five" is at the top of the visible page: the paper
  // under the default box is then on screen too.
  const sc = await page.evaluate(() => {
    const r = document
      .querySelector('[data-page-scroller]')!
      .getBoundingClientRect()
    return { top: r.top, bottom: r.bottom }
  })
  const five0 = await lineAt(page, 'Line five')
  await page.evaluate(
    (d) => {
      document.querySelector('[data-page-scroller]')!.scrollTop += d
    },
    five0.y - sc.top - 48, // below the options pill, which floats over the top of the page
  )
  await page.waitForTimeout(400)
  const five = await lineAt(page, 'Line five')
  const y = five.y + five.h / 2
  const x = five.x + 300
  await stroke(page, line([x, y], [x + 120, y]))
  await chunkOf(page)
  await lassoRound(page, async () => {
    const l = await lineAt(page, 'Line five')
    const ly = l.y + l.h / 2
    return [l.x + 280, ly - 14, l.x + 440, ly + 14]
  })
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const drop = main.y + main.height + 24
  expect(drop).toBeLessThan(sc.bottom - 4)
  // Onto the paper just below the default box: no line there.
  await dragSelectionTo(page, drop)
  const box = page.locator('[data-paper-box]:not([data-paper-box="main"])')
  await expect(box).toHaveCount(1)
  // The one stroke is now linked to a line of the new box.
  await expect
    .poll(
      async () => {
        const live = (await savedInk(page)).chunks.filter(
          (c) => c.strokes.length > 0,
        )
        if (live.length !== 1 || live[0].strokes.length !== 1) return false
        return box.evaluate(
          (el, id) => !!el.querySelector(`[data-id="${id}"]`),
          live[0].blockId,
        )
      },
      { timeout: 8000 },
    )
    .toBe(true)
})

test('rule 6: ink and text Lasso-moved together go as one piece; one Undo', async ({
  page,
}) => {
  await fiveLines(page, { 'ink.lasso': { text: true } })
  const two = await lineAt(page, 'Line two')
  const y = two.y + two.h / 2
  // Ink over the words of "Line two".
  await stroke(page, line([two.x + 4, y], [two.x + 60, y]))
  await chunkOf(page)
  // Inside the box (a loop that starts on bare paper picks boxes).
  await lassoRound(page, async () => {
    const l = await lineAt(page, 'Line two')
    return [l.x + 1, l.y - 4, l.x + 120, l.y + l.h + 4]
  })
  await expect(page.locator('[data-ink-menu="mixed"]')).toBeVisible()
  const four = await lineAt(page, 'Line four')
  await dragSelectionTo(page, four.y + four.h * 0.8)
  const order = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('.bn-block-content')]
        .map((e) => e.textContent)
        .filter((t) => t?.startsWith('Line ')),
    )
  await expect
    .poll(order)
    .toEqual(['Line one', 'Line three', 'Line four', 'Line two', 'Line five'])
  // The ink is still linked to "Line two" and sits on it in its new place.
  const near = async () => {
    const l = await lineAt(page, 'Line two')
    const mid = await inkMidY(page)
    return mid !== null && Math.abs(mid - (l.y + l.h / 2)) < l.h
  }
  await expect.poll(near).toBe(true)
  expect((await chunkOf(page))[0].blockId).toBe(two.id)
  // One Undo puts both back.
  await page.getByRole('button', { name: 'Undo', exact: true }).first().click()
  await expect
    .poll(order)
    .toEqual(['Line one', 'Line two', 'Line three', 'Line four', 'Line five'])
  await expect.poll(near).toBe(true)
  expect((await chunkOf(page))[0].blockId).toBe(two.id)
})

test('rule 9: copy and paste of a line also copies its linked ink', async ({
  page,
}) => {
  await fiveLines(page)
  const two = await lineAt(page, 'Line two')
  const y = two.y + two.h / 2
  await stroke(page, line([two.x + 260, y], [two.x + 420, y]))
  await chunkOf(page)
  // Text tool: select "Line two", copy; a new line after "Line five", paste.
  await tool(page, 'Text').click()
  await page.waitForTimeout(600)
  const editor = page.locator('.bn-editor').first()
  await editor.getByText('Line two', { exact: true }).click()
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home')
  // Real copy and paste events with a DataTransfer: WebKit on the CI machine
  // does not run Ctrl+C / Ctrl+V from the keyboard on its own, and both the
  // app's rule 9 hooks and the editor work from these events.
  await page.evaluate(() => {
    const dt = new DataTransfer()
    ;(window as unknown as { __clip: DataTransfer }).__clip = dt
    ;(document.activeElement ?? document.body).dispatchEvent(
      new ClipboardEvent('copy', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      }),
    )
    if (!dt.getData('text/plain'))
      dt.setData('text/plain', window.getSelection()?.toString() ?? '')
  })
  await editor.getByText('Line five', { exact: true }).click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.evaluate(() => {
    const dt = (window as unknown as { __clip: DataTransfer }).__clip
    ;(document.activeElement ?? document.body).dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      }),
    )
  })
  await expect(editor.getByText('Line two', { exact: true })).toHaveCount(2)
  // Two strokes now: the copy is linked to the pasted line.
  const chunks = await chunkOf(page, 2)
  const pasted = await page.evaluate(() =>
    [...document.querySelectorAll('.bn-block-content')]
      .filter((e) => e.textContent === 'Line two')
      .map((e) => e.closest('[data-id]')!.getAttribute('data-id')),
  )
  expect(pasted).toHaveLength(2)
  expect(chunks.map((c) => c.blockId).sort()).toEqual([...pasted].sort())
})

test('rule 6 across boxes: ink and a line dropped on bare paper go to a new box together', async ({
  page,
}) => {
  await fiveLines(page, { 'ink.lasso': { text: true } })
  const sc = await page.evaluate(() => {
    const r = document
      .querySelector('[data-page-scroller]')!
      .getBoundingClientRect()
    return { top: r.top, bottom: r.bottom }
  })
  const five0 = await lineAt(page, 'Line five')
  await page.evaluate(
    (d) => {
      document.querySelector('[data-page-scroller]')!.scrollTop += d
    },
    five0.y - sc.top - 48,
  )
  await page.waitForTimeout(400)
  const five = await lineAt(page, 'Line five')
  const y = five.y + five.h / 2
  await stroke(page, line([five.x + 4, y], [five.x + 60, y]))
  await chunkOf(page)
  await lassoRound(page, async () => {
    const l = await lineAt(page, 'Line five')
    return [l.x + 1, l.y - 4, l.x + 120, l.y + l.h + 4]
  })
  await expect(page.locator('[data-ink-menu="mixed"]')).toBeVisible()
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const drop = main.y + main.height + 24
  expect(drop).toBeLessThan(sc.bottom - 4)
  await dragSelectionTo(page, drop)
  const box = page.locator('[data-paper-box]:not([data-paper-box="main"])')
  await expect(box).toHaveCount(1)
  // The line is in the new box, and no longer in the first one.
  await expect(box).toContainText('Line five')
  await expect(page.locator('[data-paper-box="main"]')).not.toContainText(
    'Line five',
  )
  // The ink is linked to that very line.
  await expect
    .poll(
      async () => {
        const live = (await savedInk(page)).chunks.filter(
          (c) => c.strokes.length > 0,
        )
        if (live.length !== 1 || live[0].strokes.length !== 1) return false
        return box.evaluate(
          (el, id) =>
            el.querySelector(`[data-id="${id}"]`)?.textContent === 'Line five',
          live[0].blockId,
        )
      },
      { timeout: 8000 },
    )
    .toBe(true)
})

test('rule 6 across boxes: ink and a line dropped on another box go into it together', async ({
  page,
}) => {
  await fiveLines(page, { 'ink.lasso': { text: true } })
  // A second box on the paper below the first, with a line of its own.
  await tool(page, 'Text').click()
  await page.waitForTimeout(600)
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  await page.mouse.click(sheet.x + sheet.width * 0.5, main.y + main.height + 60)
  const other = page.locator('[data-paper-box]:not([data-paper-box="main"])')
  await expect(other).toHaveCount(1)
  await expect(other.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Other box')
  await expect(other).toContainText('Other box')
  await page.waitForTimeout(700) // autosave
  await tool(page, 'Pen').click()
  await page.waitForTimeout(600)
  // Ink over "Line two" of the first box.
  const two = await lineAt(page, 'Line two')
  const y = two.y + two.h / 2
  await stroke(page, line([two.x + 4, y], [two.x + 60, y]))
  await chunkOf(page)
  await lassoRound(page, async () => {
    const l = await lineAt(page, 'Line two')
    return [l.x + 1, l.y - 4, l.x + 120, l.y + l.h + 4]
  })
  await expect(page.locator('[data-ink-menu="mixed"]')).toBeVisible()
  const o = (await other.boundingBox())!
  const sel = (await page.locator('[data-ink-box]').boundingBox())!
  await page.mouse.move(sel.x + sel.width / 2, sel.y + sel.height / 2)
  await page.mouse.down()
  // The ink (not the whole-width box) must land in the other box.
  const dx = o.x + o.width / 2 - (two.x + 32)
  await page.mouse.move(sel.x + sel.width / 2 + dx, o.y + o.height * 0.8, {
    steps: 10,
  })
  await page.mouse.up()
  await expect(other).toContainText('Line two')
  await expect(other).toContainText('Other box')
  await expect(page.locator('[data-paper-box="main"]')).not.toContainText(
    'Line two',
  )
  // The ink follows: it is linked to "Line two", now in the other box.
  await expect
    .poll(
      async () => {
        const live = (await savedInk(page)).chunks.filter(
          (c) => c.strokes.length > 0,
        )
        if (live.length !== 1 || live[0].strokes.length !== 1) return false
        return other.evaluate(
          (el, id) =>
            el.querySelector(`[data-id="${id}"]`)?.textContent === 'Line two',
          live[0].blockId,
        )
      },
      { timeout: 8000 },
    )
    .toBe(true)
})
