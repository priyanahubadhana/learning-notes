import type { LearningNotesDB } from '../../core/db'
import { byOrder } from '../../core/order'
import { isLive } from '../../core/records'
import type { Notebook } from '../../core/types'
import {
  duplicatePages,
  extractPages,
} from '../../app/panel/v2/pageOrganiseService'
import { deleteNotebook, setNotebookCover } from '../notebookService'

/**
 * NB-B08 Duplicate: a new notebook after the others, with a copy of every
 * page (sub-pages, text, drawings, cards) and the same cover. Built from the
 * two page services that already exist, so no new storage code.
 * Returns the new notebook's id (Undo sends it to Trash).
 */
export async function duplicateNotebook(
  db: LearningNotesDB,
  source: Notebook,
  title: string,
): Promise<string | null> {
  const pages = (await db.pages.where('notebookId').equals(source.id).toArray())
    .filter((p) => isLive(p) && p.parentId === null)
    .sort(byOrder)
  if (pages.length === 0) return null
  // Copies sit right after their originals; then they move to a new notebook.
  const copies = await duplicatePages(
    db,
    pages.map((p, i) => ({ sourceId: p.id, parentId: null, toIndex: i + 1 })),
    (p) => p.title,
  )
  const { notebookId } = await extractPages(db, copies, { kind: 'new', title })
  await setNotebookCover(db, notebookId, {
    colour: source.colour,
    cover: source.cover,
  })
  return notebookId
}

export const undoDuplicateNotebook = (db: LearningNotesDB, id: string) =>
  deleteNotebook(db, id)
