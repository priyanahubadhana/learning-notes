import { isUnlocked } from '../../../../settings/level'
import type { ProFeatureId } from '../../../../settings/proFeatures.gen'
import { getBarPref } from '../barPrefs'
import { cardAutoClose as penAutoClose } from './pen/penModel'

/**
 * Whether a card closes 190 ms after a pick (TB-20). Simple pickers close;
 * a card with more controls (Professional) stays open.
 */
export function cardAutoClose(
  id: string,
  unlocked: (id: ProFeatureId) => boolean = isUnlocked,
  eraserMenus: () => boolean = () => getBarPref('eraserMenus'),
): boolean {
  switch (id) {
    // v9: with three menus the Mode and Size cards are quick pickers; the
    // one simple Eraser card (type + size) and Options stay open.
    case 'eraser.mode':
      return eraserMenus()
    case 'eraser.size':
      return true
    case 'eraser.options':
      return false
    // The quick Shape picker (Beginner row, or the folded Professional chip).
    case 'lasso.shape':
      return true
    case 'lasso.picks':
    case 'lasso.opts':
      return false
    case 'sel.colour':
    case 'sel.size':
      return true
    case 'shapes.size':
      return penAutoClose('pen.size', unlocked)
    case 'shapes.colour':
      return penAutoClose('pen.colour', unlocked)
    default:
      return penAutoClose(id, unlocked)
  }
}
