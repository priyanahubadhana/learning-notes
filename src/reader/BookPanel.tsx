import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'
import { AnnotationsPanel } from './annotations/AnnotationsPanel'
import { currentOutline, THUMB_ROW, visibleRows } from './bookPanelMath'
import type { ReaderBridge } from './readerBridge'

const THUMB_W = 72

export type BookTab = 'pages' | 'outline' | 'annotations'

/** The panel body for an open book: its pages, contents or notes. */
export default function BookPanel({
  db,
  bridge,
  tab,
}: {
  db: LearningNotesDB
  bridge: ReaderBridge
  tab: BookTab
}) {
  if (tab === 'annotations') {
    return (
      <AnnotationsPanel
        db={db}
        pageId={bridge.pageId}
        title={bridge.title}
        onJump={bridge.jump}
        onMakeCard={(a) => bridge.makeCards([a])}
        onMakeCards={bridge.makeCards}
      />
    )
  }
  if (tab === 'outline') return <ContentsTab bridge={bridge} />
  return bridge.format === 'pdf' && bridge.doc ? (
    <PdfThumbs bridge={bridge} doc={bridge.doc} />
  ) : (
    <ChapterList bridge={bridge} />
  )
}

function rowClass(active: boolean): string {
  return `flex min-h-11 w-full items-center justify-between gap-2 rounded-lg pe-2 text-start text-sm hover:bg-hover ${
    active ? 'bg-hover font-semibold text-accent' : ''
  }`
}

function ContentsTab({ bridge }: { bridge: ReaderBridge }) {
  const items = bridge.outline
  const here = currentOutline(items, bridge.page, bridge.label)
  if (items.length === 0) {
    return <p className="text-sm text-muted">{t('bookreader.noContents')}</p>
  }
  return (
    <nav aria-label={t('bookreader.contents')} data-testid="book-outline">
      <ul>
        {items.map((item, i) => (
          <li key={i}>
            <button
              type="button"
              data-chrome
              aria-current={i === here ? 'true' : undefined}
              onClick={() => bridge.go(item.at ?? `pdf:${item.page}:0`)}
              style={{ paddingInlineStart: 8 + item.depth * 14 }}
              className={rowClass(i === here)}
            >
              <span className="truncate">{item.title}</span>
              {item.page > 0 && (
                <span className="shrink-0 text-xs text-muted">{item.page}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** An EPUB has no fixed pages: its chapters stand in, numbered. */
function ChapterList({ bridge }: { bridge: ReaderBridge }) {
  const items = bridge.outline
  const here = currentOutline(items, bridge.page, bridge.label)
  if (items.length === 0) {
    return <p className="text-sm text-muted">{t('bookpanel.noPages')}</p>
  }
  return (
    <ul data-testid="book-chapters" aria-label={t('bookpanel.label')}>
      {items.map((item, i) => (
        <li key={i}>
          <button
            type="button"
            data-chrome
            data-chapter={i + 1}
            aria-current={i === here ? 'true' : undefined}
            onClick={() => bridge.go(item.at ?? `pdf:${item.page}:0`)}
            className={rowClass(i === here)}
          >
            <span className="w-7 shrink-0 text-xs text-muted tabular-nums">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate">{item.title}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/** PDF pages as small pictures; only the rows in view exist. */
function PdfThumbs({
  bridge,
  doc,
}: {
  bridge: ReaderBridge
  doc: PDFDocumentProxy
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ top: 0, height: 600 })
  const count = bridge.pageCount || doc.numPages
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const read = () => setView({ top: el.scrollTop, height: el.clientHeight })
    read()
    const watcher =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(read)
    watcher?.observe(el)
    return () => watcher?.disconnect()
  }, [])
  // Follow the reader: bring the open page into view when it is out of it.
  const lastPage = useRef(0)
  useEffect(() => {
    const el = scroller.current
    if (!el || lastPage.current === bridge.page) return
    lastPage.current = bridge.page
    const top = (bridge.page - 1) * THUMB_ROW
    if (
      top < el.scrollTop ||
      top + THUMB_ROW > el.scrollTop + el.clientHeight
    ) {
      el.scrollTop = Math.max(0, top - THUMB_ROW)
    }
  }, [bridge.page])
  const { from, to } = visibleRows(view.top, view.height, count)
  return (
    <div
      ref={scroller}
      data-testid="book-thumbs"
      className="h-full overflow-y-auto"
      onScroll={(e) =>
        setView({
          top: e.currentTarget.scrollTop,
          height: e.currentTarget.clientHeight,
        })
      }
    >
      <ul
        aria-label={t('bookpanel.label')}
        className="relative"
        style={{ height: count * THUMB_ROW }}
      >
        {Array.from({ length: to - from }, (_, i) => from + i + 1).map((n) => (
          <li
            key={n}
            className="absolute inset-x-0"
            style={{ top: (n - 1) * THUMB_ROW, height: THUMB_ROW }}
          >
            <button
              type="button"
              data-chrome
              data-testid="book-thumb"
              data-page={n}
              aria-label={t('bookpanel.thumb', { n })}
              aria-current={n === bridge.page ? 'page' : undefined}
              onClick={() => bridge.go(`pdf:${n}:0`)}
              className={`flex h-[130px] w-full items-center gap-3 rounded-lg border px-2 hover:bg-hover ${
                n === bridge.page
                  ? 'border-accent bg-hover'
                  : 'border-transparent'
              }`}
            >
              <Thumb doc={doc} page={n} />
              <span className="text-sm tabular-nums">{n}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Thumb({ doc, page }: { doc: PDFDocumentProxy; page: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    let cancelled = false
    let task: RenderTask | undefined
    // Wait a moment: a fast scroll should not draw every page it passes.
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const p = await doc.getPage(page)
          if (cancelled) return
          const base = p.getViewport({ scale: 1 })
          const vp = p.getViewport({ scale: (THUMB_W / base.width) * 2 })
          el.width = Math.ceil(vp.width)
          el.height = Math.ceil(vp.height)
          el.style.width = `${Math.ceil(vp.width / 2)}px`
          el.style.height = `${Math.ceil(vp.height / 2)}px`
          task = p.render({ canvas: el, viewport: vp })
          await task.promise
          p.cleanup()
        } catch {
          // A cancelled picture just stays blank.
        }
      })()
    }, 150)
    return () => {
      cancelled = true
      window.clearTimeout(id)
      task?.cancel()
    }
  }, [doc, page])
  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="shrink-0 rounded border border-line bg-white"
      style={{ width: THUMB_W, height: Math.round(THUMB_W * 1.3) }}
    />
  )
}
