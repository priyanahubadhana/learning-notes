import { useLiveQuery } from 'dexie-react-hooks'
import {
  Fragment,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Tip } from '../../help/Help'
import { SHEETS } from '../../paper/boxes'
import { jumpToSheet, useSheetInfo } from '../../paper/sheetNav'
import { setAudioPanel, toggleRecording } from '../../audio/audioActions'
import { EmptyState } from '../ui'
import { useContext } from 'react'
import { AppUiContext } from '../appUi'
import { formatDuration, listRecordings } from '../../audio/recordingService'
import type { LearningNotesDB } from '../../core/db'
import type { Page } from '../../core/types'
import { sampleName } from '../../i18n/defaultNames'
import { t } from '../../i18n/t'
import { listNotePages } from '../../pages/pageService'
import { usePref } from '../usePref'
import { outlineRequest } from './outlineRequest'
import {
  glideTo,
  landOn,
  prefersReducedMotion,
  targetTopFor,
} from '../reading/glide'
import {
  outlineItems,
  previewLines,
  visibleOutline,
  type OutlineItem,
  type OutlineView,
} from './panelModel'
import { Icon } from '../tools/icons'
import { readerBridge } from '../../reader/readerBridge'
import type { BookTab } from '../../reader/BookPanel'

const BookPanel = lazy(() => import('../../reader/BookPanel'))
const AloudPanel = lazy(() => import('../../reader/aloud/AloudPanel'))
const BOOK_TABS = ['pages', 'outline', 'audio', 'annotations'] as const
type BookTabId = (typeof BOOK_TABS)[number]

const TABS = ['pages', 'outline', 'audio'] as const
type Tab = (typeof TABS)[number]
const isTab = (v: unknown): v is Tab => TABS.includes(v as Tab)

/** Screens at least this wide dock the panel; narrower ones overlay it. */
const PANEL_DOCK_MIN = 1024
export const PANEL_WIDTH = 280
const MAX_ROWS = 200

/** A page's title and first lines, loaded when its row comes into view. */
function PageThumb({
  db,
  page,
  depth,
  active,
  onOpen,
}: {
  db: LearningNotesDB
  page: Page
  depth: number
  active: boolean
  onOpen: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [seen, setSeen] = useState(typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || seen) return
    const watcher = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setSeen(true)
        watcher.disconnect()
      }
    })
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [seen])
  const lines = useLiveQuery(
    async () =>
      seen
        ? previewLines(
            await db.blocks.where('pageId').equals(page.id).toArray(),
          )
        : null,
    [db, page.id, seen],
  )
  return (
    <div style={{ marginInlineStart: Math.min(depth, 3) * 10 }}>
      <button
        ref={ref}
        type="button"
        data-chrome
        data-testid="panel-page"
        aria-current={active ? 'page' : undefined}
        onClick={onOpen}
        className={`mb-1.5 block w-full rounded-lg border px-2.5 py-2 text-start hover:bg-hover ${
          active ? 'border-accent bg-hover' : 'border-line'
        }`}
      >
        <span className="line-clamp-2 text-sm font-medium break-words">
          {page.locked && (
            <Icon name="lock" size={13} className="me-1 inline" />
          )}
          {sampleName(page) || t('review.untitled')}
        </span>
        {!page.locked &&
          (lines ?? []).map((line, i) => (
            <span
              key={i}
              className="mt-0.5 line-clamp-1 block text-xs text-muted"
            >
              {line}
            </span>
          ))}
        {!page.locked && lines && lines.length === 0 && (
          <span className="mt-0.5 block text-xs text-muted italic">
            {t('lp.pages.blank')}
          </span>
        )}
      </button>
    </div>
  )
}

