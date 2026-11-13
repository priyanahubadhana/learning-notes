import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { usePref } from '../../app/usePref'
import type { LearningNotesDB } from '../../core/db'
import { EmptyState } from '../../design/parts/EmptyState'
import { StudyTabHeader } from './StudyTabHeader'
import { t, type MessageKey } from '../../i18n/t'
import {
  DEFAULT_FILTERS,
  type SearchHit,
  type SearchQuery,
  type SortOrder,
  type StatusFilter,
} from '../../search/searchQuery'
import { useHitDetails, useSearch } from '../../search/useSearch'
import { useUnlocked } from '../../settings/level'
import { CardEditorSheet } from './CardEditorSheet'
import { CardRowStrip } from './CardRowStrip'
import { useCardsMore } from './useCardsMore'
import { getReviewQueue, type ReviewScope } from '../../recall/reviewService'
import './CardsTabV2.css'

const PAGE_SIZE = 50

const SORTS: [SortOrder, MessageKey][] = [
  ['best', 'cards.sort.due'],
  ['failed', 'cards.sort.failed'],
  ['recent', 'cards.sort.recent'],
]
const SAVED_KEY = 'cardsSavedFilters'
interface SavedFilter {
  id: string
  status: StatusFilter
}
const STATUS_IDS = ['new', 'due', 'later', 'suspended']
const isSaved = (v: unknown): v is SavedFilter[] =>
  Array.isArray(v) &&
  v.every(
    (x) =>
      x &&
      typeof x.id === 'string' &&
      typeof x.status === 'string' &&
      STATUS_IDS.includes(x.status),
  )
const isSort = (v: unknown): v is SortOrder => SORTS.some(([s]) => s === v)

/** Status filters of the Cards tab, in the words people see. */
const STATUSES: [StatusFilter, MessageKey][] = [
  ['new', 'st2.status.new'],
  ['due', 'st2.status.due'],
  ['later', 'st2.status.later'],
  ['suspended', 'st2.status.suspended'],
]
const STATUS_TEXT: Record<string, MessageKey> = {
  new: 'st2.status.new',
  due: 'st2.status.due',
  later: 'st2.status.later',
  suspended: 'st2.status.suspended',
}

/**
 * The Cards tab with the shared study header (slice 15, flag study.v2): rows
 * with a status chip, a tap opens the card editor beside the list.
 */
