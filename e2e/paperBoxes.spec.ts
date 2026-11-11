// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  pickBox,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { tool } from './mainBarHelpers.ts'

/**
 * Owner fix 7 (9 Nov): GoodNotes-style boxes on paper pages. The Lasso shows
 * a box's frame and a tap selects it (handles to resize, grab to move);
 * several picked boxes move together; a dragged box is a see-through live
 * copy with a red landing line, the boxes below make room; light snap guides.
 */

test.use({ viewport: { width: 1336, height: 1100 } })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'

/** A page with `n` boxes in a column (each with a word), Text tool on. */
async function boxes(page: Page, n: number, dx = [0, 0, 0, 0]) {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Boxes ' + n)
  await typeInEditor(page, 'Main text')
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const extra = page.locator(EXTRA)
  for (let i = 0; i < n; i++) {
    await page.mouse.click(
      sheet.x + sheet.width * 0.2 + dx[i],
      main.y + main.height + 60 + i * 110,
    )
    await expect(extra).toHaveCount(i + 1)
    await expect(extra.nth(i).locator('.bn-editor')).toBeFocused()
    await page.keyboard.type('Box ' + (i + 1))
  }
  await page.waitForTimeout(500)
  return { extra, sheet }
}

/** Lasso tool on, its pill closed and the page still. */
async function lasso(page: Page) {
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
}

const centre = (r: {
  x: number
  y: number
  width: number
  height: number
}) => ({
  x: r.x + r.width / 2,
  y: r.y + r.height / 2,
})

test('Lasso: hover shows the frame, a tap selects, there are no side handles, the frame moves', async ({
  page,
}) => {
  const { extra } = await boxes(page, 1)
  await lasso(page)
  await expect(extra).toHaveAttribute('data-lasso', '')
  // 4a (owner): boxes are invisible until selected, hover shows no frame.
  await extra.hover()
  await expect(extra.locator('[data-box-frame]').first()).toHaveCSS(
    'border-top-color',
    'rgba(0, 0, 0, 0)',
  )
  await expect(extra.locator('[data-box-handle]')).toHaveCount(0)
  // A tap on the frame selects it (no width handles: the grid decides widths).
  const top = centre(
    (await extra.locator('[data-box-band="top"]').boundingBox())!,
  )
  await page.mouse.click(top.x, top.y)
  await expect(extra).toHaveAttribute('data-picked', '')
  await expect(extra.locator('[data-box-handle]')).toHaveCount(0)
  // Grabbing the frame moves it.
  const y0 = (await extra.boundingBox())!.y
  // A small box is moved by its ≡ grip (the handles cover its short top edge).
  const bandBox = (await extra.locator('[data-box-grip]').boundingBox())!
  const left = {
    x: bandBox.x + bandBox.width / 2,
    y: bandBox.y + bandBox.height / 2,
  }
  await page.mouse.move(left.x, left.y)
  await page.mouse.down()
  await page.mouse.move(left.x, left.y + 100, { steps: 6 })
  await page.mouse.up()
  await expect
    .poll(async () => (await extra.boundingBox())!.y)
    .toBeGreaterThan(y0 + 60)
  // Escape lets go.
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-picked]')).toHaveCount(0)
})

