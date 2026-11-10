import { useLiveQuery } from 'dexie-react-hooks'
import { Brain } from 'lucide-react'
import { useMemo } from 'react'
import type { LearningNotesDB } from '../core/db'
import type { Notebook } from '../core/types'
import { displayName, sampleName } from '../i18n/defaultNames'
import { t } from '../i18n/t'
import { countDue, dueByNotebook } from '../recall/reviewLazy'
import type { ReviewScope } from '../recall/reviewService'

/**
 * The Review space's own screen (item 27): cards due now, a Start button, and
 * the decks (notebooks) that have cards waiting. The sidebar keeps its Study list.
 */
export function ReviewHome({
  db,
  notebooks,
  onReview,
  onAllCards,
}: {
  db: LearningNotesDB
  notebooks: Notebook[]
  onReview: (scope: ReviewScope) => void
  onAllCards: () => void
}) {
  const stats = useLiveQuery(async () => {
    await db.cards.count()
    const now = Date.now()
    const [due, byBook] = await Promise.all([
      countDue(db, now),
      dueByNotebook(db, now),
    ])
    return { due, byBook }
  }, [db])
  const decks = useMemo(
    () =>
      notebooks
        .filter((n) => !n.kind && (stats?.byBook.get(n.id) ?? 0) > 0)
        .map((n) => ({
          id: n.id,
          name: displayName(sampleName(n)) || t('review.untitled'),
          due: stats?.byBook.get(n.id) ?? 0,
        })),
    [notebooks, stats],
  )
  const due = stats?.due ?? 0
  return (
    <section
      data-testid="review-home"
      className="mx-auto max-w-2xl px-4 pt-[10vh] pb-16"
    >
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Brain aria-hidden size={26} />
        {t('rvh.title')}
      </h1>
      <p className="mt-3 text-muted">
        {stats === undefined
          ? ''
          : due > 0
            ? t('rvh.due', { n: due })
            : t('rvh.none')}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={due === 0}
          onClick={() => onReview({ kind: 'all' })}
          className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-on-accent disabled:opacity-50"
        >
          {t('rvh.start')}
        </button>
        <button
          type="button"
          onClick={onAllCards}
          className="min-h-11 rounded-lg border border-line px-4 hover:bg-hover"
        >
          {t('rvh.allCards')}
        </button>
      </div>
      {decks.length > 0 && (
        <ul className="mt-6 divide-y divide-line rounded-xl border border-line">
          {decks.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onReview({ kind: 'notebook', notebookId: d.id })}
                className="flex min-h-11 w-full items-center gap-2 px-3 text-left hover:bg-hover"
              >
                <span className="flex-1 truncate">{d.name}</span>
                <span className="rounded-full bg-accent px-2 text-[11px] leading-5 font-semibold text-on-accent tabular-nums">
                  {t('nbh.due', { n: d.due })}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
