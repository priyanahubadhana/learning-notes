import type { LearningNotesDB } from './db'
import type { InkChunk, InkLayer, InkSnapshot } from './inkTypes'
import { purgeMany, softDeleteMany } from './records'

/**
 * Reading and writing ink (see inkTypes.ts). UI code goes through here, not
 * straight to the tables. Rows are only written for pages that have ink, so
 * a page without ink costs two small indexed reads and no storage.
 */

const live = <T extends { deletedAt: number | null; purgedAt?: number }>(
  row: T,
) => row.deletedAt === null && row.purgedAt === undefined

/** A page's layers (live ones, in order) and every chunk row, read at once. */
export async function loadInk(
  db: LearningNotesDB,
  pageId: string,
): Promise<InkSnapshot> {
  const [layers, chunks] = await Promise.all([
    db.inkLayers.where('pageId').equals(pageId).toArray(),
    db.inkChunks.where('pageId').equals(pageId).toArray(),
  ])
  return {
    layers: layers.sort((a, b) => (a.order < b.order ? -1 : 1)),
    chunks,
  }
}

/** Does this page have any ink? (An index read; no strokes are loaded.) */
export async function pageHasInk(
  db: LearningNotesDB,
  pageId: string,
): Promise<boolean> {
  return (
    (await db.inkChunks
      .where('pageId')
      .equals(pageId)
      .filter((c) => live(c) && c.strokes.length > 0)
      .count()) > 0
  )
}

/** Writes changed layers and chunks in one transaction. */
export async function saveInk(
  db: LearningNotesDB,
  layers: readonly InkLayer[],
  chunks: readonly InkChunk[],
): Promise<void> {
  if (layers.length === 0 && chunks.length === 0) return
  await db.transaction('rw', db.inkLayers, db.inkChunks, async () => {
    if (layers.length > 0) await db.inkLayers.bulkPut([...layers])
    if (chunks.length > 0) await db.inkChunks.bulkPut([...chunks])
  })
}

/** The page's live ink, for a history copy. Undefined when there is none. */
export async function inkSnapshot(
  db: LearningNotesDB,
  pageId: string,
): Promise<InkSnapshot | undefined> {
  const { layers, chunks } = await loadInk(db, pageId)
  const l = layers.filter(live)
  const c = chunks.filter((x) => live(x) && x.strokes.length > 0)
  return c.length === 0 ? undefined : { layers: l, chunks: c }
}

/**
 * Puts a history copy's ink back as the live ink. Rows not in the copy are
 * soft-deleted (kept, so a later restore can bring them back).
 */
export async function restoreInk(
  db: LearningNotesDB,
  pageId: string,
  snapshot: InkSnapshot | undefined,
  now = Date.now(),
): Promise<void> {
  const current = await loadInk(db, pageId)
  const keepLayers = new Set(snapshot?.layers.map((l) => l.id))
  const keepChunks = new Set(snapshot?.chunks.map((c) => c.id))
  await softDeleteMany(
    db.inkLayers,
    current.layers
      .filter((l) => live(l) && !keepLayers.has(l.id))
      .map((l) => l.id),
    now,
  )
  await softDeleteMany(
    db.inkChunks,
    current.chunks
      .filter((c) => live(c) && !keepChunks.has(c.id))
      .map((c) => c.id),
    now,
  )
  if (snapshot) {
    await saveInk(
      db,
      snapshot.layers.map((l) => ({
        ...l,
        deletedAt: null,
        purgedAt: undefined,
        updatedAt: now,
      })),
      snapshot.chunks.map((c) => ({
        ...c,
        deletedAt: null,
        purgedAt: undefined,
        updatedAt: now,
      })),
    )
  }
}

/** "Delete forever": the strokes are erased; empty markers stay for sync. */
export async function purgeInkOf(
  db: LearningNotesDB,
  pageIds: readonly string[],
  now: number,
): Promise<void> {
  const layers = await db.inkLayers.where('pageId').anyOf(pageIds).toArray()
  const chunks = await db.inkChunks.where('pageId').anyOf(pageIds).toArray()
  await purgeMany(
    db.inkLayers,
    layers.filter((l) => l.purgedAt === undefined).map((l) => l.id),
    { deletedAt: now, name: '' },
    now,
  )
  await purgeMany(
    db.inkChunks,
    chunks.filter((c) => c.purgedAt === undefined).map((c) => c.id),
    { deletedAt: now, strokes: [] },
    now,
  )
}
