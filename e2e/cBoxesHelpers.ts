// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, type Locator, type Page } from '@playwright/test'
import {
  createNotebook,
  pickBox,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Helpers of the text box fixes C8 to C15 (16 Nov 2026): a page with the text
 * box v2 switch ON, boxes in one row and in columns, and a mouse drag with a
 * hold, as the iPad does it.
 */
export const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
export const HOW = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
export const rect = async (l: Locator) => (await l.boundingBox())!
export const dot = (box: Locator, how: string) =>
  box.locator(`[data-resize-handle="${how}"]`)
/** Where a finger lands on a dot: the ring drawn on the edge (the grip may cover the rest of its target). */
export const ring = (box: Locator, how: string) =>
  dot(box, how).locator('[data-handle-dot]')
export const centre = async (l: Locator) => {
  const r = await rect(l)
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
}

export async function start(
  page: Page,
  name: string,
  typeMain = true,
  flags: string[] = ['textbox.v2'],
) {
  await page.addInitScript(
    (f) => localStorage.setItem('learning-notes:flags', JSON.stringify(f)),
    flags,
  )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  if (typeMain) await typeInEditor(page, 'Main text')
}

/** A box with these lines, left unselected; `down` px under the main text. */
export async function addBox(page: Page, lines: string[], fx = 0.3, down = 60) {
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const n = await page.locator(EXTRA).count()
  await page.mouse.click(
    sheet.x + sheet.width * fx,
    main.y + main.height + down,
  )
  const box = page.locator(EXTRA).nth(n)
  await expect(page.locator(EXTRA)).toHaveCount(n + 1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  for (const [i, l] of lines.entries()) {
    if (i > 0) await page.keyboard.press('Enter')
    await page.keyboard.type(l)
  }
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  return box
}

/** A mouse drag from `from` to `to`, held `hold` ms before the first move. */
export async function drag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  o: { hold?: number; up?: boolean } = {},
) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.waitForTimeout(o.hold ?? 160)
  await page.mouse.move(to.x, to.y, { steps: 8 })
  if (o.up !== false) {
    await page.mouse.up()
    await page.waitForTimeout(500)
  }
}

/** Lifts `box` by its ≡ tab and drops it on a spot (u, v of 0..1) of `target`. */
export async function dropOn(
  page: Page,
  box: Locator,
  target: Locator,
  u: number,
  v: number,
) {
  await pickBox(page, box)
  const g = await centre(box.locator('[data-box-grip]'))
  const t = await rect(target)
  await drag(page, g, { x: t.x + t.width * u, y: t.y + t.height * v })
  await page.waitForTimeout(400)
}

/**
 * Three boxes: A (brown) on the left, B (green) on the right and C (blue)
 * under B. Each has `lines` lines of text. Returns them, all unselected.
 */
export async function columns(page: Page, lines = 3, top = 60) {
  const text = (n: string) =>
    Array.from({ length: lines }, (_, i) => n + (i + 1))
  const a = await addBox(page, text('Brown '), 0.3, top)
  const b = await addBox(page, text('Green '), 0.3, top + 140)
  const c = await addBox(page, text('Blue '), 0.3, top + 280)
  await dropOn(page, b, a, 0.9, 0.5)
  await expect(page.locator('[data-grid-divider]').first()).toBeVisible()
  await dropOn(page, c, b, 0.5, 0.93)
  await page.waitForTimeout(600)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  return { a, b, c }
}

/** Two boxes side by side: left and right. */
export async function twoBoxes(page: Page, lines = 3) {
  const text = (n: string) =>
    Array.from({ length: lines }, (_, i) => n + (i + 1))
  const a = await addBox(page, text('Left '), 0.3, 60)
  const b = await addBox(page, text('Right '), 0.3, 200)
  await dropOn(page, b, a, 0.9, 0.5)
  await expect(page.locator('[data-grid-divider]').first()).toBeVisible()
  await page.waitForTimeout(400)
  return { a, b }
}

