// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, type Page } from '@playwright/test'
import { openNote, tool } from './mainBarHelpers.ts'

/** Shared steps for the ink tests: simulated pen events, and reading what was saved. */

export type Pt = [number, number]

export interface SavedStroke {
  id: string
  at: number
  kind: 'ink' | 'highlight'
  style: {
    pen: string
    colour: string
    width: number
    line: string
    opacity: number
    behind: boolean
  }
  pts: number[]
  bw: number
  shape?: string
  fill?: boolean
}
interface SavedChunk {
  id: string
  layerId: string
  blockId: string | null
  strokes: SavedStroke[]
  deletedAt: number | null
}
interface SavedLayer {
  id: string
  name: string
  hidden?: boolean
  locked?: boolean
  deletedAt: number | null
}

/** Opens a note in the given mode and chooses an ink tool. */
export async function inkNote(
  page: Page,
  name: 'Pen' | 'Highlighter' | 'Eraser' | 'Lasso',
  mode: 'computer' | 'touch' | 'pencil' = 'pencil',
  keys: Record<string, unknown> = {},
) {
  await openNote(page, mode, keys)
  await tool(page, name).click()
  await expect(page.locator('[data-ink-pad]')).toBeAttached()
  // A short note sits at the top: the pill floats over the page (R6-8), so
  // show the page from its first line, as the specs measure it there.
  await page.evaluate(() => {
    const s = document.querySelector('[data-page-scroller]')
    if (s) s.scrollTop = 0
  })
  await page.waitForTimeout(100)
}

/** The page's text block (a place to draw over). */
export async function textBox(page: Page) {
  const box = await page.locator('.bn-block-content').first().boundingBox()
  if (!box) throw new Error('no text')
  return box
}

const frames = (page: Page, n = 2) =>
  page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        const step = (i: number) =>
          i === 0 ? resolve() : requestAnimationFrame(() => step(i - 1))
        step(count)
      }),
    n,
  )

export interface StrokeOptions {
  type?: 'pen' | 'mouse' | 'touch'
  pressure?: number | ((i: number, n: number) => number)
  /** Stay still this long (ms) before lifting (draw and hold). */
  holdMs?: number
  /** Do not lift (the stroke stays open). */
  keepDown?: boolean
  id?: number
  tilt?: [number, number]
}

/** Draws a stroke with simulated pointer events (client coordinates). */
export async function stroke(page: Page, pts: Pt[], o: StrokeOptions = {}) {
  await page.evaluate(
    async ({ pts, o }) => {
      const type = o.type ?? 'pen'
      const id = o.id ?? 7
      const make = (name: string, p: number[], i: number) =>
        new PointerEvent(name, {
          pointerType: type,
          pointerId: id,
          clientX: p[0],
          clientY: p[1],
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
          pressure:
            type === 'pen'
              ? typeof o.pressure === 'number'
                ? o.pressure
                : 0.3 +
                  0.5 * Math.sin((i / Math.max(1, pts.length - 1)) * Math.PI)
              : 0.5,
          tiltX: o.tilt?.[0] ?? 0,
          tiltY: o.tilt?.[1] ?? 0,
        })
      const target = document.elementFromPoint(pts[0][0], pts[0][1])!
      target.dispatchEvent(make('pointerdown', pts[0], 0))
      for (let i = 1; i < pts.length; i++) {
        target.dispatchEvent(make('pointermove', pts[i], i))
        if (i % 4 === 0) await new Promise((r) => setTimeout(r, 4))
      }
      if (o.holdMs) await new Promise((r) => setTimeout(r, o.holdMs))
      if (!o.keepDown) {
        target.dispatchEvent(make('pointerup', pts[pts.length - 1], pts.length))
      }
    },
    { pts, o },
  )
  await frames(page)
}

/** Points along a wavy line from (x0, y) to (x1, y). */
export function wave(
  x0: number,
  x1: number,
  y: number,
  amp = 12,
  n = 40,
): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const k = i / (n - 1)
    return [x0 + (x1 - x0) * k, y + Math.sin(k * Math.PI * 3) * amp] as Pt
  })
}

/** A straight line of n points. */
export function line(a: Pt, b: Pt, n = 24): Pt[] {
  return Array.from({ length: n }, (_, i) => [
    a[0] + ((b[0] - a[0]) * i) / (n - 1),
    a[1] + ((b[1] - a[1]) * i) / (n - 1),
  ]) as Pt[]
}

/** The saved ink rows of the open database. */
export async function savedInk(page: Page) {
  const data = await page.evaluate(
    () =>
      new Promise<{ chunks: SavedChunk[]; layers: SavedLayer[] }>(
        (resolve, reject) => {
          const open = indexedDB.open('learning-notes')
          open.onerror = () => reject(open.error)
          open.onsuccess = () => {
            const db = open.result
            const tx = db.transaction(['inkChunks', 'inkLayers'])
            const c = tx.objectStore('inkChunks').getAll()
            const l = tx.objectStore('inkLayers').getAll()
            tx.oncomplete = () => {
              db.close()
              resolve({ chunks: c.result, layers: l.result })
            }
          }
        },
      ),
  )
  const live = data.chunks.filter((c) => c.deletedAt === null)
  return {
    layers: data.layers.filter((l) => l.deletedAt === null),
    chunks: live,
    strokes: live.flatMap((c) => c.strokes),
  }
}

/** Waits until the saved strokes satisfy a check (saving is a moment after drawing). */
export async function expectStrokes(
  page: Page,
  count: number,
): Promise<SavedStroke[]> {
  await expect
    .poll(async () => (await savedInk(page)).strokes.length, { timeout: 8000 })
    .toBe(count)
  return (await savedInk(page)).strokes
}

/** How many pixels of a canvas are painted. */
export const painted = (page: Page, canvas: 'ink' | 'highlights' | 'live') =>
  page.evaluate((name) => {
    const c = document.querySelector<HTMLCanvasElement>(
      `[data-ink-canvas="${name}"]`,
    )!
    const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
    let n = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] > 8) n++
    return n
  }, canvas)

/** The bounding box of painted pixels of a canvas (device px), or null. */
export const paintedBox = (page: Page, canvas: 'ink' | 'highlights') =>
  page.evaluate((name) => {
    const c = document.querySelector<HTMLCanvasElement>(
      `[data-ink-canvas="${name}"]`,
    )!
    const { width, height } = c
    const data = c.getContext('2d')!.getImageData(0, 0, width, height).data
    let x0 = width
    let y0 = height
    let x1 = -1
    let y1 = -1
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
    return x1 < 0 ? null : { x0, y0, x1, y1, dpr: c.width / c.clientWidth }
  }, canvas)
