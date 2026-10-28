import { Tip } from '../help/Help'
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { MenuPopover } from '../app/ui'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import { byOrder } from '../core/order'
import { isLive } from '../core/records'
import { displayName, sampleName } from '../i18n/defaultNames'
import { t, type MessageKey } from '../i18n/t'
import {
  DEFAULT_FILTERS,
  type SearchHit,
  type SearchQuery,
  type SortOrder,
} from '../search/searchQuery'
import { ResultRow } from '../search/SearchResults'
import { useHitDetails, useSearch } from '../search/useSearch'
import { getReviewQueue, type ReviewScope } from './reviewService'

/** Rows drawn at first, and added per "Show more". */
const PAGE_SIZE = 50

/**
 * Card sorts, as Search sorts: browsing cards "best" = soonest due first.
 */
const SORTS: [SortOrder, MessageKey][] = [
  ['best', 'cards.sort.due'],
  ['failed', 'cards.sort.failed'],
  ['recent', 'cards.sort.recent'],
]
const isSort = (v: unknown): v is SortOrder =>
  SORTS.some(([sort]) => sort === v)

/**
 * A notebook's Cards tab: every card in its notes (same engine as
 * Search › Cards), with a sort and "Review N due".
 */
export function CardsTab({
  db,
  notebookId,
  onOpenHit,
  onReview,
}: {
  db: LearningNotesDB
  /** null = the cards of every notebook ("All cards"). */
  notebookId: string | null
  onOpenHit: (hit: SearchHit) => void
  onReview: (scope: ReviewScope) => void
}) {
  const [sort, setSort] = usePref('cardsTabSort', isSort, 'best')
  const [shown, setShown] = useState(PAGE_SIZE)
  const [menu, setMenu] = useState<DOMRect | null>(null)
  const all = notebookId === null
  // "All cards" can be searched and narrowed to one notebook.
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const notebooks = useLiveQuery(
    async () =>
      all
        ? (await db.notebooks.toArray())
            .filter((n) => isLive(n) && !n.kind)
            .sort(byOrder)
        : [],
    [db, all],
  )
  // A notebook that was deleted meanwhile no longer narrows the list.
  const narrowedTo =
    all && picked && notebooks?.some((n) => n.id === picked) ? picked : null
  const effectiveNotebook = notebookId ?? narrowedTo
  const query: SearchQuery = {
    text: all ? text : '',
    type: 'card',
    filters: {
      ...DEFAULT_FILTERS,
      notebookId: effectiveNotebook,
      sort,
      templates: false,
    },
  }
  const { outcome, now } = useSearch(db, query)
  const hits = outcome?.hits ?? []
  const visible = hits.slice(0, shown)
  const details = useHitDetails(db, visible)
  const scope: ReviewScope = effectiveNotebook
    ? { kind: 'notebook', notebookId: effectiveNotebook }
    : { kind: 'all' }
  const due = useLiveQuery(
    async () => (await getReviewQueue(db, scope, now)).cards.length,
    [db, effectiveNotebook, now],
  )
  const sortLabel = t(SORTS.find(([s]) => s === sort)![1])

  if (!outcome) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }
  return (
    <section aria-label={t('notebook.tab.cards')}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="me-auto text-[15px] font-semibold">
          {t('cards.count', { count: hits.length })}{' '}
          <small className="text-xs font-normal text-muted">
            {t(notebookId ? 'cards.fromNotebook' : 'cards.fromAll')}
          </small>
        </h2>
        {all && (
          <>
            <input
              type="search"
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setShown(PAGE_SIZE)
              }}
              placeholder={t('cards.search')}
              aria-label={t('cards.search')}
              className="min-h-9 w-44 min-w-0 rounded-lg border border-line bg-bg px-3 text-[13px] outline-none focus:border-accent"
            />
            <select
              aria-label={t('cards.notebookFilter')}
              value={narrowedTo ?? ''}
              onChange={(e) => {
                setPicked(e.target.value || null)
                setShown(PAGE_SIZE)
              }}
              className="min-h-9 max-w-44 rounded-lg border border-line bg-bg px-2 text-[13px]"
            >
              <option value="">{t('cards.allNotebooks')}</option>
              {notebooks?.map((n) => (
                <option key={n.id} value={n.id}>
                  {displayName(sampleName(n)) || t('review.untitled')}
                </option>
              ))}
            </select>
          </>
        )}
        {hits.length > 0 && (
          <>
            <Tip id="cards.sort" touchInfo={false}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={!!menu}
                onClick={(e) =>
                  setMenu(e.currentTarget.getBoundingClientRect())
                }
                className="min-h-9 rounded-lg border border-line px-3 text-[13px] hover:border-accent"
              >
                {t('cards.sort', { name: sortLabel })} ▾
              </button>
            </Tip>
            <Tip id="cards.review" touchInfo={false}>
              <button
                type="button"
                onClick={() => onReview(scope)}
                className="min-h-9 rounded-lg bg-accent px-3 text-[13px] font-medium text-white hover:opacity-90"
              >
                {due ? t('cards.review', { count: due }) : t('cards.practice')}
              </button>
            </Tip>
          </>
        )}
      </div>
      {hits.length === 0 ? (
        <p className="text-sm text-muted">{t('cards.none')}</p>
      ) : (
        <ul className="rounded-[10px] border border-line p-1">
          {visible.map((hit) => (
            <li key={hit.id} className="border-b border-line last:border-0">
              <ResultRow
                hit={hit}
                details={details?.get(hit.id)}
                query={all ? text.trim() : ''}
                now={now}
                chip={all}
                plain
                onOpen={onOpenHit}
              />
            </li>
          ))}
        </ul>
      )}
      {hits.length > shown && (
        <button
          type="button"
          onClick={() => setShown(shown + PAGE_SIZE)}
          className="mt-3 min-h-10 w-full rounded-lg border border-line text-sm text-muted hover:border-accent hover:text-accent"
        >
          {t('search.more')}
        </button>
      )}
      <p className="mt-4 text-xs text-muted">{t('cards.note')}</p>
      {menu && (
        <MenuPopover
          anchor={menu}
          onClose={() => setMenu(null)}
          items={SORTS.map(([value, label]) => ({
            label: t(label),
            icon: value === sort ? '✓' : '',
            onSelect: () => {
              setSort(value)
              setShown(PAGE_SIZE)
            },
          }))}
        />
      )}
    </section>
  )
}
