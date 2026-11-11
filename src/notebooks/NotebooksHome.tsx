import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Star } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { pageLines } from '../app/pageText'
import { runTask } from '../app/errors'
import { usePref } from '../app/usePref'
import { MenuPopover, type MenuItem } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import type { Notebook } from '../core/types'
import { displayName, sampleName } from '../i18n/defaultNames'
import { dateLocale, t } from '../i18n/t'
import { listNotePages } from '../pages/pageService'
import { dueByNotebook } from '../recall/reviewLazy'
import {
  dayKind,
  HOME_TABS,
  homeTabList,
  isHomeTab,
  lastOpened,
  nextColour,
  type HomeTab,
  notebookColour,
  notebookOpenedAt,
  shortLabel,
  visibleRows,
} from './notebookLook'
import { setNotebookCover, setNotebookStarred } from './notebookService'

/**
 * The Notebooks home: every notebook as a cover on a shelf (or a list for a
 * long library). Only the rows on screen are drawn, so 500+ notebooks stay
 * fast. A "Views" row (custom views, later) goes between the header and the
 * shelf; nothing is built for it yet.
 */

type Layout = 'shelf' | 'list'
const isLayout = (v: unknown): v is Layout => v === 'shelf' || v === 'list'

const GAP_X = 20
const GAP_Y = 24
const MIN_COL = 140
const MAX_COL = 200
const META_H = 64
const LIST_ROW = 64
const COVER_RADIUS = '6px 14px 14px 6px'

function openedLabel(ts: number): string {
  const kind = dayKind(ts)
  if (kind === 'today') return t('nbh.today')
  if (kind === 'yesterday') return t('nbh.yesterday')
  return new Date(ts).toLocaleDateString(dateLocale(), {
    day: 'numeric',
    month: 'short',
  })
}

const nameOf = (n: Notebook): string =>
  displayName(sampleName(n)) || t('review.untitled')

