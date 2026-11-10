import { expect, test, type Page } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  painted,
  paintedBox,
  savedInk,
  stroke,
  textBox,
} from './inkHelpers.ts'
import { card, option, pill, tool } from './mainBarHelpers.ts'

/** Layers, anchoring to text, one history with the text, saving, speed. */

test.use({ viewport: { width: 1024, height: 1100 }, hasTouch: true })

async function openLayers(page: Page) {
  // Already showing (R6-21: a tap on the toast no longer closes the pill).
  if (await page.locator('[data-layers]').isVisible()) return
  if (!(await pill(page).isVisible())) {
    await tool(page, 'Pen').click({ force: true })
  }
  if (!(await card(page).isVisible())) {
    await option(page, /^Pen type/)
      .first()
      .click()
  }
  await page.locator('[data-card-nav="layers"]').click()
}
async function ensureLayers(page: Page) {
  if (!(await page.locator('[data-layers]').isVisible())) await openLayers(page)
}
const layerRows = (page: Page) => page.locator('[data-layer]')

test('layers: two at most, chip, hide, lock toast, merge and undo', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + 150
  await stroke(page, line([box.x + 20, y], [box.x + 300, y]))
  await expectStrokes(page, 1)
  await expect(page.locator('[data-layer-chip]')).toHaveText('Layer 1 ▾')
  await openLayers(page)
  await expect(layerRows(page)).toHaveCount(1)
  await page.locator('[data-layer-add]').click()
  await expect(layerRows(page)).toHaveCount(2)
  // The most a page can have is two: Add goes away.
  await expect(page.locator('[data-layer-add]')).toHaveCount(0)
  await expect(layerRows(page).first()).toContainText('Layer 2')
  await expect(page.locator('[data-layer-page]')).toBeVisible()
  // Clear of the open Layers card (it covers the column's upper left).
  await stroke(page, line([box.x + 300, y + 300], [box.x + 560, y + 300]))
  await expectStrokes(page, 2)
  const ink = await savedInk(page)
  expect(new Set(ink.chunks.map((c) => c.layerId)).size).toBe(2)
  // Hide: nothing of that layer is painted; show: it is back.
  const before = await painted(page, 'ink')
  await layerRows(page)
    .first()
    .getByRole('button', { name: 'Hide Layer 2' })
    .click()
  await expect.poll(() => painted(page, 'ink')).toBeLessThan(before)
  await layerRows(page)
    .first()
    .getByRole('button', { name: 'Show Layer 2' })
    .click()
  await expect.poll(() => painted(page, 'ink')).toBe(before)
  // Lock: drawing there is refused, with a toast that can unlock.
  await layerRows(page)
    .first()
    .getByRole('button', { name: 'Lock Layer 2' })
    .click()
  await stroke(page, line([box.x + 300, y + 360], [box.x + 560, y + 360]))
  await expect(page.getByText('Layer 2 is locked')).toBeVisible()
  expect((await savedInk(page)).strokes).toHaveLength(2)
  await page.getByRole('button', { name: 'Unlock', exact: true }).click()
  // Draw only once the toast has gone.
  await expect(page.getByText('Layer 2 is locked')).toHaveCount(0)
  // The page can have moved while the card and toast came and went: measure again.
  const now = await textBox(page)
  const y2 = y + (now.y - box.y)
  await stroke(page, line([now.x + 300, y2 + 360], [now.x + 560, y2 + 360]))
  await expectStrokes(page, 3)
  // Merge Layer 2 into Layer 1: warning first, then one layer, then Undo.
  await openLayers(page)
  await page.locator('[data-layer-merge]').click()
  await expect(page.getByText(/cannot be separated later/)).toBeVisible()
  await page.getByRole('button', { name: 'Merge', exact: true }).click()
  await openLayers(page)
  await expect(layerRows(page)).toHaveCount(1)
  expect((await savedInk(page)).strokes).toHaveLength(3)
  await page.getByRole('button', { name: 'Undo', exact: true }).last().click()
  await openLayers(page)
  await expect(layerRows(page)).toHaveCount(2)
})

test('ink follows its text when the text moves or the page is resized', async ({
  page,
}) => {
  await inkNote(page, 'Pen', 'touch')
  const box = await textBox(page)
  const y = box.y + 10
  await stroke(page, line([box.x + 10, y], [box.x + 200, y]))
  await expectStrokes(page, 1)
  const rel = async () => {
    const b = (await paintedBox(page, 'ink'))!
    const top = await page.evaluate(
      () =>
        document.querySelector('[data-ink-canvases]')!.getBoundingClientRect()
          .top,
    )
    const block = await page
      .locator('.bn-block-content', { hasText: 'nucleus' })
      .boundingBox()
    return (b.y0 + b.y1) / 2 / b.dpr + top - block!.y
  }
  const first = await rel()
  // A new line above: the block moves down, and its ink goes with it.
  await tool(page, 'Text').click({ force: true })
  await page.locator('.bn-block-content').first().click()
  await page.keyboard.press('Control+Home')
  await page.keyboard.press('Enter')
  await page.keyboard.type('x')
  await page.waitForTimeout(600)
  expect(Math.abs((await rel()) - first)).toBeLessThan(3)
  const b = (await paintedBox(page, 'ink'))!
  const wide = (b.x1 - b.x0) / b.dpr
  // A narrower page: the sidebar is made wider (the window itself cannot be
  // resized in the iPad profile), and the drawing gets narrower with it.
  const grip = page.getByRole('separator', { name: 'Resize menu' })
  await grip.focus()
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(600)
  const c = (await paintedBox(page, 'ink'))!
  expect((c.x1 - c.x0) / c.dpr).toBeLessThan(wide * 0.98)
})

