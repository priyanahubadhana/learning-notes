import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useFlag } from '../../app/flags'
import { useFrameSize } from '../../app/shell/useFrameSize'
import { Icon } from '../../app/tools/icons'
import { openInTopLayer, trapFocus } from '../../app/overlay'
import { motionMs } from './motion'
import { tf } from './textFeedback'
import './Sheet.css'

const OUT_MS = 180

/** The sheet docks beside the page from this width up; below it, it fills the screen. */
const SHEET_DOCK_MIN = 1024
const sheetDocks = (width = window.innerWidth) => width >= SHEET_DOCK_MIN
const SWIPE = 80

export interface SheetProps {
  title: string
  /** A grey line under the title (the page and its notebook). */
  subtitle?: string
  /**
   * A choice sheet that changes something: ✕ sits at the top left (leave without
   * changes) and ✓ at the top right (keep). Only in the new frame.
   */
  confirm?: { label: string; onConfirm(): void }
  children?: ReactNode
  footer?: ReactNode
  /** Called after the closing motion, for ✕, Esc or a swipe. */
  onClose(): void
  /** `floating` opens in the top layer through the overlay manager; `inline` just draws it (gallery, tests). */
  mode?: 'floating' | 'inline'
  /** Inline only: draw the full-screen phone shape. */
  phone?: boolean
  /** The button that opened it; focus returns here. */
  opener?: HTMLElement | null
  id?: string
  'data-testid'?: string
}

/**
 * Sheet (SP-50, SP-51): docked right at full height on iPad / PC, full screen
 * on a phone. Header with title and the close button, a body that scrolls, an
 * optional footer. Swipe right (down on a phone) closes. Docked, the page
 * beside it keeps working; full screen, focus stays inside.
 */
export function Sheet(props: SheetProps) {
  const { mode = 'floating', title, children, footer, onClose } = props
  const autoId = useId()
  const id = props.id ?? `fbsheet-${autoId}`
  const ref = useRef<HTMLDivElement | null>(null)
  const [closing, setClosing] = useState(false)
  const closeRef = useRef(onClose)
  const closingRef = useRef(false)
  // New frame (P1.9 T4/T21/T22): the sheet starts below the top bar, one fixed
  // size, over a dim that covers only the page area; the first outside tap closes it.
  const shell = useFlag('foundation.shell') && mode === 'floating'
  const scrimRef = useRef<HTMLDivElement | null>(null)
  // A turned screen moves the top bar: place the sheet again (no raw listener).
  const frame = useFrameSize()
  const start = useRef<{ x: number; y: number; head: boolean } | null>(null)
  useLayoutEffect(() => {
    closeRef.current = onClose
  })

  useLayoutEffect(() => {
    if (!shell) return
    const place = () => {
      const bar = document
        .querySelector('header[data-shell-top]')
        ?.getBoundingClientRect()
      for (const el of [ref.current, scrimRef.current]) {
        if (!el) continue
        el.style.setProperty(
          '--fb-sheet-top',
          `${Math.round((bar?.bottom ?? 0) + 8)}px`,
        )
        el.style.setProperty(
          '--fb-scrim-top',
          `${Math.round(bar?.bottom ?? 0)}px`,
        )
        el.style.setProperty(
          '--fb-scrim-left',
          `${Math.round(bar?.left ?? 0)}px`,
        )
      }
    }
    place()
  }, [shell, frame.width, frame.height])

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    const ms = motionMs(OUT_MS)
    if (ms === 0) closeRef.current()
    else setTimeout(() => closeRef.current(), ms)
  }, [])

  useEffect(() => {
    const scrim = scrimRef.current
    if (!shell || !scrim) return
    try {
      scrim.showPopover()
    } catch {
      // No popover support: the scrim is a plain fixed layer.
    }
    return () => {
      try {
        scrim.hidePopover()
      } catch {
        // Already hidden.
      }
    }
  }, [shell])

  useEffect(() => {
    if (mode !== 'floating') return
    const el = ref.current
    if (!el) return
    let live = true
    const opener =
      props.opener ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null)
    // With the dim over the page, a tap beside the sheet is an outside tap.
    const docked = sheetDocks() && !shell
    const handle = openInTopLayer(el, {
      id,
      layer: 'sheet',
      onClose: () => {
        if (live) requestClose()
      },
      // Docked: a tap on the page beside it does not close it.
      inside: (n) => docked || !!(n as Element).closest?.('.fb-toasts'),
      opener,
    })
    const release = docked ? null : trapFocus(el, opener)
    el.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    if (!el.contains(document.activeElement)) el.focus()
    return () => {
      live = false
      if (release) release()
      else opener?.focus()
      handle.close()
    }
  }, [mode, id, props.opener, requestClose, shell])

  const down = (e: RPointerEvent) => {
    const head = !!(e.target as HTMLElement).closest('.fb-sheet__head')
    start.current = { x: e.clientX, y: e.clientY, head }
  }
  const up = (e: RPointerEvent) => {
    const s = start.current
    start.current = null
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (dx > SWIPE && Math.abs(dy) < dx / 2) requestClose()
    else if (s.head && dy > SWIPE && Math.abs(dx) < dy / 2) requestClose()
  }

  const sfx = mode === 'inline' ? '-inline' : ''
  const closeButton = (
    <button
      type="button"
      className="fb-x"
      aria-label={tf('parts.fb.close')}
      data-testid={`fb-sheet-close${sfx}`}
      onClick={requestClose}
    >
      <Icon name="close" size={16} />
    </button>
  )
  const card = (
    <div
      ref={ref}
      className="fb-sheet"
      data-mode={mode}
      data-phone={props.phone ? '' : undefined}
      data-closing={closing ? '' : undefined}
      data-shell={shell ? '' : undefined}
      data-testid={props['data-testid'] ?? `fb-sheet${sfx}`}
      role="dialog"
      aria-modal={
        mode === 'floating' && (!sheetDocks() || shell) ? 'true' : undefined
      }
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={() => (start.current = null)}
    >
      <span className="fb-sheet__grab" aria-hidden="true" />
      <header
        className="fb-sheet__head"
        data-confirm={props.confirm ? '' : undefined}
      >
        {props.confirm && closeButton}
        <div className="fb-sheet__heading">
          <h2 id={`${id}-title`} className="fb-sheet__title">
            {title}
          </h2>
          {props.subtitle ? (
            <p className="fb-sheet__sub" data-testid={`fb-sheet-sub${sfx}`}>
              {props.subtitle}
            </p>
          ) : null}
        </div>
        {props.confirm ? (
          <button
            type="button"
            className="fb-x fb-ok"
            aria-label={props.confirm.label}
            data-testid={`fb-sheet-ok${sfx}`}
            onClick={props.confirm.onConfirm}
          >
            <Icon name="check" size={18} />
          </button>
        ) : (
          closeButton
        )}
      </header>
      <div className="fb-sheet__body" data-testid={`fb-sheet-body${sfx}`}>
        {children}
      </div>
      {footer ? (
        <footer className="fb-sheet__foot" data-testid={`fb-sheet-foot${sfx}`}>
          {footer}
        </footer>
      ) : null}
    </div>
  )
  return mode === 'inline'
    ? card
    : createPortal(
        <>
          {shell && (
            <div
              ref={scrimRef}
              popover="manual"
              className="fb-sheet-scrim"
              data-testid="fb-sheet-scrim"
              aria-hidden="true"
            />
          )}
          {card}
        </>,
        document.body,
      )
}
