import { useLiveQuery } from 'dexie-react-hooks'
import {
  lazy,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { onRouted } from '../../app/input/eventRouter'
import { ConfirmDialog, MenuPopover, type MenuItem } from '../../app/ui'
import { Icon } from '../../app/tools/icons'
import { isBigBook, megabytes } from '../../core/bookFormat'
import type { LearningNotesDB } from '../../core/db'
import type { Page } from '../../core/types'
import { ClearField } from '../../design/parts/ClearField'
import { EmptyState } from '../../design/parts/EmptyState'
import { SheetBase } from '../../design/parts/SheetBase'
import { t } from '../../i18n/t'
import { deletePage } from '../../pages/pageService'
import { listAllHighlights } from '../../reader/annotations/annotationService'
import { useLevel } from '../../settings/level'
import { restorePage } from '../../trash/trashService'
import { inspectBook } from '../inspect'
import {
  LibraryError,
  continueTarget,
  importBook,
  listSources,
  type SourceFilter,
} from '../libraryService'
import { BookCard, ContinueCard } from './BookCard'
import type { BookActions } from './bookMenu'
import { exportBookHighlights } from './exportData'
import { Knowledge } from './Knowledge'
import {
  newCollectionId,
  setPrefs,
  setPrefsWithUndo,
  useLibraryPrefs,
  type LibraryPrefs,
  type ManualStatus,
  type SortKey,
} from './libraryPrefs'
import { MoreSheet } from './MoreSheet'
import { JournalTab, TagsMapTab, ThemesTab } from './Themes'
import { useWindowed } from './windowed'
import { ShelfButton } from './ShelvesPanel'
import { shelfName } from './shelfNames'
import {
  activeFilters,
  continueReading,
  proRowMode,
  querySources,
} from './shelves'
import { effectiveTagIds, useTagItems } from './tagItems'
import { TagAssignPicker, TagFilterPicker } from './tagWiring'

const PromptsDialog = lazy(() => import('../../prompts/PromptsDialog'))

type Tab = 'books' | 'knowledge' | 'themes' | 'journal' | 'tags'
const TYPES: SourceFilter[] = ['all', 'books', 'videos', 'articles', 'pasted']
const SORTS: SortKey[] = ['recent', 'added', 'title', 'author', 'progress']
const STATUS_FILTERS = ['any', 'want', 'reading', 'finished'] as const

/** Width of an element, kept up to date (for the Professional row). */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(1000)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setW(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/**
 * True while the Shelves side panel is on screen beside the page (not on a
 * phone, not hidden): the shelf button by the title then stays away (LB-B18).
 */
function useShelvesPanelShown() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    let raf = 0
    const check = () => {
      raf = 0
      const el = document.querySelector<HTMLElement>(
        '[data-testid="library-panel"]',
      )
      const wide =
        typeof matchMedia !== 'function' ||
        matchMedia('(width >= 40rem) and (height >= 32rem)').matches
      const on = wide && !!el && el.getBoundingClientRect().width > 0
      setShown((was) => (was === on ? was : on))
    }
    const soon = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }
    check()
    const mo = new MutationObserver(soon)
    mo.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden'],
    })
    const ro =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(soon)
    ro?.observe(document.documentElement)
    return () => {
      mo.disconnect()
      ro?.disconnect()
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  return shown
}

const when = (ms?: number) =>
  ms ? new Date(ms).toLocaleDateString(undefined, { dateStyle: 'medium' }) : ''

/**
 * Library v2 (flag `library.v2`): Continue reading first, covers as the hero,
 * one + Add, shelves in the side panel, filters in More. See
 * docs/plans/library-v2-spec.md.
 */
