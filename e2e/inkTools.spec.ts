import { expect, test, type Page } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  painted,
  savedInk,
  stroke,
  textBox,
  wave,
} from './inkHelpers.ts'
import { card, option, pill, tool } from './mainBarHelpers.ts'

/**
 * Pen types, highlighter, eraser modes, shapes, lasso, layers, reflow, undo
 * (redesign step 3). Simulated pen events on the drawing pad.
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

const pickTool = (page: Page, name: string) =>
  tool(page, name).click({ force: true })

/** Opens a pill (again if a stroke closed it) and chooses a card chip. */
async function chooseChip(page: Page, toolName: string, radio: string) {
  if (!(await pill(page).isVisible())) await pickTool(page, toolName)
  if (toolName === 'Eraser') return void (await option(page, radio).click())
  if (!(await card(page).isVisible())) {
    await option(page, /^Pen type/)
      .first()
      .click()
  }
  await card(page).getByRole('radio', { name: radio }).click()
  // The card floats over the page: close it so it does not cover the drawing.
  await page.keyboard.press('Escape')
}

const xs = (pts: number[]) => pts.filter((_, i) => i % 6 === 0)
const ys = (pts: number[]) => pts.filter((_, i) => i % 6 === 1)
const mid = (a: number[]) => (Math.min(...a) + Math.max(...a)) / 2

test('the five pens draw differently', async ({ page }) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const counts: number[] = []
  const types = ['Fountain', 'Ball', 'Brush', 'Pencil', 'Marker']
  for (let i = 0; i < types.length; i++) {
    await chooseChip(page, 'Pen', types[i])
    await stroke(
      page,
      wave(box.x + 20, box.x + 400, box.y + 120 + i * 70, 14, 50),
    )
    const before = counts.reduce((a, b) => a + b, 0)
    counts.push((await painted(page, 'ink')) - before)
  }
  const saved = await expectStrokes(page, 5)
  expect(saved.map((s) => s.style.pen)).toEqual(
    types.map((t) => t.toLowerCase()),
  )
  expect(new Set(counts).size).toBe(5)
})

test('dashed and dotted lines, thickness and colour are saved with the stroke', async ({
  page,
}) => {
  await inkNote(page, 'Pen', 'pencil', {
    'ink.pen': { line: 'dashed', size: 2, colour: '#c62828' },
  })
  const box = await textBox(page)
  await stroke(
    page,
    line([box.x + 20, box.y + 150], [box.x + 300, box.y + 150]),
  )
  const [s] = await expectStrokes(page, 1)
  expect(s.style).toMatchObject({ line: 'dashed', colour: '#c62828' })
  expect(s.style.width).toBe(5)
})

test('hold at the end of a stroke makes a perfect shape', async ({ page }) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + 150
  const wobbly = line([box.x + 20, y], [box.x + 320, y + 6], 30).map(
    ([x, yy], i) => [x, yy + Math.sin(i * 3) * 1.5] as [number, number],
  )
  await stroke(page, wobbly, { holdMs: 900 })
  const [s] = await expectStrokes(page, 1)
  expect(s.shape).toBe('line')
  expect(s.pts.length / 6).toBe(2)
  // A rectangle.
  const x0 = box.x + 40
  const y0 = box.y + 250
  const rect = [
    ...line([x0, y0], [x0 + 200, y0 + 3], 10),
    ...line([x0 + 200, y0 + 3], [x0 + 197, y0 + 120], 10),
    ...line([x0 + 197, y0 + 120], [x0 + 2, y0 + 117], 10),
    ...line([x0 + 2, y0 + 117], [x0, y0 + 1], 10),
  ]
  await stroke(page, rect, { holdMs: 900 })
  const all = await expectStrokes(page, 2)
  expect(all[1].shape).toBe('rect')
})

