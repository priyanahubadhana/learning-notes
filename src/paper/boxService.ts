import { quietTx } from '../core/historySteps'
import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import { cleanStyle } from '../core/boxStyle'
import {
  getLive,
  isLive,
  newRecordFields,
  softDeleteMany,
} from '../core/records'
import type { Block, GridRow, Page, PaperBox } from '../core/types'
import { toPlainText } from '../editor/mapping'
import { recordVersion } from '../history/versionService'
import { ordersBetween } from '../core/order'
import {
  boxesOf,
  groupBlocksByBox,
  MAIN_BOX,
  MARGIN,
  placeInOrder,
  sheetOf,
} from './boxes'
import { insertRow, migrateToRows, reconcile } from './grid'
import { SAFE_TOP_MM } from './safeGap'

/**
 * Phase Q step 3: adding, changing and removing boxes. Box geometry lives on
 * the page record (`Page.boxes`, mm); the blocks of a box carry its id.
 */

/** Smallest box width, in mm. */
export const MIN_W = 30
/** Width of a new box, in mm. */
export const NEW_W = 90
/** At most this many boxes on a page (also checked in backups). */
export const MAX_BOXES = 500

const round = (v: number) => Math.round(v * 10) / 10

/** Keeps a box on the paper: inside the sheet width, below the top. */
export function clampBox(box: PaperBox, sheetW: number): PaperBox {
  const w = round(Math.min(sheetW, Math.max(MIN_W, box.w)))
  const x = round(Math.min(sheetW - w, Math.max(0, box.x)))
  const y = round(Math.max(SAFE_TOP_MM, box.y))
  return { ...box, x, y, w }
}

async function writeBoxes(
  db: LearningNotesDB,
  pageId: string,
  edit: (boxes: PaperBox[]) => PaperBox[],
): Promise<PaperBox[]> {
  return db.transaction('rw', db.pages, async () => {
    const page = await getLive(db.pages, pageId)
    // The default box is stored only once it was moved or resized.
    const stored = page.boxes ?? []
    const next = edit(stored.map((b) => ({ ...b })))
    if (next.length > MAX_BOXES) throw new Error('Too many boxes')
    const update: Partial<Page> = {
      boxes: next.length ? next : undefined,
      updatedAt: Date.now(),
    }
    // Item 26: once a page has a box grid, it follows every box that is made,
    // removed or restored (a new box gets a row of its own at the end).
    if (page.rows) {
      update.rows = reconcile(page.rows, [
        MAIN_BOX,
        ...next.filter((b) => b.id !== MAIN_BOX).map((b) => b.id),
      ])
    }
    await db.pages.update(pageId, update)
    return next
  })
}

/** A new empty box at (x, y) mm; returns its id. */
export async function addBox(
  db: LearningNotesDB,
  pageId: string,
  at: {
    x: number
    y: number
    w?: number
    row?: number
    /** Text box v2: a small free box at x, as wide as its text. `rows` = the arrangement shown now. */
    free?: boolean
    rows?: GridRow[]
  },
): Promise<string> {
  const page = await getLive(db.pages, pageId)
  const sheet = sheetOf(page)
  const id = createId()
  // "Use for new boxes" (bug batch 2, item 8): the default style, never the page's own box.
  const style = cleanStyle(
    (await db.settings.get('paper.boxStyleDefault'))?.value,
  )
  const box = clampBox(
    {
      id,
      x: at.x,
      y: at.y,
      w: at.w ?? Math.min(NEW_W, sheet.w - at.x - MARGIN),
      ...(style ? { style } : {}),
    },
    sheet.w,
  )
  if (at.free) {
    // A free box: its place is a row of its own at the tap (the row's y is
    // the least top it may have; rows below it slide down).
    const free = { ...box, w: Math.max(MIN_W, sheet.w - at.x - MARGIN) }
    await db.transaction('rw', db.pages, async () => {
      const now = await getLive(db.pages, pageId)
      const stored = [...(now.boxes ?? []), free]
      const base =
        now.rows ??
        at.rows ??
        migrateToRows(boxesOf({ ...now, boxes: stored.slice(0, -1) }))
      const known = [
        MAIN_BOX,
        ...stored.filter((b) => b.id !== MAIN_BOX).map((b) => b.id),
      ]
      const idx = Math.max(0, Math.min(base.length, at.row ?? base.length))
      await db.pages.update(pageId, {
        boxes: stored,
        rows: reconcile(
          insertRow(base, idx, id, box.y, { x: Math.max(0, at.x) }),
          known,
        ),
        updatedAt: Date.now(),
      })
    })
    return id
  }
  await writeBoxes(db, pageId, (boxes) => [...boxes, box])
  // On a page with a box grid the new box is a full-width row at the tap.
  if (page.rows && at.row !== undefined) {
    await db.transaction('rw', db.pages, async () => {
      const now = await getLive(db.pages, pageId)
      if (now.rows)
        await db.pages.update(pageId, {
          rows: insertRow(now.rows, at.row!, id, at.y),
        })
    })
  }
  return id
}

