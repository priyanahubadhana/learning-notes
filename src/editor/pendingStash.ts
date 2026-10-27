import {
  saveBlockChanges,
  type BlockChanges,
  type BlockUpsert,
} from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { syncCardRecords } from '../recall/cardService'

/**
 * Closing a tab can stop the page before the database write of the last
 * keystrokes finishes (IndexedDB is asynchronous). So when the page is
 * being left, the unsaved changes are also written to localStorage, which
 * is synchronous, and applied the next time that page is opened. Applying
 * is harmless if the database write did finish: it writes the same blocks.
 */
const KEY = (pageId: string) => `learning-notes:pending:${pageId}`

interface Stash {
  savedAt: number
  changes: BlockChanges
}

/** Keeps `changes` for the next start. Fails quietly (storage may be full). */
export function stashChanges(pageId: string, changes: BlockChanges): void {
  if (changes.upserts.length === 0 && changes.deletes.length === 0) return
  try {
    const stash: Stash = { savedAt: Date.now(), changes }
    localStorage.setItem(KEY(pageId), JSON.stringify(stash))
  } catch {
    // storage full or blocked: the normal save is still tried
  }
}

/** Forgets the kept changes (they are saved in the database). */
export function clearStash(pageId: string): void {
  try {
    localStorage.removeItem(KEY(pageId))
  } catch {
    // nothing to clear
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** The kept changes, if they look like ones this app wrote. */
function readStash(pageId: string): BlockChanges | null {
  try {
    const raw = localStorage.getItem(KEY(pageId))
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    if (!isObject(data) || !isObject(data.changes)) return null
    const { upserts, deletes } = data.changes
    if (!Array.isArray(upserts) || !Array.isArray(deletes)) return null
    const upsertsOk = upserts.every(
      (u) =>
        isObject(u) &&
        typeof u.id === 'string' &&
        (u.parentId === null || typeof u.parentId === 'string') &&
        typeof u.type === 'string' &&
        isObject(u.content) &&
        typeof u.order === 'string',
    )
    if (!upsertsOk || !deletes.every((d) => typeof d === 'string')) return null
    return { upserts: upserts as BlockUpsert[], deletes: deletes as string[] }
  } catch {
    return null
  }
}

/**
 * Applies changes kept when the page was last left, before it is shown.
 * Returns true if something was applied.
 */
export async function recoverStash(
  db: LearningNotesDB,
  pageId: string,
): Promise<boolean> {
  const changes = readStash(pageId)
  if (!changes) {
    clearStash(pageId)
    return false
  }
  try {
    await db.transaction('rw', db.pages, db.blocks, db.cards, async () => {
      await saveBlockChanges(db, pageId, changes)
      await syncCardRecords(db, pageId)
    })
    return true
  } catch (error) {
    // e.g. the page was deleted meanwhile: nothing to bring back
    console.error('Could not bring back unsaved changes', error)
    return false
  } finally {
    clearStash(pageId)
  }
}
