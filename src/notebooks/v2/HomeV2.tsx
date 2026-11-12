import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { usePref } from '../../app/usePref'
import type { LearningNotesDB } from '../../core/db'
import type { Notebook } from '../../core/types'
import { ClearField } from '../../design/parts/ClearField'
import { ConfirmDialog, PromptDialog } from '../../design/parts/Dialogs'
import { ContextStrip } from '../../design/parts/ContextStrip'
import { EmptyState } from '../../design/parts/EmptyState'
import { TabRow, type TabDef } from '../../design/parts/TabRow'
import { t } from '../../i18n/t'
import { dueByNotebook } from '../../recall/reviewLazy'
import { isUnlocked, useLevel } from '../../settings/level'
import { lastPageOf } from '../lastPage'
import {
  HOME_TABS,
  homeTabList,
  isHomeTab,
  lastOpened,
  notebookColour,
  notebookOpenedAt,
  shortLabel,
  visibleRows,
  type HomeTab,
} from '../notebookLook'
import { Cover, StarButton } from '../NotebooksHome'
import { ContinueStrip } from './ContinueStrip'
import { continueList, filterByName, moveState } from './homeLogic'
import { holdJustFired, rightClickInfo, useRowHold } from '../../app/rowHold'
import { openedLabel, usePageCount } from './openedLabel'
import { notebookStripItems } from './strips'
import { tn } from './tn'
import { notebookName, useNotebookActions } from './useNotebookActions'

/**
 * Notebooks home v2 (flag `notebooks.v2`, spec NB-B01..B13, NB-P01..P07).
 * Reads the same notebooks and the same preferences as today's home; only the
 * look changes (tab row, Continue strip, strip on hold) and the actions grow.
 * Only the rows on screen are drawn, so 500+ notebooks stay fast (NB-B12).
 */

type Layout = 'shelf' | 'list'
const isLayout = (v: unknown): v is Layout => v === 'shelf' || v === 'list'

const GAP_X = 18
const GAP_Y = 14
const MIN_COL = 140
const MAX_COL = 200
const META_H = 64
const LIST_ROW = 64
const COVER_RADIUS = '6px 14px 14px 6px'

const TAB_DEFS: TabDef[] = HOME_TABS.map((id) => ({
  id,
  label: tn(`nbv2.tab.${id}` as 'nbv2.tab.all'),
}))

type Dialog =
  | { kind: 'new' }
  | { kind: 'rename'; id: string }
  | { kind: 'delete'; id: string; count: number }
  | null

