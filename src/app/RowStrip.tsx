import { lazy, Suspense } from 'react'
import { useFlag, isFlagOn } from './flags'
import { MenuPopover, type MenuItem } from './ui'
import { isIconName, type IconName } from './tools/icons'
import { holdMenuSetting } from '../settings/builtinSettings'
import { readDeviceSetting } from '../settings/settingsService'

const Strip = lazy(() => import('./RowStripView'))

/** The old long-press time (ms), kept while flag page.menus is off. */
const OLD_HOLD_MS = 500

/**
 * How long a row must be held before its menu opens (PM-24). With flag
 * page.menus it follows Settings "Press-and-hold menu time"; otherwise 500 ms.
 */
export function rowHoldMs(): number {
  return isFlagOn('page.menus')
    ? readDeviceSetting(holdMenuSetting)
    : OLD_HOLD_MS
}

const CHAR_ICONS: Record<string, IconName> = {
  '✎': 'pencil',
  '+': 'plus',
  '☆': 'star',
  '★': 'star',
  '↑': 'chevronUp',
  '↓': 'chevronDown',
  '↰': 'arrowUpRight',
  '×': 'close',
}

/** A menu row's icon as a strip icon (unknown ones become "more"). */
export function stripIcon(icon: string): IconName {
  if (isIconName(icon)) return icon
  return CHAR_ICONS[icon] ?? 'more'
}

/** Where the press was (screen pixels). */
export type RowPoint = { x: number; y: number }

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
