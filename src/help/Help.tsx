import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useShowHelp } from './useShowHelp'
import { t } from '../i18n/t'
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

/** Wait before a hover tip appears (like a desktop app's tooltips). */
const HOVER_DELAY_MS = 450

export function Tip({
  id,
  children,
  className = 'inline-flex items-center gap-0.5',
  touchInfo = true,
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
}) {
  const on = useShowHelp()
  if (!on) return <>{children}</>
  return (
    <TipBox id={id} className={className} touchInfo={touchInfo}>
      {children}
    </TipBox>
  )
}

function TipBox({
  id,
  children,
  className,
  touchInfo,
}: {
  id: TipId
  children: ReactNode
  className: string
  touchInfo: boolean
}) {
  // Where the feature is while its tip is open (null = closed).
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const open = anchor !== null
  const box = useRef<HTMLSpanElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const bubbleId = useId()

  useEffect(() => () => window.clearTimeout(timer.current), [])
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
      onPointerLeave={(e) => e.pointerType !== 'touch' && hide()}
      onFocus={show}
      onBlur={hide}
      aria-describedby={open ? bubbleId : undefined}
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

/** The tip itself, fixed next to the feature (so scroll boxes never cut it). */
function Bubble({
  id,
  bubbleId,
  box,
}: {
  id: TipId
  bubbleId: string
  box: DOMRect
}) {
  const width = Math.min(280, window.innerWidth - 16)
  const left = Math.max(8, Math.min(box.left, window.innerWidth - width - 8))
  const below = window.innerHeight - box.bottom
  const up = below < 160 && box.top > below
  const style = up
    ? { left, width, bottom: window.innerHeight - box.top + 6 }
    : { left, width, top: box.bottom + 6 }
  const image = tipImage(id)
  return (
    <span
      role="tooltip"
      id={bubbleId}
      style={style}
      className="fixed z-40 block rounded-lg border border-line bg-bg p-2.5 text-start text-[12.5px] font-normal leading-snug whitespace-normal text-ink shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
    >
      {image && <img src={image} alt="" className="mb-2 w-full rounded-md" />}
      <span className="block font-medium">{tipMeaning(id)}</span>
      <span className="mt-1 block text-muted">
        {t('help.example', { text: tipExample(id) })}
      </span>
    </span>
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
