import { lazy, Suspense } from 'react'
import { useFlag } from './flags'
import { MenuPopover, type MenuItem } from './ui'
import type { RowPoint } from './rowStripLogic'

const Strip = lazy(() => import('./RowStripView'))

/**
 * A row's actions. A long-press (`at` given) with flag page.menus opens the
 * strip at that point (PM-23); otherwise (the row's ⋯ button, flag off) the
 * usual list under the button.
 */
export function RowMenu({
  anchor,
  items,
  onClose,
  at,
  all,
}: {
  anchor: DOMRect
  items: MenuItem[]
  onClose: () => void
  at?: RowPoint | null
  /** The row's full list, offered as "⋯" on the strip. */
  all?: { label: string; open: () => void }
}) {
  const on = useFlag('page.menus')
  if (!on || !at) {
    return <MenuPopover anchor={anchor} items={items} onClose={onClose} />
  }
  return (
    <Suspense fallback={null}>
      <Strip at={at} items={items} onClose={onClose} all={all} />
    </Suspense>
  )
}
