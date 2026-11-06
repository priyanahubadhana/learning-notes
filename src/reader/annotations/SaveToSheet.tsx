import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import type { LearningNotesDB } from '../../core/db'
import { isLive } from '../../core/records'
import { t } from '../../i18n/t'

/** Where "Save to…" can put a highlight. */
export type SaveTarget =
  { kind: 'book' } | { kind: 'new' } | { kind: 'page'; pageId: string }

/**
 * A sheet with the places a highlight can be saved to: the book's own page,
 * a new "Highlights" page, or any other page (searched by title).
 */
export function SaveToSheet({
  db,
  excludePageId,
  onPick,
  onCancel,
}: {
  db: LearningNotesDB
  excludePageId: string
  onPick: (target: SaveTarget) => void
  onCancel: () => void
}) {
  const [picking, setPicking] = useState(false)
  const [filter, setFilter] = useState('')
  const pages = useLiveQuery(
    async () =>
      picking
        ? (await db.pages.toArray())
            .filter(
              (p) =>
                isLive(p) &&
                p.id !== excludePageId &&
                !p.databaseId &&
                !p.source,
            )
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 400)
        : [],
    [db, picking, excludePageId],
  )
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return (pages ?? [])
      .filter((p) => !q || p.title.toLowerCase().includes(q))
      .slice(0, 40)
  }, [pages, filter])
  const row =
    'min-h-11 w-full rounded-lg px-3 text-start text-sm hover:bg-hover'
  return (
    <div
      data-chrome
      role="dialog"
      aria-label={t('annot.saveTo')}
      className="fixed inset-x-2 bottom-2 z-50 mx-auto max-w-md rounded-xl border border-line bg-bg p-2 shadow-xl"
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      {!picking ? (
        <>
          <button
            type="button"
            className={row}
            onClick={() => onPick({ kind: 'book' })}
          >
            {t('annot.saveToThisBook')}
          </button>
          <button
            type="button"
            className={row}
            onClick={() => onPick({ kind: 'new' })}
          >
            {t('annot.saveToNewPage')}
          </button>
          <button
            type="button"
            className={row}
            onClick={() => setPicking(true)}
          >
            {t('annot.saveToPick')}
          </button>
        </>
      ) : (
        <>
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label={t('annot.saveToPick')}
            className="mb-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm"
          />
          <ul className="max-h-60 overflow-auto">
            {shown.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={row}
                  onClick={() => onPick({ kind: 'page', pageId: p.id })}
                >
                  {p.title || t('review.untitled')}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="mt-1 min-h-11 w-full rounded-lg text-sm text-muted hover:bg-hover"
      >
        {t('annot.cancel')}
      </button>
    </div>
  )
}
