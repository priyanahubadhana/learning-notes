// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { painted, savedInk } from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { installRealPen, realPen, type Pt } from './realPen.ts'

/**
 * Issues #65 and #64 (owner 24 Nov 2026, iPad upright, switch textbox.v2).
 * #65: drawing in the page's first box never changes that box's shape; old
 *   ink that lies below the text stays visible.
 * #64: in a box made taller by a handle, ink and typing use the whole inside
 *   of the box up to the visible border and stop there; the handle can also
 *   bring such a box back up part of the way.
 * Every Pencil stroke is the browser's own input (e2e/realPen.ts).
 */
test.use({
  viewport: { width: 834, height: 1194 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

// The app's own numbers (the e2e project cannot import them): the dot's hold
// (HOLD_MS in src/paper/v2/boxDrag.ts, pinned by boxDrag.test.ts) and the
// stroke stride (src/core/inkTypes.ts).
const HOLD_MS = 120
const STRIDE = 6
const MAIN = '[data-paper-box="main"]'
const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
type Rc = { x: number; y: number; width: number; height: number }
const rect = async (page: Page, sel: string): Promise<Rc> =>
  (await page.locator(sel).first().boundingBox())!

async function start(page: Page, name: string) {
  await installRealPen(page)
  await page.addInitScript(() => {
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]')
    localStorage.setItem('learning-notes:advanced.autoSwitch', '"off"')
  })
  await startInMode(page, 'pencil')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
  await expect(page.locator(MAIN + ' .bn-editor')).toContainText('Main text')
}

/** Choose a tool and wait until it is pressed (a late re-render can swallow a tap). */
async function pickTool(page: Page, name: 'Pen' | 'Text' | 'Eraser' | 'Lasso') {
  await expect(async () => {
    if ((await tool(page, name).getAttribute('aria-pressed')) !== 'true')
      await tool(page, name).click()
    await expect(tool(page, name)).toHaveAttribute('aria-pressed', 'true', {
      timeout: 1500,
    })
  }).toPass()
  if (name === 'Pen')
    await expect(page.locator('[data-ink-pad]').first()).toBeAttached()
}

/** Two frames: whatever the page does after a change has been done. */
const settle = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((done) =>
        requestAnimationFrame(() => requestAnimationFrame(() => done())),
      ),
  )

const line = (x: number, y0: number, y1: number, n = 12): Pt[] =>
  Array.from({ length: n }, (_, i) => ({
    x: x + Math.sin(i) * 6,
    y: y0 + ((y1 - y0) * i) / (n - 1),
  }))

/**
 * A Pencil stroke that is saved: the page ignores a stroke drawn in the first
 * moments after a tool is chosen, so a stroke that left nothing is drawn again.
 */
async function drawSaved(page: Page, path: Pt[], count: number) {
  await expect(async () => {
    if ((await savedInk(page)).strokes.length < count) await realPen(page, path)
    await expect
      .poll(async () => (await savedInk(page)).strokes.length, {
        timeout: 8000,
      })
      .toBe(count)
  }).toPass({ timeout: 40000 })
}

test('#65: a stroke from inside the first box to far below its border leaves the box shape unchanged, also after a reload', async ({
  page,
}) => {
  await start(page, 'Ink65')
  await pickTool(page, 'Pen')
  const before = await rect(page, MAIN)
  const sheet = await rect(page, '[data-paper-sheet="1"]')
  const x = sheet.x + sheet.width * 0.3
  await drawSaved(
    page,
    line(x, before.y + before.height / 2, before.y + before.height + 300),
    1,
  )
  await settle(page)
  const after = await rect(page, MAIN)
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(2)
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(2)
  await page.reload()
  await expect(page.locator(MAIN)).toBeVisible()
  await expect.poll(() => painted(page, 'ink')).toBeGreaterThan(0)
  const again = await rect(page, MAIN)
  expect(Math.abs(again.height - before.height)).toBeLessThanOrEqual(2)
})

test('#65: old ink saved below the first box text is still visible after a reload', async ({
  page,
}) => {
  await start(page, 'Ink65old')
  await pickTool(page, 'Pen')
  const box = await rect(page, MAIN)
  const sheet = await rect(page, '[data-paper-sheet="1"]')
  await drawSaved(
    page,
    line(sheet.x + sheet.width * 0.3, box.y + 4, box.y + box.height - 4),
    1,
  )
  await expect.poll(() => painted(page, 'ink')).toBeGreaterThan(0)
  // As an old page has it: the same stroke, 200 px lower than the text.
  await page.evaluate(
    async ({ dy, stride }) => {
      await new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('inkChunks', 'readwrite')
          const store = tx.objectStore('inkChunks')
          const all = store.getAll()
          all.onsuccess = () => {
            for (const c of all.result as {
              strokes: { pts: number[] }[]
            }[]) {
              for (const s of c.strokes)
                for (let i = 1; i < s.pts.length; i += stride) s.pts[i] += dy
              store.put(c)
            }
          }
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      })
    },
    { dy: 200 / box.width, stride: STRIDE },
  )
  await page.reload()
  await expect(page.locator(MAIN)).toBeVisible()
  await expect
    .poll(() => painted(page, 'ink'), { timeout: 8000 })
    .toBeGreaterThan(0)
})

