import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { LearningNotesDB } from '../../core/db'
import type { BookSurface } from '../../ink/layout'
import { blockIn, epubBlockId, leafBlocks } from './epubInk'
import { parseLocator } from '../../core/sourceCheck'
import type { Annotation } from '../../core/types'
import { makeQuote } from '../annotations/annotationService'
import { COLOUR_FILL } from '../annotations/colours'
import type { ReaderSelection } from '../BookReader'
import type { OutlineItem } from '../pdf/PdfView'
import { pageSurface, styleCss, type ReadStyle } from '../readStyle'
import { bookFontCss } from './bookFont'
import { bookSource } from '../aloud/bookText'
import { setBookAloudHost } from '../aloud/bookAloud'
import { epubCss, flattenToc, makeEpubLoader, type TocNode } from './epubLoader'

/** The parts of foliate-js's view that we use (the library is plain JS). */
interface FoliateView extends HTMLElement {
  book: { toc?: TocNode[] }
  renderer: HTMLElement & {
    setStyles?: (css: string) => void
    next: () => Promise<void>
    prev: () => Promise<void>
    nextSection?: () => Promise<void>
    getContents: () => { doc: Document; index: number }[]
  }
  open: (book: unknown) => Promise<void>
  init: (o: { lastLocation?: string; showTextStart?: boolean }) => Promise<void>
  close: () => void
  goTo: (target: string) => Promise<unknown>
  goLeft: () => Promise<void>
  goRight: () => Promise<void>
  getCFI: (index: number, range?: Range) => string
  goToFraction: (fraction: number) => Promise<void>
  addAnnotation: (a: AnnotationDraft, remove?: boolean) => Promise<unknown>
  deleteAnnotation: (a: AnnotationDraft) => Promise<unknown>
}
interface AnnotationDraft {
  value: string
  color: string
  glow?: boolean
}
interface RelocateDetail {
  fraction: number
  cfi: string
  tocItem?: { label?: string }
  /** What is left, in foliate size units (1,600 characters each). */
  time?: { section: number; total: number }
}

// The drawing code loads only after the book is on screen (C2b).
const BookInk = lazy(() =>
  import('../../ink/BookInk').then((m) => ({ default: m.BookInk })),
)

export interface EpubViewProps {
  data: ArrayBuffer
  /** C2b: ink over the paragraphs (Scroll mode only; `on` = the Pen is on). */
  ink?: { db: LearningNotesDB; pageId: string; on: boolean }
  startAt?: string
  annotations: readonly Annotation[]
  target?: { at: string; nonce: number; glow?: string } | null
  /** Text size in percent. */
  size: number
  flow: 'paginated' | 'scrolled'
  /** The Aa sheet's look (font, spacing, margins, page colour). */
  look?: ReadStyle
  command?: {
    type: 'prev' | 'next' | 'fraction'
    nonce: number
    /** For 'fraction': where in the book, 0 to 1. */
    value?: number
  } | null
  onOutline: (items: (OutlineItem & { at?: string })[]) => void
  onPosition: (pos: {
    progress: number
    locator: string
    label: string
    /** Size units left in the chapter and the book, when the book says. */
    unitsLeft?: { chapter: number; book: number }
  }) => void
  onSelection: (sel: ReaderSelection | null) => void
  /** A tap on the text: where across the view (x of width), for page turns. */
  onTap?: (x: number, width: number) => void
  onFailed: () => void
}

const ACCENT = 'rgba(37, 99, 235, 0.9)'

/** The highlights wanted on screen, by position. */
function wantedHighlights(list: readonly Annotation[]) {
  const wanted = new Map<string, AnnotationDraft>()
  for (const a of list) {
    if (a.anchor.type !== 'epub' || a.kind === 'bookmark') continue
    wanted.set(a.anchor.cfi, {
      value: a.anchor.cfi,
      color: COLOUR_FILL[a.colour ?? 'yellow'],
    })
  }
  return wanted
}

/**
 * The EPUB reader (C3): foliate-js (vendored in `src/vendor/foliate-js`)
 * lays the book out in scroll or page mode inside frames that run no scripts.
 * This wrapper is the only importer of the library, so it can be swapped.
 */
