import { saveBlockChanges } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { Block } from '../core/types'
import { syncCardRecords } from '../recall/cardService'
import { recordVersion } from '../history/versionService'
import { createAutosaver } from './autosave'
import { clearStash, keepTryingStash, stashChanges } from './pendingStash'
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
  /**
   * Keep unsaved changes in localStorage (synchronous), for when the tab is
   * closing and the database write may not finish. See pendingStash.ts.
   */
  stash: () => void
  /** Save now, then keep a history copy of what was written (page closes). */
  leave: () => Promise<void>
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

  // History copies (history/versionService.ts): at most one per few minutes
  // while editing, and one when the page is left.
  let unrecorded = false
  const record = async (force: boolean) => {
    try {
      if (await recordVersion(db, pageId, { force })) unrecorded = false
    } catch (error) {
      console.error('Could not keep a history copy', error)
    }
  }

  // Whether a failed save's changes are in localStorage.
  let kept = false

  const autosaver = createAutosaver(async () => {
    const { changes, next } = diffBlocks(snapshot, readDrafts())
    try {
      // One transaction: a saved Card block (new, pasted or duplicated) never
      // ends up without its review schedule.
      await db.transaction('rw', db.pages, db.blocks, db.cards, async () => {
        await saveBlockChanges(db, pageId, changes)
        await syncCardRecords(db, pageId)
      })
    } catch (error) {
      kept = stashChanges(pageId, changes) // safe if the page is left now
      throw error
    }
    snapshot = next // only after a successful save
    clearStash(pageId)
    if (changes.upserts.length > 0 || changes.deletes.length > 0) {
      unrecorded = true
      await record(false)
    }
  }, delayMs)

  return {
    changed: autosaver.schedule,
    flush: autosaver.flush,
    dispose: autosaver.dispose,
    stash: () =>
      stashChanges(pageId, diffBlocks(snapshot, readDrafts()).changes),
    leave: async () => {
      await autosaver.flush()
      // The editor is closing, so it cannot be read again: the kept changes
      // carry on instead. If they could not be kept, the notice stays.
      if (autosaver.failed()) {
        if (kept) {
          autosaver.handOver()
          keepTryingStash(db, pageId)
        }
        return
      }
      if (unrecorded) await record(true)
    },
  }
}