export function HomeV2({
  db,
  notebooks,
  onOpen,
  onCreate,
  onReview,
}: {
  db: LearningNotesDB
  notebooks: Notebook[]
  onOpen: (id: string) => void
  /** Used only when there is no notebook yet to read the workspace from. */
  onCreate: () => void
  /** Starts Review for one notebook (Professional strip item, due badge). */
  onReview?: (notebookId: string) => void
}) {
  useLevel() // re-draw when Beginner / Professional or an unlock changes
  const [layout, setLayout] = usePref<Layout>(
    'notebooksLayout',
    isLayout,
    'shelf',
  )
  const [tab, setTab] = usePref<HomeTab>('notebooksTab', isHomeTab, 'all')
  const [query, setQuery] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [scrollTop, setScrollTop] = useState(0)
  const [strip, setStrip] = useState<{ id: string; el: HTMLElement } | null>(
    null,
  )
  const [dialog, setDialog] = useState<Dialog>(null)
  const actions = useNotebookActions(db, onOpen)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Cards due per notebook; re-checked every minute like the sidebar badge.
  const [minute, setMinute] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setMinute(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const due = useLiveQuery(async () => {
    await db.cards.count()
    return dueByNotebook(db, Date.now())
  }, [db, minute])

  const opened = useMemo(() => notebookOpenedAt(), [])
  const finder = isUnlocked('nb.find')
  const searching = finder && query.trim() !== ''
  const list = useMemo(() => {
    const base = homeTabList(notebooks, tab, opened)
    return searching ? filterByName(base, query, notebookName) : base
  }, [notebooks, tab, opened, searching, query])
  const cards = useMemo(
    () => continueList(notebooks, opened, lastPageOf),
    [notebooks, opened],
  )

  useRowHold((info) => {
    if (info.kind === 'nb') setStrip({ id: info.id, el: info.el })
  })
  const openStrip = (e: MouseEvent<HTMLElement>) => {
    const info = rightClickInfo(e.target)
    if (!info || info.kind !== 'nb') return
    e.preventDefault()
    setStrip({ id: info.id, el: info.el })
  }

  // ---- Layout maths: which rows are on screen ----
  const pad = box.w >= 640 ? 24 : 16
  const inner = Math.max(0, box.w - pad * 2)
  const shelf = layout === 'shelf'
  const cols = shelf
    ? Math.max(1, Math.floor((inner + GAP_X) / (MIN_COL + GAP_X)))
    : 1
  const colW = shelf
    ? Math.min(MAX_COL, (inner - GAP_X * (cols - 1)) / cols)
    : inner
  const rowH = shelf ? Math.round((colW * 4) / 3) + META_H + GAP_Y : LIST_ROW
  const addTile = shelf && tab === 'all' && !searching
  const count = addTile ? list.length + 1 : list.length
  const rows = Math.ceil(count / cols)
  const { from, to } = visibleRows(scrollTop, box.h, rowH, rows)

  const askNew = () => setDialog({ kind: 'new' })
  const cells: ReactNode[] = []
  for (let r = from; r < to; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      if (i >= count) break
      const n = i < list.length ? list[i] : undefined
      cells.push(
        <div
          key={n?.id ?? 'add'}
          style={{
            position: 'absolute',
            top: r * rowH,
            insetInlineStart: pad + c * (colW + GAP_X),
            width: colW,
            height: rowH - (shelf ? GAP_Y : 0),
          }}
        >
          {!n ? (
            <AddTile onCreate={askNew} />
          ) : (
            <NotebookCard
              db={db}
              notebook={n}
              shelf={shelf}
              due={due?.get(n.id) ?? 0}
              openedAt={lastOpened(n, opened)}
              onOpen={onOpen}
              onReview={onReview}
              onMore={(el) => setStrip({ id: n.id, el })}
            />
          )}
        </div>,
      )
    }
  }

  const target = strip ? notebooks.find((n) => n.id === strip.id) : undefined
  const ms = target ? moveState(notebooks, target.id) : null
  const closeStrip = () => setStrip(null)

  const act = (id: string, sub?: string) => {
    const n = target
    if (!n) return
    if (id === 'cover' && !sub) return
    closeStrip()
    if (id === 'open') onOpen(n.id)
    else if (id === 'pin') actions.togglePin(n)
    else if (id === 'rename') setDialog({ kind: 'rename', id: n.id })
    else if (id === 'cover') actions.cover(n, sub)
    else if (id === 'addPage') actions.addPage(n)
    else if (id === 'addTemplate') actions.addFromTemplate(n)
    else if (id === 'review') onReview?.(n.id)
    else if (ms && id === 'moveTop') actions.move(n, 0, ms.index)
    else if (ms && id === 'moveUp') actions.move(n, ms.index - 1, ms.index)
    else if (ms && id === 'moveDown') actions.move(n, ms.index + 1, ms.index)
    else if (id === 'delete')
      void actions
        .pageCount(n)
        .then((pages) => setDialog({ kind: 'delete', id: n.id, count: pages }))
  }

  const dialogNotebook =
    dialog && dialog.kind !== 'new'
      ? notebooks.find((n) => n.id === dialog.id)
      : undefined

  return (
    <div
      data-testid="notebooks-home"
      data-v2
      className="flex h-full min-h-0 flex-col"
      onContextMenu={openStrip}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-3 pt-5 pb-3"
        style={{ paddingInline: pad }}
      >
        <h1 className="text-[28px] leading-tight font-bold tracking-tight">
          {t('nbh.title')}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {finder && (
            <ClearField
              type="search"
              value={query}
              placeholder={tn('nbv2.find.placeholder')}
              aria-label={tn('nbv2.find.placeholder')}
              data-testid="nbv2-find"
              autoComplete="off"
              onChange={(e) => {
                setQuery(e.target.value)
                setScrollTop(0)
              }}
              onClear={() => setQuery('')}
              className="w-[200px]"
            />
          )}
          <div
            role="group"
            aria-label={tn('nbv2.layout')}
            className="flex rounded-full border border-line p-0.5 text-sm"
          >
            {(['shelf', 'list'] as const).map((l) => (
              <button
                key={l}
                type="button"
                data-layout={l}
                aria-pressed={layout === l}
                onClick={() => setLayout(l)}
                className={`min-h-9 rounded-full px-3 any-pointer-coarse:min-h-11 ${
                  layout === l
                    ? 'bg-accent-soft font-semibold text-accent'
                    : 'text-ink-soft hover:bg-hover'
                }`}
              >
                {tn(l === 'shelf' ? 'nbv2.layout.shelf' : 'nbv2.layout.list')}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-testid="nbh-new"
            onClick={askNew}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent hover:opacity-90 any-pointer-coarse:min-h-11"
          >
            <Plus aria-hidden size={16} strokeWidth={2.25} />
            {t('nbh.new')}
          </button>
        </div>
      </header>
      <div style={{ paddingInline: pad }} className="pb-2">
        <TabRow
          setKey="notebooksHome"
          catalog={TAB_DEFS}
          defaults={[...HOME_TABS]}
          value={tab}
          variant="pill"
          editable={false}
          label={tn('nbv2.tabs')}
          onPick={(id) => {
            if (!isHomeTab(id)) return
            setTab(id)
            setScrollTop(0)
            scroller.current?.scrollTo({ top: 0 })
          }}
        />
      </div>
      <div
        ref={scroller}
        data-testid="nbh-scroll"
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        {tab === 'all' && !searching && cards.length > 0 && (
          <ContinueStrip db={db} cards={cards} onOpen={onOpen} pad={pad} />
        )}
        <div
          role="list"
          aria-label={t('nbh.title')}
          style={{ position: 'relative', height: rows * rowH + 24 }}
        >
          {cells}
        </div>
        {list.length === 0 && (
          <div data-testid="nbh-empty">
            {searching ? (
              <p className="text-sm text-muted" style={{ paddingInline: pad }}>
                {tn('nbv2.find.none')}
              </p>
            ) : tab === 'all' ? (
              <EmptyState
                icon="notebook"
                title={tn('nbv2.empty.all.title')}
                text={tn('nbv2.empty.all.text')}
                action={t('nbh.new')}
                onAction={notebooks.length === 0 ? onCreate : askNew}
              />
            ) : (
              <EmptyState
                variant="inline"
                icon={tab === 'starred' ? 'star' : 'clock'}
                text={tn(
                  tab === 'starred'
                    ? 'nbv2.empty.starred'
                    : 'nbv2.empty.recent',
                )}
              />
            )}
          </div>
        )}
      </div>
      {strip && target && ms && (
        <ContextStrip
          items={notebookStripItems({
            starred: !!target.starred,
            coverIsPage: target.cover === 'page',
            unlocked: isUnlocked,
            canMoveUp: ms.canMoveUp,
            canMoveDown: ms.canMoveDown,
          }).filter((i) => i.id !== 'review' || !!onReview)}
          target={() => {
            const r = strip.el.getBoundingClientRect()
            return {
              left: r.left,
              top: r.top,
              width: r.width,
              height: r.height,
            }
          }}
          opener={strip.el}
          testId="nbv2-strip"
          onAction={act}
          onClose={closeStrip}
        />
      )}
      {dialog?.kind === 'new' && (
        <PromptDialog
          title={tn('nbv2.new.title')}
          label={tn('nbv2.new.label')}
          initial={t('notebook.newName')}
          saveLabel={tn('nbv2.new.create')}
          data-testid="nbv2-new-dialog"
          onCancel={() => setDialog(null)}
          onSubmit={(name) => {
            setDialog(null)
            void actions.create(name)
          }}
        />
      )}
      {dialog?.kind === 'rename' && dialogNotebook && (
        <PromptDialog
          title={tn('nbv2.rename.title')}
          label={tn('nbv2.new.label')}
          initial={dialogNotebook.title}
          data-testid="nbv2-rename-dialog"
          onCancel={() => setDialog(null)}
          onSubmit={(name) => {
            setDialog(null)
            actions.rename(dialogNotebook, name)
          }}
        />
      )}
      {dialog?.kind === 'delete' && dialogNotebook && (
        <ConfirmDialog
          title={tn('nbv2.delete.title')}
          text={tn('nbv2.delete.text', {
            name: notebookName(dialogNotebook),
            count: dialog.count,
          })}
          confirmLabel={tn('nbv2.delete.main')}
          danger
          data-testid="nbv2-delete-dialog"
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            setDialog(null)
            void actions.remove(dialogNotebook)
          }}
        />
      )}
    </div>
  )
}

function Meta({
  db,
  notebook,
  openedAt,
}: {
  db: LearningNotesDB
  notebook: Notebook
  openedAt: number
}) {
  const pages = usePageCount(db, notebook.id)
  return (
    <small className="block truncate text-xs text-muted">
      {pages === undefined ? '' : tn('nbv2.pages', { count: pages }) + ' · '}
      {openedLabel(openedAt)}
    </small>
  )
}

function DueBadge({
  notebook,
  due,
  onReview,
  className,
}: {
  notebook: Notebook
  due: number
  onReview?: (id: string) => void
  className: string
}) {
  if (due <= 0) return null
  const label = tn('nbv2.badge.due', { count: due })
  const name = notebookName(notebook)
  if (!onReview)
    return (
      <span data-testid="nbv2-due" className={className}>
        {label}
      </span>
    )
  return (
    <button
      type="button"
      data-testid="nbv2-due"
      aria-label={tn('nbv2.badge.review', { name, count: due })}
      onClick={(e) => {
        e.stopPropagation()
        if (!holdJustFired()) onReview(notebook.id)
      }}
      className={`${className} any-pointer-coarse:min-h-11 any-pointer-coarse:min-w-11`}
    >
      {label}
    </button>
  )
}

function NotebookCard({
  db,
  notebook,
  shelf,
  due,
  openedAt,
  onOpen,
  onReview,
  onMore,
}: {
  db: LearningNotesDB
  notebook: Notebook
  shelf: boolean
  due: number
  openedAt: number
  onOpen: (id: string) => void
  onReview?: (id: string) => void
  onMore: (el: HTMLElement) => void
}) {
  const name = notebookName(notebook)
  const open = () => {
    if (!holdJustFired()) onOpen(notebook.id)
  }
  const holdProps = {
    'data-hold': `nb:${notebook.id}`,
    // The native callout and text selection stay off on a held row.
    style: {
      WebkitTouchCallout: 'none',
      WebkitUserSelect: 'none',
      userSelect: 'none',
    } as const,
  }
  const more = (
    <button
      type="button"
      aria-label={tn('nbv2.more', { name })}
      onClick={(e) =>
        onMore(e.currentTarget.closest<HTMLElement>('[data-hold]')!)
      }
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover any-pointer-coarse:size-11"
    >
      ⋯
    </button>
  )
  if (!shelf) {
    return (
      <div
        role="listitem"
        data-notebook-card={notebook.id}
        {...holdProps}
        className="flex h-full items-center gap-2 border-b border-line"
      >
        <button
          type="button"
          onClick={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-start"
        >
          <span
            aria-hidden
            className="grid h-12 w-9 shrink-0 place-items-center text-[11px] font-bold text-white"
            style={{
              background: notebookColour(notebook),
              borderRadius: '3px 8px 8px 3px',
            }}
          >
            {shortLabel(name)}
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-[15px] font-semibold">
              {name}
            </strong>
            <Meta db={db} notebook={notebook} openedAt={openedAt} />
          </span>
        </button>
        <DueBadge
          notebook={notebook}
          due={due}
          onReview={onReview}
          className="rounded-full bg-accent px-2 text-[11px] leading-5 font-semibold text-on-accent"
        />
        <StarButton
          notebook={notebook}
          db={db}
          className={notebook.starred ? 'text-warn' : 'text-muted'}
        />
        {more}
      </div>
    )
  }
  return (
    <div
      role="listitem"
      data-notebook-card={notebook.id}
      {...holdProps}
      className="group relative flex h-full min-w-0 flex-col gap-1.5"
    >
      <button
        type="button"
        onClick={open}
        aria-label={name}
        className="aspect-[3/4] w-full transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        style={{ borderRadius: COVER_RADIUS }}
      >
        <Cover db={db} notebook={notebook} />
      </button>
      <StarButton
        notebook={notebook}
        db={db}
        className={`absolute end-1 top-1 ${
          notebook.starred
            ? 'text-[#FFD66B] drop-shadow'
            : 'bg-black/35 text-white'
        }`}
      />
      <div className="flex min-w-0 items-start gap-1">
        <button
          type="button"
          onClick={open}
          className="min-w-0 flex-1 text-start"
        >
          <strong className="block truncate text-[15px] font-semibold">
            {name}
          </strong>
          <Meta db={db} notebook={notebook} openedAt={openedAt} />
        </button>
        <DueBadge
          notebook={notebook}
          due={due}
          onReview={onReview}
          className="mt-0.5 shrink-0 rounded-full bg-accent-soft px-2 text-[11px] leading-5 font-semibold text-accent"
        />
        {more}
      </div>
    </div>
  )
}

function AddTile({ onCreate }: { onCreate: () => void }) {
  return (
    <div role="listitem" className="flex h-full flex-col gap-1.5">
      <button
        type="button"
        data-testid="nbh-add-tile"
        onClick={onCreate}
        aria-label={t('nbh.new')}
        className="grid aspect-[3/4] w-full place-items-center border-2 border-dashed border-line-strong text-muted hover:border-accent hover:text-accent"
        style={{ borderRadius: COVER_RADIUS }}
      >
        <Plus aria-hidden size={36} strokeWidth={1.5} />
      </button>
    </div>
  )
}
