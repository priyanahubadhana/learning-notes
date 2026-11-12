import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { overlay, placeBeside, trapFocus } from '../../app/overlay'
import { tp } from './tp'
import './SheetBase.css'

export interface SheetBaseProps {
  title: string
  children: ReactNode
  footer?: ReactNode
  /** Called for ✕, Esc and a tap outside. */
  onClose(): void
  /** `floating` opens over the page through the overlay manager; `inline` just draws the card (gallery, tests). */
  mode?: 'floating' | 'inline'
  /** Floating on a wide screen: sit beside this element. Without it the card is centred. */
  anchor?: HTMLElement | null
  /** Inline only: draw the phone shape (full height, grab bar). */
  phone?: boolean
  id?: string
  'data-testid'?: string
}

/**
 * The shared sheet (SP-02 card frame behaviour for SP-07): a card on wide
 * screens, a full-height bottom sheet under 640 px, Esc / outside tap close,
 * focus trapped and returned. Floating and focus rules come only from
 * `src/app/overlay`.
 */
export function SheetBase(props: SheetBaseProps) {
  const { mode = 'floating', title, children, footer, onClose, anchor } = props
  const autoId = useId()
  const id = props.id ?? `sheet-${autoId}`
  const ref = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef(onClose)
  useLayoutEffect(() => {
    closeRef.current = onClose
  })
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useEffect(() => {
    if (mode !== 'floating') return
    const el = ref.current
    if (!el) return
    const opener =
      anchor ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null)
    const handle = overlay.open({
      id,
      layer: 'sheet',
      close: () => closeRef.current(),
      inside: (n) => el.contains(n),
      opener,
    })
    const release = trapFocus(el, opener)
    el.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    if (!el.contains(document.activeElement)) el.focus()
    return () => {
      release()
      handle.close()
    }
  }, [mode, id, anchor])

  useLayoutEffect(() => {
    const el = ref.current
    if (mode !== 'floating' || !anchor || !el) return
    if (window.innerWidth < 640) return
    const r = anchor.getBoundingClientRect()
    const p = placeBeside(
      { left: r.left, top: r.top, width: r.width, height: r.height },
      { width: el.offsetWidth, height: el.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    )
    setPos({ left: p.left, top: p.top })
  }, [mode, anchor])

  const card = (
    <div
      ref={ref}
      className="sheet-base"
      data-mode={mode}
      data-phone={props.phone ? '' : undefined}
      data-testid={props['data-testid'] ?? 'sheet-base'}
      role="dialog"
      aria-modal={mode === 'floating' ? 'true' : undefined}
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      style={pos ? { left: pos.left, top: pos.top } : undefined}
    >
      <span className="sheet-base-grab" aria-hidden="true" />
      <header className="sheet-base-head">
        <h2 id={`${id}-title`} className="sheet-base-title">
          {title}
        </h2>
        <button
          type="button"
          className="sheet-base-x"
          aria-label={tp('parts.sheet.close')}
          data-testid="sheet-close"
          onClick={onClose}
        >
          <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
            <path
              d="M2 2l8 8M10 2l-8 8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>
      <div className="sheet-base-body">{children}</div>
      {footer ? <footer className="sheet-base-foot">{footer}</footer> : null}
    </div>
  )

  if (mode === 'inline') return card
  return createPortal(
    <>
      <div className="sheet-base-scrim" aria-hidden="true" />
      {card}
    </>,
    document.body,
  )
}