test('dragging shows a see-through copy and an accent landing outline; picked boxes move together in order with one Undo', async ({
  page,
}) => {
  const { extra } = await boxes(page, 2)
  await lasso(page)
  const a = extra.nth(0)
  const b = extra.nth(1)
  // Pick both (tap one, Shift-tap the other).
  const pa = centre((await a.locator('[data-box-band="top"]').boundingBox())!)
  await page.mouse.click(pa.x, pa.y)
  const pb = centre((await b.locator('[data-box-band="left"]').boundingBox())!)
  await page.keyboard.down('Shift')
  await page.mouse.click(pb.x, pb.y)
  await page.keyboard.up('Shift')
  await expect(page.locator('[data-picked]')).toHaveCount(2)
  const ya = (await a.boundingBox())!.y
  const yb = (await b.boundingBox())!.y
  // Drag by the first one's frame: live copy + red line while holding.
  const gb = (await a.locator('[data-box-grip]').boundingBox())!
  const g = { x: gb.x + gb.width / 2, y: gb.y + gb.height / 2 }
  await page.mouse.move(g.x, g.y)
  await page.mouse.down()
  await page.mouse.move(g.x, g.y + 120, { steps: 8 })
  await expect(a).toHaveAttribute('data-dragging', '')
  await expect(page.locator('[data-grid-ghost]')).toHaveCount(1)
  await page.mouse.up()
  // Both moved down together, in the same order, without overlapping.
  await expect
    .poll(async () => (await a.boundingBox())!.y)
    .toBeGreaterThan(ya + 80)
  const ra = (await a.boundingBox())!
  const rb = (await b.boundingBox())!
  expect(rb.y).toBeGreaterThanOrEqual(ra.y + ra.height - 1)
  void yb
  // One Undo puts both back.
  await page.getByRole('button', { name: 'Undo' }).last().click()
  await expect
    .poll(async () => Math.abs((await a.boundingBox())!.y - ya))
    .toBeLessThan(2)
  await expect
    .poll(async () => Math.abs((await b.boundingBox())!.y - yb))
    .toBeLessThan(2)
})

test('a box dropped on the right of another goes beside it: two columns, no overlap', async ({
  page,
}) => {
  const { extra } = await boxes(page, 2)
  const a = extra.nth(0)
  const b = extra.nth(1)
  await pickBox(page, b)
  const g = centre((await b.locator('[data-box-grip]').boundingBox())!)
  const ar = (await a.boundingBox())!
  await page.mouse.move(g.x, g.y)
  await page.mouse.down()
  // Onto the right third of the first box.
  await page.mouse.move(ar.x + ar.width * 0.9, ar.y + ar.height / 2, {
    steps: 8,
  })
  await expect(page.locator('[data-grid-ghost]')).toHaveCount(1)
  await page.mouse.up()
  await expect
    .poll(async () => {
      const ra = (await a.boundingBox())!
      const rb = (await b.boundingBox())!
      return rb.x >= ra.x + ra.width - 1 && Math.abs(rb.y - ra.y) < 6
    })
    .toBe(true)
  await expect(page.locator(EXTRA)).toHaveCount(2)
})

test('a row that does not fit what is left of a sheet starts on the next sheet', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Gap frame')
  await typeInEditor(page, 'Main text')
  await page
    .locator('[data-paper-sheet="1"]')
    .evaluate((el) => el.scrollIntoView({ block: 'end' }))
  await page.waitForTimeout(300)
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  await page.mouse.click(
    sheet.x + sheet.width * 0.3,
    sheet.y + sheet.height - 150,
  )
  const extra = page.locator(EXTRA)
  await expect(extra).toHaveCount(1)
  for (let i = 0; i < 14; i++) {
    await page.keyboard.type('Line ' + i)
    await page.keyboard.press('Enter')
  }
  await expect(extra.locator('[data-box-frame]')).toHaveCount(1)
  const s2 = (await page.locator('[data-paper-sheet="2"]').boundingBox())!
  const box = (await extra.boundingBox())!
  expect(box.y).toBeGreaterThanOrEqual(s2.y - 1)
})

test('a tapped box shows a floating bar above it: Style, Duplicate, Cut, Copy, Delete, More', async ({
  page,
}) => {
  const { extra } = await boxes(page, 1)
  await lasso(page)
  const top = centre(
    (await extra.locator('[data-box-band="top"]').boundingBox())!,
  )
  await page.mouse.click(top.x, top.y)
  const bar = extra.locator('[data-box-bar]')
  await expect(bar).toBeVisible()
  // Owner final 3b: the box bar has these six, text formatting is in the text bar.
  for (const id of ['style', 'duplicate', 'cut', 'copy', 'delete', 'more'])
    await expect(bar.locator(`[data-box-bar-action="${id}"]`)).toBeVisible()
  await expect(bar.locator('[data-box-bar-action="bold"]')).toHaveCount(0)
  // It sits above the box (above its grip row).
  const bb = (await bar.boundingBox())!
  const eb = (await extra.boundingBox())!
  expect(bb.y + bb.height).toBeLessThanOrEqual(eb.y)
  // Duplicate makes a second box.
  await bar.locator('[data-box-bar-action="duplicate"]').click()
  await expect(page.locator(EXTRA)).toHaveCount(2)
  // Delete removes the selected one; the toast's Undo brings it back.
  await expect(bar).toBeVisible()
  await bar.locator('[data-box-bar-action="delete"]').click()
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await page.getByRole('button', { name: 'Undo' }).last().click()
  await expect(page.locator(EXTRA)).toHaveCount(2)
})

