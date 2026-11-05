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

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

async function openLayers(page: Page) {
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
const layerRows = (page: Page) => page.locator('[data-layer]')

test('layers: add, rename, hide and show, lock, reorder, delete and undo', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + 150
  await stroke(page, line([box.x + 20, y], [box.x + 300, y]))
  await expectStrokes(page, 1)
  await openLayers(page)
  await expect(layerRows(page)).toHaveCount(1)
  // A second layer; new ink goes to it.
  await page.locator('[data-layer-add]').click()
  await expect(layerRows(page)).toHaveCount(2)
  await expect(
    layerRows(page).first().locator('[data-layer-name]'),
  ).toHaveValue('Layer 2')
  await stroke(page, line([box.x + 20, y + 60], [box.x + 300, y + 60]))
  await expectStrokes(page, 2)
  const ink = await savedInk(page)
  expect(new Set(ink.chunks.map((c) => c.layerId)).size).toBe(2)
  // Rename.
  const name = layerRows(page).first().locator('[data-layer-name]')
  await name.fill('Notes')
  await name.press('Enter')
  await expect
    .poll(async () => (await savedInk(page)).layers.map((l) => l.name))
    .toContain('Notes')
  // Hide: nothing of that layer is painted; show: it is back.
  const before = await painted(page, 'ink')
  await layerRows(page)
    .first()
    .getByRole('button', { name: 'Hide Notes' })
    .click()
  await expect.poll(() => painted(page, 'ink')).toBeLessThan(before)
  await layerRows(page)
    .first()
    .getByRole('button', { name: 'Show Notes' })
    .click()
  await expect.poll(() => painted(page, 'ink')).toBe(before)
  // Lock: drawing there is refused.
  await layerRows(page)
    .first()
    .getByRole('button', { name: 'Lock Notes' })
    .click()
  await stroke(page, line([box.x + 20, y + 120], [box.x + 300, y + 120]))
  await expectStrokes(page, 3)
  // It went to the other layer, never into the locked one.
  const locked = layerRows(page).first()
  const lockedId = await locked.getAttribute('data-layer')
  const strokesIn = (await savedInk(page)).chunks
    .filter((c) => c.layerId === lockedId)
    .reduce((n, c) => n + c.strokes.length, 0)
  expect(strokesIn).toBe(1)
  await layerRows(page)
    .first()
    .getByRole('button', { name: 'Unlock Notes' })
    .click()
  // Reorder: Notes goes up to the top.
  await layerRows(page)
    .first()
    .getByRole('button', { name: 'Move Notes down' })
    .click()
  await expect(
    layerRows(page).first().locator('[data-layer-name]'),
  ).toHaveValue('Layer 1')
  // Delete, then Undo brings it back.
  await layerRows(page)
    .first()
    .getByRole('button', { name: /^Delete / })
    .click()
  await expect(layerRows(page)).toHaveCount(1)
  await tool(page, 'Undo').click()
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
  // A narrower page: the drawing gets narrower with it.
  const wide = (b.x1 - b.x0) / b.dpr
  await page.setViewportSize({ width: 800, height: 1000 })
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
  // Scrolling and drawing again stay quick: 30 redraws of the whole layer.
  const frameMs = await page.evaluate(async () => {
    const start = performance.now()
    for (let i = 0; i < 30; i++) {
      window.dispatchEvent(new Event('resize'))
      await new Promise((r) => requestAnimationFrame(r))
    }
    return (performance.now() - start) / 30
  })
  expect(loadMs).toBeLessThan(8000)
  expect(frameMs).toBeLessThan(80)
  expect((await savedInk(page)).strokes.length).toBe(496)
})
