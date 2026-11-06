import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'
import 'pdfjs-dist/web/pdf_viewer.css'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { loadPdfjs } from '../../app/pdfjs'
import { clampDpr, release, reserve } from '../../app/canvasBudget'
import { parseLocator } from '../../core/sourceCheck'
import type { Annotation, AnnotationAnchor } from '../../core/types'
import { t } from '../../i18n/t'
import { COLOUR_FILL, type PopupRect } from '../annotations/colours'
import {
  capScale,
  fitWidthScale,
  flattenRects,
  groupRects,
  layoutPages,
  locatorAt,
  mergeRects,
  offsetForLocator,
  progressOf,
  toFractions,
  visibleRange,
  type PageSize,
  type Rect4,
} from './pdfLayout'

/** A text selection (or drawn box) in the PDF, ready for the pop-up. */
export interface PdfSelection {
  text: string
  rect: PopupRect
  anchor: Extract<AnnotationAnchor, { type: 'pdf' }>
  quote?: { exact: string; prefix: string; suffix: string }
  chapter?: string
}

export interface OutlineItem {
  title: string
  page: number
  depth: number
}

export interface PdfPosition {
  page: number
  y: number
  progress: number
}

export interface PdfViewProps {
  data: ArrayBuffer
  /** Where to start: `pdf:<page>:<y>`. */
  startAt?: string
  annotations: readonly Annotation[]
  zoom: number
  /** Jump to a locator; a new `nonce` repeats the jump. `glow` flashes an annotation. */
  target?: { at: string; nonce: number; glow?: string } | null
  onReady: (info: { pageCount: number }) => void
  onOutline: (items: OutlineItem[]) => void
  onPosition: (pos: PdfPosition) => void
  onSelection: (sel: PdfSelection | null) => void
  onFailed: () => void
  onNoText: () => void
  chapterAt: (page: number) => string | undefined
}

const DEFAULT_SIZE: PageSize = { w: 612, h: 792 }

/**
 * The continuous PDF column (C2): pages drawn on demand (the visible ones and
 * one screen either side), a selectable text layer, saved highlights as
 * coloured boxes over the page. Canvas memory goes through the shared budget,
 * and off-screen canvases are released.
 */