/** A box with one line of text made with the Text tool, then selected. */
async function pickedExtra(page: Page, name: string) {
  await start(page, name)
  await pickTool(page, 'Text')
  const sheet = await rect(page, '[data-paper-sheet="1"]')
  const main = await rect(page, MAIN)
  await page.mouse.click(sheet.x + sheet.width * 0.3, main.y + main.height + 90)
  const box = page.locator(EXTRA)
  await expect(box).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Alpha beta')
  await expect(box).toContainText('Alpha beta')
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await expect(box).not.toHaveAttribute('data-typing', '')
  const r = (await box.boundingBox())!
  await page.mouse.click(r.x - 5, r.y + r.height / 2)
  await expect(box).toHaveAttribute('data-picked', '')
  return box
}

/** Drag the bottom dot by `by` px (down is plus) with the Pencil, after the hold the app asks for. */
async function dragBottomDot(page: Page, box: Locator, by: number) {
  const h = (await box.locator('[data-resize-handle="s"]').boundingBox())!
  const from = { x: h.x + h.width / 2, y: h.y + h.height / 2 }
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = true
  })
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.waitForTimeout(HOLD_MS + 80)
  await page.mouse.move(from.x, from.y + by, { steps: 8 })
  await page.mouse.up()
  await page.evaluate(() => {
    ;(window as unknown as { __realPen?: boolean }).__realPen = false
  })
}

/** Make the box `by` px taller and wait until it is. */
async function growDown(page: Page, box: Locator, by: number) {
  const before = (await box.boundingBox())!.height
  await dragBottomDot(page, box, by)
  await expect
    .poll(async () => Math.abs((await box.boundingBox())!.height - before - by))
    .toBeLessThanOrEqual(3)
}

test('#64: in a box made taller by the bottom handle the Pen draws in the lower part and stops at the border', async ({
  page,
}) => {
  const box = await pickedExtra(page, 'Ink64a')
  const small = (await box.boundingBox())!
  await growDown(page, box, 220)
  const big = (await box.boundingBox())!
  await pickTool(page, 'Pen')
  const bottom = big.y + big.height
  // Round 1: a stroke wholly in the lower, empty part of the box.
  const x = big.x + big.width * 0.4
  await drawSaved(page, line(x, small.y + small.height + 30, bottom - 25), 1)
  const ink = await savedInk(page)
  expect(
    await box.evaluate(
      (el, id) => !!el.querySelector(`[data-id="${id}"]`),
      ink.chunks[0].blockId,
    ),
  ).toBe(true)
  // Round 2: a stroke from inside the lower part to far past the border.
  await drawSaved(page, line(x + 60, bottom - 60, bottom + 160), 2)
  await settle(page)
  const frame = (await box.boundingBox())!
  expect(Math.abs(frame.y + frame.height - bottom)).toBeLessThanOrEqual(2)
  const pad = await box.evaluate((el) => {
    const r = el.querySelector('[data-ink-pad]')!.getBoundingClientRect()
    return { y: r.y, h: r.height }
  })
  expect(pad.y + pad.h).toBeLessThanOrEqual(bottom + 1)
  expect(pad.h).toBeGreaterThan(big.height - 30)
})

test('#64: in a box made taller by the bottom handle a Text-tool tap in the empty lower part puts the caret in that box', async ({
  page,
}) => {
  const box = await pickedExtra(page, 'Ink64b')
  const small = (await box.boundingBox())!
  await growDown(page, box, 220)
  const big = (await box.boundingBox())!
  await pickTool(page, 'Text')
  await page.mouse.click(big.x + big.width * 0.4, small.y + small.height + 100)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Zed')
  await expect(box).toContainText('Zed')
  const after = (await box.boundingBox())!
  expect(Math.abs(after.height - big.height)).toBeLessThanOrEqual(2)
})

test('#64: a box made taller can be shrunk part of the way with the bottom handle, never under its text', async ({
  page,
}) => {
  const box = await pickedExtra(page, 'Ink64c')
  const text = (await box.boundingBox())!.height
  await growDown(page, box, 160)
  const tall = (await box.boundingBox())!.height
  // Back up by about two lines: still taller than the text.
  await dragBottomDot(page, box, -80)
  await expect
    .poll(async () => Math.abs((await box.boundingBox())!.height - (tall - 80)))
    .toBeLessThanOrEqual(4)
  expect((await box.boundingBox())!.height).toBeGreaterThan(text + 40)
  // Far up: it stops at the text, never under it.
  await dragBottomDot(page, box, -400)
  await expect
    .poll(async () => (await box.boundingBox())!.height)
    .toBeLessThanOrEqual(text + 2)
  expect((await box.boundingBox())!.height).toBeGreaterThanOrEqual(text - 2)
})

/** The saved strokes' points as page px inside the first box (x, y). */
async function savedPoints(page: Page, boxWidth: number) {
  return (await savedInk(page)).strokes.map((s) => {
    const out: Pt[] = []
    for (let i = 0; i + 1 < s.pts.length; i += STRIDE)
      out.push({ x: s.pts[i] * boxWidth, y: s.pts[i + 1] * boxWidth })
    return out
  })
}

