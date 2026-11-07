// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { savedInk } from './inkHelpers.ts'
import { openNote, option, tool } from './mainBarHelpers.ts'

/**
 * The Write pad (Scribble MVP): a docked pad with one big textarea. Insert
 * puts the text at the cursor, Replace swaps the selected words; the pad
 * stays open. Runs in chromium and in the iPad project (typing stands in for
 * Scribble, which only a real iPad can test).
 */

test.use({ viewport: { width: 1024, height: 768 } })

const pad = (page: Page) => page.locator('[data-write-pad]')
const input = (page: Page) => page.locator('[data-write-pad-input]')

/** Switches to AI; the first time an explainer asks first (R7-23). */
async function switchToAi(page: Page) {
  await pad(page).getByRole('button', { name: 'AI', exact: true }).click()
  const ok = page.getByTestId('write-pad-explain-ok')
  if (await ok.isVisible()) await ok.click()
}

async function openPad(page: Page) {
  await tool(page, 'Insert').click()
  await option(page, 'Write pad').click()
  await expect(pad(page)).toBeVisible()
}

/** Selects the first `word` in the page text with the page focused. */
async function selectWord(page: Page, word: string) {
  await page.locator('.bn-editor').focus()
  await page.evaluate((w) => {
    const walker = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const i = n.textContent!.indexOf(w)
      if (i >= 0) {
        getSelection()!.setBaseAndExtent(n, i, n, i + w.length)
        return
      }
    }
  }, word)
}

test('type in the pad, Insert at the cursor, then Replace the selection', async ({
  page,
}, testInfo) => {
  await openNote(page, 'touch')
  await openPad(page)
  if (testInfo.project.name === 'chromium') {
    await expect(pad(page)).toContainText(
      'On iPad, write here with Apple Pencil (Scribble)',
    )
  }

  // Preview shows what will be inserted; Insert is off while it is empty.
  await expect(page.getByTestId('write-pad-insert')).toBeDisabled()
  await input(page).fill(' really')
  await expect(page.locator('[data-write-pad-preview]')).toContainText('really')
  await page.getByTestId('write-pad-insert').click()

  const editor = page.locator('.bn-editor')
  await expect(editor).toContainText('The nucleus holds the DNA really')
  const hand = editor.locator('[data-hand]')
  await expect(hand).toHaveText(' really')
  await expect(hand).toHaveAttribute('data-hand', /^caveat\.normal\.125$/)
  // The pad stays open and is empty, ready for more.
  await expect(pad(page)).toBeVisible()
  await expect(input(page)).toHaveValue('')

  // Select "DNA" on the page, write a replacement in the pad.
  await selectWord(page, 'DNA')
  await input(page).focus()
  await input(page).fill('RNA')
  await page.getByTestId('write-pad-replace').click()
  await expect(editor).toContainText('The nucleus holds the RNA really')
  await expect(editor).not.toContainText('DNA')
})

test('the pad resizes from its top edge and has a writing zoom', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  const before = (await pad(page).boundingBox())!.height
  await page.locator('[data-write-pad-grip]').focus()
  await page.keyboard.press('ArrowUp')
  await expect
    .poll(async () => (await pad(page).boundingBox())!.height)
    .toBeGreaterThan(before)

  const size = () =>
    input(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  const small = await size()
  await page.getByRole('button', { name: 'Bigger writing' }).click()
  expect(await size()).toBeGreaterThan(small)

  await page.getByTestId('write-pad-close').click()
  await expect(pad(page)).toHaveCount(0)
})

test('the keys edit the text in the pad', async ({ page }) => {
  await openNote(page, 'touch')
  await openPad(page)
  await input(page).fill('ab')
  await pad(page).getByRole('button', { name: 'Space', exact: true }).click()
  await pad(page).getByRole('button', { name: 'New line' }).click()
  await expect(input(page)).toHaveValue('ab \n')
  await pad(page).getByRole('button', { name: 'Delete' }).click()
  await expect(input(page)).toHaveValue('ab ')
})