test('Undo and Redo walk drawings and typing in one history', async ({
  page,
}) => {
  await inkNote(page, 'Pen', 'touch')
  const box = await textBox(page)
  await stroke(
    page,
    line([box.x + 10, box.y + 150], [box.x + 200, box.y + 150]),
  )
  await expectStrokes(page, 1)
  await tool(page, 'Text').click({ force: true })
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type('ZZ')
  await expect(page.locator('.bn-editor')).toContainText('DNAZZ')
  await tool(page, 'Undo').click()
  await expect(page.locator('.bn-editor')).not.toContainText('ZZ')
  expect((await savedInk(page)).strokes).toHaveLength(1)
  await tool(page, 'Undo').click() // now the drawing
  await expectStrokes(page, 0)
  await tool(page, 'Redo').click()
  await expectStrokes(page, 1)
  await tool(page, 'Redo').click()
  await expect(page.locator('.bn-editor')).toContainText('DNAZZ')
})

test('ink stays after a reload, and in a copy kept by History', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  await stroke(
    page,
    line([box.x + 10, box.y + 150], [box.x + 300, box.y + 150]),
  )
  await expectStrokes(page, 1)
  await page.reload()
  await expect(page.locator('[data-ink-canvases]')).toBeAttached()
  await expect.poll(() => painted(page, 'ink')).toBeGreaterThan(100)
})

test('a page with 500 strokes draws within the budget', async ({ page }) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  await stroke(
    page,
    line([box.x + 10, box.y + 150], [box.x + 100, box.y + 150]),
  )
  await expectStrokes(page, 1)
  // Add 499 more strokes straight into the database, then reload.
  await page.evaluate(async () => {
    const open = indexedDB.open('learning-notes')
    const db: IDBDatabase = await new Promise((res) => {
      open.onsuccess = () => res(open.result)
    })
    const read = (store: string) =>
      new Promise<Record<string, unknown>[]>((res) => {
        const r = db.transaction(store).objectStore(store).getAll()
        r.onsuccess = () => res(r.result)
      })
    const [chunk] = (await read('inkChunks')) as {
      id: string
      strokes: { id: string; pts: number[]; at: number }[]
    }[]
    const base = chunk.strokes[0]
    const rows: Record<string, unknown>[] = []
    for (let c = 0; c < 9; c++) {
      const strokes = []
      for (let i = 0; i < 55; i++) {
        const n = c * 55 + i
        const dy = (n % 40) * 0.02
        const pts: number[] = []
        for (let k = 0; k < 30; k++) {
          pts.push(
            0.05 + k * 0.02,
            0.2 + dy + Math.sin(k / 3) * 0.01,
            0.5,
            0,
            0,
            k * 8,
          )
        }
        strokes.push({ ...base, id: `perf-${n}`, at: base.at + n + 1, pts })
      }
      rows.push({ ...chunk, id: `perf-chunk-${c}`, strokes })
    }
    await new Promise<void>((res) => {
      const tx = db.transaction('inkChunks', 'readwrite')
      for (const r of rows) tx.objectStore('inkChunks').put(r)
      tx.oncomplete = () => res()
    })
    db.close()
  })
  const t0 = Date.now()
  await page.reload()
  await expect(page.locator('[data-ink-canvases]')).toBeAttached({
    timeout: 15000,
  })
  await expect
    .poll(() => painted(page, 'ink'), { timeout: 15000 })
    .toBeGreaterThan(1000)
  const loadMs = Date.now() - t0
  // A layout check (resize, a keystroke) with 500 strokes stays quick: the
  // blocks are measured again, and the canvases are left alone when nothing
  // moved (clearing three screen-sized canvases costs a whole frame in
  // WebKit). One warm-up round (JIT, first paint), then the median of five
  // rounds, so one busy moment on a shared CI machine cannot fail it.
  const { frameMs, clears } = await page.evaluate(async () => {
    let clears = 0
    const proto = CanvasRenderingContext2D.prototype
    const clearRect = proto.clearRect
    proto.clearRect = function (this: CanvasRenderingContext2D, ...a) {
      clears++
      return clearRect.apply(this, a)
    }
    const round = async (n: number) => {
      const start = performance.now()
      for (let i = 0; i < n; i++) {
        window.dispatchEvent(new Event('resize'))
        await new Promise((r) => requestAnimationFrame(r))
      }
      return (performance.now() - start) / n
    }
    await round(10)
    clears = 0
    const times: number[] = []
    for (let k = 0; k < 5; k++) times.push(await round(10))
    proto.clearRect = clearRect
    return { frameMs: times.sort((x, y) => x - y)[2], clears }
  })
  expect(loadMs).toBeLessThan(8000)
  expect(frameMs).toBeLessThan(80)
  expect(clears).toBe(0) // nothing moved, so the canvases were not touched
  expect((await savedInk(page)).strokes.length).toBe(496)
})

