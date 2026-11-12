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
  const start = useRef<{ x: number; y: number; head: boolean } | null>(null)
  useLayoutEffect(() => {
    closeRef.current = onClose
  })

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    const ms = motionMs(OUT_MS)
    if (ms === 0) closeRef.current()
    else setTimeout(() => closeRef.current(), ms)
  }, [])

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
    const docked = sheetDocks()
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
  }, [mode, id, props.opener, requestClose])

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
  const card = (
    <div
      ref={ref}
      className="fb-sheet"
      data-mode={mode}
      data-phone={props.phone ? '' : undefined}
      data-closing={closing ? '' : undefined}
      data-testid={props['data-testid'] ?? `fb-sheet${sfx}`}
      role="dialog"
      aria-modal={mode === 'floating' && !sheetDocks() ? 'true' : undefined}
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={() => (start.current = null)}
    >
      <span className="fb-sheet__grab" aria-hidden="true" />
      <header className="fb-sheet__head">
        <h2 id={`${id}-title`} className="fb-sheet__title">
          {title}
        </h2>
        <button
          type="button"
          className="fb-x"
          aria-label={tf('parts.fb.close')}
          data-testid={`fb-sheet-close${sfx}`}
          onClick={requestClose}
        >
          <Icon name="close" size={16} />
        </button>
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
  return mode === 'inline' ? card : createPortal(card, document.body)
}