test('#65: a stroke that leaves the first box by the bottom and goes sideways outside leaves no ink along the border', async ({
  page,
}) => {
  await start(page, 'Ink65side')
  await pickTool(page, 'Pen')
  const box = await rect(page, MAIN)
  const x = box.x + 60
  const outside = box.y + box.height + 50
  await drawSaved(
    page,
    [
      { x, y: box.y + box.height / 2 },
      { x, y: outside },
      ...Array.from({ length: 8 }, (_, i) => ({
        x: x + ((i + 1) * 150) / 8,
        y: outside,
      })),
    ],
    1,
  )
  const [pts] = await savedPoints(page, box.width)
  // Nothing past the border, and no run of points sitting on it.
  expect(Math.max(...pts.map((p) => p.y))).toBeLessThanOrEqual(box.height + 1)
  expect(pts.filter((p) => p.y >= box.height - 1.5).length).toBeLessThanOrEqual(
    1,
  )
  expect(Math.max(...pts.map((p) => p.x)) - x).toBeLessThanOrEqual(10)
})

test('#65: an eraser drag that leaves the first box by the bottom erases nothing along the border', async ({
  page,
}) => {
  await start(page, 'Ink65erase')
  await pickTool(page, 'Pen')
  const box = await rect(page, MAIN)
  const x0 = box.x + 40
  const lowY = box.y + box.height - 3
  // A short stroke lying just above the border, to the right of the eraser's way down.
  await drawSaved(
    page,
    Array.from({ length: 8 }, (_, i) => ({ x: x0 + 60 + i * 20, y: lowY })),
    1,
  )
  // A second short stroke, mid-box, far to the right: the eraser's proof of life.
  const midY = box.y + box.height / 2
  await drawSaved(
    page,
    Array.from({ length: 6 }, (_, i) => ({ x: box.x + 250 + i * 8, y: midY })),
    2,
  )
  await expect.poll(() => painted(page, 'ink')).toBeGreaterThan(0)
  await pickTool(page, 'Eraser')
  const ink = await painted(page, 'ink')
  // The page ignores the first moments after a tool is chosen: rub the second stroke until it goes.
  await expect(async () => {
    if ((await savedInk(page)).strokes.length > 1)
      await realPen(page, [
        { x: box.x + 270, y: midY - 8 },
        { x: box.x + 270, y: midY + 8 },
      ])
    await expect
      .poll(async () => (await savedInk(page)).strokes.length, {
        timeout: 3000,
      })
      .toBe(1)
  }).toPass({ timeout: 20000 })
  await expect.poll(() => painted(page, 'ink')).toBeLessThan(ink)
  const alone = await painted(page, 'ink')
  // Down the left side, then sideways 50 px below the border, under the stroke.
  await realPen(page, [
    { x: x0, y: box.y + box.height / 2 },
    { x: x0, y: box.y + box.height + 50 },
    ...Array.from({ length: 10 }, (_, i) => ({
      x: x0 + ((i + 1) * 220) / 10,
      y: box.y + box.height + 50,
    })),
  ])
  await settle(page)
  // The first stroke is still all there (the live canvas, not the slower save).
  expect(Math.abs((await painted(page, 'ink')) - alone)).toBeLessThanOrEqual(
    alone * 0.02,
  )
  await expect
    .poll(async () => (await savedPoints(page, box.width)).length)
    .toBe(1)
})

test('#65: a selection handle of ink in the first box can be dragged below the box border', async ({
  page,
}) => {
  await start(page, 'Ink65handle')
  await pickTool(page, 'Pen')
  const box = await rect(page, MAIN)
  const x0 = box.x + 60
  const y0 = box.y + box.height / 2
  await drawSaved(
    page,
    Array.from({ length: 8 }, (_, i) => ({
      x: x0 + i * 4,
      y: y0 - 5 + i * 1.5,
    })),
    1,
  )
  const before = await savedPoints(page, box.width)
  const h0 =
    Math.max(...before[0].map((p) => p.y)) -
    Math.min(...before[0].map((p) => p.y))
  await pickTool(page, 'Lasso')
  await realPen(page, [
    { x: x0 - 10, y: y0 - 12 },
    { x: x0 + 40, y: y0 - 12 },
    { x: x0 + 40, y: y0 + 12 },
    { x: x0 - 10, y: y0 + 12 },
    { x: x0 - 10, y: y0 - 12 },
  ])
  const handle = page.locator('[data-handle="scale"][data-axis="both"]').last()
  await expect(handle).toBeVisible()
  const hb = (await handle.boundingBox())!
  const from = { x: hb.x + hb.width / 2, y: hb.y + hb.height / 2 }
  await realPen(page, [from, { x: from.x, y: box.y + box.height + 120 }], 8)
  await settle(page)
  await expect
    .poll(async () => {
      const [pts] = await savedPoints(page, box.width)
      return Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y))
    })
    .toBeGreaterThan(h0 * 2.5)
})
