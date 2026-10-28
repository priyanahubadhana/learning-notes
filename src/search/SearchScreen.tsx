import { Tip } from '../help/Help'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AppUiContext } from '../app/appUi'
import { usePref } from '../app/usePref'
import { removeEmptyCards, restoreEmptyCards } from '../recall/emptyCards'
import type { LearningNotesDB } from '../core/db'
import { t, type MessageKey } from '../i18n/t'
import { tagMap, tagPathIn, tagPathName } from '../tags/tagService'
import {
  STATUS_FILTERS,
  type ChangedFilter,
  type SearchFilters,
  type SearchHit,
  type SearchQuery,
  type SortOrder,
  type StatusFilter,
} from './searchQuery'
import { ResultRow } from './SearchResults'
import { useHitDetails, useSearch } from './useSearch'
import { suggestSearch } from './suggest'
import { TypeChips } from './TypeChips'

/** Results drawn at first, and added per "Show more". */
const PAGE_SIZE = 50

type View = 'list' | 'compact' | 'grouped'
const VIEWS: View[] = ['list', 'compact', 'grouped']
const isView = (v: unknown): v is View => VIEWS.includes(v as View)

const STATUS_KEY: Record<StatusFilter, MessageKey> = {
  due: 'search.status.due',
  new: 'search.status.new',
  wrong: 'search.status.wrong',
  later: 'search.status.later',
  suspended: 'search.status.suspended',
  empty: 'search.status.empty',
}

/**
 * The full Search screen: box, type chips with counts, filters (notebook,
 * card status, More filters: changed, include, sort), views (List ·
 * Compact · Grouped, remembered), "Did you mean…?", and "Review these
 * cards" for the card results.
 */