test('Enter presses are real newlines, shown as marks, and the keys edit them (R6-9)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  const marks = pad(page).locator('[data-write-pad-break]')
  await input(page).fill('one')
  await pad(page).getByRole('button', { name: 'New line' }).click()
  await page.keyboard.type('two')
  await pad(page).getByRole('button', { name: 'New line' }).click()
  await expect(input(page)).toHaveValue('one\ntwo\n')
  await expect(marks).toHaveCount(2)
  await expect(page.locator('[data-write-pad-preview]')).toContainText('↵')
  // Delete takes the last Enter away (caret is at the end).
  await pad(page).getByRole('button', { name: 'Delete' }).click()
  await expect(input(page)).toHaveValue('one\ntwo')
  await expect(marks).toHaveCount(1)
  // An Enter typed in the box is a newline too.
  await input(page).press('Enter')
  await expect(input(page)).toHaveValue('one\ntwo\n')
  await expect(marks).toHaveCount(2)
})

test('the main bar Undo and Redo work inside the pad, then on the page (R6-7)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  await input(page).fill('ab')
  await pad(page).getByRole('button', { name: 'New line' }).click()
  await expect(input(page)).toHaveValue('ab\n')
  await tool(page, 'Undo').click()
  await expect(input(page)).toHaveValue('ab')
  await tool(page, 'Undo').click()
  await expect(input(page)).toHaveValue('')
  await tool(page, 'Redo').click()
  await expect(input(page)).toHaveValue('ab')
  // Undo of Insert takes the text off the page and back into the pad
  // (R7-20); Redo inserts it again.
  await page.getByTestId('write-pad-insert').click()
  await expect(page.locator('.bn-editor')).toContainText('ab')
  await tool(page, 'Undo').click()
  await expect(page.locator('.bn-editor [data-hand]')).toHaveCount(0)
  await expect(input(page)).toHaveValue('ab')
  await tool(page, 'Redo').click()
  await expect(page.locator('.bn-editor [data-hand]')).toHaveText('ab')
  await expect(input(page)).toHaveValue('')
})

test('the action keys sit at the top of the pad, above the writing box (R6-5)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  const box = (await input(page).boundingBox())!
  const insert = (await page.getByTestId('write-pad-insert').boundingBox())!
  const keys = (await page.locator('[data-write-pad-actions]').boundingBox())!
  expect(insert.y + insert.height).toBeLessThanOrEqual(box.y)
  expect(keys.y + keys.height).toBeLessThanOrEqual(box.y)
})

test('switching Read with keeps the text, both ways (R6-15)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  await input(page).fill('keep me')
  await switchToAi(page)
  await expect(pad(page).locator('[data-write-pad-canvas]')).toBeVisible()
  await expect(pad(page).locator('[data-write-pad-kept]')).toHaveText('keep me')
  await expect(page.locator('[data-write-pad-preview]')).toContainText(
    'keep me',
  )
  await pad(page).getByRole('button', { name: 'Scribble', exact: true }).click()
  await expect(input(page)).toHaveValue('keep me')
})

test('unread canvas writing asks before it is thrown away (R6-15)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  await page.getByTestId('write-pad-live').uncheck()
  await input(page).fill('typed')
  await switchToAi(page)
  const canvas = pad(page).locator('[data-write-pad-canvas]')
  const b = (await canvas.boundingBox())!
  await canvas.evaluate((el, r) => {
    const fire = (type: string, x: number, y: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 3,
          pointerType: 'pen',
          clientX: r.x + x,
          clientY: r.y + y,
          pressure: 0.5,
        }),
      )
    fire('pointerdown', 20, 20)
    for (let i = 1; i <= 6; i++) fire('pointermove', 20 + i * 8, 20 + i * 3)
    fire('pointerup', 70, 40)
  }, b)
  await pad(page).getByRole('button', { name: 'Scribble', exact: true }).click()
  await expect(pad(page).locator('[data-write-pad-ask]')).toBeVisible()
  await expect(canvas).toBeVisible()
  // Keep writing: stays in AI mode, text untouched.
  await pad(page).getByRole('button', { name: 'Keep writing' }).click()
  await expect(pad(page).locator('[data-write-pad-ask]')).toHaveCount(0)
  await expect(canvas).toBeVisible()
  // Closing and reopening keeps the unread writing too.
  await page.getByTestId('write-pad-close').click()
  await openPad(page)
  await pad(page).getByRole('button', { name: 'Scribble', exact: true }).click()
  await expect(pad(page).locator('[data-write-pad-ask]')).toBeVisible()
  await page.getByTestId('write-pad-discard').click()
  await expect(input(page)).toHaveValue('typed')
})