/** Moves or resizes a box (the default box too). Locked boxes stay put. */
export async function updateBox(
  db: LearningNotesDB,
  pageId: string,
  id: string,
  patch: Partial<Omit<PaperBox, 'id'>>,
): Promise<void> {
  const page = await getLive(db.pages, pageId)
  const sheet = sheetOf(page)
  const current = boxesOf(page).find((b) => b.id === id)
  if (!current) return
  const moving = 'x' in patch || 'y' in patch || 'w' in patch
  if (current.locked && moving) return
  const next = clampBox({ ...current, ...patch }, sheet.w)
  if (patch.locked === undefined && 'locked' in patch) delete next.locked
  if (patch.colour === undefined && 'colour' in patch) delete next.colour
  if (patch.style === undefined && 'style' in patch) delete next.style
  if (patch.h === undefined && 'h' in patch) delete next.h
  await writeBoxes(db, pageId, (boxes) =>
    boxes.some((b) => b.id === id)
      ? boxes.map((b) => (b.id === id ? next : b))
      : [...boxes, next],
  )
}

/**
 * Lasso Group / Ungroup: boxes share a group id (one write, one Undo step), or
 * lose it. A group needs two boxes or more; the page's own text box can join.
 */
export async function setGroup(
  db: LearningNotesDB,
  pageId: string,
  ids: readonly string[],
  group: string | undefined,
): Promise<void> {
  if (group !== undefined && ids.length < 2) return
  await updateBoxes(
    db,
    pageId,
    ids.map((id) => ({ id, patch: { group } })),
  )
}

/** The live blocks of one box, in page order. */
async function blocksOf(
  db: LearningNotesDB,
  pageId: string,
  boxId: string,
): Promise<Block[]> {
  const page = await getLive(db.pages, pageId)
  const live = (
    await db.blocks.where('pageId').equals(pageId).toArray()
  ).filter(isLive)
  return groupBlocksByBox(page, live).get(boxId) ?? []
}

/**
 * Removes a box. Its blocks are deleted together (one `deletedAt`) after a
 * History copy of the page, so Undo (`restoreBox`) and History both bring
 * them back: nothing is lost silently. The default box cannot be removed.
 */
export async function removeBox(
  db: LearningNotesDB,
  pageId: string,
  id: string,
): Promise<{ box: PaperBox; deletedAt: number; blockIds: string[] } | null> {
  if (id === MAIN_BOX) return null
  const page = await getLive(db.pages, pageId)
  const box = (page.boxes ?? []).find((b) => b.id === id)
  if (!box) return null
  const blocks = await blocksOf(db, pageId, id)
  if (blocks.length) await recordVersion(db, pageId, { force: true })
  const deletedAt = Date.now()
  await db.transaction('rw', db.pages, db.blocks, async () => {
    await softDeleteMany(
      db.blocks,
      blocks.map((b) => b.id),
      deletedAt,
    )
    await writeBoxes(db, pageId, (boxes) => boxes.filter((b) => b.id !== id))
  })
  return { box, deletedAt, blockIds: blocks.map((b) => b.id) }
}

