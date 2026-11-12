import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { useFlag } from '../app/flags'
import { toggleFavourite, isFavourite } from '../app/favourites'
import { ClearField } from '../design/parts/ClearField'
import { isUnlocked, useLevel } from '../settings/level'
import { buildRows, rowMatches, type Row } from '../app/tools/controlRows'
import { Icon } from '../app/tools/icons'
import { pinTool, unpinTool } from '../app/tools/main/barOrder'
import { extraTools } from '../app/tools/main/mainTools'
import { MenuIcon } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import { t, type MessageKey } from '../i18n/t'
import { readRecentPages } from './recentPages'
import { searchWords } from './searchText'
import {
  DEFAULT_FILTERS,
  RESULT_TYPES,
  type SearchHit,
  type SearchQuery,
} from './searchQuery'
import { ResultRow } from './SearchResults'
import { TaskResults } from './TaskResults'
import { noteRecentTool } from './recentTools'
import { ToolSections } from './ToolSections'
import { TYPE_ICON, useHitDetails, useSearch } from './useSearch'
import { chipList } from './v2/chips'
import { holdJustFired, rightClickInfo, useRowHold } from '../app/rowHold'
import { ResultStrip } from './v2/ResultStrip'
import { pageLink, resultStripItems } from './v2/strips'
import { ts } from './v2/ts'

/** Recent pages shown before typing. */
const RECENT = 6
/** Results per group: with "All", a few of each type; else more of one. */
const PER_GROUP_ALL = 3
const PER_GROUP_ONE = 8
/** Features shown with "All", and with the Features chip. */
const FEATURES_ALL = 3
const FEATURES_ONE = 80

/** The filter chips: the note types, the coming ones, and the features. */
type Chip = SearchQuery['type'] | 'book' | 'highlight' | 'task' | 'feature'
const CHIPS: Chip[] = [
  'all',
  'page',
  'note',
  'book',
  'highlight',
  'card',
  'task',
  'feature',
]
/** Chips for things that are not built yet (Library, reader, Home). */
const COMING: Chip[] = ['book', 'highlight']

/**
 * The one Search (Ctrl/Cmd+K, Ctrl/Cmd+Shift+K, the 🔍 buttons): a box, filter
 * chips, and result groups: Pages · Notes · Books · Highlights · Cards · Tasks ·
 * Features. Features are every tool and setting of the app (the former control
 * panel), which can also be pinned to the tool bar. Keyboard: ↑ ↓ Enter Esc.
 * "See all" / Enter opens the full Search screen. Full screen on phones.
 */
