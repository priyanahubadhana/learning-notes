import { createId } from '../../../core/ids'
import type { LearningNotesDB } from '../../../core/db'
import { assertSignedIn, pageDeleteBlocked } from '../../../core/editLock'
import type { InkChunk, InkLayer } from '../../../core/inkTypes'
import { byOrder, orderAtIndex } from '../../../core/order'
import { descendantIds, isLive } from '../../../core/records'
import type { Block, Page } from '../../../core/types'
import { createNotebook } from '../../../notebooks/notebookService'
import { movePage, deletePage, listPages } from '../../../pages/pageService'
import { syncCardRecords } from '../../../recall/cardService'
import { restorePage } from '../../../trash/trashService'
import type { CopyStep, MoveOp } from './pageOrganise'

/**
 * The database side of organising pages (flag notebooks.v2): the same
 * tables and services as today, no new storage. Each function is one
 * undoable step; the plans themselves live in pageOrganise.ts.
 */

/** Runs move steps in order (each is a plain `movePage`). */
export async function applyMoves(
  db: LearningNotesDB,
  ops: readonly MoveOp[],
): Promise<void> {
  for (const op of ops) await movePage(db, op.id, op.parentId, op.toIndex)
}

/** Is any of these pages (or their sub-pages) edit-locked, or the device read-only? */
export async function anyDeleteBlocked(
  db: LearningNotesDB,
  ids: readonly string[],
): Promise<boolean> {
  for (const id of ids) if (await pageDeleteBlocked(db, id)) return true
  return false
}

/** Moves the pages (with their sub-pages) to Trash. */
export async function trashPages(
  db: LearningNotesDB,
  ids: readonly string[],
): Promise<void> {
  for (const id of ids) await deletePage(db, id)
}

/** Undo of trashPages: Trash brings back what went at the same moment. */
export async function restorePages(
  db: LearningNotesDB,
  ids: readonly string[],
): Promise<void> {
  for (const id of [...ids].reverse()) await restorePage(db, id)
}

/** The page and its sub-pages (live), in tree order. */
function subtreeOf(all: readonly Page[], rootId: string): Page[] {
  const ids = new Set([rootId, ...descendantIds(all, rootId)])
  return all.filter((p) => ids.has(p.id))
}

/** Marks that must not be copied (a copy is a plain page of its own). */
const NOT_COPIED = [
  'journalDate',
  'journalMonth',
  'templateRole',
  'favourite',
  'customTitle',
] as const

/**
 * Copies pages (each with its sub-pages, text, drawings and cards) to just
 * after the original. The top copy gets the name from `nameOf`. Returns the
 * ids of the top copies (so Undo can send them to Trash).
 */
export async function duplicatePages(
  db: LearningNotesDB,
  steps: readonly CopyStep[],
  nameOf: (source: Page) => string,
): Promise<string[]> {
  assertSignedIn()
  const made: string[] = []
  for (const step of steps) {
    const top = await duplicateOne(db, step, nameOf)
    if (top) made.push(top)
  }
  return made
}

async function duplicateOne(
  db: LearningNotesDB,
  step: CopyStep,
  nameOf: (source: Page) => string,
): Promise<string | null> {
  const source = await db.pages.get(step.sourceId)
  if (!source || !isLive(source)) return null
  const live = (await listPages(db, source.notebookId)).sort(byOrder)
  const tree = subtreeOf(live, source.id)
  const pageIds = tree.map((p) => p.id)
  const newPage = new Map(pageIds.map((id) => [id, createId()]))
  const now = Date.now()
  // The original stays, so the index counts it: "right after" is its index + 1.
  const siblings = live.filter((p) => p.parentId === step.parentId)
  const blocks = (await db.blocks.where('pageId').anyOf(pageIds).toArray())
    .filter(isLive)
    .sort(byOrder)
  const newBlock = new Map(blocks.map((b) => [b.id, createId()]))
  const layers = await db.inkLayers.where('pageId').anyOf(pageIds).toArray()
  const chunks = await db.inkChunks.where('pageId').anyOf(pageIds).toArray()
  const newLayer = new Map(layers.map((l) => [l.id, createId()]))

  const pages = tree.map((p): Page => {
    const copy: Page = {
      ...p,
      id: newPage.get(p.id)!,
      parentId:
        p.id === source.id ? step.parentId : (newPage.get(p.parentId!) ?? null),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }
    for (const key of NOT_COPIED) delete copy[key]
    if (p.id === source.id) {
      copy.title = nameOf(source)
      delete copy.sample
      copy.order = orderAtIndex(
        siblings.map((s) => s.order),
        step.toIndex,
      )
    }
    return copy
  })
  const blockCopies = blocks.map((b): Block => ({
    ...b,
    id: newBlock.get(b.id)!,
    pageId: newPage.get(b.pageId)!,
    parentId: b.parentId === null ? null : (newBlock.get(b.parentId) ?? null),
    content: structuredClone(b.content),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }))
  const layerCopies = layers
    .filter((l) => isLive(l) && l.purgedAt === undefined)
    .map((l): InkLayer => ({
      ...l,
      id: newLayer.get(l.id)!,
      pageId: newPage.get(l.pageId)!,
      createdAt: now,
      updatedAt: now,
    }))
  const chunkCopies = chunks
    .filter(
      (c) => isLive(c) && c.purgedAt === undefined && newLayer.has(c.layerId),
    )
    .map((c): InkChunk => ({
      ...c,
      id: createId(),
      pageId: newPage.get(c.pageId)!,
      layerId: newLayer.get(c.layerId)!,
      blockId: c.blockId === null ? null : (newBlock.get(c.blockId) ?? null),
      strokes: structuredClone(c.strokes),
      createdAt: now,
      updatedAt: now,
    }))

  await db.transaction(
    'rw',
    [db.pages, db.blocks, db.cards, db.inkLayers, db.inkChunks],
    async () => {
      await db.pages.bulkAdd(pages)
      if (blockCopies.length) await db.blocks.bulkAdd(blockCopies)
      if (layerCopies.length) await db.inkLayers.bulkAdd(layerCopies)
      if (chunkCopies.length) await db.inkChunks.bulkAdd(chunkCopies)
      // A copied Card block gets its own fresh review schedule.
      for (const p of pages) await syncCardRecords(db, p.id)
    },
  )
  return newPage.get(source.id) ?? null
}

