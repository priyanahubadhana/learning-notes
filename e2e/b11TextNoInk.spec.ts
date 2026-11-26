// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { expectStrokes, inkNote, line, savedInk, stroke } from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { installRealPen, realPen, type Pt } from './realPen.ts'

/**
 * B11 (owner, 19 Nov 2026): in the Text tool a Pencil circle round words left
 * an INK ring (the eraser could remove it). The Text tool must never make ink
 * round text. Cause: the paper's Text-tool shape reader (PaperFrame
 * textPenDown) was told "blank paper" again by the paper after the box said
 * "a box", so a ring over a box's words became a clean ellipse on the ink
 * layer; and the Pencil's HOVER moves (no button, pressure 0), sent while
 * Scribble holds the stroke, were counted as the stroke's points.
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'

async function start(page: Page) {
  await installRealPen(page)
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'computer')
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:advanced.autoSwitch', '"off"'),
  )
  await page.goto('/')
  await createNotebook(page, 'Paper', 'B11')
  await typeInEditor(page, 'Main text')
  const sheet = (await page
    .locator('[data-paper-sheet="1"]')
    .first()
    .boundingBox())!
  const main = (await page
    .locator('[data-paper-box="main"] .bn-editor')
    .first()
    .boundingBox())!
  const at = { x: sheet.x + sheet.width * 0.3, y: main.y + main.height + 60 }
  await page.mouse.click(at.x, at.y)
  const box = page.locator(EXTRA)
  await expect(box).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Service rate is high today')
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  await tool(page, 'Text').click()
  await page.waitForTimeout(700)
  return box
}

const ring = (cx: number, cy: number, rx: number, ry: number, n = 28): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => ({
    x: cx + rx * Math.cos((i / n) * Math.PI * 2),
    y: cy + ry * Math.sin((i / n) * Math.PI * 2),
  }))

const noInk = async (page: Page) => {
  await page.waitForTimeout(5000) // ink is saved a moment after drawing
  expect((await savedInk(page)).strokes).toHaveLength(0)
  await expect(page.locator(EXTRA)).toHaveCount(1)
}

test('B11 a Pencil ring round words in the Text tool leaves no ink', async ({
  page,
}) => {
  const box = await start(page)
  const b = (await box.boundingBox())!
  const y = b.y + b.height / 2
  await realPen(page, [{ x: b.x + 4, y: y }]) // settle the page
  await page.waitForTimeout(500)
  await realPen(page, ring(b.x + 150, y, 90, 26))
  await noInk(page)
})

test('B11 the owner trace (down, one move, long gap, Pencil hover round the words, lift) leaves no ink', async ({
  page,
}) => {
  const box = await start(page)
  const b = (await box.boundingBox())!
  const y = b.y + b.height / 2
  const pts = ring(b.x + 150, y, 90, 26, 40)
  await page.evaluate(
    async ([path]) => {
      const el = document.elementFromPoint(path[0].x, path[0].y)!
      const fire = (
        type: string,
        p: { x: number; y: number },
        down: boolean,
        target: Element = el,
      ) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: 1,
            pointerType: 'pen',
            isPrimary: true,
            clientX: p.x,
            clientY: p.y,
            buttons: down ? 1 : 0,
            pressure: down ? 0.2 : 0,
          }),
        )
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
      fire('pointerdown', path[0], true)
      fire('pointermove', path[1], true)
      await wait(600) // Scribble holds the stroke: nothing arrives
      for (const p of path.slice(2)) {
        fire('pointermove', p, false)
        await wait(8)
      }
      fire('pointerup', path[path.length - 1], false)
    },
    [pts] as const,
  )
  await noInk(page)
})

test('B11 a Pencil ring round words of the first (main) box leaves no ink', async ({
  page,
}) => {
  await start(page)
  const m = (await page
    .locator('[data-paper-box="main"] .bn-editor')
    .first()
    .boundingBox())!
  const y = m.y + 14
  await realPen(page, [{ x: m.x + 4, y }])
  await page.waitForTimeout(500)
  await realPen(page, ring(m.x + 40, y, 50, 22))
  await noInk(page)
})

/**
 * The same owner trace for the ink engine: a Pen touch whose lift never came
 * (Scribble took it), then the Text tool, then the Pencil HOVERING (id kept,
 * no button, pressure 0), then a lift. The engine used to go on collecting
 * the hover points of the old gesture and saved them as a stroke in the Text
 * tool. Why: move/up never asked which tool is on, and a tool change did not
 * end the old gesture.
 */
test('B11 a Pen touch left open, then Text tool, then Pencil hover and lift: no ink', async ({
  page,
}) => {
  await inkNote(page, 'Pen', 'pencil')
  const box = (await page.locator('.bn-block-content').first().boundingBox())!
  const pts = Array.from({ length: 30 }, (_, i) => ({
    x: box.x + 10 + i * 8,
    y: box.y + 12 + Math.sin(i / 2) * 8,
  }))
  await page.evaluate(
    async ([path]) => {
      const pad = document.querySelector('[data-ink-pad]')!
      const fire = (type: string, p: { x: number; y: number }, down: boolean) =>
        pad.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: 'pen',
            isPrimary: true,
            clientX: p.x,
            clientY: p.y,
            buttons: down ? 1 : 0,
            pressure: down ? 0.3 : 0,
          }),
        )
      fire('pointerdown', path[0], true)
      fire('pointermove', path[1], true)
    },
    [pts] as const,
  )
  await tool(page, 'Text').click()
  await page.waitForTimeout(300)
  await page.evaluate(
    async ([path]) => {
      const pad = document.querySelector('[data-ink-pad]')!
      const fire = (type: string, p: { x: number; y: number }, down: boolean) =>
        pad.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: 'pen',
            isPrimary: true,
            clientX: p.x,
            clientY: p.y,
            buttons: down ? 1 : 0,
            pressure: down ? 0.3 : 0,
          }),
        )
      for (const p of path.slice(2)) {
        fire('pointermove', p, false)
        await new Promise((r) => setTimeout(r, 6))
      }
      fire('pointerup', path[path.length - 1], false)
    },
    [pts] as const,
  )
  // Saving is a moment after drawing: a real Pen stroke as the control shows
  // the save ran, and that it is the only stroke on the page.
  await tool(page, 'Pen').click()
  await page.waitForTimeout(600)
  await stroke(
    page,
    line([box.x + 10, box.y + 40], [box.x + 200, box.y + 40]),
    { id: 9 },
  )
  await expectStrokes(page, 1)
  await page.waitForTimeout(1500)
  expect((await savedInk(page)).strokes).toHaveLength(1)
})