export function NotebooksHome({
  db,
  notebooks,
  onOpen,
  onCreate,
}: {
  db: LearningNotesDB
  notebooks: Notebook[]
  onOpen: (id: string) => void
  onCreate: () => void
}) {
  const [layout, setLayout] = usePref<Layout>(
    'notebooksLayout',
    isLayout,
    'shelf',
  )
  const [tab, setTab] = usePref<HomeTab>('notebooksTab', isHomeTab, 'all')
  const scroller = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [scrollTop, setScrollTop] = useState(0)
  const [menu, setMenu] = useState<{ id: string; anchor: DOMRect } | null>(null)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Cards due, per notebook; re-checked every minute like the sidebar badge.
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
  const list = useMemo(
    () => homeTabList(notebooks, tab, opened),
    [notebooks, tab, opened],
  )

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
  const addTile = shelf && tab === 'all' // the "+" tile closes the whole shelf
  const count = addTile ? list.length + 1 : list.length
  const rows = Math.ceil(count / cols)
  const { from, to } = visibleRows(scrollTop, box.h, rowH, rows)

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
            <AddTile onCreate={onCreate} />
          ) : (
            <Card
              db={db}
              notebook={n}
              shelf={shelf}
              due={due?.get(n.id) ?? 0}
              openedAt={lastOpened(n, opened)}
              onOpen={onOpen}
              onMenu={(anchor) => setMenu({ id: n.id, anchor })}
            />
          )}
        </div>,
      )
    }
  }

  const menuNotebook = menu && notebooks.find((n) => n.id === menu.id)
  const items: MenuItem[] = menuNotebook
    ? [
        {
          label: t(menuNotebook.starred ? 'nbh.unstar' : 'nbh.star'),
          icon: '★',
          onSelect: () =>
            runTask(
              setNotebookStarred(db, menuNotebook.id, !menuNotebook.starred),
            ),
        },
        {
          label: t(
            menuNotebook.cover === 'page'
              ? 'nbh.cover.colour'
              : 'nbh.cover.page',
          ),
          icon: '▤',
          onSelect: () =>
            runTask(
              setNotebookCover(db, menuNotebook.id, {
                cover: menuNotebook.cover === 'page' ? undefined : 'page',
              }),
            ),
        },
        {
          label: t('nbh.colour.next'),
          icon: '●',
          onSelect: () =>
            runTask(
              setNotebookCover(db, menuNotebook.id, {
                colour: nextColour(notebookColour(menuNotebook)),
                cover: undefined,
              }),
            ),
        },
      ]
    : []

  return (
    <div data-testid="notebooks-home" className="flex h-full min-h-0 flex-col">
      <header
        className="flex flex-wrap items-center justify-between gap-3 pt-5 pb-3"
        style={{ paddingInline: pad }}
      >
        <h1 className="text-[28px] leading-tight font-bold tracking-tight">
          {t('nbh.title')}
        </h1>
        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label={t('nbh.layout')}
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
                {t(l === 'shelf' ? 'nbh.layout.shelf' : 'nbh.layout.list')}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-testid="nbh-new"
            onClick={onCreate}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent hover:opacity-90 any-pointer-coarse:min-h-11"
          >
            <Plus aria-hidden size={16} strokeWidth={2.25} />
            {t('nbh.new')}
          </button>
        </div>
      </header>
      <div
        role="tablist"
        aria-label={t('nbh.tabs')}
        className="flex gap-1 pb-2"
        style={{ paddingInline: pad }}
      >
        {HOME_TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-home-tab={id}
            aria-selected={tab === id}
            onClick={() => {
              setTab(id)
              setScrollTop(0)
              scroller.current?.scrollTo({ top: 0 })
            }}
            className={`min-h-9 rounded-full px-3.5 text-sm any-pointer-coarse:min-h-11 ${
              tab === id
                ? 'bg-accent-soft font-semibold text-accent'
                : 'text-ink-soft hover:bg-hover'
            }`}
          >
            {t(`nbh.tab.${id}`)}
          </button>
        ))}
      </div>
      {/* Room for the "Views" row (custom views, later). */}
      <div
        ref={scroller}
        data-testid="nbh-scroll"
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <div
          role="list"
          aria-label={t('nbh.title')}
          style={{ position: 'relative', height: rows * rowH + 24 }}
        >
          {cells}
        </div>
        {list.length === 0 && (
          <p
            data-testid="nbh-empty"
            className="text-sm text-muted"
            style={{ paddingInline: pad }}
          >
            {t(tab === 'starred' ? 'nbh.empty.starred' : 'nbh.empty.recent')}
          </p>
        )}
      </div>
      {menu && menuNotebook && (
        <MenuPopover
          anchor={menu.anchor}
          items={items}
          label={t('nbh.menu', { name: nameOf(menuNotebook) })}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}

function StarButton({
  notebook,
  db,
  className,
}: {
  notebook: Notebook
  db: LearningNotesDB
  className: string
}) {
  const on = !!notebook.starred
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={t(on ? 'nbh.unstarNamed' : 'nbh.starNamed', {
        name: nameOf(notebook),
      })}
      onClick={() => runTask(setNotebookStarred(db, notebook.id, !on))}
      className={`inline-flex size-8 items-center justify-center rounded-full any-pointer-coarse:size-11 ${className}`}
    >
      <Star
        aria-hidden
        size={16}
        strokeWidth={1.75}
        fill={on ? 'currentColor' : 'none'}
      />
    </button>
  )
}

function Meta({ openedAt, due }: { openedAt: number; due: number }) {
  return (
    <small className="block truncate text-xs text-muted">
      {openedLabel(openedAt)}
      {due > 0 && (
        <>
          {' · '}
          <span className="font-semibold text-accent">
            {t('nbh.due', { n: due })}
          </span>
        </>
      )}
    </small>
  )
}

