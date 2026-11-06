import type { LearningNotesDB } from './db'
import { purgeMany } from './records'

/**
 * Erases the book files and the highlights, notes and bookmarks of pages that
 * are being deleted forever (Trash). The page is gone, so its book goes with
 * it. Lives in core so Trash does not need to import the Library.
 */
export async function purgeBooksOf(
  db: LearningNotesDB,
  pageIds: readonly string[],
  now: number,
): Promise<void> {
  const files = await db.bookFiles
    .where('pageId')
    .anyOf([...pageIds])
    .toArray()
  await purgeMany(
    db.bookFiles,
    files.filter((r) => r.purgedAt === undefined).map((r) => r.id),
    { data: new ArrayBuffer(0), name: '', size: 0, deletedAt: now },
    now,
  )
  const notes = await db.annotations
    .where('pageId')
    .anyOf([...pageIds])
    .toArray()
  await purgeMany(
    db.annotations,
    notes.filter((r) => r.purgedAt === undefined).map((r) => r.id),
    { quote: undefined, note: undefined, savedTo: undefined, deletedAt: now },
    now,
  )
}
