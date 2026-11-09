import type { LearningNotesDB } from '../core/db'
import type { Connectors } from './connectors'
import type { MasterKey } from './crypto'
import { enqueueChanged, previewRemote } from './engine'

/**
 * After signing back in (remote sign-out): what differs between this device
 * and the cloud. Counts are of pages (blocks count for their page); `items`
 * counts every changed record (cards, tags, ...). Nothing is changed except
 * that unsent edits are marked as changed here (the same marking sync does
 * at every start).
 */
export interface Divergence {
  pagesHere: number
  pagesThere: number
  itemsHere: number
  itemsThere: number
  /** Sync-state ids of the records changed here and unsent. */
  dirtyIds: string[]
  /** Pages with unsent edits here. */
  pageIdsHere: string[]
}

/** Unsent changes on this device (also marks edits made while signed out). */
export async function measureHere(
  db: LearningNotesDB,
): Promise<
  Pick<Divergence, 'itemsHere' | 'pagesHere' | 'dirtyIds' | 'pageIdsHere'>
> {
  await enqueueChanged(db)
  const dirty = await db.syncState.filter((s) => s.dirty === 1).toArray()
  const pages = new Set<string>()
  const blockIds: string[] = []
  for (const s of dirty) {
    if (s.table === 'pages') pages.add(s.recordId)
    else if (s.table === 'blocks') blockIds.push(s.recordId)
  }
  for (const b of await db.blocks.bulkGet(blockIds)) if (b) pages.add(b.pageId)
  return {
    itemsHere: dirty.length,
    pagesHere: pages.size,
    dirtyIds: dirty.map((s) => s.id),
    pageIdsHere: [...pages],
  }
}

export async function measureDivergence(
  db: LearningNotesDB,
  conn: Connectors,
  master: MasterKey,
): Promise<Divergence> {
  const here = await measureHere(db)
  if (here.itemsHere === 0) return { ...here, pagesThere: 0, itemsThere: 0 }
  const there = await previewRemote(db, conn, master)
  return {
    ...here,
    pagesThere: there.pageIds.size,
    itemsThere: there.items,
  }
}
