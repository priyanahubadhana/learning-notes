import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { listSources } from './libraryService'

/**
 * The sidebar of the Library space: Capture and the sources, newest first,
 * so any book opens in one tap while the gallery fills the main area.
 */
export function LibrarySidebar({
  db,
  workspaceId,
  currentPageId,
  onOpenPage,
  onCapture,
}: {
  db: LearningNotesDB
  workspaceId: string
  currentPageId: string | null
  onOpenPage: (pageId: string) => void
  onCapture: () => void
}) {
  const sources = useLiveQuery(
    () => listSources(db, workspaceId),
    [db, workspaceId],
  )
  return (
    <section aria-label={t('library.title')} className="px-1.5 py-2">
      <h2 className="mb-1 text-[11px] tracking-[0.06em] text-muted uppercase">
        {t('library.title')}
      </h2>
      <button
        type="button"
        onClick={onCapture}
        className="mb-2 min-h-11 w-full rounded-lg border border-line px-3 text-start text-sm hover:border-accent"
      >
        + {t('library.capture')}
      </button>
      <ul>
        {(sources ?? []).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onOpenPage(p.id)}
              aria-current={p.id === currentPageId ? 'page' : undefined}
              className={`min-h-11 w-full truncate rounded-lg px-3 text-start text-sm hover:bg-hover ${
                p.id === currentPageId ? 'bg-hover font-medium' : ''
              }`}
            >
              {p.title || t('review.untitled')}
            </button>
          </li>
        ))}
      </ul>
      {sources?.length === 0 && (
        <p className="px-1 text-xs text-muted">{t('library.empty')}</p>
      )}
    </section>
  )
}
