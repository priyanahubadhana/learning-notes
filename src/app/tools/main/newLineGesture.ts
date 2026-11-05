import { DOUBLE_TAP_MS, type NewLineExtras } from './mainTools'

/** What a tap on ↵ New line does under each setting (pure, tested). */
export function tapAction(
  mode: NewLineExtras,
  lastTapAt: number,
  now: number,
): 'add' | 'extras' {
  return mode === 'doubleTap' && now - lastTapAt < DOUBLE_TAP_MS
    ? 'extras'
    : 'add'
}

/** Does pressing and holding open the extras? */
export const holdOpensExtras = (mode: NewLineExtras): boolean => mode === 'hold'

export const NEW_LINE_EXTRA_KINDS = ['heading', 'checklist', 'divider'] as const
export type NewLineExtra = (typeof NEW_LINE_EXTRA_KINDS)[number]