export function PdfView(props: PdfViewProps) {
  const { data, annotations, zoom, target, startAt } = props
  const scroller = useRef<HTMLDivElement>(null)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [sizes, setSizes] = useState<PageSize[]>([])
  const [width, setWidth] = useState(0)
  const [range, setRange] = useState<[number, number]>([0, 0])
  const propsRef = useRef(props)
  useEffect(() => {
    propsRef.current = props
  })

  // Open the document.
  useEffect(() => {
    let cancelled = false
    let opened: PDFDocumentProxy | null = null
    let task: { destroy: () => Promise<void> } | null = null
    void (async () => {
      try {
        const pdfjs = await loadPdfjs()
        const loading = pdfjs.getDocument({
          data: new Uint8Array(data.slice(0)),
        })
        task = loading
        const pdf = await loading.promise
        if (cancelled) return void loading.destroy()
        opened = pdf
        const first = await pdf.getPage(1)
        const v = first.getViewport({ scale: 1 })
        const firstSize = { w: v.width, h: v.height }
        setSizes(Array.from({ length: pdf.numPages }, () => firstSize))
        setDoc(pdf)
        propsRef.current.onReady({ pageCount: pdf.numPages })
        // The other pages' real sizes, in the background.
        const real: PageSize[] = Array.from(
          { length: pdf.numPages },
          () => firstSize,
        )
        for (let i = 2; i <= pdf.numPages && !cancelled; i++) {
          const p = await pdf.getPage(i)
          const vp = p.getViewport({ scale: 1 })
          real[i - 1] = { w: vp.width, h: vp.height }
          p.cleanup()
          if (i % 25 === 0 || i === pdf.numPages) setSizes([...real])
        }
        void readOutline(pdf).then(
          (items) => !cancelled && propsRef.current.onOutline(items),
        )
      } catch (e) {
        console.error('PDF failed', e)
        if (!cancelled) propsRef.current.onFailed()
      }
    })()
    return () => {
      cancelled = true
      void task?.destroy()
      void opened
    }
  }, [data])

  // Width of the column.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const base = sizes[0] ?? DEFAULT_SIZE
  const scale = width > 0 ? fitWidthScale(width, base.w) * zoom : 1
  const layout = useMemo(() => layoutPages(sizes, scale), [sizes, scale])

  // Which pages to draw and where the reader is.
  const lastReported = useRef('')
  // Where the reader is, so a change of zoom or page sizes keeps the place.
  const held = useRef<{ page: number; y: number } | null>(null)
  const onScroll = useCallback(() => {
    const el = scroller.current
    if (!el || sizes.length === 0) return
    setRange(visibleRange(layout, el.scrollTop, el.clientHeight))
    const { page, y } = locatorAt(layout, el.scrollTop)
    held.current = { page, y }
    const key = `${page}:${y.toFixed(3)}`
    if (key !== lastReported.current) {
      lastReported.current = key
      propsRef.current.onPosition({
        page,
        y,
        progress: progressOf(page, y, sizes.length),
      })
    }
  }, [layout, sizes.length])

  // Keep the reading position when the layout changes (zoom, resize, real
  // page sizes arriving).
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el || sizes.length === 0 || width === 0) return
    if (held.current) {
      el.scrollTop = offsetForLocator(layout, held.current.page, held.current.y)
    }
    onScroll()
  }, [layout, sizes.length, width, onScroll])

  // Start where the reader left off, once the page sizes are known.
  const started = useRef(false)
  useEffect(() => {
    if (started.current || !doc || width === 0) return
    started.current = true
    const loc = startAt ? parseLocator(startAt) : null
    if (loc?.type === 'pdf' && scroller.current) {
      scroller.current.scrollTop = offsetForLocator(layout, loc.page, loc.y)
    }
    onScroll()
  }, [doc, width, startAt, layout, onScroll])

  // Jumps (contents, annotations, deep links).
  const [glowing, setGlowing] = useState<string | null>(null)
  const [seenNonce, setSeenNonce] = useState(-1)
  if (target && target.nonce !== seenNonce) {
    setSeenNonce(target.nonce)
    setGlowing(target.glow ?? null)
  }
  useEffect(() => {
    if (!glowing) return
    const id = window.setTimeout(() => setGlowing(null), 1700)
    return () => window.clearTimeout(id)
  }, [glowing])
  useEffect(() => {
    if (!target || !scroller.current || !doc) return
    const loc = parseLocator(target.at)
    if (loc?.type !== 'pdf') return
    scroller.current.scrollTop = offsetForLocator(layout, loc.page, loc.y)
    onScroll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.nonce, doc])

  // Text selection → pop-up.
  useEffect(() => {
    let timer = 0
    const check = () => {
      const root = scroller.current
      const sel = document.getSelection()
      if (!root || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
        propsRef.current.onSelection(null)
        return
      }
      const range = sel.getRangeAt(0)
      const startEl =
        range.startContainer.nodeType === 1
          ? (range.startContainer as Element)
          : range.startContainer.parentElement
      const pageEl = startEl?.closest<HTMLElement>('[data-pdf-page]')
      if (!pageEl || !root.contains(pageEl)) {
        propsRef.current.onSelection(null)
        return
      }
      const pageNo = Number(pageEl.dataset.pdfPage)
      const box = pageEl.getBoundingClientRect()
      const rects = mergeRects(
        Array.from(range.getClientRects())
          .filter(
            (r) =>
              r.bottom > box.top &&
              r.top < box.bottom &&
              r.right > box.left &&
              r.left < box.right,
          )
          .slice(0, 400)
          .map((r) => toFractions(r, box)),
      ).slice(0, 100)
      const text = sel.toString().replace(/\s+/g, ' ').trim()
      if (rects.length === 0 || !text) {
        propsRef.current.onSelection(null)
        return
      }
      const pageText = pageEl.querySelector('.textLayer')?.textContent ?? ''
      const at = pageText.replace(/\s+/g, ' ').indexOf(text.slice(0, 200))
      const quoteText = text.slice(0, 5000)
      const br = range.getBoundingClientRect()
      propsRef.current.onSelection({
        text: quoteText,
        rect: { x: br.left, y: br.top, w: br.width, h: br.height },
        anchor: { type: 'pdf', page: pageNo, rects: flattenRects(rects) },
        quote: {
          exact: quoteText,
          prefix:
            at > 0
              ? pageText.replace(/\s+/g, ' ').slice(Math.max(0, at - 40), at)
              : '',
          suffix:
            at >= 0
              ? pageText
                  .replace(/\s+/g, ' ')
                  .slice(at + text.length, at + text.length + 40)
              : '',
        },
        chapter: propsRef.current.chapterAt(pageNo),
      })
    }
    const onChange = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(check, 200)
    }
    document.addEventListener('selectionchange', onChange)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('selectionchange', onChange)
    }
  }, [])

  const byPage = useMemo(() => {
    const map = new Map<number, Annotation[]>()
    for (const a of annotations) {
      if (a.anchor.type !== 'pdf') continue
      const list = map.get(a.anchor.page) ?? []
      list.push(a)
      map.set(a.anchor.page, list)
    }
    return map
  }, [annotations])

  return (
    <div
      ref={scroller}
      onScroll={onScroll}
      data-testid="pdf-scroller"
      data-reader-scroll
      tabIndex={0}
      className="relative min-h-0 flex-1 overflow-auto bg-soft"
    >
      <div
        style={{
          blockSize: layout.total,
          inlineSize: '100%',
          position: 'relative',
        }}
      >
        {sizes.map((size, i) => {
          const inRange = i >= range[0] && i <= range[1]
          return (
            <div
              key={i}
              data-pdf-page={i + 1}
              style={{
                position: 'absolute',
                top: layout.tops[i],
                insetInlineStart: '50%',
                transform: 'translateX(-50%)',
                inlineSize: size.w * scale,
                blockSize: size.h * scale,
              }}
              className="bg-white shadow-sm"
            >
              {inRange && doc && (
                <PdfPageView
                  doc={doc}
                  pageNo={i + 1}
                  scale={scale}
                  size={size}
                  annotations={byPage.get(i + 1) ?? []}
                  glowing={glowing}
                  onNoText={props.onNoText}
                  onBox={(rect, box) =>
                    props.onSelection({
                      text: '',
                      rect,
                      anchor: {
                        type: 'pdf',
                        page: i + 1,
                        rects: flattenRects([box]),
                      },
                      chapter: props.chapterAt(i + 1),
                    })
                  }
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** The contents list of the PDF with page numbers (flattened, max 500). */
async function readOutline(pdf: PDFDocumentProxy): Promise<OutlineItem[]> {
  const out: OutlineItem[] = []
  const outline = await pdf.getOutline().catch(() => null)
  if (!outline) return out
  const walk = async (items: typeof outline, depth: number) => {
    for (const item of items) {
      if (out.length >= 500) return
      let page = 0
      try {
        const dest =
          typeof item.dest === 'string'
            ? await pdf.getDestination(item.dest)
            : item.dest
        const ref = dest?.[0]
        if (ref !== null && ref !== undefined) {
          page =
            typeof ref === 'object'
              ? (await pdf.getPageIndex(ref as never)) + 1
              : Number(ref) + 1
        }
      } catch {
        page = 0
      }
      if (page > 0 && item.title) {
        out.push({ title: item.title.trim().slice(0, 200), page, depth })
      }
      if (item.items?.length) await walk(item.items, depth + 1)
    }
  }
  await walk(outline, 0)
  return out
}

/** One drawn page: canvas, text layer and highlight boxes. */
function PdfPageView({
  doc,
  pageNo,
  scale,
  size,
  annotations,
  glowing,
  onNoText,
  onBox,
}: {
  doc: PDFDocumentProxy
  pageNo: number
  scale: number
  size: PageSize
  annotations: Annotation[]
  glowing: string | null
  onNoText: () => void
  onBox: (rect: PopupRect, box: Rect4) => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const textHost = useRef<HTMLDivElement>(null)
  const [hasText, setHasText] = useState(true)
  const [drag, setDrag] = useState<Rect4 | null>(null)

  useEffect(() => {
    const el = canvas.current
    const host = textHost.current
    if (!el || !host) return
    let cancelled = false
    let render: RenderTask | undefined
    let page: PDFPageProxy | undefined
    const budgetId = `pdf:${pageNo}`
    void (async () => {
      try {
        const pdfjs = await loadPdfjs()
        page = await doc.getPage(pageNo)
        if (cancelled) return
        const dpr = clampDpr(window.devicePixelRatio)
        const drawScale = capScale(scale, size, dpr) // memory-safe
        const viewport = page.getViewport({ scale: scale * dpr })
        const drawViewport = page.getViewport({ scale: drawScale * dpr })
        const bytes = drawViewport.width * drawViewport.height * 4
        if (!reserve(budgetId, bytes)) return // out of canvas memory: stay blank
        el.width = Math.ceil(drawViewport.width)
        el.height = Math.ceil(drawViewport.height)
        el.style.width = `${size.w * scale}px`
        el.style.height = `${size.h * scale}px`
        render = page.render({ canvas: el, viewport: drawViewport })
        await render.promise
        void viewport
        if (cancelled) return
        // Text layer for selection.
        host.replaceChildren()
        host.style.setProperty('--scale-factor', String(scale))
        host.style.setProperty('--total-scale-factor', String(scale))
        const layer = new pdfjs.TextLayer({
          textContentSource: page.streamTextContent(),
          container: host,
          viewport: page.getViewport({ scale }),
        })
        await layer.render()
        if (cancelled) return
        const empty = layer.textContentItemsStr.every((s) => !s.trim())
        setHasText(!empty)
        if (empty) onNoText()
      } catch (e) {
        if (
          !cancelled &&
          (e as { name?: string }).name !== 'RenderingCancelledException'
        ) {
          console.error('Page failed', e)
        }
      }
    })()
    return () => {
      cancelled = true
      render?.cancel()
      release(budgetId)
      page?.cleanup()
    }
  }, [doc, pageNo, scale, size, onNoText])

  const fractionOf = (e: React.PointerEvent) => {
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)),
      box,
    }
  }
  const start = useRef<{ x: number; y: number } | null>(null)

  return (
    <>
      <canvas ref={canvas} className="absolute inset-0" aria-hidden />
      <div
        ref={textHost}
        className="textLayer absolute inset-0"
        style={{ opacity: 1 }}
      />
      {annotations.map((a) =>
        a.anchor.type === 'pdf'
          ? groupRects(a.anchor.rects).map((r, k) => (
              <div
                key={`${a.id}:${k}`}
                data-testid="pdf-highlight"
                data-annotation={a.id}
                className={glowing === a.id ? 'pdf-glow' : undefined}
                style={{
                  position: 'absolute',
                  insetInlineStart: `${r[0] * 100}%`,
                  top: `${r[1] * 100}%`,
                  inlineSize: `${r[2] * 100}%`,
                  blockSize: `${r[3] * 100}%`,
                  background: a.colour
                    ? COLOUR_FILL[a.colour]
                    : 'rgba(250, 204, 21, 0.25)',
                  mixBlendMode: 'multiply',
                  pointerEvents: 'none',
                }}
              />
            ))
          : null,
      )}
      {!hasText && (
        // A page with no text: highlight by drawing a box.
        <div
          className="absolute inset-0 touch-none cursor-crosshair"
          data-testid="pdf-box-layer"
          onPointerDown={(e) => {
            const f = fractionOf(e)
            start.current = { x: f.x, y: f.y }
            e.currentTarget.setPointerCapture(e.pointerId)
            setDrag([f.x, f.y, 0, 0])
          }}
          onPointerMove={(e) => {
            if (!start.current) return
            const f = fractionOf(e)
            const s = start.current
            setDrag([
              Math.min(s.x, f.x),
              Math.min(s.y, f.y),
              Math.abs(f.x - s.x),
              Math.abs(f.y - s.y),
            ])
          }}
          onPointerUp={(e) => {
            const f = fractionOf(e)
            const s = start.current
            start.current = null
            const box = drag
            setDrag(null)
            if (!s || !box || box[2] < 0.01 || box[3] < 0.01) return
            onBox(
              {
                x: f.box.left + box[0] * f.box.width,
                y: f.box.top + box[1] * f.box.height,
                w: box[2] * f.box.width,
                h: box[3] * f.box.height,
              },
              box,
            )
          }}
        >
          {drag && (
            <div
              style={{
                position: 'absolute',
                insetInlineStart: `${drag[0] * 100}%`,
                top: `${drag[1] * 100}%`,
                inlineSize: `${drag[2] * 100}%`,
                blockSize: `${drag[3] * 100}%`,
                background: 'rgba(250, 204, 21, 0.3)',
                border: '1px dashed rgba(0,0,0,0.4)',
              }}
            />
          )}
        </div>
      )}
      {!hasText && <span className="sr-only">{t('bookreader.noText')}</span>}
    </>
  )
}