/** Undo of `removeBox`. */
export async function restoreBox(
  db: LearningNotesDB,
  pageId: string,
  removed: { box: PaperBox; deletedAt: number; blockIds: string[] },
): Promise<void> {
  await db.transaction('rw', db.pages, db.blocks, async () => {
    const now = Date.now()
    const back = (await db.blocks.bulkGet(removed.blockIds)).filter(
      (b): b is Block => !!b && b.deletedAt === removed.deletedAt,
    )
    await db.blocks.bulkPut(
      back.map((b) => ({ ...b, deletedAt: null, updatedAt: now })),
    )
    await writeBoxes(db, pageId, (boxes) => [
      ...boxes.filter((b) => b.id !== removed.box.id),
      removed.box,
    ])
  })
}

/** A copy of a box and its blocks (new ids), 10 mm lower and to the right. */
export async function duplicateBox(
  db: LearningNotesDB,
  pageId: string,
  id: string,
): Promise<string | null> {
  const page = await getLive(db.pages, pageId)
  const box = boxesOf(page).find((b) => b.id === id)
  if (!box) return null
  const blocks = await blocksOf(db, pageId, id)
  const copyId = createId()
  const newIds = new Map(blocks.map((b) => [b.id, createId()]))
  const now = Date.now()
  await db.transaction('rw', db.pages, db.blocks, async () => {
    await db.blocks.bulkAdd(
      blocks.map((b): Block => {
        const parentId = b.parentId ? (newIds.get(b.parentId) ?? null) : null
        const copy: Block = {
          ...b,
          id: newIds.get(b.id)!,
          parentId,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        }
        delete copy.boxId
        if (parentId === null) copy.boxId = copyId
        return copy
      }),
    )
    const sheet = sheetOf(page)
    const copy = clampBox(
      { ...box, id: copyId, x: box.x + 10, y: box.y + 10 },
      sheet.w,
    )
    delete copy.locked
    delete copy.group
    await writeBoxes(db, pageId, (boxes) => [...boxes, copy])
  })
  return copyId
}

/**
 * Phase Q rule 4: the Pencil wrote on empty paper. A box is made there with
 * `lines` empty lines under the writing, so its ink is linked to lines.
 */
export async function addBoxWithLines(
  db: LearningNotesDB,
  pageId: string,
  at: { x: number; y: number; w: number },
  lines: number,
): Promise<string> {
  const id = await addBox(db, pageId, at)
  const n = Math.max(1, Math.min(60, Math.round(lines)))
  const orders = ordersBetween(null, null, n)
  await db.blocks.bulkAdd(
    orders.map((order): Block => ({
      ...newRecordFields(),
      pageId,
      parentId: null,
      type: 'paragraph',
      content: { text: [] },
      order,
      boxId: id,
    })),
  )
  return id
}

/**
 * Phones: a new empty box placed in the reading order, right after a box,
 * at the start (`'start'`) or at the end (`'end'`) of the extra boxes. Later
 * boxes that would otherwise read before it move down a little.
 */
export async function addBoxInOrder(
  db: LearningNotesDB,
  pageId: string,
  after: string,
): Promise<string> {
  const page = await getLive(db.pages, pageId)
  const sheet = sheetOf(page)
  const id = createId()
  await writeBoxes(db, pageId, (boxes) => {
    const { y, shift, shifted } = placeInOrder(boxes, after)
    const box = clampBox({ id, x: MARGIN, y, w: sheet.w - 2 * MARGIN }, sheet.w)
    return [
      ...boxes.map((b) =>
        shifted.includes(b.id) ? { ...b, y: b.y + shift } : b,
      ),
      box,
    ]
  })
  return id
}

export interface BoxPatch {
  id: string
  patch: Partial<Omit<PaperBox, 'id'>>
}

