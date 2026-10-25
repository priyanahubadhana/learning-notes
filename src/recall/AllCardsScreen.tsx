import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useId, useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import { currentLocale, t } from '../i18n/t'
import { queryCards, type CardHit, type CardQuery } from './cardQuery'

/** Cards per "Load more". */
const PAGE_SIZE = 100

/**
 * "All cards": every card in one list, with search and each card's
 * status. Picking a card opens its note at the card. The query lives in
 * `CardQuery`, so filters and tags can be added here later.
 */
export function AllCardsScreen({
  db,
  onOpenNote,
}: {
  db: LearningNotesDB
  onOpenNote: (pageId: string, blockId: string) => void
}) {
  const [search, setSearch] = useState('')
  const query = useDebounced<CardQuery>({ search }, 250)
  const [pages, setPages] = useState(1)
  const count = pages * PAGE_SIZE
  const result = useLiveQuery(
    () => queryCards(db, query, { limit: count }),
    [db, query.search, count],
  )
  const searchId = useId()

  return (
    <div className="mx-auto max-w-[760px] px-4 pt-8 pb-24 md:px-12 md:pt-12">
      <h1 className="text-[32px] leading-tight font-bold tracking-[-0.02em]">
        {t('cards.title')}
      </h1>
      <label htmlFor={searchId} className="sr-only">
        {t('cards.search')}
      </label>
      <input
        id={searchId}
        type="search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPages(1)
        }}
        placeholder={t('cards.search')}
        className="mt-5 mb-4 min-h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent"
      />

      {result === undefined ? (
        <div className="h-24" />
      ) : result.hits.length === 0 ? (
        <p className="py-6 text-sm text-muted">
          {query.search?.trim()
            ? t('cards.noMatch', { query: query.search.trim() })
            : t('cards.empty')}
        </p>
      ) : (
        <ul aria-label={t('cards.title')}>
          {result.hits.map((hit) => (
            <li key={hit.cardId} className="border-b border-line last:border-0">
              <button
                type="button"
                onClick={() => onOpenNote(hit.pageId, hit.blockId)}
                className="flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-2 text-start hover:bg-hover focus-visible:bg-hover"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{hit.question}</span>
                  <span className="block truncate text-xs text-muted">
                    {hit.notebookTitle || t('review.untitled')} ·{' '}
                    {hit.pageTitle || t('review.untitled')}
                  </span>
                </span>
                <Status hit={hit} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {result?.next != null && (
        <button
          type="button"
          onClick={() => setPages((n) => n + 1)}
          className="mt-3 min-h-10 w-full rounded-lg border border-line text-sm text-muted hover:border-accent hover:text-accent"
        >
          {t('cards.more')}
        </button>
      )}
    </div>
  )
}

const STATUS_KEYS = {
  new: 'cardList.status.new',
  due: 'cardList.status.due',
  suspended: 'cardList.status.suspended',
} as const

function Status({ hit }: { hit: CardHit }) {
  const text =
    hit.status === 'later'
      ? new Intl.DateTimeFormat(currentLocale(), {
          day: 'numeric',
          month: 'short',
        }).format(hit.due)
      : t(STATUS_KEYS[hit.status])
  return (
    <span
      className={`shrink-0 text-xs ${
        hit.status === 'due' ? 'font-medium text-accent' : 'text-muted'
      }`}
    >
      {text}
    </span>
  )
}

/** `value`, updated only after it stops changing for `ms`. */
function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  const key = JSON.stringify(value)
  useEffect(() => {
    const id = setTimeout(() => setSettled(JSON.parse(key) as T), ms)
    return () => clearTimeout(id)
  }, [key, ms])
  return settled
}