export function EpubView(props: EpubViewProps) {
  const host = useRef<HTMLDivElement>(null)
  const viewRef = useRef<FoliateView | null>(null)
  const propsRef = useRef(props)
  useEffect(() => {
    propsRef.current = props
  })
  const lastTocLabel = useRef('')
  const [inkWrap, setInkWrap] = useState<HTMLElement | null>(null)
  /** Tells the ink that paragraphs may have moved (scroll, load, resize). */
  const inkWatchers = useRef(new Set<() => void>())
  const leafCache = useRef(new WeakMap<Document, Element[]>())
  const [surface] = useState<BookSurface>(() => ({
    blocks: (wrap) => {
      const view = viewRef.current
      if (!view) return []
      const box = wrap.getBoundingClientRect()
      const out: ReturnType<typeof blockIn>[] = []
      for (const { doc, index } of view.renderer.getContents()) {
        const frame = doc.defaultView?.frameElement?.getBoundingClientRect()
        if (!frame) continue
        let leaves = leafCache.current.get(doc)
        if (!leaves) {
          leaves = leafBlocks(doc)
          leafCache.current.set(doc, leaves)
        }
        leaves.forEach((el, n) => {
          out.push(
            blockIn(
              epubBlockId(index, n),
              el.getBoundingClientRect(),
              frame,
              box,
            ),
          )
        })
      }
      return out.filter((b) => b !== null)
    },
    unit: (wrap) => wrap.getBoundingClientRect().width || 1,
    watch: (cb) => {
      inkWatchers.current.add(cb)
      return () => inkWatchers.current.delete(cb)
    },
  }))
  const pokeInk = () => inkWatchers.current.forEach((cb) => cb())
  const drawn = useRef(new Map<string, AnnotationDraft>())

  /** Our annotations → the frame's overlay. */
  const sync = (v: FoliateView) => {
    const wanted = wantedHighlights(propsRef.current.annotations)
    for (const [cfi, d] of drawn.current) {
      if (!wanted.has(cfi)) void v.deleteAnnotation(d)
    }
    drawn.current = wanted
    for (const d of wanted.values()) void v.addAnnotation(d)
  }

  // Open the book.
  useEffect(() => {
    const el = host.current
    if (!el) return
    let cancelled = false
    let view: FoliateView | null = null
    void (async () => {
      try {
        const [, { EPUB }, { Overlayer }] = await Promise.all([
          import('../../vendor/foliate-js/view.js'),
          import('../../vendor/foliate-js/epub.js'),
          import('../../vendor/foliate-js/overlayer.js'),
        ])
        const loader = makeEpubLoader(new Uint8Array(propsRef.current.data))
        const book = await new EPUB(loader).init()
        if (cancelled) return
        view = document.createElement('foliate-view') as FoliateView
        view.style.cssText = 'display:block;width:100%;height:100%'
        el.append(view)
        viewRef.current = view
        await view.open(book)
        if (cancelled) return
        view.renderer.setAttribute('flow', propsRef.current.flow)
        applyStyle(view, propsRef.current.size, propsRef.current.look)
        view.renderer.addEventListener('scroll', pokeInk)
        // Read aloud reads the open chapter and goes on to the next one.
        setBookAloudHost({
          source: () => {
            const c = view?.renderer.getContents()[0]
            const frame = c?.doc.defaultView?.frameElement
            if (!c?.doc.body || !frame || !host.current) return null
            return bookSource(c.doc.body, () => {
              const f = frame.getBoundingClientRect()
              const h = host.current!.getBoundingClientRect()
              return {
                left: h.left - f.left,
                top: h.top - f.top,
                right: h.right - f.left,
                bottom: h.bottom - f.top,
              }
            })
          },
          next: async () => {
            const was = view?.renderer.getContents()[0]?.index
            await view?.renderer.nextSection?.()
            await new Promise((res) => setTimeout(res, 400))
            const now = view?.renderer.getContents()[0]?.index
            return now !== undefined && now !== was
          },
        })

        view.addEventListener('relocate', (e) => {
          pokeInk()
          const d = (e as CustomEvent<RelocateDetail>).detail
          lastTocLabel.current = d.tocItem?.label ?? ''
          propsRef.current.onPosition({
            progress: d.fraction,
            locator: `epub:${d.cfi}`,
            label: lastTocLabel.current,
            ...(d.time && {
              unitsLeft: { chapter: d.time.section, book: d.time.total },
            }),
          })
        })
        view.addEventListener('draw-annotation', (e) => {
          const { draw, annotation } = (
            e as CustomEvent<{
              draw: (f: unknown, o: unknown) => void
              annotation: AnnotationDraft
            }>
          ).detail
          if (annotation.glow) {
            draw(Overlayer.outline, { color: ACCENT, width: 3 })
          } else draw(Overlayer.highlight, { color: annotation.color })
        })
        view.addEventListener('create-overlay', () => sync(view!))
        view.addEventListener('load', (e) => {
          const { doc, index } = (
            e as CustomEvent<{ doc: Document; index: number }>
          ).detail
          watchSelection(view!, doc, index)
          pokeInk()
          // The text re-flowed (size, font, width): the ink follows.
          const body = doc.documentElement
          if (body && typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(pokeInk).observe(body)
          }
          doc.addEventListener('click', (c) => {
            const target = c.target as Element | null
            if (target?.closest('a, button, input, select, textarea')) return
            if (!doc.getSelection()?.isCollapsed) return
            const box = host.current?.getBoundingClientRect()
            const frame = doc.defaultView?.frameElement?.getBoundingClientRect()
            if (!box || !frame) return
            propsRef.current.onTap?.(
              c.clientX + frame.left - box.left,
              box.width,
            )
          })
          doc.addEventListener('keydown', (k) => {
            if (k.key === 'ArrowLeft') void view?.goLeft()
            else if (k.key === 'ArrowRight') void view?.goRight()
          })
        })
        propsRef.current.onOutline(
          flattenToc(book.toc as TocNode[] | undefined).map((t) => ({
            title: t.title,
            page: 0,
            depth: t.depth,
            at: `href:${t.href}`,
          })),
        )
        const loc = propsRef.current.startAt
          ? parseLocator(propsRef.current.startAt)
          : null
        await view.init({
          lastLocation: loc?.type === 'epub' ? loc.cfi : undefined,
          showTextStart: true,
        })
        // Never a blank page (item 28): a very long chapter in columns can
        // draw nothing on some devices. If no text is on screen a moment
        // after opening, fall back to the scrolling layout.
        window.setTimeout(() => {
          if (cancelled || !view || textIsShowing(view)) return
          view.renderer.setAttribute('flow', 'scrolled')
          console.warn('EPUB: no text on screen, switched to Scroll')
        }, 2500)
      } catch (e) {
        console.error('EPUB failed', e)
        if (!cancelled) propsRef.current.onFailed()
      }
    })()

    function watchSelection(v: FoliateView, doc: Document, index: number) {
      let timer = 0
      doc.addEventListener('selectionchange', () => {
        window.clearTimeout(timer)
        timer = window.setTimeout(() => {
          const sel = doc.getSelection()
          if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
            propsRef.current.onSelection(null)
            return
          }
          const range = sel.getRangeAt(0)
          const text = sel.toString().replace(/\s+/g, ' ').trim()
          if (!text) return propsRef.current.onSelection(null)
          const frame = doc.defaultView?.frameElement?.getBoundingClientRect()
          const r = range.getBoundingClientRect()
          const full = (doc.body.textContent ?? '').replace(/\s+/g, ' ')
          const at = Math.max(0, full.indexOf(text.slice(0, 200)))
          propsRef.current.onSelection({
            text: text.slice(0, 5000),
            rect: {
              x: r.left + (frame?.left ?? 0),
              y: r.top + (frame?.top ?? 0),
              w: r.width,
              h: r.height,
            },
            anchor: { type: 'epub', cfi: v.getCFI(index, range) },
            quote: makeQuote(full, at, at + text.length),
            chapter: lastTocLabel.current || undefined,
          })
        }, 200)
      })
    }

    return () => {
      cancelled = true
      setBookAloudHost(null)
      view?.close()
      view?.remove()
      viewRef.current = null
      drawn.current = new Map()
    }
  }, [props.data])

  // Highlights follow the list.
  useEffect(() => {
    if (viewRef.current) sync(viewRef.current)
  }, [props.annotations])

  // Text size, theme and layout.
  useEffect(() => {
    const v = viewRef.current
    // The view is stored before foliate has opened the book, so its renderer
    // may not exist yet (a size or theme change in that gap threw and sent the
    // reader to the error screen). Opening applies the current settings itself.
    if (!v || !(v as Partial<FoliateView>).renderer) return
    v.renderer.setAttribute('flow', props.flow)
    applyStyle(v, props.size, props.look)
    const mo = new MutationObserver(() => applyStyle(v, props.size, props.look))
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    })
    return () => mo.disconnect()
  }, [props.flow, props.size, props.look])

  // Jumps: contents (`href:`), annotations and deep links (`epub:`).
  useEffect(() => {
    const v = viewRef.current
    const t = props.target
    if (!v || !t) return
    const where = t.at.startsWith('href:')
      ? t.at.slice(5)
      : parseLocator(t.at)?.type === 'epub'
        ? t.at.slice(5)
        : null
    if (!where) return
    void v.goTo(where).then(() => {
      if (!t.glow || !t.at.startsWith('epub:')) return
      const glow = { value: where, color: ACCENT, glow: true }
      void v.addAnnotation(glow)
      window.setTimeout(() => {
        // Back to the normal colour (or nothing, if it was not a highlight).
        void v.deleteAnnotation(glow)
        const normal = drawn.current.get(where)
        if (normal) void v.addAnnotation(normal)
      }, 1700)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.target?.nonce])

  // Previous / next page.
  useEffect(() => {
    const v = viewRef.current
    const c = props.command
    if (!v || !c) return
    if (c.type === 'fraction') void v.goToFraction(c.value ?? 0)
    else void (c.type === 'next' ? v.goRight() : v.goLeft())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.command?.nonce])

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div
        ref={host}
        data-testid="epub-host"
        className="absolute inset-0 overflow-hidden"
      />
      {props.ink && props.flow === 'scrolled' && (
        <>
          <div
            ref={setInkWrap}
            data-testid="epub-ink-wrap"
            className="pointer-events-none absolute inset-0 z-[2]"
          />
          <Suspense fallback={null}>
            <BookInk
              db={props.ink.db}
              pageId={props.ink.pageId}
              wrap={inkWrap}
              surface={surface}
              on={props.ink.on}
              textSize={props.size}
            />
          </Suspense>
        </>
      )}
    </div>
  )
}

