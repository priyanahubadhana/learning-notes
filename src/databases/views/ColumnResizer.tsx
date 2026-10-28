import { useRef } from 'react'
import { t } from '../../i18n/t'
import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from './viewConfig'

/** How far an arrow key moves the edge (pixels). */
const KEY_STEP = 16

const clamp = (px: number) =>
  Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(px)))

/**
 * A thin handle on the edge of a column header: drag it (mouse, pen or
 * finger) or press ← → to change the column's width. `onLive` follows the
 * drag; `onDone` is called once with the final width.
 */
export function ColumnResizer({
  name,
  width,
  measure,
  onLive,
  onDone,
}: {
  /** The column's name, for the screen-reader label. */
  name: string
  /** The width now (if the user set one). */
  width: number | undefined
  /** The width the column has on screen. */
  measure: () => number
  onLive: (px: number) => void
  onDone: (px: number) => void
}) {
  const drag = useRef<{ x: number; width: number; dir: number } | null>(null)
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t('table.resize', { name })}
      aria-valuemin={MIN_COLUMN_WIDTH}
      aria-valuemax={MAX_COLUMN_WIDTH}
      aria-valuenow={width ?? Math.round(measure())}
      tabIndex={0}
      data-column-resizer
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
        drag.current = { x: e.clientX, width: measure(), dir: rtl ? -1 : 1 }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        if (d) onLive(clamp(d.width + (e.clientX - d.x) * d.dir))
      }}
      onPointerUp={(e) => {
        const d = drag.current
        drag.current = null
        if (d) onDone(clamp(d.width + (e.clientX - d.x) * d.dir))
      }}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
        e.preventDefault()
        const rtl = getComputedStyle(e.currentTarget).direction === 'rtl'
        const grow = (e.key === 'ArrowRight') !== rtl
        onDone(clamp((width ?? measure()) + (grow ? KEY_STEP : -KEY_STEP)))
      }}
      className="absolute inset-y-0 end-0 z-[2] w-3 cursor-col-resize touch-none select-none after:absolute after:inset-y-1 after:end-0 after:w-px after:bg-line hover:after:w-0.5 hover:after:bg-accent focus-visible:after:w-0.5 focus-visible:after:bg-accent phone:w-4"
    />
  )
}
