import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { CardCtx, focusTarget } from './cardPick'
import {
  LAYERS,
  overlay,
  trapFocus,
  type OverlayHandle,
} from '../../app/overlay'
import { Icon } from '../../app/tools/icons'
import { useFootLift } from '../../app/spaces/footLift'
import { useFlag } from '../../app/flags'
import { motionMs } from './motion'
import { ScrollBar } from './ScrollBar'
import { tp } from './tp'
import { useAnchoredCard, usePhone } from './useAnchoredCard'
import './Card.css'

export type CardCloseReason = 'x' | 'esc' | 'outside' | 'pick'
type RectLike = { left: number; top: number; width: number; height: number }

export type CardProps = {
  /** The ▾ that opened it; null = centred sheet. */
  anchor: HTMLElement | RectLike | null
  size: 'pick' | 'panel'
  title: string
  onClose(reason: CardCloseReason): void
  /** Drill-in arrow (never a card from a card). */
  back?: () => void
  /** Pick cards close 190 ms after a choice (tiles call `useCardPick()`). */
  autoClose?: boolean
  children: ReactNode
  footer?: ReactNode
  /** Skeleton wells instead of the body. */
  loading?: boolean
  /** Replays the open motion when it changes (switching view in the card). */
  viewKey?: string | number
  /** `static` draws the frame in place (gallery cells); no overlay, no focus trap. */
  placement?: 'anchored' | 'static'
  /** Rect the card keeps clear of (the selected picture); read at each placement. */
  avoid?: () => RectLike | null
  /** Force the phone sheet look (gallery cell). */
  phone?: boolean
  testId?: string
}

const WIDTH = { pick: 304, panel: 376 } as const

