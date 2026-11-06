import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n/t'

/**
 * Page Flip (C5): a slider along the bottom to look through the whole book.
 * A PDF shows a small picture of the page under your finger; an EPUB shows
 * the place as a percentage. Letting go (or pausing) opens that place, and
 * "Back to p. 42" returns to where you started.
 */
export function PageFlip({
  doc,
  pageCount,
  page,
  progress,
  onGoPage,
  onGoFraction,
  onBack,
  backTo,
  onScrubStart,
  onClose,
}: {
  /** The PDF, when this is a PDF (pictures of its pages). */
  doc: PDFDocumentProxy | null
  /** PDF page count; 0 for an EPUB. */
  pageCount: number
  /** The page now open (PDF). */
  page: number
  /** Where in the book now, 0 to 1. */
  progress: number
  onGoPage: (page: number) => void
  onGoFraction: (fraction: number) => void
  /** Returns to where the flip started. */
  onBack: () => void
  /** What "Back to" names, or null when there is nowhere to go back to. */
  backTo: string | null
  /** The first move of a scrub: remember where it started. */
  onScrubStart: () => void
  onClose: () => void
}) {
  const pdf = pageCount > 0
  const max = pdf ? pageCount : 1000
  const now = pdf ? page : Math.round(progress * 1000)
  const [value, setValue] = useState(now)
  const dragging = useRef(false)
  const timer = useRef(0)
  // Follow the book while the slider is not being used.
  useEffect(() => {
    if (!dragging.current) setValue(now)
  }, [now])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const commit = (v: number) => {
    dragging.current = false
    if (pdf) onGoPage(v)
    else onGoFraction(v / 1000)
  }
  const move = (v: number) => {
    if (!dragging.current) onScrubStart()
    dragging.current = true
    setValue(v)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => commit(v), 450)
  }

  const label = pdf
    ? t('reader.flip.page', { page: value, total: pageCount })
    : t('reader.flip.percent', { percent: Math.round(value / 10) })

  return (
    <div
      data-chrome
      role="group"
      aria-label={t('reader.flip.label')}
      data-testid="page-flip"
      className="absolute inset-x-2 bottom-2 z-20 mx-auto max-w-xl rounded-xl border border-line bg-bg p-3 shadow-lg"
    >
      <div className="flex items-center gap-3">
        {pdf && doc && <PagePreview doc={doc} page={value} />}
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-sm" data-testid="page-flip-label">
            {label}
          </p>
          <input
            type="range"
            min={1}
            max={max}
            step={1}
            value={Math.min(max, Math.max(1, value))}
            aria-label={t('reader.flip.slider')}
            aria-valuetext={label}
            data-testid="page-flip-slider"
            className="h-11 w-full accent-[var(--color-accent)]"
            onChange={(e) => move(Number(e.target.value))}
            onPointerUp={() => {
              window.clearTimeout(timer.current)
              if (dragging.current) commit(value)
            }}
            onKeyUp={() => {
              window.clearTimeout(timer.current)
              if (dragging.current) commit(value)
            }}
          />
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        {backTo ? (
          <button
            type="button"
            data-testid="page-flip-back"
            onClick={onBack}
            className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
          >
            {t('reader.flip.back', { where: backTo })}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-lg px-3 text-sm hover:bg-hover"
        >
          {t('reader.flip.close')}
        </button>
      </div>
    </div>
  )
}

/** A small picture of one PDF page (drawn when the slider settles for a moment). */
function PagePreview({ doc, page }: { doc: PDFDocumentProxy; page: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    let cancelled = false
    let task: RenderTask | undefined
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const p = await doc.getPage(Math.min(doc.numPages, Math.max(1, page)))
          if (cancelled) return
          const base = p.getViewport({ scale: 1 })
          const scale = 96 / base.width
          const vp = p.getViewport({ scale: scale * 2 })
          el.width = Math.ceil(vp.width)
          el.height = Math.ceil(vp.height)
          el.style.width = `${Math.ceil(vp.width / 2)}px`
          el.style.height = `${Math.ceil(vp.height / 2)}px`
          task = p.render({ canvas: el, viewport: vp })
          await task.promise
          p.cleanup()
        } catch {
          // A cancelled or failed preview just stays as it was.
        }
      })()
    }, 120)
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
      data-testid="page-flip-preview"
      className="shrink-0 rounded border border-line bg-white"
      style={{ width: 96, minHeight: 60 }}
    />
  )
}
