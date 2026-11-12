import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { popPosition } from './popPosition'
import { useOverlayLayer } from './useOverlayLayer'
import { useTopLayer } from './useTopLayer'
import './shell-parts.css'

export interface PopItem {
  id: string
  label: string
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  onPick: () => void
}

export interface PopSection {
  /** A small caps label above the group. */
  label?: string
  items: PopItem[]
}

export interface PopMenuProps {
  anchor: HTMLElement | null
  sections: PopSection[]
  onClose: () => void
  label: string
  id?: string
}

/**
 * SH-11: the pop menu. Anchored to its button, rows 44 high, arrows move,
 * Enter picks, Esc closes (the overlay manager), danger last after a
 * divider. Flips to stay in the visible viewport (keyboard and pinch aware).
 */
export function PopMenu(props: PopMenuProps) {
  const { anchor, sections, onClose, label } = props
  const auto = useId()
  const id = props.id ?? `pop-${auto}`
  const layer = useRef<HTMLDivElement | null>(null)
  const box = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{
    left: number
    top: number
    flipped: boolean
  } | null>(null)
  useTopLayer(layer)
  useOverlayLayer(box, { id, layer: 'menu', onClose })

  useLayoutEffect(() => {
    const el = box.current
    if (!el || !anchor) return
    const r = anchor.getBoundingClientRect()
    const vv = window.visualViewport
    setPos(
      popPosition(
        { left: r.left, top: r.top, width: r.width, height: r.height },
        { width: el.offsetWidth, height: el.offsetHeight },
        {
          width: vv?.width ?? window.innerWidth,
          height: vv?.height ?? window.innerHeight,
          top: vv?.offsetTop ?? 0,
        },
      ),
    )
  }, [anchor])

  // Focus the first row once the menu is placed (a hidden menu cannot take focus).
  useEffect(() => {
    if (!pos) return
    box.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
      ?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos !== null])

  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])',
      ),
    )
    const at = items.indexOf(document.activeElement as HTMLElement)
    let next = -1
    if (e.key === 'ArrowDown') next = (at + 1) % items.length
    else if (e.key === 'ArrowUp') next = (at - 1 + items.length) % items.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = items.length - 1
    if (next < 0) return
    e.preventDefault()
    items[next]?.focus()
  }

  return createPortal(
    <div ref={layer} popover="manual" className="sh-layer">
      <div
        ref={box}
        role="menu"
        aria-label={label}
        className="sh-pop"
        data-testid="shell-pop"
        data-flipped={pos?.flipped ? '' : undefined}
        style={
          pos
            ? { left: pos.left, top: pos.top }
            : { left: 0, top: 0, visibility: 'hidden' }
        }
        onKeyDown={move}
      >
        {sections.map((sec, i) => (
          <div key={i} role="group" aria-label={sec.label}>
            {i > 0 && <hr className="sh-pop-div" />}
            {sec.label && (
              <div className="sh-pop-label" aria-hidden="true">
                {sec.label}
              </div>
            )}
            {sec.items.map((it) => (
              <button
                key={it.id}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                data-danger={it.danger ? '' : undefined}
                className="sh-pop-row"
                onClick={() => {
                  it.onPick()
                  onClose()
                }}
              >
                {it.icon && <span className="sh-pop-ic">{it.icon}</span>}
                {it.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>,
    document.body,
  )
}
