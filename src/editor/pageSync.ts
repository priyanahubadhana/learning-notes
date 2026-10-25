import { saveBlockChanges } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { Block } from '../core/types'
import { syncCardRecords } from '../recall/cardService'
import { createAutosaver } from './autosave'
import { createSnapshot, diffBlocks, type BlockDraft } from './diff'

/**
 * Keeps one open page in sync: editor → database only (one-way while
 * editing, so saves can never trigger reloads and loop).
 */
export interface PageSync {
  /** Call on every editor change. */
  changed: () => void
  /** Save pending changes now. */
  flush: () => Promise<void>
  /** Cancel a pending timer. */
  dispose: () => void
}

/**
 * @param records    Live records the editor was loaded from.
 * @param readDrafts Reads the editor's current blocks (via mapping.ts).
 */
export function createPageSync(
  db: LearningNotesDB,
  pageId: string,
  records: readonly Block[],
  readDrafts: () => BlockDraft[],
  delayMs?: number,
): PageSync {
  // Starting point = exactly what the editor shows after load, so opening
  // a page never writes anything.
  let snapshot = createSnapshot(readDrafts(), records)

  const autosaver = createAutosaver(async () => {
    const { changes, next } = diffBlocks(snapshot, readDrafts())
    await saveBlockChanges(db, pageId, changes)
    await syncCardRecords(db, pageId) // new Card blocks get a review schedule
    snapshot = next // only after a successful save
  }, delayMs)

  return {
    changed: autosaver.schedule,
    flush: autosaver.flush,
    dispose: autosaver.dispose,
  }
}