/** Selects a box by a tap on one of its four frame strips (works in a crowded layout). */
export async function pick(page: Page, box: Locator) {
  const r = (await box.boundingBox())!
  const spots = [
    [r.x + r.width / 2, r.y - 4],
    [r.x + r.width / 2, r.y + r.height + 4],
    [r.x - 4, r.y + r.height / 2],
    [r.x + r.width + 4, r.y + r.height / 2],
  ]
  for (const [x, y] of spots) {
    await page.mouse.click(x, y)
    await page.waitForTimeout(150)
    if (
      (await box.getAttribute('data-picked')) !== null &&
      (await box.getAttribute('data-typing')) === null
    )
      return
  }
  await expect(box).toHaveAttribute('data-picked', '')
}

/** One tap on bare paper below every box. */
export async function tapOut(page: Page) {
  // Phones draw no sheets: the column is the first box.
  const sheetEl = page.locator('[data-paper-sheet="1"]')
  const sheet = await rect(
    (await sheetEl.count()) ? sheetEl : page.locator('[data-paper-box="main"]'),
  )
  // Under the lowest box, at the right of the page.
  const bottom = await page.evaluate(() =>
    Math.max(
      ...[...document.querySelectorAll('[data-paper-box]')].map(
        (el) => el.getBoundingClientRect().bottom,
      ),
    ),
  )
  await page.mouse.click(sheet.x + sheet.width * 0.85, bottom + 120)
  await page.waitForTimeout(350)
}

/** The page called `title` gets a fill and padding on its default box (stored, then reloaded). */
export async function styleMain(page: Page, title: string) {
  await page.waitForTimeout(800)
  await page.evaluate(
    (t) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('pages', 'readwrite')
          const store = tx.objectStore('pages')
          const all = store.getAll()
          all.onsuccess = () => {
            for (const p of all.result)
              if (p.title === t)
                store.put({
                  ...p,
                  boxes: [
                    ...(p.boxes ?? []).filter(
                      (b: { id: string }) => b.id !== 'main',
                    ),
                    {
                      id: 'main',
                      x: 15,
                      y: 8,
                      w: 180,
                      style: { bg: 'lime', radius: 8, pad: 8 },
                    },
                  ],
                  updatedAt: Date.now(),
                })
          }
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
        }
      }),
    title,
  )
  await page.reload()
  await page.waitForTimeout(1200)
}

/** All rects of the boxes (by order) as plain numbers. */
export async function rects(boxes: Locator[]) {
  return Promise.all(boxes.map(rect))
}

/** A tap on the end of the first line of text of a box (the caret goes there). */
export async function tapTextEnd(page: Page, box: Locator) {
  const t = await rect(box.locator('.bn-inline-content').first())
  await page.mouse.click(t.x + t.width - 1, t.y + t.height / 2)
}

/** Gives the boxes of the page called `title` these colours (in page order), then reloads. */
export async function colourBoxes(
  page: Page,
  title: string,
  colours: string[],
) {
  await page.waitForTimeout(800)
  await page.evaluate(
    ([t, cols]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('pages', 'readwrite')
          const store = tx.objectStore('pages')
          const all = store.getAll()
          all.onsuccess = () => {
            for (const p of all.result)
              if (p.title === t)
                store.put({
                  ...p,
                  boxes: (p.boxes ?? []).map((b: { id: string }, i: number) =>
                    b.id === 'main'
                      ? b
                      : { ...b, colour: cols[i % cols.length] },
                  ),
                  updatedAt: Date.now(),
                })
          }
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
        }
      }),
    [title, colours] as [string, string[]],
  )
  await page.reload()
  await page.waitForTimeout(1500)
}

/**
 * C27: a new box is the whole line wide. Makes it narrower by pulling its east
 * dot left (or its west dot right, which also moves its left edge) by `by` px.
 */
export async function narrowBox(
  page: Page,
  box: Locator,
  side: 'e' | 'w',
  by: number,
) {
  await pick(page, box)
  const c = await centre(ring(box, side))
  await drag(page, c, { x: c.x + (side === 'e' ? -by : by), y: c.y })
  await page.waitForTimeout(300)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  // Leave it unselected: a Text-tool tap on paper only deselects a picked box.
  await page.keyboard.press('Escape')
  await expect(box).not.toHaveAttribute('data-picked', '')
  await page.waitForTimeout(600)
}
