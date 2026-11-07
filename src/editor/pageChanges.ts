import { liveQuery } from 'dexie'
import type { LearningNotesDB } from '../core/db'

/** A cheap fingerprint of a page's saved blocks: how many, and the newest edit. */
export async function pageFingerprint(
  db: LearningNotesDB,
  pageId: string,
): Promise<string> {
  let count = 0
  let newest = 0
  await db.blocks
    .where('pageId')
    .equals(pageId)
    .each((b) => {
      count += 1
      if (b.updatedAt > newest) newest = b.updatedAt
    })
  return `${count}:${newest}`
}

/**
 * Calls `onChange` whenever the page's saved blocks change after this call
 * (another window saved, or sync brought an edit). Dexie tells windows of the
 * same browser about each other's writes. Returns the stop function.
 */
export function watchPageChanges(
  db: LearningNotesDB,
  pageId: string,
  onChange: () => void,
): () => void {
  let first: string | undefined
  const sub = liveQuery(() => pageFingerprint(db, pageId)).subscribe({
    next: (print) => {
      if (first === undefined) first = print
      else if (print !== first) {
        first = print
        onChange()
      }
    },
    error: () => {},
  })
  return () => sub.unsubscribe()
}