function PagesTab({
  db,
  notebookId,
  currentPageId,
  onOpenPage,
}: {
  db: LearningNotesDB
  notebookId: string
  currentPageId: string | null
  onOpenPage: (id: string) => void
}) {
  const pages = useLiveQuery(
    () => listNotePages(db, notebookId),
    [db, notebookId],
  )
  if (!pages) return null
  const children = new Map<string | null, Page[]>()
  for (const p of pages) {
    const list = children.get(p.parentId) ?? []
    list.push(p)
    children.set(p.parentId, list)
  }
  const flat: { page: Page; depth: number }[] = []
  const walk = (parentId: string | null, depth: number) => {
    for (const page of children.get(parentId) ?? []) {
      flat.push({ page, depth })
      walk(page.id, depth + 1)
    }
  }
  walk(null, 0)
  if (flat.length === 0) {
    return <p className="px-1 text-sm text-muted">{t('lp.pages.empty')}</p>
  }
  return (
    <>
      {flat.slice(0, MAX_ROWS).map(({ page, depth }) => (
        <Fragment key={page.id}>
          <PageThumb
            db={db}
            page={page}
            depth={depth}
            active={page.id === currentPageId}
            onOpen={() => onOpenPage(page.id)}
          />
          {page.id === currentPageId && (
            <SheetStrip pageId={page.id} depth={depth} />
          )}
        </Fragment>
      ))}
      {flat.length > MAX_ROWS && (
        <p className="px-1 text-xs text-muted">
          {t('lp.pages.more', { count: MAX_ROWS })}
        </p>
      )}
    </>
  )
}

/** Opens a closed toggle (the block itself when `self`, and every toggle around it). */
function openToggles(el: HTMLElement, self: boolean): void {
  const open = (outer: Element | null) => {
    const button = outer?.querySelector<HTMLElement>(
      ':scope > .bn-block > .bn-toggle-wrapper > .bn-toggle-button, :scope .bn-toggle-button',
    )
    if (button?.getAttribute('aria-expanded') === 'false') button.click()
  }
  for (
    let o = el.parentElement?.closest('.bn-block-outer') ?? null;
    o;
    o = o.parentElement?.closest('.bn-block-outer') ?? null
  ) {
    open(o)
  }
  if (self) open(el)
}

const isDepth = (v: unknown): v is OutlineView['depth'] =>
  v === 1 || v === 2 || v === 3
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