export function CardsTabV2({
  db,
  notebookId,
  onOpenHit,
  onReview,
  onMakeCard,
  title,
}: {
  db: LearningNotesDB
  /** null = the cards of every notebook ("All cards"). */
  notebookId: string | null
  onOpenHit: (hit: SearchHit) => void
  onReview: (scope: ReviewScope) => void
  /** The Empty state's one button: start a note to make a card in. */
  onMakeCard?: () => void
  /** Header title when it is not "Cards" (Review › Browse). */
  title?: string
}) {
  const [sort, setSort] = usePref('cardsTabSort', isSort, 'best')
  const [status, setStatus] = useState<StatusFilter | null>(null)
  const [shown, setShown] = useState(PAGE_SIZE)
  const [refresh, setRefresh] = useState(0)
  const [editing, setEditing] = useState<SearchHit | null>(null)
  const canFilter = useUnlocked('rev.browse')
  const canSave = useUnlocked('study.savedFilters')
  const canStrip = useUnlocked('rev.sessionExtras')
  const { toast } = useContext(AppUiContext)
  const [saved, setSaved] = usePref(SAVED_KEY, isSaved, [])
  const more = useCardsMore(db, notebookId)
  const activeStatus = canFilter ? status : null
  const query: SearchQuery = {
    text: '',
    type: 'card',
    filters: {
      ...DEFAULT_FILTERS,
      notebookId,
      sort,
      templates: false,
      status: activeStatus,
    },
  }
  const { outcome, now } = useSearch(db, query, refresh)
  const hits = outcome?.hits ?? []
  const visible = hits.slice(0, shown)
  const details = useHitDetails(db, visible)
  const scope: ReviewScope = notebookId
    ? { kind: 'notebook', notebookId }
    : { kind: 'all' }
  const due = useLiveQuery(
    async () => (await getReviewQueue(db, scope, now)).cards.length,
    [db, notebookId, now],
  )
  if (!outcome) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }
  const savedChips = canSave
    ? saved.map((f) => ({
        id: 'saved-' + f.id,
        label: t(STATUS_TEXT[f.status] ?? 'st2.filter'),
        onSelect: () => {
          setStatus(f.status)
          setShown(PAGE_SIZE)
        },
        onRemove: () => {
          const at = saved.findIndex((x) => x.id === f.id)
          setSaved((list) => list.filter((x) => x.id !== f.id))
          toast(t('st21.removed'), {
            label: t('annot.undo'),
            onSelect: () =>
              setSaved((list) =>
                list.some((x) => x.id === f.id)
                  ? list
                  : [...list.slice(0, at), f, ...list.slice(at)],
              ),
          })
        },
      }))
    : []
  const chips = activeStatus
    ? [
        {
          id: activeStatus,
          label: t(STATUS_TEXT[activeStatus] ?? 'st2.filter'),
          onRemove: () => {
            setStatus(null)
            setShown(PAGE_SIZE)
          },
        },
      ]
    : []
  const allChips = [...savedChips, ...chips]
  const canSaveNow =
    canSave && !!activeStatus && !saved.some((f) => f.status === activeStatus)
  return (
    <section aria-label={t('notebook.tab.cards')} className="cards-v2">
      <StudyTabHeader
        title={title ?? t('st2.title.cards')}
        count={hits.length}
        countLabel={t('st2.cardsCount', { count: hits.length })}
        filterItems={
          canFilter
            ? [
                {
                  label: t('st2.filter.all'),
                  icon: '',
                  checked: status === null,
                  onSelect: () => setStatus(null),
                },
                ...(canSaveNow
                  ? [
                      {
                        label: t('st21.save'),
                        icon: '',
                        onSelect: () => {
                          setSaved((list) => [
                            ...list,
                            { id: crypto.randomUUID(), status: status! },
                          ])
                          toast(t('st21.saved'))
                        },
                      },
                    ]
                  : []),
                ...STATUSES.map(([value, label]) => ({
                  label: t(label),
                  icon: '',
                  checked: status === value,
                  onSelect: () => {
                    setStatus(value)
                    setShown(PAGE_SIZE)
                  },
                })),
              ]
            : undefined
        }
        sortItems={SORTS.map(([value, label]) => ({
          label: t(label),
          icon: value === sort ? '✓' : '',
          onSelect: () => {
            setSort(value)
            setShown(PAGE_SIZE)
          },
        }))}
        moreItems={more.items}
        chips={allChips}
        action={
          hits.length > 0 && (
            <button
              type="button"
              className="study-header__action"
              onClick={() => onReview(scope)}
            >
              {due ? t('cards.review', { count: due }) : t('cards.practice')}
            </button>
          )
        }
      />
      {hits.length === 0 ? (
        <EmptyState
          variant="inline"
          replacesContent={!!activeStatus}
          title={activeStatus ? t('st2.filter.none') : t('st2.empty.title')}
          text={activeStatus ? undefined : t('st2.empty.text')}
          action={
            !activeStatus && onMakeCard ? t('st2.empty.action') : undefined
          }
          onAction={onMakeCard}
          testId="cards-empty"
        />
      ) : (
        <ul className="cards-v2__list">
          {visible.map((hit) => {
            const text = details?.get(hit.id)?.text ?? ''
            const chip = hit.status ? STATUS_TEXT[hit.status] : undefined
            return (
              <li key={hit.id}>
                <CardRowStrip
                  db={db}
                  hit={hit}
                  enabled={canStrip}
                  className="cards-v2__row"
                  onOpen={() => setEditing(hit)}
                  onChanged={() => setRefresh((n) => n + 1)}
                  onOpenNote={() => onOpenHit(hit)}
                >
                  <span className="cards-v2__text">
                    {text || t('st2.card.emptyQuestion')}
                  </span>
                  {chip && (
                    <span
                      className="cards-v2__chip"
                      data-status={hit.status}
                      data-testid="card-status"
                    >
                      {t(chip)}
                    </span>
                  )}
                </CardRowStrip>
              </li>
            )
          })}
        </ul>
      )}
      {hits.length > shown && (
        <button
          type="button"
          onClick={() => setShown(shown + PAGE_SIZE)}
          className="mt-3 min-h-11 w-full rounded-lg border border-line text-sm text-muted hover:border-accent hover:text-accent"
        >
          {t('search.more')}
        </button>
      )}
      {more.node}
      {editing?.blockId && (
        <CardEditorSheet
          db={db}
          blockId={editing.blockId}
          onClose={() => setEditing(null)}
          onOpenNote={() => {
            const hit = editing
            setEditing(null)
            onOpenHit(hit)
          }}
        />
      )}
    </section>
  )
}
