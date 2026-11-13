import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useShowHelp } from './useShowHelp'
import { t } from '../i18n/t'
import { useLongPress } from '../app/useLongPress'
import {
  lineText,
  tipExample,
  tipImage,
  tipMeaning,
  type HelpLineId,
  type TipId,
} from './helpRegistry'

/**
 * Help that follows Settings › Show help: `Tip` wraps a feature with a
 * hover tip (a plain one-line meaning plus a short example; on touch
 * screens a small ⓘ opens it), and `HelpLine` is a short line of help
 * shown under a feature that is harder to learn. With Show help off,
 * both disappear.
 */

/**
 * True while the last key pressed was Tab. A tip opens on keyboard focus
 * only then: a button focused by the app itself (like "Show answer") or
 * after a shortcut key must not pop a tip open.
 */
let tabbing = false
if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (e) => (tabbing = e.key === 'Tab'), true)
  document.addEventListener('pointerdown', () => (tabbing = false), true)
}

/** Every kind of toast on screen (app, shell and shared stack). */
const TOAST_SELECTOR = '[data-toast], [data-testid="shell-toast"], .fb-toast'

/** Wait before a hover tip appears (like a desktop app's tooltips). */
const HOVER_DELAY_MS = 450

export function Tip({
  id,
  children,
  className = 'inline-flex items-center gap-0.5',
  touchInfo = true,
  hold: holdTip = true,
}: {
  id: TipId
  children: ReactNode
  /** Layout of the wrapper (it is a span). */
  className?: string
  /**
   * Show the ⓘ on touch screens. Off for small icon buttons in lists (an ⓘ
   * beside every icon would crowd them): those keep the hover tip only.
   */
  touchInfo?: boolean
  /** Touch: press and hold shows the tip (off where the press has another job). */
  hold?: boolean
}) {
  const on = useShowHelp()
  // Off: keep the same wrapper, so the layout does not change.
  if (!on) return <span className={className}>{children}</span>
  return (
    <TipBox
      id={id}
      className={className}
      touchInfo={touchInfo}
      holdTip={holdTip}
    >
      {children}
    </TipBox>
  )
}

function TipBox({
  id,
  children,
  className,
  touchInfo,
  holdTip,
}: {
  id: TipId
  children: ReactNode
  className: string
  touchInfo: boolean
  holdTip: boolean
}) {
  // Where the feature is while its tip is open (null = closed).
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const open = anchor !== null
  const box = useRef<HTMLSpanElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const bubbleId = useId()
  const hideTimer = useRef<number | undefined>(undefined)

  // Touch: press and hold an icon to read its tip. The tap that follows the
  // hold is swallowed (so the action does not run) and the tip fades alone.
  const { onPointerLeave: endHold, ...hold } = useLongPress(() => {
    setAnchor(box.current?.getBoundingClientRect() ?? null)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setAnchor(null), 3000)
  })

  useEffect(
    () => () => {
      window.clearTimeout(timer.current)
      window.clearTimeout(hideTimer.current)
    },
    [],
  )
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setAnchor(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAnchor(null)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const show = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(
      () => setAnchor(box.current?.getBoundingClientRect() ?? null),
      HOVER_DELAY_MS,
    )
  }
  const hide = () => {
    window.clearTimeout(timer.current)
    setAnchor(null)
  }

  return (
    <span
      ref={box}
      className={className}
      data-tip={id}
      // A mouse hovers; touch uses the ⓘ button (a long press would also
      // fire these, so only mouse and pen count).
      onPointerEnter={(e) => e.pointerType !== 'touch' && show()}
      onPointerLeave={(e) => {
        endHold()
        if (e.pointerType !== 'touch') hide()
      }}
      onFocus={() => tabbing && show()}
      onBlur={hide}
      aria-describedby={open ? bubbleId : undefined}
      data-tip-hold={!touchInfo && holdTip ? true : undefined}
      {...(!touchInfo && holdTip ? hold : {})}
    >
      {children}
      {touchInfo && (
        <button
          type="button"
          aria-label={t('help.info')}
          aria-expanded={open}
          onClick={() =>
            setAnchor(
              open ? null : (box.current?.getBoundingClientRect() ?? null),
            )
          }
          className="tip-info"
        >
          ⓘ
        </button>
      )}
      {anchor && <Bubble id={id} bubbleId={bubbleId} box={anchor} />}
    </span>
  )
}