/**
 * Moves or resizes several boxes in one write (one Undo step): a group move,
 * or a drop that pushes the boxes below it down. Locked boxes stay put.
 */
export async function updateBoxes(
  db: LearningNotesDB,
  pageId: string,
  patches: readonly BoxPatch[],
): Promise<void> {
  if (patches.length === 0) return
  const page = await getLive(db.pages, pageId)
  const sheet = sheetOf(page)
  const all = boxesOf(page)
  const next = new Map<string, PaperBox>()
  for (const { id, patch } of patches) {
    const current = all.find((b) => b.id === id)
    if (!current || current.locked) continue
    const merged = clampBox({ ...current, ...patch }, sheet.w)
    if (patch.group === undefined && 'group' in patch) delete merged.group
    next.set(id, merged)
  }
  if (next.size === 0) return
  await writeBoxes(db, pageId, (boxes) => {
    const have = new Set(boxes.map((b) => b.id))
    return [
      ...boxes.map((b) => next.get(b.id) ?? b),
      ...[...next.values()].filter((b) => !have.has(b.id)),
    ]
  })
}

/** Two boxes whose corners are this close (mm) sit on top of each other. */
const SAME_SPOT_MM = 12

/**
 * Page repair on open (owner bug, 9 Nov): an empty box that sits (almost) on
 * top of the default box or another box shows a second "Enter text" line on
 * top of the first, and cannot be told apart or deleted. Such a box is
 * removed when it holds nothing at all: no text, no ink, only empty lines.
 * Empty orphan lines (their box is gone) go too, when the page has other
 * text. Nothing with content is ever touched. Returns the removed box ids.
 */
export async function repairBoxes(
  db: LearningNotesDB,
  pageId: string,
): Promise<string[]> {
  const page = await getLive(db.pages, pageId)
  const boxes = boxesOf(page)
  const live = (
    await db.blocks.where('pageId').equals(pageId).toArray()
  ).filter(isLive)
  const known = new Set(boxes.map((b) => b.id))
  const groups = groupBlocksByBox(page, live)
  const inkBlocks = new Set(
    (await db.inkChunks.where('pageId').equals(pageId).toArray())
      .filter((c) => isLive(c) && c.strokes.length > 0)
      .map((c) => c.blockId),
  )
  const isEmptyLine = (b: Block) =>
    b.type === 'paragraph' &&
    toPlainText(b.content).trim() === '' &&
    !inkBlocks.has(b.id)
  const empty = (id: string) => (groups.get(id) ?? []).every(isEmptyLine)
  const near = (a: PaperBox, b: PaperBox) =>
    Math.abs(a.x - b.x) <= SAME_SPOT_MM && Math.abs(a.y - b.y) <= SAME_SPOT_MM
  const drop: PaperBox[] = []
  const kept: PaperBox[] = [boxes[0]]
  for (const b of boxes.slice(1)) {
    const twin = [
      ...kept,
      ...boxes.slice(1).filter((o) => o !== b && !empty(o.id)),
    ]
    if (empty(b.id) && !b.locked && twin.some((o) => near(o, b))) drop.push(b)
    else kept.push(b)
  }
  // Lines pointing at a box that no longer exists show up in the default box.
  const topLevel = live.filter((b) => b.parentId === null)
  const orphans = topLevel.filter(
    (b) => b.boxId && !known.has(b.boxId) && isEmptyLine(b),
  )
  const others = topLevel.filter((b) => !orphans.includes(b))
  const orphanIds = others.length > 0 ? orphans.map((b) => b.id) : []
  if (drop.length === 0 && orphanIds.length === 0) return []
  const ids = [
    ...drop.flatMap((b) => (groups.get(b.id) ?? []).map((x) => x.id)),
    ...orphanIds,
  ]
  const gone = new Set(drop.map((b) => b.id))
  await db.transaction('rw', db.pages, db.blocks, async () => {
    quietTx() // an automatic repair is not an Undo step
    if (ids.length) await softDeleteMany(db.blocks, ids, Date.now())
    if (gone.size)
      await writeBoxes(db, pageId, (all) => all.filter((b) => !gone.has(b.id)))
  })
  console.info(
    'Repaired the paper page: removed empty boxes',
    [...gone],
    orphanIds,
  )
  return [...gone]
}

