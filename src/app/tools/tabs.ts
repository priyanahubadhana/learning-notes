/** The ribbon's tabs, in order. */
export const TABS = [
  'file',
  'home',
  'insert',
  'draw',
  'view',
  'review',
] as const
export type TabId = (typeof TABS)[number]
