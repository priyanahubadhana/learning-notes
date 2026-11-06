import type { LearningNotesDB } from './db'
import { purgeMany } from './records'

/**
 * Erases every recording of pages that are being deleted forever (Trash).
 * The page is gone, so its sound goes with it. Lives in core so Trash does
 * not need to import the audio feature.
 */
export async function purgeRecordingsOf(
  db: LearningNotesDB,
  pageIds: readonly string[],
  now: number,
): Promise<void> {
  const rows = await db.recordings
    .where('pageId')
    .anyOf([...pageIds])
    .toArray()
  await purgeMany(
    db.recordings,
    rows.filter((r) => r.purgedAt === undefined).map((r) => r.id),
    { data: new ArrayBuffer(0), name: '', deletedAt: now },
    now,
  )
}
