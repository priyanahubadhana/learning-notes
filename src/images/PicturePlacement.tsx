import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../app/tools/icons'
import { resizedWidth, CORNERS, type Corner } from '../editor/pictureResize'
import { t } from '../i18n/t'
import type { MessageKey } from '../i18n/t'
import { endPlacement, type PlacementAsk } from './pictureChooserStore'

/** What the preview needs from the editor. */
interface Host {
  domElement?: HTMLElement
  getTextCursorPosition: () => { block: { id: string } }
}

const LABEL: Record<Corner, MessageKey> = {
  nw: 'pic.resize.nw',
  ne: 'pic.resize.ne',
  sw: 'pic.resize.sw',
  se: 'pic.resize.se',
}

type Align = 'left' | 'center' | 'right'

/**
 * Placing a chosen picture (iPad fix 1): the picture shows as a preview at
 * the cursor's line, the page scrolls to it, and it can be dragged to another
 * line (it snaps under the block it is over, kept inside the page) and
 * resized by its corners. ✓ (or Enter) puts it in the page as one step;
 * ✕ (or Esc) throws it away. Nothing is added to the note before ✓.
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
  const [anchor, setAnchor] = useState<string>(
    () => ask.blockId ?? editor.getTextCursorPosition().block.id,
  )
  const [align, setAlign] = useState<Align>('left')
  const [width, setWidth] = useState(0)
  // Only a size the person chose is saved (else the picture keeps its default).
  const [resized, setResized] = useState(false)
  const [spot, setSpot] = useState<{ left: number; top: number } | null>(null)
  const [drag, setDrag] = useState<{ left: number; top: number } | null>(null)
  const gesture = useRef<
    | { kind: 'move'; dx: number; dy: number }
    | { kind: 'size'; corner: Corner; x: number; y: number; width: number }
    | null
  >(null)
  const box = useRef<HTMLDivElement>(null)

  const page = () => editor.domElement?.firstElementChild as HTMLElement | null
  const blockEl = (id: string) =>
    editor.domElement?.querySelector<HTMLElement>(
      `.bn-block[data-id="${CSS.escape(id)}"] > .bn-block-content`,
    ) ?? null

  // The first size: the picture's own, at most 60% of the page.
  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (!img.naturalWidth) return
    setRatio(img.naturalHeight / img.naturalWidth)
    const room = page()?.clientWidth ?? 600
    setWidth(Math.round(Math.max(64, Math.min(img.naturalWidth, room * 0.6))))
  }

  // Scroll the page to the place once, then follow it while the page moves.
  useEffect(() => {
    blockEl(anchor)?.scrollIntoView({ block: 'center', behavior: 'instant' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    let frame = 0
    const follow = () => {
      const p = page()
      const a = blockEl(anchor)
      if (p && a && !gesture.current) {
        const pr = p.getBoundingClientRect()
        const ar = a.getBoundingClientRect()
        const left =
          align === 'center'
            ? pr.left + (pr.width - width) / 2
            : align === 'right'
              ? pr.right - width
              : pr.left
        setSpot((old) =>
          old && old.left === left && old.top === ar.bottom + 4
            ? old
            : { left, top: ar.bottom + 4 },
        )
      }
      frame = requestAnimationFrame(follow)
    }
    follow()
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, align, width])

  const place = () => {
    endPlacement()
    ask.onPlace({
      width: resized ? width : undefined,
      afterId: ask.blockId ? undefined : anchor,
      align,
    })
  }
  const cancel = () => endPlacement()

  // Enter places, Esc cancels (before the page sees the key).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        place()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        cancel()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, anchor, align, resized])
  const ready = spot !== null
  useEffect(() => {
    if (ready) box.current?.focus({ preventScroll: true })
  }, [ready])

  const height = width * ratio
  const shown = drag ?? spot
  if (!shown || width === 0) {
    return createPortal(
      <img src={url} alt="" onLoad={onLoad} className="hidden" />,
      document.body,
    )
  }

  /** The block under a point (the picture goes under it) and the side. */
  const snap = (x: number, y: number) => {
    const p = page()
    if (!p) return
    const pr = p.getBoundingClientRect()
    const third = (x - pr.left) / Math.max(1, pr.width)
    setAlign(third < 0.34 ? 'left' : third > 0.66 ? 'right' : 'center')
    if (ask.blockId) return
    let best: string | null = null
    for (const el of editor.domElement?.querySelectorAll<HTMLElement>(
      '.bn-block[data-id]',
    ) ?? []) {
      const r = el.getBoundingClientRect()
      if (r.height && r.top <= y) best = el.getAttribute('data-id')
      if (r.top > y) break
    }
    if (best) setAnchor(best)
  }

  const down = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    gesture.current = {
      kind: 'move',
      dx: e.clientX - shown.left,
      dy: e.clientY - shown.top,
    }
    setDrag({ left: shown.left, top: shown.top })
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
      // Kept inside the page sideways.
      const pr = page()?.getBoundingClientRect()
      const left = pr
        ? Math.min(Math.max(e.clientX - g.dx, pr.left), pr.right - width)
        : e.clientX - g.dx
      setDrag({ left, top: e.clientY - g.dy })
    } else {
      const room = page()?.clientWidth ?? 4000
      setResized(true)
      setWidth(
        resizedWidth(
          g.width,
          g.corner,
          e.clientX - g.x,
          e.clientY - g.y,
          room,
          align === 'center',
        ),
      )
    }
  }
  const up = (e: React.PointerEvent) => {
    const g = gesture.current
    gesture.current = null
    if (g?.kind === 'move' && drag) snap(drag.left + width / 2, e.clientY)
    setDrag(null)
  }

  const barLeft = Math.max(8, Math.min(shown.left, window.innerWidth - 8 - 100))
  const below = shown.top + height + 56 < window.innerHeight
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
        className="fixed z-[var(--z-popup)] touch-none rounded-md outline-2 outline-dashed outline-accent"
        style={{ left: shown.left, top: shown.top, width, height }}
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
          className="size-full cursor-grab rounded-md object-fill opacity-90 shadow-lg select-none"
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
        className="fixed z-[var(--z-popup)] flex gap-1 rounded-2xl border border-ink-soft bg-bg p-1 shadow-[0_10px_28px_rgba(0,0,0,0.2)]"
        style={{
          left: barLeft,
          top: below ? shown.top + height + 8 : Math.max(60, shown.top - 58),
        }}
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