test('close, reload, resize, zoom and font never lose the text (R6-15)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  await page.getByTestId('write-pad-live').uncheck()
  await input(page).fill('still here')
  // Resize, zoom and a font change keep it.
  await page.locator('[data-write-pad-grip]').focus()
  await page.keyboard.press('ArrowUp')
  await page.getByRole('button', { name: 'Bigger writing' }).click()
  await pad(page)
    .getByRole('button', { name: 'Normal', exact: true })
    .first()
    .click()
  await expect(input(page)).toHaveValue('still here')
  // Close and open again: the draft is back.
  await page.getByTestId('write-pad-close').click()
  await expect(pad(page)).toHaveCount(0)
  await openPad(page)
  await expect(input(page)).toHaveValue('still here')
  // The draft is in localStorage under this page (reload: see draft.test.ts).
  expect(
    await page.evaluate(() =>
      Object.entries(localStorage).filter(([k]) =>
        k.startsWith('learning-notes:writePad.draft.'),
      ),
    ),
  ).toHaveLength(1)
  // Insert clears the draft.
  await page.getByTestId('write-pad-insert').click()
  await page.getByTestId('write-pad-close').click()
  await openPad(page)
  await expect(input(page)).toHaveValue('')
})

test('live writing: the text shows as a ghost at the cursor, not in the page, then Insert is one Undo (R6-16)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  const ghost = page.locator('.bn-editor [data-write-pad-ghost]')
  await expect(ghost).toHaveCount(0)
  await input(page).fill(' live')
  await expect(ghost).toHaveText(' live')
  await expect(ghost).toHaveCSS('text-decoration-style', 'dashed')
  // Not a document change: no hand text in the page, Undo is still the pad's.
  await expect(page.locator('.bn-editor [data-hand]')).toHaveCount(0)
  await input(page).fill(' live words')
  await expect(ghost).toHaveText(' live words')
  await page.getByTestId('write-pad-insert').click()
  await expect(ghost).toHaveCount(0)
  await expect(page.locator('.bn-editor [data-hand]')).toHaveText(' live words')
  await tool(page, 'Undo').click()
  await expect(page.locator('.bn-editor [data-hand]')).toHaveCount(0)
  // Undo put the words back in the pad (R7-20), the draft shows again.
  await expect(input(page)).toHaveValue(' live words')
  await expect(ghost).toHaveText(' live words')
})

test('live copy keeps the pad text; Done and closing make the draft final as one step (R7-25)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  const ghost = page.locator('.bn-editor [data-write-pad-ghost]')
  const hand = page.locator('.bn-editor [data-hand]')
  await input(page).fill(' one')
  await expect(ghost).toHaveText(' one')
  // Edits in the pad update the draft; the pad keeps the text.
  await input(page).fill(' one two')
  await expect(ghost).toHaveText(' one two')
  await expect(input(page)).toHaveValue(' one two')
  // Done: final on the page, pad closed.
  await page.getByTestId('write-pad-done').click()
  await expect(pad(page)).toHaveCount(0)
  await expect(hand).toHaveText(' one two')
  await expect(ghost).toHaveCount(0)
  await tool(page, 'Undo').click()
  await expect(hand).toHaveCount(0)

  // Closing the pad also makes a draft final.
  await openPad(page)
  await input(page).fill(' closed')
  await page.getByTestId('write-pad-close').click()
  await expect(pad(page)).toHaveCount(0)
  await expect(hand).toHaveText(' closed')

  // Clear removes both the pad text and the draft.
  await openPad(page)
  await input(page).fill(' scrap')
  await expect(ghost).toHaveCount(1)
  await page.getByTestId('write-pad-clear').click()
  await expect(input(page)).toHaveValue('')
  await expect(ghost).toHaveCount(0)
  // Clear is one Undo step.
  await tool(page, 'Undo').click()
  await expect(input(page)).toHaveValue(' scrap')
  await expect(ghost).toHaveText(' scrap')
  await tool(page, 'Redo').click()
  await expect(input(page)).toHaveValue('')

  // With the option off nothing shows on the page.
  await page.getByTestId('write-pad-live').uncheck()
  await input(page).fill(' hidden')
  await expect(ghost).toHaveCount(0)
})

