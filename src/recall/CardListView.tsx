import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useState } from 'react'
import { EditorContext } from '../editor/editorContext'
import { EmptyState } from '../app/ui'
import { t } from '../i18n/t'
import { listCardRows } from './cardList'
import { CardStatusLabel } from './CardStatusLabel'
import { useMinuteClock } from './useMinuteClock'

/** Rows shown before "Show all" (keeps very large pages quick). */
const FIRST_ROWS = 100

/**
 * Body of a "Card list" block: the cards on this page (and its sub-pages
 * with `includeSubpages`), updated live. Picking a row scrolls to its card.
 */
export function CardListView({
  includeSubpages,
}: {
  includeSubpages: boolean
}) {
  const app = useContext(EditorContext)
  const now = useMinuteClock()
  const rows = useLiveQuery(
    async () =>
      app ? listCardRows(app.db, app.pageId, includeSubpages, now) : [],
    [app, includeSubpages, now],
  )
  const [showAll, setShowAll] = useState(false)
  if (!rows) return <div className="h-16 w-full" />

  const shown = showAll ? rows : rows.slice(0, FIRST_ROWS)
  const title = includeSubpages ? 'cardList.titleTree' : 'cardList.title'
  return (
    <section
      contentEditable={false}
      aria-label={t(title)}
      className="w-full rounded-xl border border-line px-3 py-2.5 select-none"
    >
      <div className="flex items-center gap-2 px-2 pb-1.5 text-[11px] tracking-[0.06em] text-muted uppercase">
        <span aria-hidden>🃏</span>
        <span className="flex-1">{t(title)}</span>
        <span>{t('cardList.count', { count: rows.length })}</span>
        {app?.reviewCards && rows.length > 0 && (
          <button
            type="button"
            onClick={() => app.reviewCards?.(includeSubpages)}
            className="-my-1 min-h-8 rounded-md px-2 tracking-normal text-accent normal-case hover:bg-hover"
          >
            {t('cardList.review')}
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          testId="cards-empty"
          className="m-1"
          icon="cards"
          text={t('cardList.empty')}
        />
      ) : (
        <ul>
          {shown.map((row) => (
            <li key={row.cardId} data-page-row>
              <button
                type="button"
                onClick={() => app?.openBlock(row.pageId, row.blockId)}
                className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-start text-sm hover:bg-hover focus-visible:bg-hover"
              >
                <span className="min-w-0 flex-1 truncate">{row.question}</span>
                {row.pageTitle !== null && (
                  <span className="max-w-[35%] shrink-0 truncate text-xs text-muted">
                    {row.pageTitle || t('review.untitled')}
                  </span>
                )}
                <CardStatusLabel status={row.status} due={row.due} now={now} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!showAll && rows.length > FIRST_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-1 min-h-10 w-full rounded-lg px-2 text-start text-sm text-muted hover:bg-hover hover:text-ink"
        >
          {t('cardList.showAll', { count: rows.length })}
        </button>
      )}
    </section>
  )
}
