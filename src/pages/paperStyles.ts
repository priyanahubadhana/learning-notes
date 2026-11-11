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

/** The "Default paper style" choices of Settings (blank is written out). */
export type PaperChoice = 'blank' | 'lined' | 'grid' | 'dots'
export const PAPER_CHOICES: readonly PaperChoice[] = [
  'blank',
  'lined',
  'grid',
  'dots',
]
export const isPaperChoice = (v: unknown): v is PaperChoice =>
  PAPER_CHOICES.includes(v as PaperChoice)

/** A page's paper for a choice (blank = unset, like every untouched page). */
export const choiceToBg = (choice: PaperChoice): Page['inkBg'] =>
  choice === 'blank' ? undefined : choice
