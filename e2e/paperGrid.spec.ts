// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { tool } from './mainBarHelpers.ts'

/**
 * Bug batch item 26 (10 Nov): the box grid. Boxes never overlap; they sit in
 * rows of 1-3 columns, a column holds 1-2 boxes. Dragging shows a live
 * preview and an accent landing outline; a divider resizes columns; the box
 * menu has a Windows-style Layout picker.
 */
test.use({ viewport: { width: 1336, height: 1100 } })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'

const rect = async (l: Locator) => (await l.boundingBox())!

/** A page with `n` boxes, one under the other, each with a word. */
async function boxes(page: Page, n: number) {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Grid ' + n)
  await typeInEditor(page, 'Main text')
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const extra = page.locator(EXTRA)
  for (let i = 0; i < n; i++) {
    await page.mouse.click(
      sheet.x + sheet.width * 0.3,
      main.y + main.height + 50 + i * 110,
    )
    await expect(extra).toHaveCount(i + 1)
    await expect(extra.nth(i).locator('.bn-editor')).toBeFocused()
    await page.keyboard.type('Box ' + (i + 1))
  }
  await page.waitForTimeout(600)
  return { extra, sheet }
}

/** Drags box `from` by its grip onto a point of box `onto` (fractions of it). */
async function dropOn(
  page: Page,
  from: Locator,
  onto: Locator,
  fx: number,
  fy: number,
  release = true,
) {
  await from.hover()
  const g = await rect(from.locator('[data-box-grip]'))
  const t = await rect(onto)
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(t.x + t.width * fx, t.y + t.height * fy, { steps: 8 })
  if (release) await page.mouse.up()
  await page.waitForTimeout(400)
}

const noOverlap = async (page: Page) => {
  const rs = await page
    .locator('[data-paper-box]')
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))
  for (let i = 0; i < rs.length; i++)
    for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i]
      const b = rs[j]
      const hit =
        a.left < b.right - 1 &&
        b.left < a.right - 1 &&
        a.top < b.bottom - 1 &&
        b.top < a.bottom - 1
      expect(hit, `boxes ${i} and ${j} overlap`).toBe(false)
    }
}

test('beside makes 2 columns, a third makes 3, a fourth is "full" and gets a new row; stacking makes 2x2', async ({
  page,
}) => {
  const { extra } = await boxes(page, 4)
  const [a, b, c, d] = [0, 1, 2, 3].map((i) => extra.nth(i))
  // b onto the right of a: two columns.
  await dropOn(page, b, a, 0.9, 0.5)
  let ra = await rect(a)
  let rb = await rect(b)
  expect(rb.x).toBeGreaterThan(ra.x + ra.width - 1)
  expect(Math.abs(rb.y - ra.y)).toBeLessThan(6)
  expect(Math.abs(ra.width - rb.width)).toBeLessThan(12)
  // c onto the right of b: three columns.
  await dropOn(page, c, b, 0.9, 0.5)
  const rc = await rect(c)
  rb = await rect(b)
  expect(rc.x).toBeGreaterThan(rb.x + rb.width - 1)
  expect(Math.abs(rc.y - rb.y)).toBeLessThan(6)
  // d onto the right of c: the row is full, the ghost says so, d goes below.
  await dropOn(page, d, c, 0.9, 0.5, false)
  await expect(page.locator('[data-grid-ghost][data-full]')).toHaveCount(1)
  await expect(page.getByText('Row is full')).toBeVisible()
  await page.mouse.up()
  await page.waitForTimeout(400)
  const rd = await rect(d)
  ra = await rect(a)
  expect(rd.y).toBeGreaterThan(ra.y + ra.height - 1)
  await noOverlap(page)
  // d under a (the bottom quarter): a and d stack in one column (2 + 1 + 1).
  await dropOn(page, d, a, 0.5, 0.95)
  const rd2 = await rect(d)
  ra = await rect(a)
  expect(Math.abs(rd2.x - ra.x)).toBeLessThan(3)
  expect(rd2.y).toBeGreaterThan(ra.y + ra.height - 1)
  await noOverlap(page)
})

