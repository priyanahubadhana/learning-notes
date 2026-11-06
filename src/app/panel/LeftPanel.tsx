import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { setAudioPanel } from '../../audio/audioActions'
import { formatDuration, listRecordings } from '../../audio/recordingService'
import type { LearningNotesDB } from '../../core/db'
import type { Page } from '../../core/types'
import { sampleName } from '../../i18n/defaultNames'
import { t } from '../../i18n/t'
import { listNotePages } from '../../pages/pageService'
import { usePref } from '../usePref'
import {
  glideTo,
  landOn,
  prefersReducedMotion,
  targetTopFor,
} from '../reading/glide'
import { outlineFromBlocks, previewLines } from './panelModel'

const TABS = ['pages', 'outline', 'audio'] as const
type Tab = (typeof TABS)[number]
const isTab = (v: unknown): v is Tab => TABS.includes(v as Tab)

/** Screens at least this wide dock the panel; narrower ones overlay it. */
export const PANEL_DOCK_MIN = 1024
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
          {page.locked ? '🔒 ' : ''}
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
        <PageThumb
          key={page.id}
          db={db}
          page={page}
          depth={depth}
          active={page.id === currentPageId}
          onOpen={() => onOpenPage(page.id)}
        />
      ))}
      {flat.length > MAX_ROWS && (
        <p className="px-1 text-xs text-muted">
          {t('lp.pages.more', { count: MAX_ROWS })}
        </p>
      )}
    </>
  )
}

function OutlineTab({ db, pageId }: { db: LearningNotesDB; pageId: string }) {
  const headings = useLiveQuery(
    async () =>
      outlineFromBlocks(
        await db.blocks.where('pageId').equals(pageId).toArray(),
      ),
    [db, pageId],
  )
  const jump = (id: string) => {
    const el = document.querySelector<HTMLElement>(
      `.bn-block-outer[data-id="${CSS.escape(id)}"]`,
    )
    const scroller = document.querySelector<HTMLElement>('[data-page-scroller]')
    if (!el || !scroller) return
    glideTo(scroller, targetTopFor(scroller, el), 600, {
      instant: prefersReducedMotion(),
    })
    landOn(el)
  }
  if (!headings) return null
  if (headings.length === 0) {
    return <p className="px-1 text-sm text-muted">{t('lp.outline.empty')}</p>
  }
  return (
    <ul aria-label={t('lp.tab.outline')}>
      {headings.map((h) => (
        <li key={h.id} style={{ paddingInlineStart: (h.level - 1) * 14 }}>
          <button
            type="button"
            data-chrome
            data-heading={h.id}
            onClick={() => jump(h.id)}
            className="min-h-11 w-full rounded-lg px-2 text-start text-sm hover:bg-hover"
          >
            <span className="line-clamp-2 break-words">{h.text}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function AudioTab({ db, pageId }: { db: LearningNotesDB; pageId: string }) {
  const recordings = useLiveQuery(
    () => listRecordings(db, pageId),
    [db, pageId],
  )
  return (
    <>
      {recordings && recordings.length === 0 && (
        <p className="mb-2 px-1 text-sm text-muted">{t('lp.audio.empty')}</p>
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
}: {
  db: LearningNotesDB
  notebookId: string
  pageId: string
  onOpenPage: (id: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = usePref<Tab>('leftPanel.tab', isTab, 'pages')
  const docked = window.innerWidth >= PANEL_DOCK_MIN
  return (
    <aside
      data-chrome
      data-testid="left-panel"
      aria-label={t('lp.label')}
      className={
        docked
          ? 'flex w-[280px] shrink-0 flex-col border-e border-line bg-bg'
          : 'fixed inset-y-0 start-0 z-[39] flex w-[300px] max-w-[88vw] flex-col border-e border-line bg-bg pt-[calc(env(safe-area-inset-top)+3rem)] shadow-[8px_0_24px_rgba(0,0,0,0.08)] phone:bottom-14'
      }
    >
      <div className="flex items-center gap-1 px-2 pt-2" role="tablist">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-chrome
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-11 flex-1 rounded-lg px-2 text-sm ${
              tab === id
                ? 'bg-hover font-semibold text-accent'
                : 'text-ink-soft hover:bg-hover'
            }`}
          >
            {t(`lp.tab.${id}`)}
          </button>
        ))}
        <button
          type="button"
          data-chrome
          aria-label={t('lp.close')}
          title={t('lp.close')}
          onClick={onClose}
          className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-hover"
        >
          ✕
        </button>
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-2">
        {tab === 'pages' && (
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
        {tab === 'outline' && <OutlineTab db={db} pageId={pageId} />}
        {tab === 'audio' && <AudioTab db={db} pageId={pageId} />}
      </div>
    </aside>
  )
}