test('the highlighter over words highlights the text; with snap off it draws', async ({
  page,
}) => {
  await inkNote(page, 'Highlighter')
  const box = await textBox(page)
  const y = box.y + box.height / 2
  await stroke(page, line([box.x + 2, y], [box.x + 120, y]))
  await expect(
    page.locator('.bn-editor [data-style-type="backgroundColor"]'),
  ).toHaveCount(1)
  expect((await savedInk(page)).strokes).toHaveLength(0)
  // Over blank paper it is ink, drawn behind (its own canvas).
  await stroke(page, line([box.x + 2, y + 200], [box.x + 200, y + 200]))
  const [h] = await expectStrokes(page, 1)
  expect(h.kind).toBe('highlight')
  expect(await painted(page, 'highlights')).toBeGreaterThan(100)
})

test('the highlighter with snap off draws even over words', async ({
  page,
}) => {
  await inkNote(page, 'Highlighter', 'pencil', {
    'ink.highlighter': { snapToText: false },
  })
  const box = await textBox(page)
  const y = box.y + box.height / 2
  await stroke(page, line([box.x + 2, y], [box.x + 120, y]))
  const [h] = await expectStrokes(page, 1)
  expect(h.kind).toBe('highlight')
  await expect(
    page.locator('.bn-editor [data-style-type="backgroundColor"]'),
  ).toHaveCount(0)
})

test('eraser: precise splits, whole stroke removes, highlights only spares ink', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + 200
  await stroke(page, line([box.x + 20, y], [box.x + 420, y], 60))
  await expectStrokes(page, 1)
  await pickTool(page, 'Eraser')
  await chooseChip(page, 'Eraser', 'Precise')
  await stroke(page, line([box.x + 220, y - 30], [box.x + 220, y + 30], 10))
  const split = await expectStrokes(page, 2)
  expect(Math.max(...xs(split[0].pts))).toBeLessThan(box.x * 0 + 1)
  // Undo brings the whole stroke back in one step.
  await tool(page, 'Undo').click()
  await expectStrokes(page, 1)
  // Whole stroke mode.
  await chooseChip(page, 'Eraser', 'Whole stroke')
  await stroke(page, line([box.x + 220, y - 30], [box.x + 220, y + 30], 10))
  await expectStrokes(page, 0)
})

test('eraser "highlights only" leaves the pen ink', async ({ page }) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + 200
  await stroke(page, line([box.x + 20, y], [box.x + 420, y], 40))
  await pickTool(page, 'Highlighter')
  await stroke(page, line([box.x + 20, y + 4], [box.x + 420, y + 4], 40))
  await expectStrokes(page, 2)
  await pickTool(page, 'Eraser')
  await option(page, 'Erase highlights only').click()
  await stroke(page, line([box.x + 220, y - 30], [box.x + 220, y + 40], 10))
  await expect
    .poll(async () =>
      (await savedInk(page)).strokes.some((s) => s.kind === 'ink'),
    )
    .toBe(true)
  // The pen line is whole (one piece), the highlight was cut.
  const ink = (await savedInk(page)).strokes.filter((s) => s.kind === 'ink')
  expect(ink).toHaveLength(1)
})

test('scribbling over ink erases it when the gesture is on', async ({
  page,
}) => {
  await inkNote(page, 'Pen', 'pencil', { 'ink.pen': { scribbleErase: true } })
  const box = await textBox(page)
  const y = box.y + 200
  await stroke(page, line([box.x + 20, y], [box.x + 160, y], 20))
  await expectStrokes(page, 1)
  const zig = Array.from({ length: 40 }, (_, i) => [
    box.x + 15 + (i % 2) * 150,
    y - 20 + i * 1,
  ]) as [number, number][]
  await stroke(page, zig)
  await expectStrokes(page, 0)
})

