import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import {
  getLive,
  isLive,
  newRecordFields,
  softDeleteMany,
} from '../core/records'
import type { Block, PaperBox } from '../core/types'
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
  const y = round(Math.max(0, box.y))
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
    await db.pages.update(pageId, {
      boxes: next.length ? next : undefined,
      updatedAt: Date.now(),
    })
    return next
  })
}

/** A new empty box at (x, y) mm; returns its id. */
export async function addBox(
  db: LearningNotesDB,
  pageId: string,
  at: { x: number; y: number; w?: number },
): Promise<string> {
  const page = await getLive(db.pages, pageId)
  const sheet = sheetOf(page)
  const id = createId()
  const box = clampBox(
    {
      id,
      x: at.x,
      y: at.y,
      w: at.w ?? Math.min(NEW_W, sheet.w - at.x - MARGIN),
    },
    sheet.w,
  )
  await writeBoxes(db, pageId, (boxes) => [...boxes, box])
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
  await writeBoxes(db, pageId, (boxes) =>
    boxes.some((b) => b.id === id)
      ? boxes.map((b) => (b.id === id ? next : b))
      : [...boxes, next],
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
    next.set(id, clampBox({ ...current, ...patch }, sheet.w))
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