test('the draft shows at the end of the page when no cursor was set, above the pad (R7-24)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  // Many lines so the end of the page is far below the first screen.
  await page.locator('.bn-editor').click()
  for (let i = 0; i < 30; i++) await page.keyboard.press('Enter')
  await page.keyboard.type('Last line')
  // Take the cursor away from the page, as when opened from the bar.
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await openPad(page)
  await input(page).fill('draft here')
  const ghost = page.locator('.bn-editor [data-write-pad-ghost]')
  await expect(ghost).toHaveText('draft here')
  await expect
    .poll(async () => {
      const g = (await ghost.boundingBox())!
      const p = (await pad(page).boundingBox())!
      return g.y >= 0 && g.y + g.height <= p.y
    })
    .toBe(true)
})

test('Undo and Redo reverse mode switches, Read-less clears and keys in order (R7-21, R7-22)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  await page.getByTestId('write-pad-live').uncheck()
  await input(page).fill('abc')
  // Clear in Scribble mode, undoable.
  await page.getByTestId('write-pad-clear').click()
  await expect(input(page)).toHaveValue('')
  await tool(page, 'Undo').click()
  await expect(input(page)).toHaveValue('abc')
  // The mode switch is a step too.
  await switchToAi(page)
  await expect(pad(page).locator('[data-write-pad-canvas]')).toBeVisible()
  await tool(page, 'Undo').click()
  await expect(input(page)).toHaveValue('abc')
  await tool(page, 'Redo').click()
  await expect(pad(page).locator('[data-write-pad-canvas]')).toBeVisible()
})

test('the first Scribble to AI switch explains, with Don’t show again (R7-23)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  const aiButton = pad(page).getByRole('button', { name: 'AI', exact: true })
  await aiButton.click()
  await expect(pad(page).locator('[data-write-pad-explain]')).toBeVisible()
  // Cancel stays in Scribble.
  await pad(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(input(page)).toBeVisible()
  await aiButton.click()
  await page.getByTestId('write-pad-explain-never').click()
  await expect(pad(page).locator('[data-write-pad-canvas]')).toBeVisible()
  // Back to Scribble and again: no explainer any more.
  await pad(page).getByRole('button', { name: 'Scribble', exact: true }).click()
  await aiButton.click()
  await expect(pad(page).locator('[data-write-pad-explain]')).toHaveCount(0)
  await expect(pad(page).locator('[data-write-pad-canvas]')).toBeVisible()
})

/** Draws one pen stroke on the AI canvas. */
async function penStroke(page: Page, y: number) {
  const canvas = pad(page).locator('[data-write-pad-canvas]')
  const b = (await canvas.boundingBox())!
  await canvas.evaluate(
    (el, r) => {
      const fire = (type: string, x: number, yy: number) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 3,
            pointerType: 'pen',
            buttons: type === 'pointerup' ? 0 : 1,
            clientX: r.x + x,
            clientY: r.y + yy,
            pressure: 0.5,
          }),
        )
      fire('pointerdown', 20, r.y0)
      for (let i = 1; i <= 12; i++) fire('pointermove', 20 + i * 10, r.y0)
      fire('pointerup', 140, r.y0)
    },
    { x: b.x, y: b.y, y0: y },
  )
}

const canvasInk = (page: Page) =>
  pad(page)
    .locator('[data-write-pad-canvas]')
    .evaluate((c: HTMLCanvasElement) => {
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
      let n = 0
      for (let i = 3; i < d.length; i += 4) if (d[i] > 8) n++
      return n
    })

