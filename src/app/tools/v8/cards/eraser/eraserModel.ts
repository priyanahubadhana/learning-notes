import { eraserSettings, type EraserMode } from '../../../main/inkSettings'

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
