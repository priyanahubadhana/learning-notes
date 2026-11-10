import { useRef, type RefObject } from 'react'
import type { GridRow } from '../core/types'
import { t } from '../i18n/t'
import { equalRow, resizeCols, type Rect } from './grid'

/**
 * Item 26: the draggable divider between the columns of a row. Drag changes
 * the two neighbouring columns (they snap to 1/3, 1/2 and 2/3 within 3 %);
 * a double tap sets equal widths. A thin accent line shows on hover and while
 * dragged; the hit area is wide enough for a finger. It replaces the box
 * side handles (a single column is always the full row).
 */
export function GridDividers({
  rows,
  layout,
  k,
  left,
  width,
  paperEl,
  enabled,
  onLive,
  onCommit,
}: {
  rows: GridRow[]
  layout: Map<string, Rect & { h: number }>
  /** Pixels per mm, the row content's left edge and width (mm). */
  k: number
  left: number
  width: number
  paperEl: RefObject<HTMLDivElement | null>
  enabled: boolean
  /** The rows while a divider is dragged (null: back to the saved ones). */
  onLive: (rows: GridRow[] | null) => void
  onCommit: (rows: GridRow[]) => void
}) {
  const drag = useRef<{
    rowId: string
    i: number
    rows: GridRow[]
    moved: boolean
  } | null>(null)
  const lastTap = useRef(0)
  if (!enabled) return null

  const move = (e: React.PointerEvent) => {
    const d = drag.current
    const r = paperEl.current?.getBoundingClientRect()
    if (!d || !r) return
    const at = ((e.clientX - r.left) / k - left) / Math.max(1, width)
    const next = d.rows.map((row) =>
      row.id === d.rowId ? resizeCols(row, d.i, at) : row,
    )
    d.rows = next
    d.moved = true
    onLive(next)
  }
  const end = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (e.type === 'pointercancel') return onLive(null)
    if (d.moved) return onCommit(d.rows)
    onLive(null)
  }

  const out = rows.flatMap((row) => {
    if (row.cols.length < 2) return []
    const spans = row.cols.map((c) => {
      const rs = c.boxIds
        .map((id) => layout.get(id))
        .filter((x): x is Rect & { h: number } => !!x)
      return {
        l: Math.min(...rs.map((x) => x.x)),
        r: Math.max(...rs.map((x) => x.x + x.w)),
        top: Math.min(...rs.map((x) => x.y)),
        bottom: Math.max(...rs.map((x) => x.y + x.h)),
      }
    })
    if (spans.some((s) => !Number.isFinite(s.l))) return []
    const top = Math.min(...spans.map((s) => s.top))
    const bottom = Math.max(...spans.map((s) => s.bottom))
    return spans.slice(0, -1).map((s, i) => {
      const mid = (s.r + spans[i + 1].l) / 2
      return (
        <div
          key={row.id + ':' + i}
          role="separator"
          aria-orientation="vertical"
          aria-label={t('paper.box.resize')}
          data-grid-divider={row.id}
          data-divider-index={i}
          className="group/div absolute flex w-5 cursor-col-resize justify-center touch-none pointer-coarse:w-11"
          style={{
            left: mid * k,
            top: top * k,
            height: (bottom - top) * k,
            transform: 'translateX(-50%)',
          }}
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              // A pointer the browser no longer knows: the moves still arrive.
            }
            const now = Date.now()
            if (now - lastTap.current < 350) {
              lastTap.current = 0
              onCommit(rows.map((rw) => (rw.id === row.id ? equalRow(rw) : rw)))
              return
            }
            lastTap.current = now
            drag.current = { rowId: row.id, i, rows, moved: false }
          }}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          <span
            aria-hidden
            className="h-full w-0.5 rounded-full bg-accent opacity-0 transition-opacity group-hover/div:opacity-60 group-active/div:opacity-100"
          />
        </div>
      )
    })
  })
  return <>{out}</>
}