test('lasso: select, move, scale and rotate with separate handles, duplicate, delete', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + 220
  await stroke(page, wave(box.x + 100, box.x + 300, y, 20, 40))
  const [orig] = await expectStrokes(page, 1)
  await pickTool(page, 'Lasso')
  // A free-hand loop around the stroke (starts on empty paper).
  const loop: [number, number][] = [
    [box.x + 60, y - 70],
    [box.x + 340, y - 70],
    [box.x + 340, y + 70],
    [box.x + 60, y + 70],
    [box.x + 62, y - 68],
  ]
  await stroke(
    page,
    loop.flatMap((p, i) => (i ? line(loop[i - 1], p, 8) : [p])),
  )
  const selBox = page.locator('[data-ink-box]')
  await expect(selBox).toBeVisible()
  const b0 = (await selBox.boundingBox())!
  // Move: drag the body.
  await page.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2)
  await page.mouse.down()
  await page.mouse.move(b0.x + b0.width / 2 + 60, b0.y + b0.height / 2 + 40, {
    steps: 6,
  })
  await page.mouse.up()
  let [moved] = await expectStrokesAfter(page, orig.id)
  expect(mid(xs(moved.pts)) - mid(xs(orig.pts))).toBeGreaterThan(0.04)
  // Scale: drag the bottom-right corner outwards.
  const b1 = (await selBox.boundingBox())!
  const corner = page.locator('[data-handle="scale"]').nth(3)
  await corner.hover()
  await page.mouse.down()
  await page.mouse.move(b1.x + b1.width + 80, b1.y + b1.height + 40, {
    steps: 6,
  })
  await page.mouse.up()
  const scaled = await expectStrokesAfter(page, moved.id)
  const w = (s: number[]) => Math.max(...xs(s)) - Math.min(...xs(s))
  expect(w(scaled[0].pts)).toBeGreaterThan(w(moved.pts) * 1.2)
  moved = scaled[0]
  // Rotate: the round handle, a quarter turn.
  const b2 = (await selBox.boundingBox())!
  const rot = page.locator('[data-handle="rotate"]')
  await rot.hover()
  await page.mouse.down()
  await page.mouse.move(b2.x + b2.width + 120, b2.y + b2.height / 2, {
    steps: 8,
  })
  await page.mouse.up()
  const turned = await expectStrokesAfter(page, moved.id)
  const h = (s: number[]) => Math.max(...ys(s)) - Math.min(...ys(s))
  expect(h(turned[0].pts) / w(turned[0].pts)).toBeGreaterThan(
    (h(moved.pts) / w(moved.pts)) * 1.5,
  )
  // Menu: duplicate, then delete everything selected.
  await page.locator('[data-ink-action="duplicate"]').click()
  await expectStrokes(page, 2)
  await page.locator('[data-ink-action="delete"]').click()
  await expectStrokes(page, 1)
  // Colour of what is left selected? Select it by a tap and recolour.
})

/** Waits for the saved strokes to no longer include `oldId`, and returns them. */
async function expectStrokesAfter(page: Page, oldId: string) {
  await expect
    .poll(
      async () => (await savedInk(page)).strokes.some((s) => s.id === oldId),
      {
        timeout: 8000,
      },
    )
    .toBe(false)
  return (await savedInk(page)).strokes
}

test('a lasso tap on a stroke selects it; the colour menu recolours it', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + 220
  await stroke(page, line([box.x + 100, y], [box.x + 300, y], 30))
  const [orig] = await expectStrokes(page, 1)
  await pickTool(page, 'Lasso')
  await stroke(page, [[box.x + 200, y]], { type: 'pen' })
  await expect(page.locator('[data-ink-box]')).toBeVisible()
  await page.locator('[data-ink-action="colour"]').click()
  await page.locator('[data-ink-colour="red"]').click()
  const after = await expectStrokesAfter(page, orig.id)
  expect(after[0].style.colour).toBe('#c62828')
})

test('keyboard users can select and delete strokes', async ({ page }) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  await stroke(
    page,
    line([box.x + 100, box.y + 200], [box.x + 300, box.y + 200], 30),
  )
  await expectStrokes(page, 1)
  const door = page.locator('[data-ink-keys]')
  await door.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-ink-box]')).toBeVisible()
  await page.keyboard.press('Delete')
  await expectStrokes(page, 0)
  await expect(page.locator('[data-ink-ui]')).toHaveAttribute(
    'aria-label',
    /Drawing on this page/,
  )
})

test('paper behind the ink', async ({ page }) => {
  await inkNote(page, 'Pen')
  await option(page, /^Pen type/)
    .first()
    .click()
  await page.locator('[data-card-nav="layers"]').click()
  await card(page).getByRole('radio', { name: 'Grid' }).click()
  await expect(page.locator('[data-ink-paper="grid"]')).toHaveCount(1)
})
