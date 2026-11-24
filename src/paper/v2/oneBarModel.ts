import type { MessageKey } from '../../i18n/t'
import type { BuiltInFont } from '../../app/reading/readingPrefs'
import { BUILT_IN_FONTS } from '../../app/reading/readingPrefs'

/**
 * What the one bar offers (box bar part A; owner decisions 18 Nov 2026).
 * Kept apart from the drawing so it can be tested.
 */

/** Size: any whole number between these (px); 16 is the normal text size. */
export const SIZE_MIN = 6
export const SIZE_MAX = 200
export const SIZE_NORMAL = 16

export function clampSize(n: number): number {
  if (!Number.isFinite(n)) return SIZE_NORMAL
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(n)))
}
/** The − and + buttons move one step. */
export const stepSize = (n: number, dir: 1 | -1): number => clampSize(n + dir)

/** The three quick fonts (owner, 18 Nov): the name they show, and the font. */
export const FONT_QUICK: readonly {
  id: BuiltInFont
  name: string
  key: MessageKey
  family: string
}[] = [
  {
    id: 'atkinson',
    name: 'Easy to read',
    key: 'onebar.font.easy',
    family: 'Atkinson Hyperlegible',
  },
  {
    id: 'literata',
    name: 'Classic',
    key: 'onebar.font.classic',
    family: 'Literata',
  },
  {
    id: 'patrick',
    name: 'Handwritten',
    key: 'onebar.font.hand',
    family: 'Patrick Hand',
  },
]

/** "More fonts…": every other font the app already has (none is dropped). */
export const MORE_FONTS: readonly BuiltInFont[] = BUILT_IN_FONTS.filter(
  (f) => !FONT_QUICK.some((q) => q.id === f),
)

/** The list strip, in the owner's order. */
export const LIST_CHOICES = [
  { id: 'bullets', key: 'onebar.list.bullets', icon: 'list' },
  { id: 'numbers', key: 'onebar.list.numbers', icon: 'numbered' },
  { id: 'checklist', key: 'onebar.list.checklist', icon: 'checklist' },
  { id: 'star', key: 'onebar.list.star', icon: 'star' },
  { id: 'toggle', key: 'onebar.list.toggle', icon: 'chevronRight' },
] as const satisfies readonly { id: string; key: MessageKey; icon: string }[]
export type OneBarList = (typeof LIST_CHOICES)[number]['id']

/**
 * A new size for a whole box: the first block gets `n` and every other block is
 * scaled by the same ratio, so a heading stays bigger than the body.
 */
export function scaleSizes(current: number[], n: number): number[] {
  if (!current.length || !(current[0] > 0)) return current
  const ratio = n / current[0]
  return current.map((px) => clampSize(px * ratio))
}