/**
 * The tip itself, in the page body (a portal) and fixed next to the feature,
 * so no scroll box, sidebar edge or transform can cut it. After drawing it is
 * moved back inside the window if any side would be cut off.
 */
function Bubble({
  id,
  bubbleId,
  box,
}: {
  id: TipId
  bubbleId: string
  box: DOMRect
}) {
  const el = useRef<HTMLSpanElement>(null)
  const width = Math.min(280, window.innerWidth - 16)
  const left = Math.max(8, Math.min(box.left, window.innerWidth - width - 8))
  const below = window.innerHeight - box.bottom
  const up = below < 160 && box.top > below
  const style = up
    ? { left, width, bottom: window.innerHeight - box.top + 6 }
    : { left, width, top: box.bottom + 6 }
  // Keep the whole bubble on screen (flip/shift after it has a size).
  useLayoutEffect(() => {
    const node = el.current
    if (!node) return
    const r = node.getBoundingClientRect()
    const vh = window.innerHeight
    const vw = window.innerWidth
    if (r.bottom > vh - 8 && box.top - 6 - r.height >= 8) {
      node.style.top = `${box.top - 6 - r.height}px`
      node.style.bottom = 'auto'
    } else if (r.top < 8 && box.bottom + 6 + r.height <= vh - 8) {
      node.style.top = `${box.bottom + 6}px`
      node.style.bottom = 'auto'
    }
    const r2 = node.getBoundingClientRect()
    if (r2.bottom > vh - 8) {
      node.style.top = `${Math.max(8, vh - 8 - r2.height)}px`
      node.style.bottom = 'auto'
    } else if (r2.top < 8) {
      node.style.top = '8px'
      node.style.bottom = 'auto'
    }
    if (r2.right > vw - 8)
      node.style.left = `${Math.max(8, vw - 8 - r2.width)}px`
    else if (r2.left < 8) node.style.left = '8px'
  }, [box, up])
  // Gate 3 v5 (slice 6, fix 4): a tip and a toast never share a spot. The
  // toast is the feedback, so while one covers the tip the tip steps aside.
  useEffect(() => {
    const node = el.current
    if (!node) return
    const check = () => {
      const r = node.getBoundingClientRect()
      const hit = Array.from(document.querySelectorAll(TOAST_SELECTOR)).some(
        (n) => {
          const b = n.getBoundingClientRect()
          return (
            b.width > 0 &&
            r.left < b.right &&
            b.left < r.right &&
            r.top < b.bottom &&
            b.top < r.bottom
          )
        },
      )
      node.style.visibility = hit ? 'hidden' : ''
    }
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [box])
  const image = tipImage(id)
  return createPortal(
    <span
      ref={el}
      role="tooltip"
      id={bubbleId}
      style={style}
      className="pointer-events-none fixed z-[70] block rounded-lg border border-line bg-bg p-2.5 text-start text-[12.5px] font-normal leading-snug whitespace-normal text-ink shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
    >
      {image && <img src={image} alt="" className="mb-2 w-full rounded-md" />}
      <span className="block font-medium">{tipMeaning(id)}</span>
      <span className="mt-1 block text-muted">
        {t('help.example', { text: tipExample(id) })}
      </span>
    </span>,
    document.body,
  )
}

/** A short line of help under a feature; marked so it can be reviewed. */
export function HelpLine({
  id,
  className = 'mt-2 text-xs text-muted',
}: {
  id: HelpLineId
  className?: string
}) {
  const on = useShowHelp()
  if (!on) return null
  return (
    <p data-help-line={id} className={className}>
      {lineText(id)}
    </p>
  )
}
