import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../app/tools/icons'
import {
  createOverlayManager,
  openInTopLayer,
  stackPositions,
  type OverlayHandle,
  type ToastItem,
} from '../../app/overlay'
import { type Toasts } from './toastLogic'
import { tf } from './textFeedback'
import './ToastStack.css'

/**
 * Toasts take the top layer but never join the real overlay manager: Esc and
 * outside taps belong to the dialog or sheet under them. A private manager
 * with no listeners gives them `openInTopLayer` alone.
 */
const toastLayer = createOverlayManager({
  onEscape: () => () => {},
  onPointerDown: () => () => {},
  onBackground: () => () => {},
})
const openToastLayer = (el: HTMLElement): OverlayHandle =>
  openInTopLayer(el, { id: 'toasts', layer: 'toast' }, toastLayer)

const AVOID_SELECTOR =
  '[data-toast-avoid], .fb-sheet[data-mode="floating"] .fb-sheet__foot, .fb-dialog-layer .fb-dialog__foot, h1'
const GAP = 8
const MARGIN = 16

/**
 * Where each toast goes: bottom centre, 16 px above the safe area, 8 px
 * apart, and moved up out of the way of any title, sheet footer or dialog.
 */
function layout(els: HTMLElement[], avoid: Element[]): number[] {
  const vw = document.documentElement.clientWidth
  const vh = window.innerHeight
  const heights = els.map((e) => e.offsetHeight)
  const width = Math.min(420, vw - 2 * MARGIN)
  const rects = avoid
    .map((a) => a.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
    }))
  return stackPositions(heights, { width: vw, height: vh }, rects, {
    width,
    margin: MARGIN,
    gap: GAP,
  })
}

/** The stack at the bottom centre (SP-54, SP-55). A polite live region, up to 3 toasts. */
export function ToastStack({
  toasts,
  mode = 'floating',
}: {
  toasts: Toasts
  mode?: 'floating' | 'inline'
}) {
  const { queue } = toasts
  const [items, setItems] = useState<readonly ToastItem[]>(() => [
    ...queue.visible(),
  ])
  useEffect(() => {
    const sync = () => setItems([...queue.visible()])
    sync()
    return queue.subscribe(sync)
  }, [queue])
  const regionRef = useRef<HTMLDivElement | null>(null)
  const refs = useRef(new Map<number, HTMLElement>())
  const [tops, setTops] = useState<number[]>([])
  const seen = useRef(0)
  const itemsRef = useRef(items)
  useLayoutEffect(() => {
    itemsRef.current = items
  })

  const layerRef = useRef<OverlayHandle | null>(null)
  useEffect(() => {
    const el = regionRef.current
    if (mode !== 'floating' || !el) return
    layerRef.current = openToastLayer(el)
    return () => {
      layerRef.current?.close()
      layerRef.current = null
    }
  }, [mode])

  // A new toast must sit above a dialog that opened before it (open again = raised).
  useLayoutEffect(() => {
    const el = regionRef.current
    if (
      mode === 'floating' &&
      el &&
      items.length > seen.current &&
      layerRef.current
    )
      layerRef.current = openToastLayer(el)
    seen.current = items.length
  }, [items.length, mode])

  // Place the toasts; again when the screen or the things to avoid change.
  useLayoutEffect(() => {
    if (mode !== 'floating') return
    let frame = 0
    const place = () => {
      frame = 0
      const els = itemsRef.current
        .map((t) => refs.current.get(t.id))
        .filter((e): e is HTMLElement => !!e)
      if (els.length !== itemsRef.current.length) return
      const avoid = Array.from(
        document.querySelectorAll(AVOID_SELECTOR),
      ).filter((a) => !regionRef.current?.contains(a))
      const next = layout(els, avoid)
      setTops((old) =>
        old.length === next.length && old.every((v, i) => v === next[i])
          ? old
          : next,
      )
    }
    const later = () => {
      if (!frame) frame = requestAnimationFrame(place)
    }
    place()
    // a sheet that is still sliding in moves its footer: place again once it stops
    const settle = setTimeout(place, 300)
    const size = new ResizeObserver(later)
    size.observe(document.documentElement)
    const dom = new MutationObserver((list) => {
      if (list.some((m) => !regionRef.current?.contains(m.target))) later()
    })
    dom.observe(document.body, { childList: true, subtree: true })
    return () => {
      clearTimeout(settle)
      size.disconnect()
      dom.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [items, mode])

  const sfx = mode === 'inline' ? '-inline' : ''
  const region = (
    <div
      ref={regionRef}
      className="fb-toasts"
      data-mode={mode}
      role="status"
      aria-live="polite"
      aria-label={tf('parts.fb.toasts')}
      data-testid={`fb-toasts${sfx}`}
    >
      {items.map((t, i) => {
        const kind = toasts.kindOf(t.id)
        return (
          <div
            key={t.id}
            ref={(el) => {
              if (el) refs.current.set(t.id, el)
              else refs.current.delete(t.id)
            }}
            className="fb-toast"
            data-kind={kind}
            data-testid={`fb-toast${sfx}`}
            style={
              mode === 'floating' && tops[i] !== undefined
                ? { top: tops[i], bottom: 'auto' }
                : undefined
            }
            onPointerEnter={() => toasts.hold(t.id, true)}
            onPointerLeave={() => toasts.hold(t.id, false)}
            onFocus={() => toasts.hold(t.id, true)}
            onBlur={() => toasts.hold(t.id, false)}
          >
            <span className="fb-toast__icon" aria-hidden="true">
              {kind === 'problem' ? '!' : <Icon name="check" size={16} />}
            </span>
            <span className="fb-toast__text">{t.message}</span>
            {kind === 'undo' ? (
              <button
                type="button"
                className="fb-toast__undo"
                data-testid={`fb-toast-undo${sfx}`}
                onClick={() => toasts.undo(t.id)}
              >
                {tf('parts.fb.undo')}
              </button>
            ) : null}
            {kind === 'problem' ? (
              <button
                type="button"
                className="fb-x fb-toast__x"
                aria-label={tf('parts.fb.dismiss')}
                data-testid={`fb-toast-x${sfx}`}
                onClick={() => toasts.dismiss(t.id)}
              >
                <Icon name="close" size={14} />
              </button>
            ) : null}
          </div>
        )
      })}
    </div>
  )
  return mode === 'inline' ? region : createPortal(region, document.body)
}