function OutlineTab({ db, pageId }: { db: LearningNotesDB; pageId: string }) {
  // View options are remembered on this device.
  const [depth, setDepth] = usePref<OutlineView['depth']>(
    'outline.depth',
    isDepth,
    3,
  )
  const [toggles, setToggles] = usePref('outline.toggles', isBool, false)
  const [numbered, setNumbered] = usePref('outline.numbered', isBool, false)
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set())
  const records = useLiveQuery(
    () => db.blocks.where('pageId').equals(pageId).toArray(),
    [db, pageId],
  )
  const items = useMemo(
    () =>
      records ? outlineItems(records, { depth, toggles, numbered }) : null,
    [records, depth, toggles, numbered],
  )
  const jump = (item: OutlineItem) => {
    const find = () =>
      document.querySelector<HTMLElement>(
        `.bn-block-outer[data-id="${CSS.escape(item.id)}"]`,
      )
    const el = find()
    const scroller = document.querySelector<HTMLElement>('[data-page-scroller]')
    if (!el || !scroller) return
    // A toggle opens when tapped; a heading inside a closed toggle opens it.
    openToggles(el, item.kind === 'toggle')
    // The page grows when a toggle opens: scroll once it has settled.
    window.setTimeout(
      () => {
        const now = find() ?? el
        glideTo(scroller, targetTopFor(scroller, now), 600, {
          instant: prefersReducedMotion(),
        })
        landOn(now)
      },
      item.kind === 'toggle' ? 60 : 0,
    )
  }
  const flip = (id: string) =>
    setFolded((old) => {
      const next = new Set(old)
      if (!next.delete(id)) next.add(id)
      return next
    })
  if (!items) return null
  const shown = visibleOutline(items, folded)
  const chip = (on: boolean) =>
    `min-h-11 rounded-lg border px-2.5 text-xs ${
      on ? 'border-accent bg-soft' : 'border-line hover:bg-hover'
    }`
  return (
    <>
      <div
        role="group"
        aria-label={t('lp.outline.view')}
        data-testid="outline-options"
        className="mb-2 flex flex-wrap gap-1.5"
      >
        <select
          aria-label={t('lp.outline.depth')}
          value={depth}
          onChange={(e) =>
            setDepth(Number(e.target.value) as OutlineView['depth'])
          }
          className="min-h-11 rounded-lg border border-line bg-bg px-2 text-xs"
        >
          <option value={1}>{t('lp.outline.h1')}</option>
          <option value={2}>{t('lp.outline.h12')}</option>
          <option value={3}>{t('lp.outline.hAll')}</option>
        </select>
        <button
          type="button"
          data-chrome
          aria-pressed={toggles}
          onClick={() => setToggles(!toggles)}
          className={chip(toggles)}
        >
          {t('lp.outline.toggles')}
        </button>
        <button
          type="button"
          data-chrome
          aria-pressed={numbered}
          onClick={() => setNumbered(!numbered)}
          className={chip(numbered)}
        >
          {t('lp.outline.numbers')}
        </button>
      </div>
      {items.length === 0 ? (
        <p className="px-1 text-sm text-muted">{t('lp.outline.empty')}</p>
      ) : (
        <ul aria-label={t('lp.tab.outline')}>
          {shown.map((h) => (
            <li
              key={h.id}
              className="flex items-center"
              style={{ paddingInlineStart: (h.level - 1) * 14 }}
            >
              {h.hasChildren ? (
                <button
                  type="button"
                  data-chrome
                  aria-expanded={!folded.has(h.id)}
                  aria-label={t('lp.outline.fold')}
                  onClick={() => flip(h.id)}
                  className="flex min-h-11 w-6 shrink-0 items-center justify-center text-xs text-muted"
                >
                  {folded.has(h.id) ? '▸' : '▾'}
                </button>
              ) : (
                <span className="w-6 shrink-0" />
              )}
              <button
                type="button"
                data-chrome
                data-heading={h.id}
                data-kind={h.kind}
                onClick={() => jump(h)}
                className="min-h-11 min-w-0 flex-1 rounded-lg px-2 text-start text-sm hover:bg-hover"
              >
                <span className="line-clamp-2 break-words">
                  {h.number && (
                    <span className="me-1.5 text-muted tabular-nums">
                      {h.number}
                    </span>
                  )}
                  {h.kind === 'toggle' && (
                    <span aria-hidden className="me-1 text-muted">
                      ▸
                    </span>
                  )}
                  {h.text}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function AudioTab({ db, pageId }: { db: LearningNotesDB; pageId: string }) {
  const { toast } = useContext(AppUiContext)
  const recordings = useLiveQuery(
    () => listRecordings(db, pageId),
    [db, pageId],
  )
  return (
    <>
      {recordings && recordings.length === 0 && (
        <EmptyState
          testId="audio-empty"
          className="mb-2"
          icon="mic"
          text={t('lp.audio.empty')}
          action={t('empty.audio.action')}
          onAction={() => void toggleRecording(pageId, toast)}
        />
      )}
      <ul>
        {(recordings ?? []).map((r) => (
          <li
            key={r.id}
            className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2 text-sm"
          >
            <span className="min-w-0 break-words">{r.name}</span>
            <span className="shrink-0 text-xs text-muted tabular-nums">
              {formatDuration(r.durationMs)}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        data-chrome
        onClick={() => setAudioPanel(true)}
        className="mt-2 min-h-11 w-full rounded-lg border border-line px-3 text-sm hover:bg-hover"
      >
        {t('lp.audio.open')}
      </button>
    </>
  )
}

/**
 * The left panel (D1): Pages (the notebook's pages with their first lines),
 * Outline (the page's headings) and Audio (this page's recordings). Docked
 * beside the page on wide screens, an overlay on narrow ones.
 */
export function LeftPanel({
  db,
  notebookId,
  pageId,
  onOpenPage,
  onClose,
  docked: dockedProp,
  width,
}: {
  db: LearningNotesDB
  notebookId: string
  pageId: string
  onOpenPage: (id: string) => void
  onClose: () => void
  /** The new app frame decides docked or overlay itself (flag foundation.shell). */
  docked?: boolean
  /** Docked width in px (the new frame uses 288). */
  width?: number
}) {
  const [noteTab, setTab] = usePref<Tab>('leftPanel.tab', isTab, 'pages')
  // While a book is open the panel is about the book (items 32 and 45).
  const book = readerBridge.useValue()
  const [bookTab, setBookTab] = useState<BookTabId>('pages')
  const tab: BookTabId = book ? bookTab : noteTab
  const tabs: readonly BookTabId[] = book ? BOOK_TABS : TABS
  const ask = outlineRequest.useValue()
  useEffect(() => {
    if (ask.n > 0 && Date.now() - ask.at < 1500) {
      const want = book ? ask.tab : ask.tab === 'audio' ? 'audio' : 'outline'
      ;(book ? setBookTab : setTab)(want as never)
    }
  }, [ask, setTab, book])
  const docked = dockedProp ?? window.innerWidth >= PANEL_DOCK_MIN
  return (
    <aside
      data-chrome
      data-testid="left-panel"
      style={docked && width ? { width } : undefined}
      aria-label={t('lp.label')}
      className={
        docked
          ? 'flex w-[280px] shrink-0 flex-col border-e border-line bg-bg'
          : 'fixed inset-y-0 start-0 z-[39] flex w-[300px] max-w-[88vw] flex-col border-e border-line bg-bg pt-[calc(env(safe-area-inset-top)+3rem)] shadow-[8px_0_24px_rgba(0,0,0,0.08)] phone:bottom-14'
      }
    >
      <div className="flex items-center gap-1 px-2 pt-2" role="tablist">
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-chrome
            aria-selected={tab === id}
            onClick={() =>
              book ? setBookTab(id as BookTabId) : setTab(id as Tab)
            }
            className={`min-h-11 flex-1 rounded-lg px-2 text-sm ${
              tab === id
                ? 'bg-hover font-semibold text-accent'
                : 'text-ink-soft hover:bg-hover'
            }`}
          >
            {id === 'annotations'
              ? t('bookpanel.tab.annotations')
              : t(`lp.tab.${id}`)}
          </button>
        ))}
        <button
          type="button"
          data-chrome
          aria-label={t('lp.close')}
          onClick={onClose}
          className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-hover"
        >
          <Icon name="close" size={18} />
        </button>
      </div>
      <div
        role="tabpanel"
        className={`min-h-0 flex-1 p-2 ${
          book?.format === 'pdf' && tab === 'pages'
            ? 'overflow-hidden'
            : 'overflow-y-auto'
        }`}
      >
        {book && tab !== 'audio' && (
          <Suspense fallback={null}>
            <BookPanel db={db} bridge={book} tab={tab as BookTab} />
          </Suspense>
        )}
        {!book && tab === 'pages' && (
          <PagesTab
            db={db}
            notebookId={notebookId}
            currentPageId={pageId}
            onOpenPage={(id) => {
              onOpenPage(id)
              if (!docked) onClose()
            }}
          />
        )}
        {!book && tab === 'outline' && <OutlineTab db={db} pageId={pageId} />}
        {book && tab === 'audio' && (
          <Suspense fallback={null}>
            <AloudPanel />
          </Suspense>
        )}
        {tab === 'audio' && (
          <AudioTab db={db} pageId={book ? book.pageId : pageId} />
        )}
      </div>
    </aside>
  )
}

/** Thumbnails of the open page's sheets (long pages only); a tap jumps there. */
function SheetStrip({ pageId, depth }: { pageId: string; depth: number }) {
  const info = useSheetInfo()
  if (!info || info.pageId !== pageId || info.count < 2) return null
  const shape = SHEETS[info.sheet]
  return (
    <ul
      aria-label={t('paper.sheets')}
      data-sheet-strip
      className="mb-1.5 flex flex-wrap gap-1.5 ps-1"
      style={{ marginInlineStart: Math.min(depth, 3) * 10 }}
    >
      {Array.from({ length: Math.min(info.count, 60) }, (_, i) => (
        <li key={i}>
          <Tip id="paper.sheetThumb" touchInfo={false}>
            <button
              type="button"
              data-chrome
              data-sheet-thumb={i + 1}
              aria-label={t('paper.sheetN', { n: i + 1 })}
              onClick={() => jumpToSheet(i + 1)}
              className="relative block w-10 rounded-sm border border-line bg-surface hover:border-accent"
              style={
                {
                  aspectRatio: shape.w + ' / ' + shape.h,
                  '--paper-step': '6px',
                } as CSSProperties
              }
              data-paper-bg={info.bg}
            >
              <span className="absolute inset-x-0 bottom-0.5 text-center text-[10px] leading-none text-muted tabular-nums">
                {i + 1}
              </span>
            </button>
          </Tip>
        </li>
      ))}
    </ul>
  )
}