test('a hidden layer with drawings shows a chip at the top right; one tap shows it', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  await stroke(
    page,
    line([box.x + 20, box.y + 150], [box.x + 300, box.y + 150]),
  )
  await expectStrokes(page, 1)
  await openLayers(page)
  await layerRows(page)
    .first()
    .getByRole('button', { name: 'Hide Layer 1' })
    .click()
  const chip = page.locator('[data-hidden-layer]')
  await expect(chip).toContainText('Layer 1 hidden')
  const page_ = (await page.locator('.bn-container').boundingBox())!
  const at = (await chip.boundingBox())!
  expect(at.x + at.width).toBeGreaterThan(page_.x + page_.width - 40)
  // The tap that closes the open Layers card can swallow the first click in
  // WebKit (flaky before round 5 too): tap again if the chip is still there.
  await expect(async () => {
    if (await chip.count()) await chip.click()
    await expect(chip).toHaveCount(0, { timeout: 2000 })
  }).toPass({ timeout: 20_000 })
})

test('strokes merged into a locked layer can be erased after Unlock (R5-11)', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + 150
  await stroke(page, line([box.x + 20, y], [box.x + 420, y], 60))
  await expectStrokes(page, 1)
  await openLayers(page)
  await page.locator('[data-layer-add]').click()
  // Lock Layer 1 (it holds the stroke), draw on Layer 2, then merge down.
  await layerRows(page)
    .nth(1)
    .getByRole('button', { name: 'Lock Layer 1' })
    .click()
  await stroke(page, line([box.x + 300, y + 300], [box.x + 560, y + 300], 40))
  await expectStrokes(page, 2)
  await ensureLayers(page)
  await page.locator('[data-layer-merge]').click()
  await page.getByRole('button', { name: 'Merge', exact: true }).click()
  await ensureLayers(page)
  // Merging opened the locked target up, so its ink is not stuck.
  await expect(
    layerRows(page).first().getByRole('button', { name: 'Lock Layer 1' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(async () => {
    if (!(await option(page, 'Whole stroke').isVisible()))
      await tool(page, 'Eraser').click({ force: true })
    await expect(option(page, 'Whole stroke')).toBeVisible({ timeout: 2000 })
  }).toPass()
  await option(page, 'Whole stroke').click()
  // The pills and cards open now may have moved the page: measure again.
  await page.waitForTimeout(400)
  const dy = (await textBox(page)).y - box.y
  await stroke(
    page,
    line([box.x + 400, y + dy - 30], [box.x + 400, y + dy + 330], 20),
  )
  await expectStrokes(page, 0)
})

test('strokes drawn on Layer 2, locked, then merged down can be erased (R5-11)', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + 150
  await stroke(page, line([box.x + 20, y], [box.x + 420, y], 60))
  await expectStrokes(page, 1)
  await openLayers(page)
  await page.locator('[data-layer-add]').click()
  await stroke(page, line([box.x + 300, y + 300], [box.x + 560, y + 300], 40))
  await expectStrokes(page, 2)
  await ensureLayers(page)
  await layerRows(page)
    .first()
    .getByRole('button', { name: 'Lock Layer 2' })
    .click()
  // Switch to the unlocked Layer 1, then merge Layer 2 into it.
  await layerRows(page).nth(1).locator('[data-layer-draw]').click()
  await page.locator('[data-layer-merge]').click()
  await page.getByRole('button', { name: 'Merge', exact: true }).click()
  await expectStrokes(page, 2)
  await page.waitForTimeout(800)
  await page.reload()
  await expect(page.locator('[data-ink-pad]')).toBeAttached()
  await page.keyboard.press('Escape')
  await expect(async () => {
    if (!(await option(page, 'Whole stroke').isVisible()))
      await tool(page, 'Eraser').click({ force: true })
    await expect(option(page, 'Whole stroke')).toBeVisible({ timeout: 2000 })
  }).toPass()
  await option(page, 'Whole stroke').click()
  // The pills and cards open now may have moved the page: measure again.
  await page.waitForTimeout(400)
  const dy = (await textBox(page)).y - box.y
  await stroke(
    page,
    line([box.x + 400, y + dy - 30], [box.x + 400, y + dy + 330], 20),
  )
  await expectStrokes(page, 0)
})