export function SearchScreen({
  db,
  initial,
  title,
  onOpenHit,
  onReview,
  onClose,
  actions,
  onChange,
}: {
  db: LearningNotesDB
  initial: SearchQuery
  /** Shown instead of "Search" (e.g. a saved search's name). */
  title?: string
  onOpenHit: (hit: SearchHit) => void
  onReview: (blockIds: string[], name: string) => void
  /** Leaves the screen (its close button shows on phones, full screen). */
  onClose: () => void
  /** Extra buttons next to the result count (e.g. Save search). */
  actions?: (query: SearchQuery) => React.ReactNode
  /** Called with the search whenever it changes. */
  onChange?: (query: SearchQuery) => void
}) {
  const [text, setText] = useState(initial.text)
  const [type, setType] = useState(initial.type)
  const [filters, setFilters] = useState(initial.filters)
  const [moreOpen, setMoreOpen] = useState(false)
  const [view, setView] = usePref<View>('searchView', isView, 'list')
  const query: SearchQuery = { text, type, filters }
  const queryKey = JSON.stringify(query)
  // "Show more" counts start over when the search changes.
  const [paging, setPaging] = useState({ key: queryKey, shown: PAGE_SIZE })
  const shown = paging.key === queryKey ? paging.shown : PAGE_SIZE
  const { outcome, now } = useSearch(db, query)
  const inputId = useId()

  const change = useRef(onChange)
  useEffect(() => {
    change.current = onChange
  })
  useEffect(() => {
    change.current?.(JSON.parse(queryKey) as SearchQuery)
  }, [queryKey])

  const setFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K],
  ) => setFilters((f) => ({ ...f, [key]: value }))

  const notebooks = useLiveQuery(() => db.notebooks.toArray(), [db])
  const notebookName = (id: string) =>
    notebooks?.find((n) => n.id === id)?.title || t('review.untitled')
  const tags = useLiveQuery(() => tagMap(db), [db])
  const tagLabel = (id: string) => `#${tags ? tagPathName(tags, id) : ''}`
  // The tag menu goes step by step: the chosen tag's sub-tags (or the top
  // level), each with how many results it would give.
  const tagLevel = tags
    ? [...tags.values()]
        .filter((tag) => tag.parentId === filters.tagId)
        .map((tag) => ({
          value: tag.id,
          label: `#${tag.name}`,
          count: outcome?.tagCounts.get(tag.id) ?? 0,
        }))
        .filter((item) => item.count > 0)
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    : []
  const tagCrumbs = filters.tagId && tags ? tagPathIn(tags, filters.tagId) : []

  const hits = outcome?.hits ?? []
  const visible = hits.slice(0, shown)
  const details = useHitDetails(db, visible)
  const active = !!outcome?.active
  const cardIds = hits.flatMap((h) =>
    h.type === 'card' && h.blockId && !h.empty ? [h.blockId] : [],
  )
  const emptyIds = hits.flatMap((h) =>
    h.empty && h.blockId && !h.deleted ? [h.blockId] : [],
  )
  const ui = useContext(AppUiContext)
  const removeEmpty = async () => {
    const removed = await removeEmptyCards(db, emptyIds)
    ui.toast(t('search.removedEmpty', { count: removed.count }), {
      label: t('review.undo'),
      onSelect: () => void restoreEmptyCards(db, removed),
    })
  }
  const showStatus =
    active &&
    (type === 'card' ||
      filters.status !== null ||
      (outcome?.typeCounts.card ?? 0) > 0)

  const suggestion = useLiveQuery(
    async () =>
      active && hits.length === 0 && text.trim()
        ? suggestSearch(db, text)
        : null,
    [db, active, hits.length, text],
  )

  const row = (hit: SearchHit, compact: boolean) => (
    <li key={hit.id} className="border-b border-line last:border-0">
      <ResultRow
        hit={hit}
        details={details?.get(hit.id)}
        query={text}
        now={now}
        compact={compact}
        onOpen={onOpenHit}
      />
    </li>
  )

  return (
    <div className="phone:fixed phone:inset-0 phone:z-30 phone:overflow-auto phone:bg-bg">
      <div className="mx-auto max-w-[920px] px-4 pt-8 pb-24 phone:pt-16 md:px-12 md:pt-12">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="flex-1 text-[26px] leading-tight font-bold tracking-[-0.02em]">
            {title ?? t('search.title')}
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('search.close')}
            title={t('search.close')}
            className="hidden size-11 items-center justify-center rounded-lg text-lg text-muted hover:bg-hover hover:text-ink phone:flex"
          >
            ×
          </button>
        </div>
        <label htmlFor={inputId} className="sr-only">
          {t('search.placeholder')}
        </label>
        <div className="flex items-center gap-2.5 rounded-[10px] border border-line px-3.5 py-2.5 focus-within:border-accent">
          <span aria-hidden className="text-muted">
            🔍
          </span>
          <input
            id={inputId}
            type="search"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('search.placeholder')}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base outline-none"
          />
        </div>
        <Tip id="search.types" className="flex items-center" touchInfo={false}>
          <TypeChips
            value={type}
            onChange={setType}
            counts={active ? outcome.typeCounts : undefined}
            className="pt-2.5"
          />
        </Tip>

        <div className="mt-3.5 mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {active && (
              <>
                <Facet
                  label={
                    filters.notebookId
                      ? notebookName(filters.notebookId)
                      : t('search.filter.notebook')
                  }
                  on={filters.notebookId !== null}
                  onClear={() => setFilter('notebookId', null)}
                  items={[...outcome.notebookCounts]
                    .sort((a, b) => b[1] - a[1])
                    .map(([id, count]) => ({
                      value: id,
                      label: notebookName(id),
                      count,
                    }))}
                  empty={t('search.filter.noNotebooks')}
                  onPick={(id) => setFilter('notebookId', id)}
                />
                {(tagLevel.length > 0 || filters.tagId) && (
                  <Facet
                    label={
                      filters.tagId
                        ? tagLabel(filters.tagId)
                        : t('search.filter.tag')
                    }
                    on={filters.tagId !== null}
                    onClear={() => setFilter('tagId', null)}
                    header={
                      tagCrumbs.length > 0 && (
                        <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-1 pb-1.5 text-xs text-muted">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => setFilter('tagId', null)}
                            className="min-h-7 rounded px-1 hover:bg-hover hover:text-ink"
                          >
                            {t('search.filter.allTags')}
                          </button>
                          {tagCrumbs.map((tag) => (
                            <span key={tag.id} className="flex items-center">
                              ›
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => setFilter('tagId', tag.id)}
                                className="min-h-7 rounded px-1 hover:bg-hover hover:text-ink"
                              >
                                {tag.name}
                              </button>
                            </span>
                          ))}
                        </div>
                      )
                    }
                    items={tagLevel}
                    empty={
                      filters.tagId
                        ? t('search.filter.noSubTags')
                        : t('search.filter.noTags')
                    }
                    onPick={(id) => setFilter('tagId', id)}
                  />
                )}
                {showStatus && (
                  <Facet
                    label={
                      filters.status
                        ? t(STATUS_KEY[filters.status])
                        : t('search.filter.status')
                    }
                    on={filters.status !== null}
                    onClear={() => setFilter('status', null)}
                    items={STATUS_FILTERS.flatMap((s) => {
                      const count = outcome.statusCounts.get(s) ?? 0
                      return count
                        ? [{ value: s, label: t(STATUS_KEY[s]), count }]
                        : []
                    })}
                    empty={t('search.filter.noStatus')}
                    onPick={(s) => setFilter('status', s as StatusFilter)}
                  />
                )}
                <button
                  type="button"
                  aria-expanded={moreOpen}
                  onClick={() => setMoreOpen((o) => !o)}
                  className={facetClass(moreOpen || hasMoreFilters(filters))}
                >
                  {t('search.filter.more')}
                </button>
              </>
            )}
          </div>
          <div
            role="group"
            aria-label={t('search.view')}
            className="inline-flex overflow-hidden rounded-lg border border-line text-[12.5px]"
          >
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`min-h-8 px-2.5 ${view === v ? 'bg-hover font-semibold' : 'text-muted'}`}
              >
                {t(`search.view.${v}`)}
              </button>
            ))}
          </div>
        </div>

        {moreOpen && active && (
          <MoreFilters filters={filters} onChange={setFilter} />
        )}

        {active && hits.length > 0 && (
          <div className="mt-3.5 mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[12.5px] text-muted">
            <span aria-live="polite">
              {t('search.count', { count: hits.length })}
              {filters.trash && ` · ${t('search.includingTrash')}`}
            </span>
            <span className="flex flex-wrap gap-2">
              {actions?.(query)}
              {filters.status === 'empty' && emptyIds.length > 0 && (
                <Tip id="search.removeEmpty">
                  <button
                    type="button"
                    onClick={() => void removeEmpty()}
                    className="min-h-8 rounded-lg border border-line px-3 text-[13px] text-danger hover:border-danger"
                  >
                    {t('search.removeEmpty', { count: emptyIds.length })}
                  </button>
                </Tip>
              )}
              {cardIds.length > 0 && (
                <Tip id="search.reviewCards">
                  <button
                    type="button"
                    onClick={() =>
                      onReview(
                        cardIds,
                        title ?? (text.trim() || t('search.type.card')),
                      )
                    }
                    className="min-h-8 rounded-lg bg-accent px-3 text-[13px] font-medium text-white hover:opacity-90"
                  >
                    {t('search.reviewThese', { count: cardIds.length })}
                  </button>
                </Tip>
              )}
            </span>
          </div>
        )}

        {outcome === undefined ? (
          <div className="h-24" />
        ) : !active ? (
          <p className="px-4 py-7 text-center text-sm leading-relaxed text-muted">
            {t('search.hint')}
          </p>
        ) : hits.length === 0 ? (
          <div className="px-4 py-7 text-center text-sm leading-relaxed text-muted">
            <p className="font-semibold text-ink">
              {text.trim()
                ? t('search.noResults', { query: text.trim() })
                : filters.tagId
                  ? t('search.noResults', { query: tagLabel(filters.tagId) })
                  : t('search.noCards')}
            </p>
            {suggestion && (
              <p>
                {t('search.didYouMean')}{' '}
                <button
                  type="button"
                  onClick={() => setText(suggestion)}
                  className="font-semibold text-accent hover:underline"
                >
                  {suggestion}
                </button>
                ?
              </p>
            )}
            <p>{t('search.noResultsFilters')}</p>
            {outcome.trashCount > 0 && (
              <button
                type="button"
                onClick={() => setFilter('trash', true)}
                className="mt-1 text-accent hover:underline"
              >
                {t('search.showTrash', { count: outcome.trashCount })}
              </button>
            )}
          </div>
        ) : view === 'grouped' ? (
          groupByPage(visible).map((group) => {
            const first = details?.get(group[0].id)
            return (
              <section key={group[0].pageId} className="mt-4">
                <h2 className="mb-0.5 flex gap-2 text-[13px] font-semibold">
                  <span className="truncate">
                    {first?.notebookTitle || t('review.untitled')} ›{' '}
                    {first?.pageTitle || t('review.untitled')}
                  </span>
                  <span className="font-normal text-muted">{group.length}</span>
                </h2>
                <ul>{group.map((hit) => row(hit, true))}</ul>
              </section>
            )
          })
        ) : (
          <ul aria-label={t('search.results')}>
            {visible.map((hit) => row(hit, view === 'compact'))}
          </ul>
        )}
        {hits.length > shown && (
          <button
            type="button"
            onClick={() =>
              setPaging({ key: queryKey, shown: shown + PAGE_SIZE })
            }
            className="mt-3 min-h-10 w-full rounded-lg border border-line text-sm text-muted hover:border-accent hover:text-accent"
          >
            {t('search.more')}
          </button>
        )}
      </div>
    </div>
  )
}