/** Where an extracted page was, for Undo. */
export interface ExtractUndo {
  moved: {
    id: string
    notebookId: string
    parentId: string | null
    order: string
  }[]
  /** The notebook made by Extract (removed again by Undo), if any. */
  createdNotebookId?: string
}

export type ExtractTarget =
  { kind: 'existing'; notebookId: string } | { kind: 'new'; title: string }

export class ExtractRefusedError extends Error {}

/**
 * Moves pages (with their sub-pages) to another notebook, or to a new one,
 * as top-level pages at its end. Cards, summary lines and the search
 * entries follow the pages. A locked notebook is refused.
 */
export async function extractPages(
  db: LearningNotesDB,
  ids: readonly string[],
  target: ExtractTarget,
): Promise<{ notebookId: string; undo: ExtractUndo }> {
  assertSignedIn()
  const first = await db.pages.get(ids[0])
  if (!first) throw new ExtractRefusedError('missing')
  const fromNotebook = first.notebookId
  let notebookId: string
  let createdNotebookId: string | undefined
  if (target.kind === 'new') {
    const source = await db.notebooks.get(fromNotebook)
    if (!source) throw new ExtractRefusedError('missing')
    const nb = await createNotebook(db, source.workspaceId, target.title)
    notebookId = createdNotebookId = nb.id
  } else {
    notebookId = target.notebookId
    const nb = await db.notebooks.get(notebookId)
    if (!nb || nb.deletedAt !== null) throw new ExtractRefusedError('missing')
    if (nb.locked || nb.editLocked) throw new ExtractRefusedError('locked')
  }
  const src = await db.notebooks.get(fromNotebook)
  if (src?.editLocked) throw new ExtractRefusedError('locked')

  const undo: ExtractUndo = { moved: [], createdNotebookId }
  await db.transaction(
    'rw',
    [db.pages, db.cards, db.summaryItems, db.notebooks],
    async () => {
      const all = (
        await db.pages.where('notebookId').equals(fromNotebook).toArray()
      ).filter(isLive)
      const there = (
        await db.pages.where('notebookId').equals(notebookId).toArray()
      )
        .filter((p) => isLive(p) && p.parentId === null)
        .sort(byOrder)
      if (all.some((p) => ids.includes(p.id) && p.editLocked))
        throw new ExtractRefusedError('locked')
      let tail = there.map((p) => p.order)
      const now = Date.now()
      for (const id of ids) {
        const tree = subtreeOf(all, id)
        const moved = new Set(tree.map((p) => p.id))
        for (const p of tree) {
          undo.moved.push({
            id: p.id,
            notebookId: p.notebookId,
            parentId: p.parentId,
            order: p.order,
          })
        }
        const order = orderAtIndex(tail, tail.length)
        tail = [...tail, order]
        for (const p of tree) {
          await db.pages.update(p.id, {
            notebookId,
            updatedAt: now,
            ...(p.id === id ? { parentId: null, order } : {}),
          })
        }
        await db.cards
          .where('pageId')
          .anyOf([...moved])
          .modify({ notebookId, updatedAt: now })
        await db.summaryItems
          .where('pageId')
          .anyOf([...moved])
          .modify({ notebookId, updatedAt: now })
      }
    },
  )
  return { notebookId, undo }
}

/** Undo of extractPages: every page goes back to where it was. */
export async function undoExtract(
  db: LearningNotesDB,
  undo: ExtractUndo,
): Promise<void> {
  const now = Date.now()
  await db.transaction(
    'rw',
    [db.pages, db.cards, db.summaryItems, db.notebooks],
    async () => {
      for (const m of undo.moved) {
        await db.pages.update(m.id, {
          notebookId: m.notebookId,
          parentId: m.parentId,
          order: m.order,
          updatedAt: now,
        })
        await db.cards
          .where('pageId')
          .equals(m.id)
          .modify({ notebookId: m.notebookId, updatedAt: now })
        await db.summaryItems
          .where('pageId')
          .equals(m.id)
          .modify({ notebookId: m.notebookId, updatedAt: now })
      }
      if (undo.createdNotebookId) {
        await db.notebooks.update(undo.createdNotebookId, {
          deletedAt: now,
          updatedAt: now,
        })
      }
    },
  )
}