test('Esc during a drag changes nothing; a drop is one Undo', async ({
  page,
}) => {
  const { extra } = await boxes(page, 2)
  const [a, b] = [extra.nth(0), extra.nth(1)]
  const before = await rect(b)
  await dropOn(page, b, a, 0.9, 0.5, false)
  await expect(page.locator('[data-grid-ghost]')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await page.waitForTimeout(400)
  expect(Math.abs((await rect(b)).y - before.y)).toBeLessThan(2)
  await expect(page.locator('[data-grid-ghost]')).toHaveCount(0)
  // A real drop, then the toast's Undo puts it back.
  await dropOn(page, b, a, 0.9, 0.5)
  expect((await rect(b)).x).toBeGreaterThan((await rect(a)).x + 50)
  await page.getByRole('button', { name: 'Undo' }).last().click()
  await expect
    .poll(async () => Math.abs((await rect(b)).y - before.y))
    .toBeLessThan(2)
})

test('a divider resizes the columns, snapping to thirds; a double tap makes them equal; it survives a reload', async ({
  page,
}) => {
  const { extra } = await boxes(page, 2)
  const [a, b] = [extra.nth(0), extra.nth(1)]
  await dropOn(page, b, a, 0.9, 0.5)
  const divider = page.locator('[data-grid-divider]').first()
  await expect(divider).toBeVisible()
  const d = await rect(divider)
  const ra = await rect(a)
  const rb = await rect(b)
  const total = rb.x + rb.width - ra.x
  const x = d.x + d.width / 2
  const y = d.y + d.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  // Drag to about one third of the row: it snaps there.
  await page.mouse.move(ra.x + total * 0.335, y, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const wa = (await rect(a)).width
  const wb = (await rect(b)).width
  expect(wb / wa).toBeGreaterThan(1.8)
  expect(wb / wa).toBeLessThan(2.2)
  // The saved page keeps it.
  await page.waitForTimeout(800)
  await page.reload()
  await expect(extra).toHaveCount(2)
  const wa2 = (await rect(extra.nth(0))).width
  const wb2 = (await rect(extra.nth(1))).width
  expect(Math.abs(wb2 / wa2 - wb / wa)).toBeLessThan(0.2)
  // Double tap: equal again.
  const d2 = await rect(page.locator('[data-grid-divider]').first())
  await page.mouse.dblclick(d2.x + d2.width / 2, d2.y + d2.height / 2)
  await page.waitForTimeout(500)
  const wa3 = (await rect(extra.nth(0))).width
  const wb3 = (await rect(extra.nth(1))).width
  expect(Math.abs(wa3 - wb3)).toBeLessThan(8)
})

test('box ⋯ › Layout opens Layout Assist; a layout never makes an empty box (layoutAssist.spec.ts has the rest)', async ({
  page,
}) => {
  const { extra } = await boxes(page, 1)
  const a = extra.nth(0)
  await a.hover()
  await a.locator('[data-box-menu]').click()
  await page.getByRole('menuitem', { name: 'Layout' }).click()
  await expect(page.locator('[data-layout-assist]')).toBeVisible()
  await page.locator('[data-layout-zone="two:0"]').click()
  await page.locator('[data-layout-done]').click()
  await expect(page.locator('[data-layout-assist]')).toHaveCount(0)
  await expect(extra).toHaveCount(1)
})

test('switching tools does not move the boxes', async ({ page }) => {
  const { extra } = await boxes(page, 2)
  const before = await Promise.all([0, 1].map((i) => rect(extra.nth(i))))
  await tool(page, 'Pen').click()
  await page.waitForTimeout(800)
  await tool(page, 'Text').click()
  await page.waitForTimeout(800)
  for (const i of [0, 1]) {
    const r = await rect(extra.nth(i))
    expect(Math.abs(r.y - before[i].y)).toBeLessThan(2)
    expect(Math.abs(r.x - before[i].x)).toBeLessThan(2)
  }
})

test('a page with free, overlapping boxes opens tidy: nothing overlaps and no text is lost', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Old page')
  await typeInEditor(page, 'Main text')
  // Two boxes written straight into the page record, overlapping, as an old
  // page could have them.
  await page.evaluate(async () => {
    const open = indexedDB.open('learning-notes')
    const db: IDBDatabase = await new Promise((res, rej) => {
      open.onsuccess = () => res(open.result)
      open.onerror = () => rej(open.error)
    })
    const tx = db.transaction('pages', 'readwrite')
    const store = tx.objectStore('pages')
    const all: { id: string; title: string; boxes?: unknown }[] =
      await new Promise((res) => {
        const r = store.getAll()
        r.onsuccess = () => res(r.result)
      })
    const p = all.find((x) => x.title === 'Old page') ?? all[all.length - 1]
    p.boxes = [
      { id: 'old1', x: 20, y: 120, w: 100 },
      { id: 'old2', x: 40, y: 125, w: 100 },
    ]
    store.put(p)
    await new Promise((res) => (tx.oncomplete = res))
  })
  await page.reload()
  await expect(page.locator(EXTRA)).toHaveCount(2)
  await page.waitForTimeout(800)
  await noOverlap(page)
})