/** True when some paragraph of the open chapter sits inside the view. */
function textIsShowing(view: FoliateView): boolean {
  try {
    const box = view.getBoundingClientRect()
    for (const { doc } of view.renderer.getContents()) {
      const frame = doc.defaultView?.frameElement?.getBoundingClientRect()
      if (!frame) return true
      const els = doc.querySelectorAll('p, li, h1, h2, h3, div')
      for (let i = 0; i < Math.min(els.length, 6000); i++) {
        const r = els[i].getBoundingClientRect()
        const x = r.left + frame.left
        const y = r.top + frame.top
        if (
          r.width > 4 &&
          r.height > 4 &&
          x < box.right &&
          x + r.width > box.left &&
          y < box.bottom &&
          y + r.height > box.top
        )
          return true
      }
    }
    return false
  } catch {
    return true // cannot tell: leave it
  }
}

/** Puts the app's colours and the chosen text size into the book's pages. */
function applyStyle(view: FoliateView, size: number, look?: ReadStyle) {
  const css = getComputedStyle(document.documentElement)
  const surface = look ? pageSurface(look.page) : null
  view.renderer.setStyles?.(
    epubCss({
      size,
      bg: surface?.bg ?? (css.getPropertyValue('--color-bg').trim() || '#fff'),
      ink:
        surface?.ink ?? (css.getPropertyValue('--color-ink').trim() || '#111'),
      select: css.getPropertyValue('--color-select').trim(),
      extra: look
        ? `${look.font === 'bookerly' ? bookFontCss() : ''}
${styleCss(look)}`
        : '',
    }),
  )
}