test('the pad Eraser is the main Eraser: it erases the pad writing, Undo brings it back (R7-15, R7-18)', async ({
  page,
}) => {
  await openNote(page, 'pencil')
  await openPad(page)
  await switchToAi(page)
  await penStroke(page, 40)
  await expect.poll(() => canvasInk(page)).toBeGreaterThan(100)
  const before = await canvasInk(page)

  // The pad's Eraser button selects the main Eraser (one shared tool).
  await page.getByTestId('write-pad-eraser').click()
  await expect(tool(page, 'Eraser')).toHaveAttribute('aria-pressed', 'true')
  await expect(
    pad(page).locator('[data-write-pad-eraser-options]'),
  ).toBeVisible()
  // Rub across the stroke's middle with the eraser (precise, small).
  const canvas = pad(page).locator('[data-write-pad-canvas]')
  const b = (await canvas.boundingBox())!
  await page.mouse.move(b.x + 70, b.y + 20)
  await page.mouse.down()
  await page.mouse.move(b.x + 70, b.y + 60, { steps: 8 })
  await page.mouse.up()
  await expect.poll(() => canvasInk(page)).toBeLessThan(before)
  expect(await canvasInk(page)).toBeGreaterThan(0)
  // The stray-mark check: nothing was drawn on the page.
  expect(
    await page.locator('[data-ink-canvas="ink"]').count(),
  ).toBeLessThanOrEqual(1)

  // The main bar Undo brings the erased part back.
  await tool(page, 'Undo').click()
  await expect.poll(() => canvasInk(page)).toBe(before)
  await tool(page, 'Redo').click()
  await expect.poll(() => canvasInk(page)).toBeLessThan(before)

  // Choosing the main bar Eraser works the same: the button follows it.
  await page.getByTestId('write-pad-eraser').click()
  await expect(tool(page, 'Eraser')).toHaveAttribute('aria-pressed', 'false')
})

test('the Lasso is ignored in the pad and leaves no mark in the pad or on the page (R7-19)', async ({
  page,
}) => {
  await openNote(page, 'pencil')
  await openPad(page)
  await switchToAi(page)
  await tool(page, 'Lasso').click()
  await penStroke(page, 40)
  await expect(pad(page).locator('[data-write-pad-canvas]')).toHaveAttribute(
    'data-pad-tool',
    'ignore',
  )
  expect(await canvasInk(page)).toBe(0)
  // No ink reached the page either.
  await page.getByTestId('write-pad-close').click()
  expect((await savedInk(page)).strokes).toHaveLength(0)
})

test('the pad rows wrap and never overlap or clip at a narrow width (R7-16, R7-26)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await openNote(page, 'touch')
  await openPad(page)
  await switchToAi(page)
  // Every control sits inside the pad's width, none is cut off.
  const clipped = await pad(page).evaluate((section) => {
    const s = section.getBoundingClientRect()
    const bad: string[] = []
    section.querySelectorAll('button, label, input').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width === 0) return
      if (r.left < s.left - 1 || r.right > s.right + 1)
        bad.push(el.getAttribute('aria-label') ?? el.textContent ?? '')
    })
    return { bad, wide: section.scrollWidth > section.clientWidth + 1 }
  })
  expect(clipped.bad).toEqual([])
  expect(clipped.wide).toBe(false)
  // No two controls overlap.
  const overlaps = await pad(page).evaluate((section) => {
    const boxes = [...section.querySelectorAll('button, label')]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0)
    const hits: string[] = []
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].r
        const b = boxes[j].r
        if (
          boxes[i].el.contains(boxes[j].el) ||
          boxes[j].el.contains(boxes[i].el)
        )
          continue
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (w > 2 && h > 2)
          hits.push(`${boxes[i].el.textContent}|${boxes[j].el.textContent}`)
      }
    return hits
  })
  expect(overlaps).toEqual([])
  // The last row (the live-copy option) can be reached by scrolling the pad.
  await pad(page).getByTestId('write-pad-live').scrollIntoViewIfNeeded()
  await expect(pad(page).getByTestId('write-pad-live')).toBeVisible()
})