export function Card(props: CardProps) {
  const {
    anchor,
    size,
    title,
    onClose,
    back,
    autoClose,
    children,
    footer,
    loading,
    viewKey,
    placement = 'anchored',
    testId,
  } = props
  const isStatic = placement === 'static'
  const phone = usePhone() || !!props.phone
  const rootRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  // New app frame (SC-01): a card that scrolls shows the shared bar at rest.
  const shell = useFlag('foundation.shell')
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null)
  useEffect(() => setBodyEl(bodyRef.current), [])
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const [closing, setClosing] = useState(false)
  const [picked, setPicked] = useState(false)
  const [fade, setFade] = useState(false)
  // true once the open motion has finished (at once when there is none)
  const [settled, setSettled] = useState(false)
  const closingRef = useRef(false)
  const reasonRef = useRef<CardCloseReason>('outside')
  const handleRef = useRef<OverlayHandle | null>(null)
  const releaseRef = useRef<() => void>(() => {})
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onCloseRef = useRef(onClose)
  const anchorRef = useRef(anchor)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
    anchorRef.current = anchor
  })

  const request = useCallback((reason: CardCloseReason) => {
    if (closingRef.current) return
    closingRef.current = true
    reasonRef.current = reason
    setClosing(true)
    handleRef.current?.close()
    // Why: the closing motion is only a picture. Keys pressed while it plays
    // (CI run 43505401817) were pulled back into the fading card by its Tab
    // trap, and a tap into the text (CI run 43478875272) was undone by a late
    // focus hand-back. So the trap ends and focus goes back to the chip now,
    // and only if it is still in the card or nowhere.
    releaseRef.current()
    const now = document.activeElement
    const free =
      !now || now === document.body || !!rootRef.current?.contains(now)
    const a = anchorRef.current
    if (reason !== 'outside' && free && a instanceof HTMLElement) a.focus()
    timerRef.current = setTimeout(
      () => onCloseRef.current(reason),
      motionMs(130),
    )
  }, [])

  // Overlay: one card at a time; Esc and a tap outside close it.
  useEffect(() => {
    if (isStatic) return
    closingRef.current = false
    const el = rootRef.current
    const opener =
      anchorRef.current instanceof HTMLElement ? anchorRef.current : null
    handleRef.current = overlay.open({
      id: 'card',
      layer: phone ? 'sheet' : 'card',
      opener,
      close: () => request(reasonRef.current),
      inside: (t) => !!el && el.contains(t),
    })
    const release = el ? trapFocus(el, null) : () => {}
    releaseRef.current = release
    if (el) focusTarget(el).focus()
    return () => {
      closingRef.current = true
      clearTimeout(timerRef.current)
      release()
      handleRef.current?.close()
      handleRef.current = null
    }
  }, [isStatic, phone, request])

  // BUG-006: with the keyboard up the card stays inside what can be seen.
  const footLift = useFootLift()
  const pos = useAnchoredCard({
    footLift,
    anchor,
    card: node,
    widthPx: WIDTH[size],
    active: !isStatic && !phone && !!anchor,
    avoid: props.avoid,
  })

  // A floating card is hidden until positioned, and a hidden element cannot
  // take focus, so focus again once it is visible (SP-14).
  const placed = !!pos
  useEffect(() => {
    if (isStatic || !placed || closingRef.current) return
    const el = rootRef.current
    if (!el || el.contains(document.activeElement)) return
    focusTarget(el).focus()
  }, [isStatic, placed])

  // The bottom edge fades while there is more to scroll.
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const update = () =>
      setFade(body.scrollHeight - body.scrollTop - body.clientHeight > 4)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(body)
    if (body.firstElementChild) ro.observe(body.firstElementChild)
    return () => ro.disconnect()
  }, [loading, viewKey, children])

  const pick = useCallback(() => {
    if (!autoClose || picked) return
    setPicked(true)
    timerRef.current = setTimeout(() => request('pick'), motionMs(190))
  }, [autoClose, picked, request])

  const floating = !isStatic && !phone
  const style: CSSProperties & Record<string, string | number | undefined> =
    isStatic
      ? { position: 'relative' }
      : phone
        ? { zIndex: LAYERS.sheet }
        : {
            zIndex: LAYERS.card,
            left: pos?.left ?? 0,
            top: pos?.top ?? 0,
            width: pos?.width,
            visibility: pos ? 'visible' : 'hidden',
            maxHeight: footLift
              ? Math.max(160, window.innerHeight - footLift - 24)
              : undefined,
          }
  if (floating && pos?.arrowX != null) style['--arrow-x'] = `${pos.arrowX}px`
  const side = floating ? (pos?.side ?? 'below') : 'below'
  const arrow = isStatic ? !phone : floating && pos?.arrowX != null

  const card = (
    <CardCtx.Provider value={{ pick }}>
      <div
        ref={(el) => {
          rootRef.current = el
          setNode(el)
          if (el && getComputedStyle(el).animationName === 'none')
            setSettled(true)
        }}
        className="pcard"
        role="dialog"
        aria-label={title}
        data-testid={testId ?? 'pcard'}
        data-size={size}
        data-phone={phone || undefined}
        data-static={isStatic || undefined}
        data-side={side}
        data-state={closing ? 'closing' : 'open'}
        data-settled={(settled && !closing) || undefined}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && !closing) setSettled(true)
        }}
        data-picked={picked || undefined}
        data-fade={fade || undefined}
        tabIndex={-1}
        style={style}
        onKeyDown={(e) => {
          if (e.key === 'Escape') reasonRef.current = 'esc'
        }}
      >
        {phone && <span className="pcard-grab" aria-hidden />}
        {arrow && <span className="pcard-arrow" aria-hidden />}
        <header className="pcard-head">
          {back && (
            <button
              type="button"
              className="pcard-x"
              aria-label={tp('parts.card.back')}
              onClick={back}
            >
              <Icon name="chevronLeft" size={18} />
            </button>
          )}
          <h2 className="pcard-title">{title}</h2>
          <button
            type="button"
            className="pcard-x"
            aria-label={tp('parts.card.close')}
            data-testid="pcard-close"
            onClick={() => request('x')}
          >
            <Icon name="close" size={16} />
          </button>
        </header>
        <div
          ref={bodyRef}
          className="pcard-body"
          data-testid="pcard-body"
          onScroll={(e) => {
            const b = e.currentTarget
            setFade(b.scrollHeight - b.scrollTop - b.clientHeight > 4)
          }}
        >
          <div
            key={viewKey}
            className="pcard-view"
            aria-busy={loading || undefined}
          >
            {loading ? <CardSkeleton /> : children}
          </div>
        </div>
        {footer && <footer className="pcard-foot">{footer}</footer>}
        {shell && <ScrollBar scroller={bodyEl} />}
      </div>
    </CardCtx.Provider>
  )
  if (isStatic) return card
  return createPortal(
    <>
      {phone && <div className="pcard-scrim" aria-hidden />}
      {card}
    </>,
    document.body,
  )
}

function CardSkeleton() {
  return (
    <div
      className="pcard-skel"
      role="status"
      aria-label={tp('parts.card.loading')}
    >
      <i />
      <i />
      <i />
    </div>
  )
}

/**
 * The ▾ that opens a card: aria-haspopup, aria-expanded, looks pressed while
 * open, and glows once when `glowKey` changes (a value was chosen).
 */
export function CardTrigger({
  open,
  label,
  onClick,
  glowKey,
  testId,
  className,
  describedBy,
  children,
}: {
  open: boolean
  label: string
  onClick: (el: HTMLButtonElement) => void
  glowKey?: number
  testId?: string
  className?: string
  /** Id of the element that describes this button. */
  describedBy?: string
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      className={`pcard-trigger ${className ?? ''}`}
      data-popup-trigger=""
      data-testid={testId}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={label}
      aria-describedby={describedBy}
      data-pressed={open || undefined}
      onClick={(e) => onClick(e.currentTarget)}
    >
      {glowKey ? (
        <span key={glowKey} className="pcard-glow" aria-hidden />
      ) : null}
      {children}
      <Icon name="chevronDown" size={16} />
    </button>
  )
}
