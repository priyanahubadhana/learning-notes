import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../../core/db'
import { recentPages } from '../../core/recentPages'
import { isLive } from '../../core/records'
import { displayName, sampleName } from '../../i18n/defaultNames'
import { t } from '../../i18n/t'
import { listNotebooks } from '../../notebooks/notebookService'

const RECENT = 20

/**
 * The whole-app Notes view (Phase M): every notebook, and the pages you
 * edited last. The full notes stay on their pages; this is the way in.
 */
export function NotesOverview({
  db,
  workspaceId,
  onOpenNotebook,
  onOpenPage,
}: {
  db: LearningNotesDB
  workspaceId: string
  onOpenNotebook: (notebookId: string) => void
  onOpenPage: (pageId: string) => void
}) {
  const data = useLiveQuery(async () => {
    const notebooks = await listNotebooks(db, workspaceId)
    const live = new Set(notebooks.map((n) => n.id))
    const pages = await recentPages(
      db,
      (p) => isLive(p) && !p.databaseId && live.has(p.notebookId),
      RECENT,
    )
    return { notebooks, pages }
  }, [db, workspaceId])
  if (!data) return null
  const row =
    'flex min-h-11 w-full items-center rounded-lg px-3 text-start text-sm hover:bg-hover'
  return (
    <section aria-label={t('summary.seg.notes')} className="grid gap-5">
      <div>
        <h2 className="mb-1 text-sm font-semibold">
          {t('summary.notes.books')}
        </h2>
        <ul>
          {data.notebooks.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onOpenNotebook(n.id)}
                className={row}
              >
                {displayName(sampleName(n)) || t('review.untitled')}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="mb-1 text-sm font-semibold">
          {t('summary.notes.recent')}
        </h2>
        {data.pages.length === 0 && (
          <p className="text-sm text-muted">{t('summary.notes.none')}</p>
        )}
        <ul>
          {data.pages.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpenPage(p.id)}
                className={row}
              >
                {sampleName(p) || t('review.untitled')}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