export function SearchPopup({
  db,
  onClose,
  onOpenMenu,
  onOpenHit,
  onOpenPage,
  onSeeAll,
  initialChip = 'all',
  onOpenTask,
}: {
  db: LearningNotesDB
  onClose: () => void
  /** Phones only: this popup fills the screen and covers the menu button. */
  onOpenMenu: () => void
  onOpenHit: (hit: SearchHit) => void
  onOpenPage: (pageId: string) => void
  onSeeAll: (query: SearchQuery) => void
  /** "Search all features" opens with the Features chip. */
  initialChip?: 'all' | 'feature'
  /** A task was picked: Home's Tasks. */
  onOpenTask?: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [chip, setChip] = useState<Chip>(initialChip)
  // Flag search.v2: chips by level, a ✕ in the box, a strip on a result row.
  const v2 = useFlag('search.v2')
  const libraryOn = useFlag('library.v2')
  useLevel() // re-draw when Beginner / Professional or an unlock changes
  const { toast } = useContext(AppUiContext)
  const [strip, setStrip] = useState<{
    hit: SearchHit
    el: HTMLElement
  } | null>(null)
  const chips: Chip[] = v2
    ? chipList({ unlocked: isUnlocked, libraryOn, active: chip })
    : CHIPS
  const type: SearchQuery['type'] =
    chip === 'all' || chip === 'page' || chip === 'note' || chip === 'card'
      ? chip
      : 'all'
  /** False on the coming chips and on Features: no note results there. */
  const showNotes = type === chip
  const [selected, setSelected] = useState(-1)
  const query: SearchQuery = { text, type, filters: DEFAULT_FILTERS }
  const { outcome, now } = useSearch(db, query)
  const listId = useId()
  const onBar = extraTools.useValue()
  const featureRows = useMemo(() => buildRows(), [])

  useEffect(() => {
    ref.current?.showModal()
    inputRef.current?.focus() // showModal picks the first button on phones
  }, [])

  const recent = useLiveQuery(async () => {
    const pages = await db.pages.bulkGet(readRecentPages())
    return pages
      .filter((p) => p && p.deletedAt === null)
      .slice(0, RECENT)
      .map((p) => p!)
  }, [db])

  // Results in groups (pages, notes, cards), and the same rows in one list
  // for the arrow keys.
  const active = !!outcome?.active && showNotes
  const groups = active
    ? RESULT_TYPES.map((kind) => ({
        kind,
        hits: outcome.hits
          .filter((h) => h.type === kind)
          .slice(0, type === 'all' ? PER_GROUP_ALL : PER_GROUP_ONE),
      })).filter((g) => g.hits.length > 0)
    : []
  const flat = groups.flatMap((g) => g.hits)
  const details = useHitDetails(db, flat)
  useRowHold((info) => {
    if (!v2 || info.kind !== 'hit') return
    const hit = flat.find((h) => h.id === info.id)
    if (hit) setStrip({ hit, el: info.el })
  })

  // Features: every tool and setting (the former control panel).
  const typed = text.trim().length > 0
  const featureMatches =
    chip === 'feature' || (chip === 'all' && typed)
      ? featureRows.filter((row) => !typed || rowMatches(row.haystack, text))
      : []
  const features = featureMatches.slice(
    0,
    chip === 'feature' ? FEATURES_ONE : FEATURES_ALL,
  )
  const offset = flat.length
  const rows = flat.length + features.length
  const browsing = !active && features.length === 0 && showNotes
  const total = (active ? outcome.typeCounts[type] : 0) + featureMatches.length

  const seeAll = () => onSeeAll(query)
  const runFeature = (row: Row) => {
    if (row.pinId) noteRecentTool(row.key)
    onClose()
    // After the search is gone, so the page has its focus back first.
    setTimeout(row.run, 0)
  }
  // A newly pinned tool goes first (R7-12), not last where it hides off the end.
  const togglePin = (id: string) =>
    extraTools.get().includes(id) ? unpinTool(id) : pinTool(id)
  const openRow = (index: number) => {
    if (index >= offset) {
      const row = features[index - offset]
      if (row) runFeature(row)
    } else if (active) onOpenHit(flat[index])
  }
  const openRecent = (index: number) => {
    if (recent?.[index]) onOpenPage(recent[index].id)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      // A search box would clear its text first; Esc should just close.
      e.preventDefault()
      if (strip) setStrip(null)
      else onClose()
      return
    }
    const count = browsing ? (recent?.length ?? 0) : rows
    if (e.key === 'ArrowDown' && count > 0) {
      e.preventDefault()
      setSelected((s) => Math.min(count - 1, s + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(-1, s - 1))
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (selected >= 0) {
        if (browsing) openRecent(selected)
        else openRow(selected)
      } else if (
        features.length > 0 &&
        (chip === 'feature' || flat.length === 0)
      ) {
        runFeature(features[0])
      } else if (
        showNotes &&
        (searchWords(text).length > 0 || type === 'card')
      ) {
        seeAll()
      }
    }
  }

  // Keep the selected row in view while moving with the arrow keys.
  useEffect(() => {
    document
      .getElementById(`${listId}-${selected}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected, listId])

  const optionId = (i: number) => `${listId}-${i}`
  /** The count on a chip (typed text only): notes by type, features by match. */
  const chipCount = (v: Chip): number | undefined => {
    if (v === 'feature')
      return featureRows.filter((r) => rowMatches(r.haystack, text)).length
    if (v === 'all' || v === 'page' || v === 'note' || v === 'card')
      return outcome?.active ? outcome.typeCounts[v] : undefined
    return undefined
  }
  let index = 0

  return (
    <dialog
      ref={ref}
      aria-label={t('search.title')}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // click on the backdrop
      }}
      onPointerDown={(e) => {
        if (
          strip &&
          e.target instanceof Element &&
          !e.target.closest('[data-strip-host]')
        )
          setStrip(null)
      }}
      className="mx-auto mt-[10vh] flex max-h-[72vh] w-[min(620px,calc(100vw-32px))] flex-col overflow-hidden glass rounded-[var(--r-lg)] p-0 text-ink backdrop:bg-[var(--scrim)] phone:m-0 phone:h-full phone:max-h-none phone:w-full phone:max-w-none phone:rounded-none phone:border-0"
    >
      <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3 phone:ps-2">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label={t('nav.openMenu')}
          className="hidden size-11 shrink-0 items-center justify-center rounded-lg border border-line text-ink phone:flex"
        >
          <MenuIcon />
        </button>
        <span aria-hidden className="text-muted">
          <Icon name="search" size={18} />
        </span>
        {v2 ? (
          <ClearField
            ref={inputRef}
            type="search"
            autoFocus
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setSelected(-1)
            }}
            onClear={() => {
              setText('')
              setSelected(-1)
            }}
            onKeyDown={onKeyDown}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            role="combobox"
            aria-expanded={rows > 0}
            aria-controls={listId}
            aria-activedescendant={
              selected >= 0 ? optionId(selected) : undefined
            }
            autoComplete="off"
            data-testid="srv2-box"
            className="min-w-0 flex-1 bg-transparent text-base outline-none [&::-webkit-search-cancel-button]:hidden"
          />
        ) : (
          <input
            ref={inputRef}
            type="search"
            autoFocus
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setSelected(-1)
            }}
            onKeyDown={onKeyDown}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            role="combobox"
            aria-expanded={rows > 0}
            aria-controls={listId}
            aria-activedescendant={
              selected >= 0 ? optionId(selected) : undefined
            }
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base outline-none [&::-webkit-search-cancel-button]:hidden"
          />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('search.close')}
          className="min-h-8 rounded-md px-2 text-xs text-muted hover:bg-hover"
        >
          Esc
        </button>
      </div>
      <div
        role="group"
        aria-label={t('search.show')}
        className="flex flex-wrap gap-1.5 border-b border-line px-3.5 py-2"
      >
        {chips.map((v) => (
          <button
            key={v}
            type="button"
            data-chip={v}
            aria-pressed={chip === v}
            onClick={() => {
              setChip(v)
              setSelected(-1)
              inputRef.current?.focus() // keep typing and arrow keys working
            }}
            className={`${
              v2
                ? 'relative min-h-9 px-3 font-semibold after:absolute after:-inset-y-1 after:inset-x-0 after:content-[""]'
                : 'min-h-7 px-2.5'
            } rounded-full border text-[12.5px] whitespace-nowrap ${
              chip === v
                ? 'border-ink bg-ink text-bg'
                : 'border-line text-muted hover:text-ink'
            }`}
          >
            {t(`search.type.${v}` as MessageKey)}
            {v2 && typed && chipCount(v) !== undefined && (
              <span className="ms-1 tabular-nums opacity-80">
                {chipCount(v)}
              </span>
            )}
          </button>
        ))}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {!typed && chip !== 'feature'
          ? ''
          : total === 0
            ? t('panel.none')
            : t('panel.count', { count: total })}
      </p>

      {!typed && (chip === 'all' || chip === 'feature') && (
        <ToolSections rows={featureRows} pinned={onBar} onRun={runFeature} />
      )}
      <div
        id={listId}
        role="listbox"
        aria-label={t('search.results')}
        className="flex-1 overflow-y-auto p-1.5"
      >
        {chip === 'task' ? (
          <TaskResults
            db={db}
            text={text}
            onOpen={() => {
              onClose()
              onOpenTask?.()
            }}
          />
        ) : !v2 && COMING.includes(chip) ? (
          <p className="px-4 py-7 text-center text-sm text-muted">
            {t(`search.coming.${chip}` as MessageKey)}
          </p>
        ) : browsing ? (
          recent && recent.length > 0 ? (
            <>
              <GroupLabel>{t('search.recent')}</GroupLabel>
              {recent.map((page, i) => (
                <button
                  key={page.id}
                  id={optionId(i)}
                  type="button"
                  role="option"
                  aria-selected={selected === i}
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onOpenPage(page.id)}
                  className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-start text-sm hover:bg-hover ${
                    selected === i
                      ? 'bg-hover shadow-[inset_2px_0_0_var(--color-accent)]'
                      : ''
                  }`}
                >
                  <span aria-hidden className="w-[18px] text-center text-muted">
                    {TYPE_ICON.page}
                  </span>
                  <span className="truncate">
                    {page.title || t('review.untitled')}
                  </span>
                </button>
              ))}
            </>
          ) : (
            <p className="px-4 py-7 text-center text-sm text-muted">
              {t('search.hint')}
            </p>
          )
        ) : rows === 0 ? (
          <div className="px-4 py-7 text-center text-sm leading-relaxed text-muted">
            <p className="font-semibold text-ink">
              {t('search.noResults', { query: text.trim() })}
            </p>
            <p>{t('search.noResultsHint')}</p>
            {outcome && outcome.trashCount > 0 && showNotes && (
              <button
                type="button"
                onClick={() =>
                  onSeeAll({
                    ...query,
                    filters: { ...query.filters, trash: true },
                  })
                }
                className="mt-1 text-accent hover:underline"
              >
                {t('search.searchTrash', { count: outcome.trashCount })}
              </button>
            )}
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div
                key={group.kind}
                role="group"
                aria-label={t(`search.type.${group.kind}`)}
              >
                <GroupLabel>{t(`search.type.${group.kind}`)}</GroupLabel>
                {group.hits.map((hit) => {
                  const i = index++
                  const row = (
                    <ResultRow
                      key={hit.id}
                      id={optionId(i)}
                      hit={hit}
                      details={details?.get(hit.id)}
                      query={text}
                      now={now}
                      selected={selected === i}
                      onOpen={(h) => {
                        if (!holdJustFired()) onOpenHit(h)
                      }}
                    />
                  )
                  if (!v2) return row
                  return (
                    <div
                      key={hit.id}
                      data-hold={`hit:${hit.id}`}
                      data-testid="srv2-row"
                      style={{
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                      }}
                      onContextMenu={(e) => {
                        const info = rightClickInfo(e.target)
                        if (!info) return
                        e.preventDefault()
                        setStrip({ hit, el: info.el })
                      }}
                    >
                      {strip?.hit.id === hit.id && (
                        <ResultStrip
                          row={strip.el}
                          items={resultStripItems({
                            pinned: isFavourite(hit.pageId),
                            canPin: !hit.deleted,
                          })}
                          onAction={(id) => {
                            setStrip(null)
                            if (id === 'open') onOpenHit(hit)
                            else if (id === 'openNew')
                              window.open(
                                pageLink(hit.pageId),
                                '_blank',
                                'noopener',
                              )
                            else if (id === 'pin') toggleFavourite(hit.pageId)
                            else if (id === 'copyLink')
                              void navigator.clipboard
                                .writeText(pageLink(hit.pageId))
                                .then(
                                  () => toast(ts('srv2.linkCopied')),
                                  () => toast(ts('srv2.linkFailed')),
                                )
                          }}
                          onClose={() => setStrip(null)}
                        />
                      )}
                      {row}
                    </div>
                  )
                })}
              </div>
            ))}
            {features.length > 0 && (
              <div role="group" aria-label={t('search.type.feature')}>
                <GroupLabel>{t('search.type.feature')}</GroupLabel>
                {features.map((row, n) => {
                  const i = offset + n
                  const pinned = row.pinId ? onBar.includes(row.pinId) : false
                  return (
                    <div
                      key={row.key}
                      data-panel-row={row.key}
                      className="flex items-center gap-1"
                    >
                      <button
                        id={optionId(i)}
                        type="button"
                        role="option"
                        aria-selected={selected === i}
                        tabIndex={-1}
                        data-panel-run
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => runFeature(row)}
                        className={`flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 text-start text-sm hover:bg-hover ${
                          selected === i
                            ? 'bg-hover shadow-[inset_2px_0_0_var(--color-accent)]'
                            : ''
                        }`}
                      >
                        <span aria-hidden className="w-[18px] text-muted">
                          <Icon name={row.icon} size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{row.label}</span>
                          <span className="block truncate text-xs text-muted">
                            {row.coming ?? row.where}
                          </span>
                        </span>
                        {row.shortcut && (
                          <kbd className="shrink-0 rounded border border-line px-1.5 font-mono text-[11px] text-muted">
                            {row.shortcut}
                          </kbd>
                        )}
                      </button>
                      {row.pinId && chip === 'feature' && (
                        <button
                          type="button"
                          aria-pressed={pinned}
                          aria-label={t(
                            pinned ? 'panel.unpinNamed' : 'panel.pinNamed',
                            { name: row.label },
                          )}
                          onClick={() => togglePin(row.pinId!)}
                          className="min-h-11 shrink-0 rounded-xl border border-line px-3 text-xs hover:bg-hover aria-pressed:bg-hover aria-pressed:font-semibold"
                        >
                          {t(pinned ? 'panel.pinned' : 'panel.pin')}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3.5 py-2 text-xs text-muted">
        <span className="phone:hidden">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> {t('search.keys.move')} · <Kbd>Enter</Kbd>{' '}
          {selected >= 0 || browsing || !active
            ? t('search.keys.open')
            : t('search.keys.seeAll')}{' '}
          · <Kbd>Esc</Kbd> {t('search.keys.close')}
        </span>
        {active && outcome && (
          <button
            type="button"
            onClick={seeAll}
            className="ms-auto min-h-8 font-semibold text-accent hover:underline"
          >
            {t('search.seeAll', { count: outcome.typeCounts[type] })} →
          </button>
        )}
      </div>
    </dialog>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 pt-2.5 pb-1 text-[11px] tracking-[0.06em] text-muted uppercase">
      {children}
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-b-2 border-line px-1 font-mono text-[11px]">
      {children}
    </kbd>
  )
}
