import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useId, useRef, useState } from 'react'
import { MenuIcon } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { readRecentPages } from './recentPages'
import { searchWords } from './searchText'
import {
  DEFAULT_FILTERS,
  RESULT_TYPES,
  type SearchHit,
  type SearchQuery,
} from './searchQuery'
import { ResultRow } from './SearchResults'
import { TYPE_ICON, useHitDetails, useSearch } from './useSearch'
import { TypeChips } from './TypeChips'

/** Recent pages shown before typing. */
const RECENT = 6
/** Results per group: with "All", a few of each type; else more of one. */
const PER_GROUP_ALL = 3
const PER_GROUP_ONE = 8

/**
 * The quick search (Ctrl+K / 🔍): a box, type chips, the best few results
 * per type, and keyboard use (↑ ↓ Enter Esc). "See all" / Enter opens the
 * full Search screen with the same search. Full screen on phones.
 */
export function SearchPopup({
  db,
  onClose,
  onOpenMenu,
  onOpenHit,
  onOpenPage,
  onSeeAll,
}: {
  db: LearningNotesDB
  onClose: () => void
  /** Phones only: this popup fills the screen and covers the menu button. */
  onOpenMenu: () => void
  onOpenHit: (hit: SearchHit) => void
  onOpenPage: (pageId: string) => void
  onSeeAll: (query: SearchQuery) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [type, setType] = useState<SearchQuery['type']>('all')
  const [selected, setSelected] = useState(-1)
  const query: SearchQuery = { text, type, filters: DEFAULT_FILTERS }
  const { outcome, now } = useSearch(db, query)
  const listId = useId()

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
  const active = !!outcome?.active
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
  const rows = active ? flat.length : (recent?.length ?? 0)

  const seeAll = () => onSeeAll(query)
  const openRow = (index: number) => {
    if (active) onOpenHit(flat[index])
    else if (recent?.[index]) onOpenPage(recent[index].id)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && rows > 0) {
      e.preventDefault()
      setSelected((s) => Math.min(rows - 1, s + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => Math.max(-1, s - 1))
    } else if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (selected >= 0) openRow(selected)
      else if (searchWords(text).length > 0 || type === 'card') seeAll()
    }
  }

  // Keep the selected row in view while moving with the arrow keys.
  useEffect(() => {
    document
      .getElementById(`${listId}-${selected}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected, listId])

  const optionId = (i: number) => `${listId}-${i}`
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
      className="mx-auto mt-[10vh] flex max-h-[72vh] w-[min(620px,calc(100vw-32px))] flex-col overflow-hidden rounded-[14px] border border-line bg-bg p-0 text-ink shadow-[0_12px_40px_rgba(0,0,0,0.16)] backdrop:bg-black/25 phone:m-0 phone:h-full phone:max-h-none phone:w-full phone:max-w-none phone:rounded-none phone:border-0"
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
          🔍
        </span>
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
          aria-activedescendant={selected >= 0 ? optionId(selected) : undefined}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={t('search.close')}
          className="min-h-8 rounded-md px-2 text-xs text-muted hover:bg-hover"
        >
          Esc
        </button>
      </div>
      <TypeChips
        value={type}
        onChange={(next) => {
          setType(next)
          setSelected(-1)
          inputRef.current?.focus() // keep typing and arrow keys working
        }}
        className="border-b border-line px-3.5 py-2"
      />

      <div
        id={listId}
        role="listbox"
        aria-label={t('search.results')}
        className="flex-1 overflow-y-auto p-1.5"
      >
        {!active ? (
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
        ) : flat.length === 0 ? (
          <div className="px-4 py-7 text-center text-sm leading-relaxed text-muted">
            <p className="font-semibold text-ink">
              {t('search.noResults', { query: text.trim() })}
            </p>
            <p>{t('search.noResultsHint')}</p>
            {outcome.trashCount > 0 && (
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
          groups.map((group) => (
            <div
              key={group.kind}
              role="group"
              aria-label={t(`search.type.${group.kind}`)}
            >
              <GroupLabel>{t(`search.type.${group.kind}`)}</GroupLabel>
              {group.hits.map((hit) => {
                const i = index++
                return (
                  <ResultRow
                    key={hit.id}
                    id={optionId(i)}
                    hit={hit}
                    details={details?.get(hit.id)}
                    query={text}
                    now={now}
                    selected={selected === i}
                    onOpen={onOpenHit}
                  />
                )
              })}
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3.5 py-2 text-xs text-muted">
        <span className="phone:hidden">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> {t('search.keys.move')} · <Kbd>Enter</Kbd>{' '}
          {selected >= 0 || !active
            ? t('search.keys.open')
            : t('search.keys.seeAll')}{' '}
          · <Kbd>Esc</Kbd> {t('search.keys.close')}
        </span>
        {active && (
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
