import type { LearningNotesDB } from '../../core/db'

/**
 * "Always open in Reading mode" for a page or a notebook: an optional flag
 * (`readFirst`) on the record, so it goes with backups and needs no
 * database upgrade.
 */
export async function setReadFirst(
  db: LearningNotesDB,
  kind: 'page' | 'notebook',
  id: string,
  on: boolean,
): Promise<void> {
  const changes = {
    readFirst: on ? (true as const) : undefined,
    updatedAt: Date.now(),
  }
  if (kind === 'page') await db.pages.update(id, changes)
  else await db.notebooks.update(id, changes)
}
