import { isUnlocked } from '../../../../settings/level'
import type { ProFeatureId } from '../../../../settings/proFeatures.gen'
import { cardAutoClose as penAutoClose } from './pen/penModel'

/**
 * Whether a card closes 190 ms after a pick (TB-20). Simple pickers close;
 * a card with more controls (Professional) stays open.
 */
export function cardAutoClose(
  id: string,
  unlocked: (id: ProFeatureId) => boolean = isUnlocked,
): boolean {
  switch (id) {
    case 'eraser.mode':
    case 'eraser.size':
      return !unlocked('tb.eraserOptions')
    case 'lasso.shape':
      return !unlocked('tb.lassoOptions')
    case 'shapes.size':
      return penAutoClose('pen.size', unlocked)
    case 'shapes.colour':
      return penAutoClose('pen.colour', unlocked)
    default:
      return penAutoClose(id, unlocked)
  }
}