/**
 * Item 6/9 (10 Nov): an accidental box left empty goes away. It holds nothing
 * at all (only empty lines, no ink), is not locked and is not the default
 * box. Returns true when it was removed (its empty lines go with it; there
 * is nothing to bring back, so no History copy or Undo is offered).
 */
export async function removeIfEmptyBox(
  db: LearningNotesDB,
  pageId: string,
  boxId: string,
): Promise<boolean> {
  if (boxId === MAIN_BOX) return false
  const page = await getLive(db.pages, pageId)
  const box = (page.boxes ?? []).find((b) => b.id === boxId)
  if (!box || box.locked) return false
  const blocks = await blocksOf(db, pageId, boxId)
  const inked = new Set(
    (await db.inkChunks.where('pageId').equals(pageId).toArray())
      .filter((c) => isLive(c) && c.strokes.length > 0)
      .map((c) => c.blockId),
  )
  const emptyLine = (b: Block) =>
    b.type === 'paragraph' &&
    toPlainText(b.content).trim() === '' &&
    !inked.has(b.id)
  if (!blocks.every(emptyLine)) return false
  await db.transaction('rw', db.pages, db.blocks, async () => {
    if (blocks.length)
      await softDeleteMany(
        db.blocks,
        blocks.map((b) => b.id),
        Date.now(),
      )
    await writeBoxes(db, pageId, (all) => all.filter((b) => b.id !== boxId))
  })
  return true
}

/** What a grid change replaced, for Undo. */
export interface GridBefore {
  rows: GridRow[] | undefined
  boxes: PaperBox[] | undefined
}

/**
 * Item 26: writes the box grid (and, for old clients, the places it gives the
 * boxes) in one step. The first time a page gets rows, a History copy is made
 * first. Locked boxes keep their stored place. The default box keeps its
 * stored size (the paper's scale hangs on it). Returns what it replaced.
 */
export async function updateGrid(
  db: LearningNotesDB,
  pageId: string,
  rows: readonly GridRow[],
  places: readonly BoxPatch[],
): Promise<GridBefore> {
  const first = await getLive(db.pages, pageId)
  if (!first.rows) await recordVersion(db, pageId, { force: true })
  return db.transaction('rw', db.pages, async () => {
    const page = await getLive(db.pages, pageId)
    const sheet = sheetOf(page)
    const before: GridBefore = {
      rows: page.rows?.map((r) => ({
        ...r,
        cols: r.cols.map((c) => ({ ...c, boxIds: [...c.boxIds] })),
      })),
      boxes: page.boxes?.map((b) => ({ ...b })),
    }
    const stored = new Map((page.boxes ?? []).map((b) => [b.id, b]))
    for (const { id, patch } of places) {
      if (id === MAIN_BOX) continue
      const cur = stored.get(id)
      if (cur) stored.set(id, clampBox({ ...cur, ...patch }, sheet.w))
    }
    const boxes = [...stored.values()]
    await db.pages.update(pageId, {
      boxes: boxes.length ? boxes : undefined,
      rows: reconcile(rows, [
        MAIN_BOX,
        ...boxes.filter((b) => b.id !== MAIN_BOX).map((b) => b.id),
      ]),
      updatedAt: Date.now(),
    })
    return before
  })
}

/** Undo of `updateGrid` and the layout assist: puts back the rows and boxes. */
export async function restoreGrid(
  db: LearningNotesDB,
  pageId: string,
  before: GridBefore,
): Promise<void> {
  await db.pages.update(pageId, {
    rows: before.rows,
    boxes: before.boxes,
    updatedAt: Date.now(),
  })
}
