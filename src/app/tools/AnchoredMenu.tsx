import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePopup } from '../popups'
import { PopupHeader } from './PopupClose'
import type { AnchoredMenuState } from './useAnchoredMenu'

/**
 * A small menu under a button, drawn on the page body so a scrolling ribbon
 * never clips it. It follows the shared pop-up rule (src/app/popups.ts) and
 * has a visible ✕. Use `useAnchoredMenu` for the button's side of it.
 */
export function AnchoredMenu({
  menu,
  label,
  width = 220,
  focusFirst = true,
  children,
}: {
  menu: AnchoredMenuState
  label: string
  width?: number
  /** Move the keyboard focus to the first item when it opens. */
  focusFirst?: boolean
  children: ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)
  const { at, close, opener, id } = menu

  usePopup(at !== null, close, (el) => panel.current?.contains(el) ?? false, {
    onEscape: () => opener?.focus(),
    opener,
  })
  if (!at) return null

  const items = () => [
    ...(panel.current?.querySelectorAll<HTMLElement>(
      'button:not([data-popup-close])',
    ) ?? []),
  ]
  const arrows = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const list = items()
    const now = list.indexOf(document.activeElement as HTMLElement)
    const next = now + (e.key === 'ArrowDown' ? 1 : -1)
    list[(next + list.length) % list.length]?.focus()
  }
  const left = Math.max(
    8,
    Math.min(at.right - width, window.innerWidth - width - 8),
  )
  // Opens downwards, or upwards when the button is in the lower half (a bar at
  // the bottom); a tall menu scrolls inside the room it has.
  const up = at.top > window.innerHeight / 2
  const vertical = up
    ? {
        bottom: Math.max(8, window.innerHeight - at.top + 4),
        maxHeight: Math.max(120, at.top - 12),
      }
    : {
        top: Math.max(8, at.bottom + 4),
        maxHeight: Math.max(120, window.innerHeight - at.bottom - 12),
      }
  return createPortal(
    <div
      ref={(el) => {
        panel.current = el
        if (el && focusFirst && !el.contains(document.activeElement)) {
          el.querySelector<HTMLElement>(
            'button:not([data-popup-close])',
          )?.focus({ preventScroll: true })
        }
      }}
      id={id}
      role="menu"
      aria-label={label}
      onKeyDown={arrows}
      style={{
        left,
        ...vertical,
        width,
      }}
      className="fixed z-50 glass overflow-y-auto rounded-xl p-1 text-ink"
    >
      <PopupHeader title={label} onClose={close} />
      {children}
    </div>,
    document.body,
  )
}