const hasMoreFilters = (f: SearchFilters) =>
  f.changed !== 'any' ||
  !f.journal ||
  !f.templates ||
  f.trash ||
  f.sort !== 'best'

const facetClass = (on: boolean) =>
  `inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] whitespace-nowrap ${
    on ? 'border-accent bg-accent/15 text-accent' : 'border-line hover:bg-hover'
  }`

/** Results of the same page together (pages in order of their best result). */
function groupByPage(hits: SearchHit[]): SearchHit[][] {
  const groups = new Map<string, SearchHit[]>()
  for (const hit of hits) {
    const list = groups.get(hit.pageId) ?? []
    list.push(hit)
    groups.set(hit.pageId, list)
  }
  return [...groups.values()]
}

/** A filter button with a menu of values and their counts. */
function Facet({
  label,
  on,
  items,
  empty,
  onPick,
  onClear,
  header,
}: {
  label: string
  on: boolean
  items: { value: string; label: string; count: number }[]
  empty: string
  onPick: (value: string) => void
  onClear: () => void
  /** Shown above the items (e.g. the tag menu's steps back). */
  header?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus()
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative flex">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className={facetClass(on)}
      >
        <span className="max-w-[180px] truncate">{label}</span>
        {!on && <span aria-hidden>▾</span>}
      </button>
      {on && (
        <button
          type="button"
          onClick={onClear}
          aria-label={t('search.filter.clear', { name: label })}
          className="-ms-px min-h-8 rounded-e-lg border border-accent bg-accent/15 px-2 text-[12.5px] text-accent"
        >
          ✕
        </button>
      )}
      {open && (
        <div
          role="menu"
          className="absolute start-0 top-[calc(100%+4px)] z-30 max-h-[50vh] w-max max-w-[min(320px,86vw)] min-w-[220px] overflow-auto rounded-[10px] border border-line bg-bg p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
        >
          {header}
          {items.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted">{empty}</p>
          ) : (
            items.map((item) => (
              <button
                key={item.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onPick(item.value)
                }}
                className="flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-2 text-start text-sm outline-none hover:bg-hover focus:bg-hover"
              >
                <span className="truncate">{item.label}</span>
                <span className="text-muted tabular-nums">{item.count}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/** Changed · Include · Sort. */
function MoreFilters({
  filters,
  onChange,
}: {
  filters: SearchFilters
  onChange: <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K],
  ) => void
}) {
  const name = useId()
  const radio = <K extends 'changed' | 'sort'>(
    key: K,
    value: SearchFilters[K],
    label: MessageKey,
  ) => (
    <label className="flex min-h-8 cursor-pointer items-center gap-2">
      <input
        type="radio"
        name={`${name}-${key}`}
        checked={filters[key] === value}
        onChange={() => onChange(key, value)}
      />
      {t(label)}
    </label>
  )
  const check = (key: 'journal' | 'templates' | 'trash', label: MessageKey) => (
    <label className="flex min-h-8 cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={filters[key]}
        onChange={(e) => onChange(key, e.target.checked)}
      />
      {t(label)}
    </label>
  )
  const changed: [ChangedFilter, MessageKey][] = [
    ['any', 'search.changed.any'],
    ['week', 'search.changed.week'],
    ['month', 'search.changed.month'],
  ]
  const sorts: [SortOrder, MessageKey][] = [
    ['best', 'search.sort.best'],
    ['recent', 'search.sort.recent'],
    ['failed', 'search.sort.failed'],
  ]
  const heading = 'mb-1 text-xs font-semibold text-muted'
  return (
    <div className="my-2 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5 rounded-[10px] border border-line px-3.5 py-3 text-sm">
      <fieldset>
        <legend className={heading}>{t('search.changed')}</legend>
        {changed.map(([v, label]) => (
          <div key={v}>{radio('changed', v, label)}</div>
        ))}
      </fieldset>
      <fieldset>
        <legend className={heading}>{t('search.include')}</legend>
        {check('journal', 'search.include.journal')}
        {check('templates', 'search.include.templates')}
        {check('trash', 'search.include.trash')}
      </fieldset>
      <fieldset>
        <legend className={heading}>{t('search.sort')}</legend>
        {sorts.map(([v, label]) => (
          <div key={v}>{radio('sort', v, label)}</div>
        ))}
      </fieldset>
    </div>
  )
}
