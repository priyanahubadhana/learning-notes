import type { Page } from '../core/types'

/** The paper styles in menu order (undefined = blank). */
export const PAPER_STYLES: readonly Page['inkBg'][] = [
  undefined,
  'lined',
  'grid',
  'dots',
]

/** The words for a paper style (blank when unset). */
export const paperStyleKey = (bg: Page['inkBg']) =>
  bg === 'lined'
    ? ('ink.paper.lined' as const)
    : bg === 'grid'
      ? ('ink.paper.grid' as const)
      : bg === 'dots'
        ? ('ink.paper.dots' as const)
        : ('ink.paper.blank' as const)
