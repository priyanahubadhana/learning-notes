import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { EditorView } from 'prosemirror-view'
import { Icon } from '../app/tools/icons'
import { resizedWidth, CORNERS, type Corner } from '../editor/pictureResize'
import { t } from '../i18n/t'
import type { MessageKey } from '../i18n/t'
import { holdPagination } from '../editor/paperBridge'
import { endPlacement, type PlacementAsk } from './pictureChooserStore'
import { dropSpot, setPlacementGap } from './placementGap'
import { maxPictureWidth, sizeHint, writableHeight } from './pictureMax'
import { autoScrollStep } from './placementDrag'

/** What the preview needs from the editor. */
interface Host {
  domElement?: HTMLElement
  prosemirrorView?: EditorView
  getTextCursorPosition: () => { block: { id: string } }
}

const LABEL: Record<Corner, MessageKey> = {
  nw: 'pic.resize.nw',
  ne: 'pic.resize.ne',
  sw: 'pic.resize.sw',
  se: 'pic.resize.se',
}

type Align = 'left' | 'center' | 'right'

/** Width of the page scroll bar's gutter (the preview never goes over it). */
const BAR_GUTTER = 24

/**
 * Placing a chosen picture (iPad fix 1, reworked 10 Nov, item 22). The
 * picture shows as a preview. Dragging moves it with the finger every frame
 * (a transform, no React work), the page scrolls when it nears the top or
 * bottom edge, and it stays inside the page area, never over the bars. Where
 * it would land, a real gap opens in the text flow (the text below slides
 * down); in the middle of a line the line splits there like a caret. It
 * stays put across an app switch and never moves or commits by itself: only
 * ✓ (or Enter) places it, as one step; ✕ (or Esc) throws it away and closes
 * the gap. A corner resizes it up to one sheet's writable area.
 */
