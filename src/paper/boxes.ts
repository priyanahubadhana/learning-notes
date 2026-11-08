import type { Block, Page, PaperBox } from '../core/types'

/**
 * Phase Q box model (no DOM). Every page is paper; its blocks sit in boxes.
 * A page with no `boxes` (every page made before Phase Q) has exactly one
 * box, the default one, holding all its blocks: nothing is converted.
 */

/** Id of the default box: blocks with no `boxId` belong to it. */
export const MAIN_BOX = 'main'

/** Sheet sizes in mm. */
export const SHEETS = {
  A4: { w: 210, h: 297 },
  Letter: { w: 215.9, h: 279.4 },
} as const

/** Side margin of the default box, in mm. */
export const MARGIN = 15
/** Top margin of the default box, in mm (small: the text starts near the top). */
export const TOP = 8

export const sheetOf = (page: Pick<Page, 'sheet'>) => SHEETS[page.sheet ?? 'A4']

/** The default full-width box at the top of the first sheet. */
export function mainBox(page: Pick<Page, 'sheet'>): PaperBox {
  const s = sheetOf(page)
  return { id: MAIN_BOX, x: MARGIN, y: TOP, w: s.w - 2 * MARGIN }
}

/**
 * All boxes of a page: the default box first (its stored geometry if it
 * was moved, else the default), then the others as stored.
 */
export function boxesOf(page: Pick<Page, 'sheet' | 'boxes'>): PaperBox[] {
  const stored = page.boxes ?? []
  const main = stored.find((b) => b.id === MAIN_BOX) ?? mainBox(page)
  return [main, ...stored.filter((b) => b.id !== MAIN_BOX)]
}

/** The box a top-level block belongs to (unknown box = the default box). */
export function boxOfBlock(
  block: Pick<Block, 'boxId'>,
  known: ReadonlySet<string>,
): string {
  const id = block.boxId
  return id && known.has(id) ? id : MAIN_BOX
}

/**
 * Splits a page's live blocks by box. Nested blocks go with their top-level
 * ancestor. Order inside each group is kept. Every box gets a list, even
 * an empty one.
 */
export function groupBlocksByBox<
  B extends Pick<Block, 'id' | 'parentId' | 'boxId'>,
>(page: Pick<Page, 'sheet' | 'boxes'>, blocks: readonly B[]): Map<string, B[]> {
  const boxes = boxesOf(page)
  const known = new Set(boxes.map((b) => b.id))
  const groups = new Map<string, B[]>(boxes.map((b) => [b.id, []]))
  const byId = new Map(blocks.map((b) => [b.id, b]))
  const topOf = (b: B): B => {
    let cur = b
    for (let i = 0; i < 64 && cur.parentId; i++) {
      const up = byId.get(cur.parentId)
      if (!up) break
      cur = up
    }
    return cur
  }
  for (const b of blocks) groups.get(boxOfBlock(topOf(b), known))!.push(b)
  return groups
}

/**
 * Reading order (read aloud, export, search): top to bottom, then left to
 * right. Boxes whose tops are within `rowMm` count as one row.
 */
export function readingOrder(
  boxes: readonly PaperBox[],
  rowMm = 5,
): PaperBox[] {
  return [...boxes].sort((a, b) =>
    Math.abs(a.y - b.y) <= rowMm ? a.x - b.x : a.y - b.y,
  )
}

/**
 * A page's blocks in paper reading order (export, read aloud): box by box,
 * top to bottom then left to right, each box in its own order (`inOrder`).
 * A page with no boxes is exactly `inOrder(blocks)`.
 */
export function inPaperOrder<
  B extends Pick<Block, 'id' | 'parentId' | 'boxId'>,
>(
  page: Pick<Page, 'sheet' | 'boxes'>,
  blocks: B[],
  inOrder: (blocks: B[]) => B[],
): B[] {
  if (!page.boxes?.length) return inOrder(blocks)
  const groups = groupBlocksByBox(page, blocks)
  return readingOrder(boxesOf(page)).flatMap((b) =>
    inOrder(groups.get(b.id) ?? []),
  )
}

/** Gap between a box and the one made after it, in mm (more than a row). */
export const ORDER_STEP = 6

/**
 * Phones (stacked layout): where a new box goes in the reading order.
 * `after` = a box id (right after it), 'start' (before every other box) or
 * 'end'. Returns the new box's y and the boxes that must move down so the
 * reading order puts the new box exactly there (locked boxes stay put).
 */
export function placeInOrder(
  others: readonly PaperBox[],
  after: string,
): { y: number; shift: number; shifted: string[] } {
  const order = readingOrder(others.filter((b) => b.id !== MAIN_BOX))
  const at =
    after === 'end'
      ? order.length - 1
      : after === 'start'
        ? -1
        : order.findIndex((b) => b.id === after)
  const prev = at >= 0 ? order[at] : undefined
  const later = order.slice(at + 1)
  const y = Math.max(
    0,
    prev ? prev.y + ORDER_STEP : later[0] ? later[0].y - ORDER_STEP : 40,
  )
  const need = later[0] ? y + ORDER_STEP - later[0].y : 0
  const shift = Math.max(0, Math.round(need * 10) / 10)
  return {
    y,
    shift,
    shifted: shift > 0 ? later.filter((b) => !b.locked).map((b) => b.id) : [],
  }
}

/** Box colours (the highlight colours). */
export const BOX_COLOURS: Record<string, string> = {
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  pink: '#ec4899',
  purple: '#a855f7',
}
