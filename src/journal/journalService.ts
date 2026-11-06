import { copyBlocks, createBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { Notebook, Page } from '../core/types'
import { syncCardRecords } from '../recall/cardService'
import {
  createNotebook,
  findNotebookOfKind,
} from '../notebooks/notebookService'
import { createPage, listPages } from '../pages/pageService'
import { ensureTemplates, getDailyTemplate } from '../templates/templateService'
import { dateKey, dayTitle, monthKey, monthTitle } from './dates'

/**
 * Daily journal: one page per day, grouped under month pages, inside a
 * "Journal" notebook that is created when first needed.
 */

/** Returns the Journal notebook, creating it the first time. */
export async function ensureJournal(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<Notebook> {
  return db.transaction('rw', db.workspaces, db.notebooks, async () => {
    return (
      (await findNotebookOfKind(db, workspaceId, 'journal')) ??
      (await createNotebook(db, workspaceId, 'Journal', 'journal'))
    )
  })
}

/**
 * Opens the journal page for `date` (default: today), creating it — and its
 * month page — if needed. New days are filled from the Daily journal template.
 */
export async function openJournalDay(
  db: LearningNotesDB,
  workspaceId: string,
  date: Date = new Date(),
): Promise<{ page: Page; created: boolean }> {
  return db.transaction(
    'rw',
    [db.workspaces, db.notebooks, db.pages, db.blocks, db.cards],
    async () => {
      const journal = await ensureJournal(db, workspaceId)
      const pages = await listPages(db, journal.id)

      const existing = pages.find((p) => p.journalDate === dateKey(date))
      if (existing) return { page: existing, created: false }

      const month =
        pages.find(
          (p) => p.journalMonth === monthKey(date) && p.parentId === null,
        ) ??
        (await createPage(db, journal.id, null, monthTitle(date), {
          journalMonth: monthKey(date),
        }))
      const page = await createPage(db, journal.id, month.id, dayTitle(date), {
        journalDate: dateKey(date),
      })

      await ensureTemplates(db, workspaceId)
      const daily = await getDailyTemplate(db, workspaceId)
      if (daily) {
        await copyBlocks(db, daily.id, page.id, ['pageLink'])
        await syncCardRecords(db, page.id) // copied cards get a schedule
      }
      // The day's task record (F1): read live from the tasks, never edited.
      await createBlock(db, {
        pageId: page.id,
        type: 'dayRecord',
        content: { day: dateKey(date) },
      })
      return { page, created: true }
    },
  )
}
