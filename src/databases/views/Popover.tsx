import { useEffect, useRef, type ReactNode } from 'react'

/**
 * A panel that opens next to the button that opened it (column menus,
 * pickers). It stays open while you work in it and closes on Esc, a click
 * outside, or `onClose`; focus then goes back to that button. A click on
 * the button itself is left to the button (so it can toggle the panel).
 */
export function Popover({
  anchor,
  label,
  onClose,
  children,
  width = 272,
}: {
  anchor: HTMLElement
  label: string
  onClose: () => void
  children: ReactNode
  width?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })

  useEffect(() => {
    const panel = ref.current
    panel
      ?.querySelector<HTMLElement>('input, select, textarea, button')
      ?.focus()
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!panel?.contains(target) && !anchor.contains(target)) close.current()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close.current()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      // Back to the button, unless focus already moved somewhere else.
      if (
        anchor.isConnected &&
        (!document.activeElement ||
          document.activeElement === document.body ||
          panel?.contains(document.activeElement))
      ) {
        anchor.focus()
      }
    }
  }, [anchor])

  const box = anchor.getBoundingClientRect()
  const w = Math.min(width, window.innerWidth - 16)
  const left = Math.max(8, Math.min(box.left, window.innerWidth - w - 8))
  // Opens upwards when there is little room below.
  const below = window.innerHeight - box.bottom
  const up = below < 260 && box.top > below
  const style = up
    ? { left, width: w, bottom: window.innerHeight - box.top + 4 }
    : { left, width: w, top: box.bottom + 4 }
  const maxHeight = (up ? box.top : below) - 12

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      style={{ ...style, maxHeight }}
      className="fixed z-20 overflow-y-auto glass rounded-xl p-1.5 text-[13.5px] text-ink"
    >
      {children}
    </div>
  )
}

/** A small heading inside a popover ("Sort", "Filter" …). */
export function PopHeading({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase">
      {children}
    </div>
  )
}

export function PopSeparator() {
  return <div aria-hidden className="mx-1 my-1.5 border-t border-line" />
}

/** A choice inside a popover; `on` marks the current one (✓). */
export function PopItem({
  icon,
  label,
  hint,
  on,
  onClick,
  pressable = false,
}: {
  icon?: ReactNode
  label: ReactNode
  hint?: string
  on?: boolean
  onClick: () => void
  /** Toggles (aria-pressed), e.g. options of a multi-choice picker. */
  pressable?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressable ? !!on : undefined}
      aria-current={!pressable && on ? 'true' : undefined}
      className="flex min-h-9 w-full items-center gap-2.5 rounded-md px-2.5 py-1 text-start outline-none hover:bg-hover focus-visible:bg-hover"
    >
      <span aria-hidden className="w-5 shrink-0 text-center text-muted">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {hint && <small className="block text-xs text-muted">{hint}</small>}
      </span>
      {on && (
        <span aria-hidden className="text-accent">
          ✓
        </span>
      )}
    </button>
  )
}