export function LibraryV2({
  db,
  workspaceId,
  onOpenPage,
  onRead,
  onCapture,
}: {
  db: LearningNotesDB
  workspaceId: string
  onOpenPage: (pageId: string) => void
  onRead: (pageId: string, at?: string) => void
  onCapture: (draft?: { url?: string; title?: string; text?: string }) => void
}) {
  const { toast } = useContext(AppUiContext)
  const prefs = useLibraryPrefs()
  const pro = useLevel() === 'professional'
  const [tab, setTab] = useState<Tab>('books')
  // A saved filter picked in the side panel opens Knowledge.
  if (prefs.openSaved && tab !== 'knowledge') setTab('knowledge')
  const [exportFocus, setExportFocus] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [addAt, setAddAt] = useState<DOMRect | null>(null)
  const [menu, setMenu] = useState<{
    kind: 'type' | 'status' | 'sort' | 'move' | 'bulkStatus'
    at: DOMRect
  } | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Page | null>(null)
  const [collectionsFor, setCollectionsFor] = useState<Page | null>(null)
  const [tagFilter, setTagFilter] = useState<HTMLElement | null | false>(false)
  const [tagAssign, setTagAssign] = useState<{
    pages: Page[]
    anchor: HTMLElement | null
  } | null>(null)
  const [prompts, setPrompts] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const [rowRef, rowWidth] = useWidth()
  const panelShown = useShelvesPanelShown()
  const sources = useLiveQuery(
    () => listSources(db, workspaceId),
    [db, workspaceId],
  )
  const { tags, items: tagItems } = useTagItems(db, sources ?? [])
  const all = useMemo(() => sources ?? [], [sources])

  // The search key: `/` or Ctrl/Cmd+K opens the search box.
  useEffect(
    () =>
      onRouted(
        'keydown',
        (e) => {
          const target = e.target as HTMLElement | null
          const typing = !!target?.closest(
            'input, textarea, select, [contenteditable="true"]',
          )
          const k = e.key.toLowerCase()
          if (
            (k === '/' && !typing) ||
            (k === 'k' && (e.ctrlKey || e.metaKey))
          ) {
            e.preventDefault()
            setSearchOpen(true)
            return true
          }
        },
        { priority: -500, name: 'library-v2-search' },
      ),
    [],
  )
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus()
  }, [searchOpen])

  const effective: LibraryPrefs = useMemo(
    () => ({ ...prefs, tagIds: effectiveTagIds(prefs, tags) }),
    [prefs, tags],
  )
  const books = useMemo(() => querySources(all, effective), [all, effective])
  const { limit: winLimit, more: winMore, watchEnd } = useWindowed(books.length)
  const filters = activeFilters(prefs)
  const showContinue =
    prefs.shelf === 'all' && filters.length === 0 && !search.trim()
  const cont = showContinue
    ? continueReading(all, prefs, rowWidth < 560 ? 1 : rowWidth < 860 ? 2 : 3)
    : []
  const grouped = tab === 'books' && search.trim().length >= 3
  const annotations = useLiveQuery(
    () => (grouped ? listAllHighlights(db) : Promise.resolve([])),
    [db, grouped],
  )

  const importFiles = async (files: File[]) => {
    for (const file of files) {
      setBusy(`${file.name} (${megabytes(file.size)} MB)`)
      if (isBigBook(file.size)) toast(t('library.bigFile'))
      try {
        const page = await importBook(db, workspaceId, file, inspectBook)
        toast(t('library.imported', { title: page.title || file.name }))
      } catch (e) {
        if (e instanceof LibraryError) toast(e.message)
        else throw e
      } finally {
        setBusy(null)
      }
    }
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) return void runTask(importFiles(files))
    const url = e.dataTransfer.getData('text/uri-list').split('\n')[0]?.trim()
    const text = e.dataTransfer.getData('text/plain')
    if (url || text)
      onCapture({ url: url || undefined, text: url ? undefined : text })
  }

  /** Changes prefs with a toast and one Undo. */
  const change = (patch: Partial<LibraryPrefs>, message: string) => {
    const undo = setPrefsWithUndo(patch)
    toast(message, { label: t('annot.undo'), onSelect: undo })
  }

  const actions: BookActions = {
    open: (p) => onOpenPage(p.id),
    start: (p) =>
      runTask(
        (async () => {
          const target = await continueTarget(db, p)
          if (target.kind === 'read') onRead(p.id, target.at)
          else onOpenPage(target.id)
        })(),
      ),
    setStatus: (p, status: ManualStatus) => {
      change(
        { manual: { ...prefs.manual, [p.id]: status } },
        t(`lib2.movedTo.${status}`),
      )
    },
    collections: (p) => setCollectionsFor(p),
    tags: (p, anchor) => setTagAssign({ pages: [p], anchor }),
    original: (p) => {
      const url = p.source?.url
      if (url?.startsWith('https://'))
        window.open(url, '_blank', 'noopener,noreferrer')
    },
    exportHighlights: (p) =>
      runTask(
        exportBookHighlights(db, p.id).then((ok) =>
          toast(t(ok ? 'lib2.exportedHighlights' : 'lib2.export.none')),
        ),
      ),
    remove: (p) => setPendingDelete(p),
  }

  const clear = (which: 'type' | 'status' | 'tags') =>
    setPrefs(
      which === 'type'
        ? { type: 'all' }
        : which === 'status'
          ? { status: 'any' }
          : { tagIds: [] },
    )
  const typeLabel = t(`library.filter.${prefs.type}`)
  const tagNames = prefs.tagIds
    .map((id) => tags.find((x) => x.id === id)?.name)
    .filter((x): x is string => !!x)
  const chipText = (k: 'type' | 'status' | 'tags') =>
    k === 'type'
      ? typeLabel
      : k === 'status'
        ? t(`lib2.mark.${prefs.status as ManualStatus}`)
        : tagNames.map((n) => `#${n}`).join(' ')

  const radio = (
    items: readonly string[],
    cur: string,
    label: (x: string) => string,
    apply: (x: string) => void,
  ): MenuItem[] =>
    items.map((x) => ({
      label: label(x),
      icon: 'check',
      checked: cur === x,
      onSelect: () => apply(x),
    }))
  const mode = proRowMode(rowWidth)
  const proChip = (
    key: string,
    text: string,
    icon: string,
    on: boolean,
    onClick: (el: HTMLButtonElement) => void,
  ) => (
    <button
      key={key}
      type="button"
      data-testid={`pro-${key}`}
      aria-label={text}
      aria-pressed={on}
      aria-haspopup={key === 'view' || key === 'select' ? undefined : 'menu'}
      onClick={(e) => onClick(e.currentTarget)}
      className={`min-h-11 shrink-0 whitespace-nowrap rounded-full px-3 text-sm ${on ? 'bg-accent/15 font-medium' : 'bg-soft'}`}
    >
      {mode === 'full' || icon === '' ? text : icon}
      {mode === 'full' && key !== 'view' && key !== 'select' ? ' ▾' : ''}
    </button>
  )

  const selectedPages = all.filter((p) => selected.includes(p.id))
  const toggleSel = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    )

  const hasAny = all.length > 0
  const empty = sources !== undefined && !hasAny
  return (
    <div
      className="mx-auto max-w-[1120px] px-4 pt-5 pb-24"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      data-testid="library"
      data-library-v2=""
    >
      <div className="mb-2 flex min-h-12 items-center gap-2.5">
        <h1 className="t-h2">{t('library.title')}</h1>
        {!panelShown && <ShelfButton db={db} workspaceId={workspaceId} />}
        <span className="flex-1" />
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".pdf,.epub,.docx,application/pdf,application/epub+zip"
          className="sr-only"
          aria-label={t('library.importHint')}
          data-testid="library-file"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (files.length) void runTask(importFiles(files))
          }}
        />
        <button
          type="button"
          data-testid="library-add"
          aria-haspopup="menu"
          disabled={busy !== null}
          onClick={(e) => setAddAt(e.currentTarget.getBoundingClientRect())}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent px-5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Icon name="plus" size={18} />
          {t('lib2.add')}
        </button>
        {addAt && (
          <MenuPopover
            anchor={addAt}
            onClose={() => setAddAt(null)}
            items={[
              {
                label: t('library.import'),
                icon: 'filePlus',
                description: t('lib2.add.caption'),
                onSelect: () => fileInput.current?.click(),
              },
              {
                label: t('lib2.add.capture'),
                icon: 'link',
                onSelect: () => onCapture(),
              },
              {
                label: t('lib2.add.prompts'),
                icon: 'sparkles',
                onSelect: () => setPrompts(true),
              },
            ]}
          />
        )}
      </div>
      {busy && (
        <p role="status" className="mb-2 text-sm text-muted">
          {t('library.saving', { name: busy })}
        </p>
      )}

      <div ref={rowRef}>
        <div
          className="flex items-center gap-2 border-b border-line pb-1"
          data-testid="control-row"
        >
          <button
            type="button"
            data-testid="library-more-button"
            aria-haspopup="dialog"
            onClick={() => setMore(true)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-soft px-4 text-sm font-medium"
          >
            <Icon name="sliders" size={18} />
            {t('lib2.more')}
          </button>
          <div
            role="tablist"
            aria-label={t('library.title')}
            className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
          >
            {(pro
              ? (['books', 'knowledge', 'themes', 'journal', 'tags'] as const)
              : (['books', 'knowledge'] as const)
            ).map((x) => (
              <button
                key={x}
                type="button"
                role="tab"
                aria-selected={tab === x}
                data-testid={`tab-${x}`}
                onClick={() => {
                  setTab(x)
                  setExportFocus(false)
                }}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm ${tab === x ? 'bg-accent/10 font-semibold text-ink' : 'text-muted hover:bg-hover'}`}
              >
                {t(`lib2.tab.${x}`)}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-testid="library-search-button"
            aria-label={t('lib2.search')}
            aria-pressed={searchOpen}
            onClick={() => setSearchOpen((o) => !o)}
            className={`grid size-11 place-items-center rounded-full ${searchOpen ? 'bg-accent/15' : 'hover:bg-hover'}`}
          >
            <Icon name="search" size={20} />
          </button>
        </div>
        {searchOpen && (
          <div className="mt-2">
            <ClearField
              ref={searchInput}
              type="search"
              value={search}
              data-testid="library-search"
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && search === '') setSearchOpen(false)
              }}
              placeholder={t('lib2.search.placeholder')}
              aria-label={t('lib2.search')}
              className="min-h-[46px] w-full rounded-[14px] bg-soft px-4 text-[15px]"
            />
          </div>
        )}
        {tab === 'books' && pro && (
          <div
            data-testid="pro-row"
            data-mode={mode}
            className="mt-2.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto"
          >
            {proChip(
              'type',
              typeLabel === t('library.filter.all')
                ? t('lib2.pro.type')
                : typeLabel,
              'T',
              prefs.type !== 'all',
              (el) => setMenu({ kind: 'type', at: el.getBoundingClientRect() }),
            )}
            {!['reading', 'want', 'finished'].includes(prefs.shelf) &&
              proChip(
                'status',
                prefs.status === 'any'
                  ? t('lib2.pro.status')
                  : t(`lib2.mark.${prefs.status}`),
                'S',
                prefs.status !== 'any',
                (el) =>
                  setMenu({ kind: 'status', at: el.getBoundingClientRect() }),
              )}
            {proChip(
              'tag',
              tagNames.length ? `#${tagNames[0]}` : t('lib2.tag'),
              '#',
              tagNames.length > 0,
              (el) => setTagFilter(el),
            )}
            {proChip('sort', t(`lib2.sort.${prefs.sort}`), '↕', false, (el) =>
              setMenu({ kind: 'sort', at: el.getBoundingClientRect() }),
            )}
            {proChip(
              'view',
              prefs.view === 'grid' ? t('lib2.view.list') : t('lib2.view.grid'),
              prefs.view === 'grid' ? '☰' : '▦',
              false,
              () => setPrefs({ view: prefs.view === 'grid' ? 'list' : 'grid' }),
            )}
            {proChip('select', t('lib2.select'), '☑', selecting, () => {
              setSelecting((s) => !s)
              setSelected([])
            })}
          </div>
        )}
        {tab === 'books' && filters.length > 0 && (
          <div
            className="mt-2.5 flex flex-wrap items-center gap-2"
            data-testid="filter-chips"
          >
            {filters.map((k) => (
              <span
                key={k}
                data-testid={`chip-${k}`}
                className="inline-flex min-h-11 items-center gap-1 rounded-full bg-accent/15 pl-3 text-sm"
              >
                {chipText(k)}
                <button
                  type="button"
                  aria-label={t('lib2.chip.clear', { name: chipText(k) })}
                  onClick={() => clear(k)}
                  className="grid size-11 place-items-center rounded-full"
                >
                  ✕
                </button>
              </span>
            ))}
            <span className="text-xs text-muted">{t('lib2.chip.hint')}</span>
          </div>
        )}
      </div>

      {dragging && (
        <p className="mt-3 rounded-lg border border-dashed border-accent p-4 text-center text-sm">
          {t('library.drop')}
        </p>
      )}

      {tab === 'themes' && pro ? (
        <ThemesTab db={db} pages={all} onOpenPage={onOpenPage} />
      ) : tab === 'journal' && pro ? (
        <JournalTab pages={all} />
      ) : tab === 'tags' && pro ? (
        <TagsMapTab db={db} pages={all} onOpenPage={onOpenPage} />
      ) : tab === 'knowledge' ? (
        <Knowledge
          db={db}
          search={search}
          showStats={prefs.knowStats}
          exportFocus={exportFocus}
          onOpenPage={onOpenPage}
          onRead={onRead}
        />
      ) : sources === undefined ? null : empty ? (
        <EmptyState
          testId="library-empty"
          className="mt-10"
          icon="bookOpen"
          text={t('library.empty')}
          action={t('empty.library.action')}
          onAction={() => fileInput.current?.click()}
        />
      ) : grouped ? (
        <SearchResults
          q={search.trim().toLocaleLowerCase()}
          books={all}
          annotations={annotations ?? []}
          tagItems={tagItems}
          onOpen={onOpenPage}
          onTag={(id) => {
            setSearch('')
            setPrefs({ tagIds: [id] })
          }}
        />
      ) : (
        <>
          {cont.length > 0 && (
            <section
              aria-label={t('lib2.continue.title')}
              data-testid="continue-block"
              className="mt-4"
            >
              <h2 className="mb-2 text-sm font-semibold text-muted">
                {t('lib2.continue.title')}
              </h2>
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${cont.length}, minmax(0, 1fr))`,
                }}
              >
                {cont.map((p) => (
                  <ContinueCard key={p.id} page={p} actions={actions} />
                ))}
              </div>
            </section>
          )}
          <h2
            className="mt-5 mb-2 text-sm font-semibold text-muted"
            data-testid="shelf-heading"
          >
            {shelfName(prefs)} · {books.length}
          </h2>
          {books.length === 0 ? (
            <EmptyState
              testId="library-empty"
              className="mt-6"
              icon="bookOpen"
              text={t('library.emptyFilter')}
              action={t('lib2.showAll')}
              onAction={() =>
                setPrefs({
                  shelf: 'all',
                  type: 'all',
                  status: 'any',
                  tagIds: [],
                })
              }
            />
          ) : prefs.view === 'list' ? (
            <table className="w-full text-sm" data-testid="library-list">
              <thead>
                <tr className="text-start text-xs text-muted">
                  <th className="py-1 text-start font-medium">
                    {t('lib2.col.title')}
                  </th>
                  <th className="py-1 text-start font-medium max-sm:hidden">
                    {t('lib2.col.author')}
                  </th>
                  <th className="py-1 text-start font-medium">
                    {t('lib2.col.progress')}
                  </th>
                  <th className="py-1 text-start font-medium max-sm:hidden">
                    {t('lib2.col.opened')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {books.map((p) => (
                  <tr
                    key={p.id}
                    data-testid="source-row"
                    className="border-t border-line"
                  >
                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          selecting ? toggleSel(p.id) : actions.open(p)
                        }
                        className="min-h-11 text-start font-medium"
                      >
                        {p.title || t('review.untitled')}
                      </button>
                    </td>
                    <td className="text-muted max-sm:hidden">
                      {p.source?.author}
                    </td>
                    <td>{Math.round((p.source?.progress ?? 0) * 100)}%</td>
                    <td className="text-muted max-sm:hidden">
                      {when(p.source?.openedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ul
              className="grid gap-x-3.5 gap-y-5 [grid-template-columns:repeat(2,minmax(0,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]"
              data-testid="library-grid"
            >
              {books.slice(0, winLimit).map((p) => (
                <li key={p.id}>
                  <BookCard
                    page={p}
                    prefs={prefs}
                    actions={actions}
                    selecting={selecting}
                    selected={selected.includes(p.id)}
                    onToggle={() => toggleSel(p.id)}
                  />
                </li>
              ))}
              {winMore && (
                <li
                  ref={watchEnd}
                  data-testid="grid-more"
                  aria-hidden="true"
                  className="h-1"
                />
              )}
            </ul>
          )}
        </>
      )}

      {selecting && (
        <div
          role="toolbar"
          aria-label={t('lib2.select')}
          data-testid="select-bar"
          className="fixed inset-x-0 bottom-4 z-(--z-pill) mx-auto flex w-fit max-w-[95vw] items-center gap-1 rounded-full border border-line bg-bg px-2 shadow-lg"
        >
          <span className="px-3 text-sm">
            {t('lib2.selected', { n: selected.length })}
          </span>
          <button
            type="button"
            disabled={!selected.length}
            onClick={(e) =>
              setTagAssign({ pages: selectedPages, anchor: e.currentTarget })
            }
            className="min-h-11 rounded-full px-3 text-sm hover:bg-hover disabled:opacity-40"
          >
            {t('lib2.tag')}
          </button>
          <button
            type="button"
            disabled={!selected.length}
            onClick={(e) =>
              setMenu({
                kind: 'bulkStatus',
                at: e.currentTarget.getBoundingClientRect(),
              })
            }
            className="min-h-11 rounded-full px-3 text-sm hover:bg-hover disabled:opacity-40"
          >
            {t('lib2.statusWord')}
          </button>
          <button
            type="button"
            disabled={!selected.length || prefs.collections.length === 0}
            onClick={(e) =>
              setMenu({
                kind: 'move',
                at: e.currentTarget.getBoundingClientRect(),
              })
            }
            className="min-h-11 rounded-full px-3 text-sm hover:bg-hover disabled:opacity-40"
          >
            {t('lib2.moveTo')}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelecting(false)
              setSelected([])
            }}
            className="min-h-11 rounded-full px-3 text-sm font-medium"
          >
            {t('lib2.done')}
          </button>
        </div>
      )}

      {menu && (
        <MenuPopover
          anchor={menu.at}
          onClose={() => setMenu(null)}
          items={
            menu.kind === 'type'
              ? radio(
                  TYPES,
                  prefs.type,
                  (x) => t(`library.filter.${x as SourceFilter}`),
                  (x) => setPrefs({ type: x as SourceFilter }),
                )
              : menu.kind === 'status'
                ? radio(
                    STATUS_FILTERS,
                    prefs.status,
                    (x) =>
                      x === 'any'
                        ? t('library.filter.all')
                        : t(`lib2.mark.${x as ManualStatus}`),
                    (x) => setPrefs({ status: x as LibraryPrefs['status'] }),
                  )
                : menu.kind === 'sort'
                  ? radio(
                      SORTS,
                      prefs.sort,
                      (x) => t(`lib2.sort.${x as SortKey}`),
                      (x) => setPrefs({ sort: x as SortKey }),
                    )
                  : menu.kind === 'move'
                    ? prefs.collections.map((c) => ({
                        label: c.name,
                        icon: 'notebook',
                        onSelect: () => {
                          const m = { ...prefs.membership }
                          for (const id of selected)
                            m[id] = [...new Set([...(m[id] ?? []), c.id])]
                          change(
                            { membership: m },
                            t('lib2.moved', { name: c.name }),
                          )
                        },
                      }))
                    : (['want', 'reading', 'finished'] as const).map((s) => ({
                        label: t(`lib2.mark.${s}`),
                        icon: 'check',
                        onSelect: () => {
                          const m = { ...prefs.manual }
                          for (const id of selected) m[id] = s
                          change({ manual: m }, t(`lib2.movedTo.${s}`))
                        },
                      }))
          }
        />
      )}

      {more && (
        <MoreSheet
          prefs={prefs}
          tagNames={tagNames}
          onClose={() => setMore(false)}
          onDone={(patch) => {
            setMore(false)
            if (Object.keys(patch).length) change(patch, t('lib2.saved'))
          }}
          onTag={(patch) => {
            if (Object.keys(patch).length) setPrefs(patch)
            setMore(false)
            setTagFilter(
              document.querySelector<HTMLElement>(
                '[data-testid="library-more-button"]',
              ),
            )
          }}
          onImport={() => {
            setMore(false)
            fileInput.current?.click()
          }}
          onCapture={() => {
            setMore(false)
            onCapture()
          }}
          onDaily={() => {
            setMore(false)
            setTab('knowledge')
          }}
          onExport={() => {
            setMore(false)
            setTab('knowledge')
            setExportFocus(true)
          }}
          prompts={
            <button
              type="button"
              onClick={() => {
                setMore(false)
                setPrompts(true)
              }}
              className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
            >
              ✦ {t('prompts.open')}
            </button>
          }
        />
      )}

      {tagFilter !== false && (
        <TagFilterPicker
          db={db}
          pages={all}
          shown={books}
          prefs={prefs}
          anchor={tagFilter}
          onClose={() => setTagFilter(false)}
        />
      )}
      {tagAssign && (
        <TagAssignPicker
          db={db}
          pages={tagAssign.pages}
          all={all}
          anchor={tagAssign.anchor}
          onClose={() => setTagAssign(null)}
        />
      )}
      {prompts && (
        <Suspense fallback={null}>
          <PromptsDialog
            db={db}
            workspaceId={workspaceId}
            onClose={() => setPrompts(false)}
          />
        </Suspense>
      )}
      {collectionsFor && (
        <CollectionsDialog
          page={collectionsFor}
          prefs={prefs}
          onClose={() => setCollectionsFor(null)}
          onSave={(ids, collections) => {
            const m = { ...prefs.membership, [collectionsFor.id]: ids }
            change({ collections, membership: m }, t('lib2.collectionsSaved'))
            setCollectionsFor(null)
          }}
        />
      )}
      {pendingDelete && (
        <ConfirmDialog
          message={t('sidebar.confirm.page', {
            name: pendingDelete.title || t('review.untitled'),
          })}
          confirmLabel={t('ui.delete')}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            const page = pendingDelete
            setPendingDelete(null)
            runTask(
              deletePage(db, page.id).then(() =>
                toast(t('lib2.deleted'), {
                  label: t('annot.undo'),
                  onSelect: () => runTask(restorePage(db, page.id)),
                }),
              ),
            )
          }}
        />
      )}
    </div>
  )
}

function CollectionsDialog({
  page,
  prefs,
  onClose,
  onSave,
}: {
  page: Page
  prefs: LibraryPrefs
  onClose: () => void
  onSave: (ids: string[], collections: LibraryPrefs['collections']) => void
}) {
  const [ids, setIds] = useState(prefs.membership[page.id] ?? [])
  const [collections, setCollections] = useState(prefs.collections)
  const [name, setName] = useState('')
  const add = () => {
    const n = name.trim().slice(0, 80)
    if (!n) return
    const id = newCollectionId(n, collections)
    setCollections([...collections, { id, name: n }])
    setIds([...ids, id])
    setName('')
  }
  return (
    <SheetBase
      title={t('lib2.addToCollections')}
      onClose={onClose}
      data-testid="collections-dialog"
      footer={
        <button
          type="button"
          data-testid="collections-save"
          onClick={() => onSave(ids, collections)}
          className="min-h-11 w-full rounded-lg bg-accent px-4 text-sm font-medium text-white"
        >
          {t('lib2.done')}
        </button>
      }
    >
      {collections.length === 0 && (
        <p className="mb-2 text-sm text-muted">{t('lib2.noCollections')}</p>
      )}
      <ul>
        {collections.map((c) => (
          <li key={c.id}>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={ids.includes(c.id)}
                onChange={(e) =>
                  setIds(
                    e.target.checked
                      ? [...ids, c.id]
                      : ids.filter((x) => x !== c.id),
                  )
                }
                className="size-5 accent-[var(--color-accent)]"
              />
              {c.name}
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <ClearField
          value={name}
          onChange={(e) => setName(e.target.value)}
          onClear={() => setName('')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
          placeholder={t('lib2.collection.new')}
          aria-label={t('lib2.collection.new')}
          maxLength={80}
          className="min-h-11 flex-1 rounded-lg border border-line bg-bg px-3 text-sm"
        />
        <button
          type="button"
          onClick={add}
          className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
        >
          {t('lib2.collection.add')}
        </button>
      </div>
    </SheetBase>
  )
}

/** Grouped search results on Books: Books, Highlights, Notes, Tags (LB-B35). */
function SearchResults({
  q,
  books,
  annotations,
  tagItems,
  onOpen,
  onTag,
}: {
  q: string
  books: readonly Page[]
  annotations: readonly import('../../core/types').Annotation[]
  tagItems: readonly { id: string; name: string }[]
  onOpen: (id: string) => void
  onTag: (id: string) => void
}) {
  const hit = (s?: string) => !!s && s.toLocaleLowerCase().includes(q)
  const bookHits = books.filter((b) => hit(b.title) || hit(b.source?.author))
  const quotes = annotations.filter((a) => hit(a.quote?.exact))
  const notes = annotations.filter((a) => hit(a.note))
  const tagHits = tagItems.filter((x) => hit(x.name))
  const name = (id: string) => books.find((b) => b.id === id)?.title ?? ''
  const total = bookHits.length + quotes.length + notes.length + tagHits.length
  if (total === 0)
    return (
      <p data-testid="search-none" className="mt-6 text-sm text-muted">
        {t('lib2.search.none')}
      </p>
    )
  const group = (
    key: string,
    rows: { id: string; text: string; sub?: string; go: () => void }[],
  ) =>
    rows.length > 0 && (
      <section data-testid={`search-${key}`} className="mt-4">
        <h2 className="mb-1 text-sm font-semibold text-muted">
          {t(`lib2.search.${key}` as 'lib2.search.books')}
        </h2>
        <ul>
          {rows.slice(0, 20).map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={r.go}
                className="min-h-11 w-full text-start text-sm hover:bg-hover"
              >
                <span className="line-clamp-2">{r.text}</span>
                {r.sub && <span className="text-xs text-muted">{r.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      </section>
    )
  return (
    <div data-testid="search-results">
      {group(
        'books',
        bookHits.map((b) => ({
          id: b.id,
          text: b.title,
          sub: b.source?.author,
          go: () => onOpen(b.id),
        })),
      )}
      {group(
        'highlights',
        quotes.map((a) => ({
          id: a.id,
          text: a.quote?.exact ?? '',
          sub: name(a.pageId),
          go: () => onOpen(a.pageId),
        })),
      )}
      {group(
        'notes',
        notes.map((a) => ({
          id: a.id,
          text: a.note ?? '',
          sub: name(a.pageId),
          go: () => onOpen(a.pageId),
        })),
      )}
      {group(
        'tags',
        tagHits.map((x) => ({
          id: x.id,
          text: `#${x.name}`,
          go: () => onTag(x.id),
        })),
      )}
    </div>
  )
}
