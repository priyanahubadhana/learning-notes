import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../../core/db'
import { dateLocale } from '../../i18n/t'
import { dayKind } from '../notebookLook'
import { tn } from './tn'

/** "Today", "Yesterday" or a short date (NB-B03). */
export function openedLabel(ts: number): string {
  const kind = dayKind(ts)
  if (kind === 'today') return tn('nbv2.today')
  if (kind === 'yesterday') return tn('nbv2.yesterday')
  return new Date(ts).toLocaleDateString(dateLocale(), {
    day: 'numeric',
    month: 'short',
  })
}

/** Live pages of one notebook, through the notebookId index (rows on screen only). */
export function usePageCount(db: LearningNotesDB, notebookId: string) {
  return useLiveQuery(
    async () =>
      (await db.pages.where('notebookId').equals(notebookId).toArray()).filter(
        (p) => p.deletedAt === null && !p.databaseId,
      ).length,
    [db, notebookId],
  )
}
