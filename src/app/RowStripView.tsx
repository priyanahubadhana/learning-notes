import { useMemo } from 'react'
import { ContextStrip, type StripItem } from '../design/parts/ContextStrip'
import type { MenuItem } from './ui'
import { stripIcon, type RowPoint } from './rowStripLogic'

/** The row strip may start at the sidebar's left edge, never over the rail. */
const fromSidebar = () => {
  const side = document.querySelector('aside')?.getBoundingClientRect()
  if (!side || !side.width) return null
  const w = document.documentElement.clientWidth
  return {
    left: side.left,
    top: 0,
    width: w - side.left,
    height: window.innerHeight,
  }
}

/** The press-and-hold strip of a page, notebook, library or task row (PM-23). */
export default function RowStripView({
  at,
  items,
  onClose,
  all,
}: {
  at: RowPoint
  items: MenuItem[]
  onClose: () => void
  all?: { label: string; open: () => void }
}) {
  const strip = useMemo<StripItem[]>(
    () =>
      items.map((i, n) => ({
        id: String(n),
        icon: stripIcon(i.icon),
        label: i.label,
        danger: i.danger,
        disabled: i.disabled,
        menu: i.submenu?.map((s, k) => ({ id: String(k), label: s.label })),
      })),
    [items],
  )
  return (
    <ContextStrip
      items={strip}
      allLevels
      phoneLabels
      target={{ left: at.x - 1, top: at.y - 10, width: 2, height: 20 }}
      commands={
        all
          ? [
              {
                id: 'all',
                label: all.label,
                items: [{ id: 'all', label: all.label, icon: 'more' }],
              },
            ]
          : undefined
      }
      onAction={(id, sub) => {
        if (id === 'all') {
          onClose()
          all?.open()
          return
        }
        const item = items[Number(id)]
        const run = sub !== undefined ? item?.submenu?.[Number(sub)] : item
        if (!run || run.disabled) return
        onClose()
        run.onSelect()
      }}
      onClose={onClose}
      testId="row-strip"
      bounds={fromSidebar}
    />
  )
}
