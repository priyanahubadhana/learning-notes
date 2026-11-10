import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { t } from '../../i18n/t'
import { visibleFraction } from '../bookPanelMath'

const W = 84

/**
 * The small overview in the corner of a zoomed PDF page (item 44): the page
 * as a picture with a frame where the screen is now.
 */
export default function ZoomPreview({
  doc,
  page,
  onClose,
}: {
  doc: PDFDocumentProxy
  page: number
  onClose: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [frame, setFrame] = useState({ x: 0, y: 0, w: 1, h: 1 })
  const [ratio, setRatio] = useState(1.3)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    let cancelled = false
    let task: RenderTask | undefined
    void (async () => {
      try {
        const p = await doc.getPage(Math.min(doc.numPages, Math.max(1, page)))
        if (cancelled) return
        const base = p.getViewport({ scale: 1 })
        setRatio(base.height / base.width)
        const vp = p.getViewport({ scale: (W / base.width) * 2 })
        el.width = Math.ceil(vp.width)
        el.height = Math.ceil(vp.height)
        task = p.render({ canvas: el, viewport: vp })
        await task.promise
        p.cleanup()
      } catch {
        // A cancelled picture just stays blank.
      }
    })()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, page])

  // The frame follows the scroll.
  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(
      '[data-testid="pdf-scroller"]',
    )
    if (!scroller) return
    let raf = 0
    const read = () => {
      raf = 0
      const pageEl = scroller.querySelector<HTMLElement>(
        `[data-pdf-page="${page}"]`,
      )
      if (!pageEl) return
      const p = pageEl.getBoundingClientRect()
      const s = scroller.getBoundingClientRect()
      setFrame(visibleFraction(p, s))
    }
    const poke = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    read()
    scroller.addEventListener('scroll', poke, { passive: true })
    window.addEventListener('resize', poke)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      scroller.removeEventListener('scroll', poke)
      window.removeEventListener('resize', poke)
    }
  }, [page])

  return (
    <div
      data-chrome
      data-testid="zoom-preview"
      role="group"
      aria-label={t('reader.zoomPreview.label')}
      className="absolute end-3 top-3 z-20 rounded-lg border border-line bg-bg p-1 shadow-lg"
    >
      <div
        role="img"
        aria-label={t('reader.zoomPreview.map')}
        className="relative"
        style={{ width: W, height: Math.round(W * ratio) }}
      >
        <canvas
          ref={canvas}
          aria-hidden
          className="absolute inset-0 size-full rounded-sm bg-white"
        />
        <span
          aria-hidden
          data-testid="zoom-frame"
          className="absolute rounded-sm border-2 border-accent bg-accent/10"
          style={{
            left: `${frame.x * 100}%`,
            top: `${frame.y * 100}%`,
            width: `${frame.w * 100}%`,
            height: `${frame.h * 100}%`,
          }}
        />
      </div>
      <button
        type="button"
        data-testid="zoom-close"
        aria-label={t('reader.zoomPreview.close')}
        onClick={onClose}
        className="mt-1 block min-h-11 w-full rounded-md text-sm hover:bg-hover"
      >
        ✕
      </button>
    </div>
  )
}
