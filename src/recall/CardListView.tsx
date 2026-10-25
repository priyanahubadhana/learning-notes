import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useState } from 'react'
import { EditorContext } from '../editor/editorContext'
import { currentLocale, t } from '../i18n/t'
import { listCardRows, type CardRow } from './cardList'

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
        <p className="px-2 py-1.5 text-sm text-muted">{t('cardList.empty')}</p>
      ) : (
        <ul>
          {shown.map((row) => (
            <li key={row.cardId}>
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
                <StatusLabel row={row} now={now} />
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

const STATUS_KEYS = {
  new: 'cardList.status.new',
  due: 'cardList.status.due',
  suspended: 'cardList.status.suspended',
} as const

function StatusLabel({ row, now }: { row: CardRow; now: number }) {
  const text =
    row.status === 'later'
      ? relativeTime(row.due - now)
      : t(STATUS_KEYS[row.status])
  return (
    <span
      className={`shrink-0 text-xs ${
        row.status === 'due' ? 'font-medium text-accent' : 'text-muted'
      }`}
    >
      {text}
    </span>
  )
}

/** "in 10 minutes", "tomorrow", "in 3 days" (in the app's language). */
function relativeTime(ms: number): string {
  const format = new Intl.RelativeTimeFormat(currentLocale(), {
    numeric: 'auto',
  })
  const minutes = Math.ceil(ms / 60_000)
  if (minutes < 60) return format.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return format.format(hours, 'hour')
  return format.format(Math.round(hours / 24), 'day')
}

/** The current time, updated each minute (so "due" labels stay right). */
function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}