export default function PicturePlacement({
  ask,
  editor,
}: {
  ask: PlacementAsk
  editor: Host
}) {
  const url = useMemo(() => URL.createObjectURL(ask.file), [ask.file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const [ratio, setRatio] = useState(0.5)
  const [align, setAlign] = useState<Align>('left')
  const [width, setWidth] = useState(0)
  // Only a size the person chose is saved (else the picture keeps its default).
  const [resized, setResized] = useState(false)
  const [dragging, setDragging] = useState(false)
  /** The document position the picture will land at (null: fill a block). */
  const [pos, setPos] = useState<number | null>(() => {
    if (ask.blockId) return null
    try {
      return editor.prosemirrorView?.state.selection.from ?? null
    } catch {
      return null
    }
  })
  const fillId = ask.blockId
  const [anchorId] = useState(
    () => fillId ?? editor.getTextCursorPosition().block.id,
  )

  const gesture = useRef<
    | { kind: 'move'; dx: number; dy: number; release: () => void }
    | { kind: 'size'; corner: Corner; x: number; y: number; width: number }
    | null
  >(null)
  const pointer = useRef({ x: 0, y: 0 })
  const spot = useRef<{ left: number; top: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const sizes = useRef({ width: 0, height: 0, align: 'left' as Align })

  const height = width * ratio
  useEffect(() => {
    sizes.current = { width, height, align }
  })

  const page = () => editor.domElement?.firstElementChild as HTMLElement | null
  const scroller = () =>
    document.querySelector<HTMLElement>('[data-page-scroller]')
  const blockEl = (id: string) =>
    editor.domElement?.querySelector<HTMLElement>(
      `.bn-block[data-id="${CSS.escape(id)}"] > .bn-block-content`,
    ) ?? null

  /** The widest the picture may be: the column, and one sheet's height. */
  const cap = () =>
    maxPictureWidth(
      ratio,
      page()?.clientWidth ?? 4000,
      writableHeight(editor.domElement),
    )

  // The first size: the picture's own, at most 60% of the page and the cap.
  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (!img.naturalWidth) return
    const r = img.naturalHeight / img.naturalWidth
    setRatio(r)
    const room = page()?.clientWidth ?? 600
    const max = maxPictureWidth(r, room, writableHeight(editor.domElement))
    setWidth(
      Math.round(Math.max(64, Math.min(img.naturalWidth, room * 0.6, max))),
    )
  }

  // The gap in the text flow: as tall as the picture, at the landing place.
  useEffect(() => {
    if (pos === null || width === 0) return
    setPlacementGap(editor as never, { pos, px: Math.round(height + 8) })
  }, [pos, width, height, editor])
  useEffect(
    () => () => setPlacementGap(editor as never, null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // Scroll the page to the place once.
  useEffect(() => {
    blockEl(anchorId)?.scrollIntoView({ block: 'center', behavior: 'instant' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // One loop: while dragging it follows the pointer, scrolls near the edges
  // and moves the gap; otherwise it sits in the gap (or under the block it
  // fills), so it follows the page when text above changes. It stops while
  // the app is in the background and picks up again, in place, afterwards.
  useEffect(() => {
    const area = () => {
      const r = scroller()?.getBoundingClientRect()
      return {
        left: (r?.left ?? 0) + 4,
        right: (r?.right ?? window.innerWidth) - BAR_GUTTER - 4,
        top: (r?.top ?? 0) + 4,
        bottom: (r?.bottom ?? window.innerHeight) - 4,
      }
    }
    const clampSpot = (left: number, top: number) => {
      const a = area()
      const { width: w, height: h } = sizes.current
      return {
        left: Math.min(Math.max(left, a.left), Math.max(a.left, a.right - w)),
        top: Math.min(Math.max(top, a.top), Math.max(a.top, a.bottom - h)),
      }
    }
    const posUnder = (x: number, y: number): number | null => {
      const v = editor.prosemirrorView
      const p = page()
      if (!v || !p) return null
      const pr = p.getBoundingClientRect()
      try {
        const at = v.posAtCoords({
          left: Math.min(Math.max(x, pr.left + 2), pr.right - 2),
          top: y,
        })
        return at ? at.pos : null
      } catch {
        return null
      }
    }
    const paint = () => {
      const s = spot.current
      const el = preview.current
      if (!s || !el) return
      const { height: h } = sizes.current
      // The first placement is instant (it must not glide in from a corner).
      if (!el.dataset.placed) {
        el.dataset.placed = '1'
        el.style.transition = 'none'
        requestAnimationFrame(() =>
          requestAnimationFrame(() => (el.style.transition = '')),
        )
      }
      el.style.transform = `translate3d(${s.left}px, ${s.top}px, 0)`
      el.style.visibility = 'visible'
      const b = bar.current
      if (b) {
        const left = Math.max(8, Math.min(s.left, window.innerWidth - 8 - 100))
        const below = s.top + h + 56 < window.innerHeight
        const top = below ? s.top + h + 8 : Math.max(60, s.top - 58)
        b.style.transform = `translate3d(${left}px, ${top}px, 0)`
        b.style.visibility = 'visible'
      }
    }
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (document.hidden) return
      const g = gesture.current
      if (g?.kind === 'move') {
        const sc = scroller()
        if (sc) {
          const r = sc.getBoundingClientRect()
          sc.scrollTop += autoScrollStep(pointer.current.y, r.top, r.bottom)
        }
        spot.current = clampSpot(
          pointer.current.x - g.dx,
          pointer.current.y - g.dy,
        )
        const p = posUnder(pointer.current.x, pointer.current.y)
        if (p !== null && !fillId) setPos((old) => (old === p ? old : p))
      } else if (!g && sizes.current.width > 0) {
        const { width: w, align: al } = sizes.current
        const pr = page()?.getBoundingClientRect()
        const gap =
          editor.domElement?.querySelector<HTMLElement>('[data-place-gap]')
        const top = gap
          ? gap.getBoundingClientRect().top
          : (blockEl(anchorId)?.getBoundingClientRect().bottom ?? null)
        if (pr && top !== null) {
          const left =
            al === 'center'
              ? pr.left + (pr.width - w) / 2
              : al === 'right'
                ? pr.right - w
                : pr.left
          spot.current = clampSpot(left, top + 4)
        }
      }
      paint()
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const place = () => {
    const v = editor.prosemirrorView
    const opts: Parameters<PlacementAsk['onPlace']>[0] = {
      width: resized ? width : undefined,
      align,
    }
    if (!fillId && pos !== null && v) {
      const where = dropSpot(v.state.doc, pos)
      if (where?.kind === 'split') {
        // Like pressing Enter at the drop point: words before stay above,
        // the picture goes between, words after continue below.
        try {
          v.dispatch(v.state.tr.split(where.pos, 2))
        } catch {
          // Could not split: the picture goes after the line instead.
        }
        opts.afterId = where.blockId
      } else if (where?.kind === 'before') opts.beforeId = where.blockId
      else if (where?.kind === 'after') opts.afterId = where.blockId
    }
    if (!fillId && !opts.afterId && !opts.beforeId) opts.afterId = anchorId
    setPlacementGap(editor as never, null)
    endPlacement()
    ask.onPlace(opts)
  }
  const cancel = () => {
    setPlacementGap(editor as never, null)
    endPlacement()
  }

  // Enter places, Esc cancels (before the page sees the key). Only these.
  const latest = useRef({ place, cancel })
  useEffect(() => {
    latest.current = { place, cancel }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        latest.current.place()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        latest.current.cancel()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
  const ready = width > 0
  useEffect(() => {
    if (ready) box.current?.focus({ preventScroll: true })
  }, [ready])

  if (width === 0) {
    return createPortal(
      <img src={url} alt="" onLoad={onLoad} className="hidden" />,
      document.body,
    )
  }

  const down = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    const s = spot.current ?? { left: 0, top: 0 }
    pointer.current = { x: e.clientX, y: e.clientY }
    gesture.current = {
      kind: 'move',
      dx: e.clientX - s.left,
      dy: e.clientY - s.top,
      // Nothing jumps to the next sheet while it is dragged.
      release: holdPagination(),
    }
    setDragging(true)
  }
  const corner = (c: Corner) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    gesture.current = {
      kind: 'size',
      corner: c,
      x: e.clientX,
      y: e.clientY,
      width,
    }
  }
  const move = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g) return
    if (g.kind === 'move') {
      pointer.current = { x: e.clientX, y: e.clientY }
    } else {
      const max = cap()
      setResized(true)
      const w = resizedWidth(
        g.width,
        g.corner,
        e.clientX - g.x,
        e.clientY - g.y,
        max,
        align === 'center',
      )
      if (w >= max) sizeHint()
      setWidth(w)
    }
  }
  const up = (e: React.PointerEvent) => {
    const g = gesture.current
    gesture.current = null
    if (g?.kind === 'move') {
      g.release()
      // The side it was dropped on.
      const pr = page()?.getBoundingClientRect()
      if (pr) {
        const third = (e.clientX - pr.left) / Math.max(1, pr.width)
        setAlign(third < 0.34 ? 'left' : third > 0.66 ? 'right' : 'center')
      }
    }
    setDragging(false)
  }

  return createPortal(
    <div
      ref={box}
      tabIndex={-1}
      data-chrome
      data-picture-placement
      role="group"
      aria-label={t('pic.place.label')}
      className="contents"
    >
      <div
        ref={preview}
        className={
          'fixed top-0 left-0 z-[var(--z-popup)] touch-none rounded-md outline-2 outline-dashed outline-accent ' +
          (dragging
            ? ''
            : 'transition-transform duration-150 ease-out motion-reduce:transition-none')
        }
        style={{
          width,
          height,
          visibility: 'hidden',
          willChange: 'transform',
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        data-picture-preview
      >
        <img
          src={url}
          alt=""
          draggable={false}
          onLoad={onLoad}
          className="size-full cursor-grab rounded-md object-fill opacity-95 shadow-lg select-none"
        />
        {CORNERS.map((c) => (
          <button
            key={c}
            type="button"
            tabIndex={-1}
            data-preview-handle={c}
            aria-label={t(LABEL[c])}
            onPointerDown={corner(c)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            className="absolute grid size-11 touch-none place-items-center"
            style={{
              left: c.endsWith('e') ? '100%' : 0,
              top: c.startsWith('s') ? '100%' : 0,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span className="size-3.5 rounded-full border-2 border-accent bg-bg" />
          </button>
        ))}
      </div>
      <div
        ref={bar}
        className="fixed top-0 left-0 z-[var(--z-popup)] flex gap-1 rounded-2xl border border-ink-soft bg-bg p-1 shadow-[0_10px_28px_rgba(0,0,0,0.2)]"
        style={{ visibility: 'hidden' }}
      >
        <button
          type="button"
          data-place="ok"
          aria-label={t('pic.place.ok')}
          onClick={place}
          className="grid min-h-11 min-w-11 place-items-center rounded-xl bg-accent text-white"
        >
          <Icon name="check" />
        </button>
        <button
          type="button"
          data-place="cancel"
          aria-label={t('pic.place.cancel')}
          onClick={cancel}
          className="grid min-h-11 min-w-11 place-items-center rounded-xl text-ink hover:bg-hover"
        >
          <Icon name="close" />
        </button>
      </div>
    </div>,
    document.body,
  )
}
