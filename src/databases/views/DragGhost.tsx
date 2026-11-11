import type { ReactNode } from 'react'

/**
 * The small card that follows the pointer while a row or chip is dragged.
 * It never takes the pointer itself, so the drop target underneath can be
 * found.
 */
export function DragGhost({
  x,
  y,
  width,
  children,
}: {
  x: number
  y: number
  width: number
  children: ReactNode
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-50 truncate rounded-[9px] border border-line bg-bg px-2.5 py-1.5 text-[12.5px] shadow-[0_14px_32px_rgba(0,0,0,0.22)]"
      style={{ left: x, top: y, width }}
    >
      {children}
    </div>
  )
}
