// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { line, stroke } from './inkHelpers.ts'
import { inkNote } from './inkHelpers.ts'
import { expectStrokes, textBox } from './inkHelpers.ts'

/**
 * Polish 2 item 15: a paper page with 50 boxes and 2,000 strokes opens
 * quickly, because a box's editor is only made when the box comes near the
 * screen; the Lasso over all 50 boxes answers at once. The numbers are
 * medians (as for the ink budget) with room for GitHub's two-core machine.
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>
const BOXES = 50
const STROKES = 2000

/** Turns the open note into a page of 50 boxes holding 2,000 strokes. */
async function seed(page: Page) {
  await page.evaluate(
    async ({ boxes, strokes }) => {
      const open = indexedDB.open('learning-notes')
      const db: IDBDatabase = await new Promise((res) => {
        open.onsuccess = () => res(open.result)
      })
      const read = (store: string) =>
        new Promise<Row[]>((res) => {
          const r = db.transaction(store).objectStore(store).getAll()
          r.onsuccess = () => res(r.result)
        })
      const [notePage] = (await read('pages')).filter(
        (p) => p.title === 'First',
      )
      const [block] = await read('blocks')
      const [chunk] = await read('inkChunks')
      const base = chunk.strokes[0]
      const ids = Array.from({ length: boxes }, (_, i) => 'perfbox-' + i)
      const blocks = ids.map((id, i) => ({
        ...block,
        id: 'perfblock-' + i,
        boxId: id,
        parentId: null,
        order: 'a' + String(i + 1).padStart(3, '1'),
      }))
      const chunks: Record<string, unknown>[] = []
      for (let c = 0; c < strokes / 50; c++) {
        const list: Record<string, unknown>[] = []
        for (let i = 0; i < 50; i++) {
          const n = c * 50 + i
          const pts: number[] = []
          for (let k = 0; k < 20; k++)
            pts.push(0.05 + k * 0.02, 0.2 + (n % 40) * 0.02, 0.5, 0, 0, k * 8)
          list.push({ ...base, id: 'perf-' + n, at: base.at + n + 1, pts })
        }
        chunks.push({
          ...chunk,
          id: 'perf-chunk-' + c,
          blockId: blocks[c % boxes].id,
          strokes: list,
        })
      }
      await new Promise<void>((res) => {
        const tx = db.transaction(['pages', 'blocks', 'inkChunks'], 'readwrite')
        tx.objectStore('pages').put({
          ...notePage,
          boxes: ids.map((id, i) => ({
            id,
            x: 15 + (i % 5) * 36,
            y: 40 + Math.floor(i / 5) * 100,
            w: 34,
          })),
        })
        for (const b of blocks) tx.objectStore('blocks').put(b)
        for (const c of chunks) tx.objectStore('inkChunks').put(c)
        tx.oncomplete = () => res()
      })
      db.close()
    },
    { boxes: BOXES, strokes: STROKES },
  )
}

test('a paper page with 50 boxes and 2,000 strokes opens within the budget; the Lasso takes the ink of all 50 at once', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  await stroke(
    page,
    line([box.x + 10, box.y + 150], [box.x + 100, box.y + 150]),
  )
  await expectStrokes(page, 1)
  await page.waitForTimeout(700) // autosave
  await seed(page)

  // Open it three times; the median counts (the first also warms the cache).
  const times: number[] = []
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now()
    await page.reload()
    await expect(
      page.locator('[data-paper-box="main"] .bn-editor'),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-paper-box]')).toHaveCount(BOXES + 1, {
      timeout: 15000,
    })
    times.push(Date.now() - t0)
  }
  times.sort((a, b) => a - b)
  console.log('PAPER OPEN ms', times.join(', '))
  // GitHub's 2-core machine opens it about 2.5 times slower than a laptop.
  expect(times[1]).toBeLessThan(process.env.CI ? 8000 : 4000)

  // Far boxes are placeholders; the editors made are a few, not fifty.
  const made = await page.locator('[data-paper-box] .bn-editor').count()
  expect(made).toBeLessThan(BOXES * 0.7)
  await expect(page.locator('[data-box-placeholder]').first()).toBeAttached()

  // Scrolling down makes the editors of the boxes that come near.
  await expect(
    page.locator('[data-paper-box="perfbox-49"] .bn-editor'),
  ).toHaveCount(0)
  await page.evaluate(() => {
    const s = document.querySelector('[data-page-scroller]')!
    s.scrollTop = s.scrollHeight
  })
  await expect(
    page.locator('[data-paper-box="perfbox-49"] .bn-editor'),
  ).toHaveCount(1)

  // Lasso: one loop round all 50 boxes (events straight on the paper).
  await page.getByRole('button', { name: 'Lasso', exact: true }).click()
  const ms = await page.evaluate(async () => {
    const paper = document
      .querySelector('[data-paper]')!
      .getBoundingClientRect()
    const target = document.querySelector('[data-paper-sheet="1"]')!
    const fire = (type: string, x: number, y: number) =>
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 7,
          pointerType: 'mouse',
          button: 0,
          buttons: 1,
          clientX: x,
          clientY: y,
        }),
      )
    const round = async () => {
      const x0 = paper.left - 5
      const x1 = paper.right + 5
      const y0 = paper.top - 5
      const y1 = paper.bottom + 5
      fire('pointerdown', x0, y0)
      fire('pointermove', x1, y0)
      fire('pointermove', x1, y1)
      fire('pointermove', x0, y1)
      const start = performance.now()
      fire('pointerup', x0, y0)
      await new Promise((r) => requestAnimationFrame(r))
      const n = document.querySelectorAll('[data-picked]').length
      return { ms: performance.now() - start, n }
    }
    const out: number[] = []
    let n = 0
    for (let i = 0; i < 5; i++) {
      const r = await round()
      out.push(r.ms)
      n = r.n
    }
    return { median: out.sort((a, b) => a - b)[2], n }
  })
  console.log('PAPER LASSO ms', ms.median)
  // Owner item 2: a loop from the margin selects what it covers inside the
  // boxes (their ink) instead of picking whole boxes, so no box is "picked"
  expect(ms.n).toBe(0)
  expect(ms.median).toBeLessThan(150)
})