test('Delete and Cut on a page-wide Ctrl+A selection empty every box; Undo brings it back', async ({
  page,
}) => {
  const { extra } = await boxes(page, 2)
  await extra.nth(0).locator('.bn-editor').click()
  for (let i = 0; i < 3; i++) await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await expect(page.getByText('Page emptied.')).toBeVisible()
  await expect(page.locator('[data-paper-box="main"]')).not.toContainText(
    'Main text',
  )
  await expect(extra.nth(0)).not.toContainText('Box 1')
  await expect(extra.nth(1)).not.toContainText('Box 2')
  await page.getByRole('button', { name: 'Undo' }).last().click()
  await expect(extra.nth(0)).toContainText('Box 1')
  await expect(page.locator('[data-paper-box="main"]')).toContainText(
    'Main text',
  )
  // Cut does the same.
  for (let i = 0; i < 3; i++) await page.keyboard.press('Control+a')
  await page.keyboard.press('Control+x')
  await expect(extra.nth(1)).not.toContainText('Box 2')
})

test('an empty box lying on the default box is repaired on open, and an empty box goes with Backspace', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Doubles')
  await typeInEditor(page, 'Main text')
  await page.waitForTimeout(800)
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const extra = page.locator(EXTRA)
  // Seed the broken page: an empty box lying on the default box.
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases()
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open(dbs[0].name!)
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    const tx = db.transaction(['pages', 'blocks'], 'readwrite')
    const all = <T>(name: string) =>
      new Promise<T[]>((res) => {
        const r = tx.objectStore(name).getAll()
        r.onsuccess = () => res(r.result as T[])
      })
    const blocks = await all<Record<string, unknown>>('blocks')
    const pages = await all<Record<string, unknown>>('pages')
    const src = blocks.find((x) =>
      JSON.stringify(x.content).includes('Main text'),
    )!
    const pg = pages.find((x) => x.id === src.pageId)!
    tx.objectStore('pages').put({
      ...pg,
      boxes: [{ id: 'dup', x: 16, y: 10, w: 90 }],
    })
    tx.objectStore('blocks').put({
      ...src,
      id: 'dupline',
      content: {},
      boxId: 'dup',
      order: 'a0',
    })
    await new Promise((r) => (tx.oncomplete = r))
    db.close()
  })
  await page.reload()
  await expect(page.locator('[data-paper-box="main"]')).toBeVisible()
  await expect(extra).toHaveCount(0)
  // An empty box far away: Backspace removes it (and a toast offers Undo).
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  await page.mouse.click(sheet.x + sheet.width * 0.5, main.y + main.height + 90)
  await expect(extra).toHaveCount(1)
  await expect(extra.locator('.bn-editor')).toBeFocused()
  await page.keyboard.press('Backspace')
  await expect(extra).toHaveCount(0)
})

test('one paragraph taller than a sheet is split at line boundaries: no line sits in the gap', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Tall block')
  await typeInEditor(page, 'Start')
  const words = Array.from({ length: 1400 }, (_, i) => 'word' + i).join(' ')
  await page.keyboard.insertText(' ' + words)
  await expect(page.locator('[data-paper-sheet="2"]')).toBeVisible()
  await expect(page.locator('[data-page-spacer]').first()).toBeAttached()
  const bad = await page.evaluate(() => {
    const s1 = document
      .querySelector('[data-paper-sheet="1"]')!
      .getBoundingClientRect()
    const s2 = document
      .querySelector('[data-paper-sheet="2"]')!
      .getBoundingClientRect()
    const p = document.querySelector(
      '[data-paper-box="main"] .bn-inline-content',
    )!
    const r = document.createRange()
    r.selectNodeContents(p)
    return Array.from(r.getClientRects()).filter(
      (x) =>
        x.height > 4 &&
        x.height < 60 &&
        x.bottom > s1.bottom + 1 &&
        x.top < s2.top - 1,
    ).length
  })
  expect(bad).toBe(0)
})
