import {
  saveBlockChanges,
  type BlockChanges,
  type BlockUpsert,
} from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { markSaved, markUnsaved } from '../app/saveStatus'
import { syncCardRecords } from '../recall/cardService'
import { retryDelay } from './autosave'

/**
 * Closing a tab can stop the page before the database write of the last
 * keystrokes finishes (IndexedDB is asynchronous). So when the page is
 * being left, the unsaved changes are also written to localStorage, which
 * is synchronous, and applied the next time that page is opened. Applying
 * is harmless if the database write did finish: it writes the same blocks.
 * A failed save is kept the same way, until a save works.
 */
const KEY = (pageId: string) => `learning-notes:pending:${pageId}`

interface Stash {
  savedAt: number
  changes: BlockChanges
}

/**
 * Keeps `changes` for the next start. Returns false if they could not be
 * kept (storage full or blocked); the normal save is still tried.
 */
export function stashChanges(pageId: string, changes: BlockChanges): boolean {
  if (changes.upserts.length === 0 && changes.deletes.length === 0) return true
  try {
    const stash: Stash = { savedAt: Date.now(), changes }
    localStorage.setItem(KEY(pageId), JSON.stringify(stash))
    return true
  } catch {
    return false
  }
}

/**
 * Changes one field of a block inside the kept changes of a page, if that
 * block is in them. Used when something else (Home ticking a linked task)
 * changes a block that the page left unsaved copies of, so opening the page
 * does not bring the old value back.
 */
export function patchStashedBlock(
  pageId: string,
  blockId: string,
  patch: Record<string, unknown>,
): void {
  try {
    const raw = localStorage.getItem(KEY(pageId))
    if (!raw) return
    const stash = JSON.parse(raw) as Stash
    let touched = false
    for (const upsert of stash.changes?.upserts ?? []) {
      if (upsert.id !== blockId) continue
      Object.assign(upsert.content, patch)
      touched = true
    }
    if (touched) localStorage.setItem(KEY(pageId), JSON.stringify(stash))
  } catch {
    // nothing kept, nothing to patch
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

/** False only when the page is known to be gone (a failed read is not). */
async function pageStillThere(
  db: LearningNotesDB,
  pageId: string,
): Promise<boolean> {
  try {
    const page = await db.pages.get(pageId)
    return !!page && !page.deletedAt
  } catch {
    return true
  }
}

/** Applies kept changes. They stay kept if the database still fails. */
async function applyStash(
  db: LearningNotesDB,
  pageId: string,
): Promise<'nothing' | 'applied' | 'failed'> {
  const changes = readStash(pageId)
  if (!changes) {
    clearStash(pageId)
    return 'nothing'
  }
  try {
    await db.transaction('rw', db.pages, db.blocks, db.cards, async () => {
      await saveBlockChanges(db, pageId, changes)
      await syncCardRecords(db, pageId)
    })
    clearStash(pageId)
    return 'applied'
  } catch (error) {
    console.error('Could not bring back unsaved changes', error)
    // A deleted page has nowhere to bring them back to.
    if (await pageStillThere(db, pageId)) return 'failed'
    clearStash(pageId)
    return 'nothing'
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
  return (await applyStash(db, pageId)) === 'applied'
}

/**
 * The page closed with its changes unsaved: keeps trying to apply them, and
 * the "Not saved yet" notice stays until that works. Opening the page again
 * applies them too; this then finds nothing left and stops.
 */
export function keepTryingStash(db: LearningNotesDB, pageId: string): void {
  const token = {}
  let tries = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const attempt = async () => {
    clearTimeout(timer)
    if ((await applyStash(db, pageId)) === 'failed') {
      tries += 1
      timer = setTimeout(() => void attempt(), retryDelay(tries))
    } else {
      markSaved(token)
    }
  }
  markUnsaved(token, () => void attempt())
  timer = setTimeout(() => void attempt(), retryDelay(1))
}
