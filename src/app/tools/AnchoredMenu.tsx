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
  bottomReserve = 0,
  solid = false,
  children,
}: {
  menu: AnchoredMenuState
  label: string
  width?: number
  /** Move the keyboard focus to the first item when it opens. */
  focusFirst?: boolean
  /** Screen height at the bottom the menu must not use (a bottom bar), px. */
  bottomReserve?: number
  /**
   * A fully opaque card whose title row stays put and whose rows scroll
   * inside it: the scroll-hint fade then touches the rows only, never the
   * card (R12).
   */
  solid?: boolean
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
        maxHeight: Math.max(
          120,
          window.innerHeight - at.bottom - 12 - bottomReserve,
        ),
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
      data-solid={solid || undefined}
      style={{
        left,
        ...vertical,
        width,
        // Opened from a sheet or dialog (the Organise sheet's "..."): above it.
        zIndex: opener?.closest('[role="dialog"]')
          ? 'calc(var(--z-sheet) + 1)'
          : 50,
      }}
      className={`fixed glass rounded-xl p-1 text-ink ${solid ? 'flex flex-col' : 'overflow-y-auto'}`}
    >
      <PopupHeader title={label} onClose={close} />
      {solid ? (
        <div data-menu-rows className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      ) : (
        children
      )}
    </div>,
    document.body,
  )
}
