import type { CSSProperties, ReactNode, Ref } from 'react'
import { COLUMN_WIDTH, type Columns } from './columns'

type WidthVar = CSSProperties & { '--sidebar-width'?: string }

/**
 * SH-07: the sidebar's place at the start of the row. Docked or hidden it
 * stays in the row; as a phone drawer the sidebar slides in by itself (its
 * own markup). A stepped-aside sidebar the user opened docks here too (T4).
 */
export function SideSlot({
  cols,
  width,
  render,
}: {
  cols: Columns
  width: number
  render: (o: { hidden: boolean }) => ReactNode
}) {
  const style: WidthVar = { '--sidebar-width': `${width}px` }
  return (
    <div className="sh-sidewrap" data-state={cols.sidebar} style={style}>
      {render({ hidden: cols.sidebar === 'hidden' })}
    </div>
  )
}

/**
 * SH-08: the pages panel. Docked it is a 288 px column beside the page; on a
 * phone the panel draws itself as an overlay under the top bar (so the top
 * bar, and ✕ Exit reading, stay in reach).
 */
export function PanelSlot({
  cols,
  render,
  wrapRef,
  left,
}: {
  cols: Columns
  wrapRef?: Ref<HTMLDivElement>
  /** Where a panel over the page starts (px from the left). */
  left?: number
  render: (o: { docked: boolean; width: number }) => ReactNode
}) {
  if (cols.panel === 'hidden') return null
  const docked = cols.panel === 'docked'
  return (
    <div
      ref={wrapRef}
      className="sh-panelwrap"
      data-state={cols.panel}
      style={
        !docked && !cols.phone && left !== undefined
          ? ({ '--panel-left': `${left}px` } as CSSProperties)
          : undefined
      }
    >
      {render({ docked, width: COLUMN_WIDTH })}
    </div>
  )
}
