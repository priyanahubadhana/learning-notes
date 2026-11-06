import { isBoolean } from '../uiPrefs'
import { prefStore } from '../tools/store'
import type { Heading } from './readingOutline'

export const contentsDocked = prefStore<boolean>(
  'reading.contentsDocked',
  isBoolean,
  false,
)

export const DOCK_WIDTH = 300
const DOCK_MIN_SCREEN = 1024

/** Does the pane push the text aside right now? */
export const dockedNow = (docked: boolean): boolean =>
  docked && window.innerWidth >= DOCK_MIN_SCREEN

/** The headings with the ids of the branches below them (pure, tested). */
export function treeRows(
  headings: readonly Heading[],
  folded: ReadonlySet<string>,
): { heading: Heading; hasChildren: boolean }[] {
  const rows: { heading: Heading; hasChildren: boolean }[] = []
  let hideBelow: number | null = null
  headings.forEach((h, i) => {
    if (hideBelow !== null) {
      if (h.level > hideBelow) return
      hideBelow = null
    }
    const next = headings[i + 1]
    rows.push({ heading: h, hasChildren: !!next && next.level > h.level })
    if (folded.has(h.id)) hideBelow = h.level
  })
  return rows
}

/** The heading being read: the last one at or above 30 % of the screen. */
export function currentHeadingId(
  headings: readonly Heading[],
  tops: ReadonlyMap<string, number>,
  line: number,
): string | null {
  let current: string | null = null
  for (const h of headings) {
    const top = tops.get(h.id)
    if (top !== undefined && top <= line) current = h.id
  }
  return current
}