function Cover({ db, notebook }: { db: LearningNotesDB; notebook: Notebook }) {
  const colour = notebookColour(notebook)
  if (notebook.cover === 'page')
    return <PageCover db={db} notebook={notebook} />
  return (
    <div
      aria-hidden
      className="relative grid size-full place-items-center overflow-hidden text-white"
      style={{
        borderRadius: COVER_RADIUS,
        background: `linear-gradient(135deg, ${colour}, color-mix(in srgb, ${colour} 70%, #000))`,
        boxShadow: 'var(--elev-1), inset -6px 0 0 rgba(255,255,255,.12)',
      }}
    >
      <span className="absolute inset-y-0 start-0 w-2.5 bg-black/20" />
      <b className="text-[28px] font-bold tracking-tight">
        {shortLabel(nameOf(notebook))}
      </b>
    </div>
  )
}

/** The first page as the cover: its title and its first lines. */
function PageCover({
  db,
  notebook,
}: {
  db: LearningNotesDB
  notebook: Notebook
}) {
  const first = useLiveQuery(async () => {
    const page = (await listNotePages(db, notebook.id)).find(
      (p) => p.parentId === null,
    )
    if (!page) return null
    return {
      title: page.title,
      lines: (await pageLines(db, page.id)).slice(0, 5),
    }
  }, [db, notebook.id])
  return (
    <div
      aria-hidden
      className="relative size-full overflow-hidden border border-line bg-bg py-4 ps-5 pe-3 text-start text-ink-soft"
      style={{ borderRadius: COVER_RADIUS, boxShadow: 'var(--elev-1)' }}
    >
      <span className="absolute inset-y-0 start-0 w-2.5 bg-black/10" />
      <p className="mb-1 line-clamp-2 text-[11px] font-semibold text-ink">
        {first?.title || t('nbh.blankPage')}
      </p>
      {first?.lines.map((l, i) => (
        <p key={i} className="truncate text-[11px] leading-relaxed">
          {l}
        </p>
      ))}
    </div>
  )
}

function MenuButton({
  name,
  onMenu,
}: {
  name: string
  onMenu: (a: DOMRect) => void
}) {
  return (
    <button
      type="button"
      aria-label={t('nbh.menu', { name })}
      onClick={(e) => onMenu(e.currentTarget.getBoundingClientRect())}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-hover any-pointer-coarse:size-11"
    >
      ⋯
    </button>
  )
}

function Card({
  db,
  notebook,
  shelf,
  due,
  openedAt,
  onOpen,
  onMenu,
}: {
  db: LearningNotesDB
  notebook: Notebook
  shelf: boolean
  due: number
  openedAt: number
  onOpen: (id: string) => void
  onMenu: (anchor: DOMRect) => void
}) {
  const name = nameOf(notebook)
  const onContextMenu = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    onMenu(e.currentTarget.getBoundingClientRect())
  }
  if (!shelf) {
    return (
      <div
        role="listitem"
        data-notebook-card={notebook.id}
        className="flex h-full items-center gap-2 border-b border-line"
        onContextMenu={onContextMenu}
      >
        <button
          type="button"
          onClick={() => onOpen(notebook.id)}
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
            <Meta openedAt={openedAt} due={due} />
          </span>
        </button>
        <StarButton
          notebook={notebook}
          db={db}
          className={notebook.starred ? 'text-warn' : 'text-muted'}
        />
        <MenuButton name={name} onMenu={onMenu} />
      </div>
    )
  }
  return (
    <div
      role="listitem"
      data-notebook-card={notebook.id}
      className="group relative flex h-full min-w-0 flex-col gap-1.5"
      onContextMenu={onContextMenu}
    >
      <button
        type="button"
        onClick={() => onOpen(notebook.id)}
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
            : 'bg-black/35 text-white opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 any-pointer-coarse:opacity-100'
        }`}
      />
      <div className="flex min-w-0 items-start gap-1">
        <button
          type="button"
          onClick={() => onOpen(notebook.id)}
          className="min-w-0 flex-1 text-start"
        >
          <strong className="block truncate text-[15px] font-semibold">
            {name}
          </strong>
          <Meta openedAt={openedAt} due={due} />
        </button>
        <MenuButton name={name} onMenu={onMenu} />
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
