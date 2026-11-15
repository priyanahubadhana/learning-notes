import {
  eraseTargets,
  eraserSettings,
  type EraserMode,
} from '../../../main/inkSettings'

/**
 * Logic of the Eraser cards (1d, TB-30). Every write goes to `ink.eraser`,
 * the store today's bar reads, so the old and the new bar never disagree.
 */

/** Beginner: Standard and Whole stroke. Professional adds Precise. */
export function eraserModes(pro: boolean, current: EraserMode): EraserMode[] {
  const modes: EraserMode[] = ['standard', 'stroke']
  // A saved Precise stays visible, so the pick is never hidden from its owner.
  if (pro || current === 'precise') modes.push('precise')
  return modes
}

export const chooseEraserMode = (mode: EraserMode): void =>
  eraserSettings.update({ mode })

export const chooseEraserSize = (size: 0 | 1 | 2): void =>
  eraserSettings.update({ size })

export type EraseTarget = 'hl' | 'text' | 'pen'

const TARGET_FIELD = {
  hl: 'eraseHl',
  text: 'eraseText',
  pen: 'erasePen',
} as const

/**
 * Turns one thing the eraser takes on or off (TB-30b). At least one stays on:
 * the last one cannot be turned off (false: nothing changed, the bar says why).
 * The old "highlights only" switch is turned off and what it showed is kept.
 */
export function toggleErases(target: EraseTarget): boolean {
  const now = eraseTargets()
  if (now[target] && Object.values(now).filter(Boolean).length === 1)
    return false
  eraserSettings.update({
    highlightsOnly: false,
    eraseHl: now.hl,
    eraseText: now.text,
    erasePen: now.pen,
    [TARGET_FIELD[target]]: !now[target],
  })
  return true
}
