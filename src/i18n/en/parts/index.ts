/**
 * Words for the shared design parts (src/design/parts), registered with the
 * late texts so `t()` finds them and other languages can translate them.
 * A key missing in es/hi shows the English text, as everywhere.
 */
import { enPartsArrange } from './arrange'
import { enPartsCore } from './core'
import { enPartsDrag } from './drag'
import { enPartsFeedback } from './feedback'
import { enPartsMenus } from './menus'
import { enPartsMisc } from './misc'
import { enPartsStep3 } from './step3'

export const enParts = {
  ...enPartsCore,
  ...enPartsDrag,
  ...enPartsArrange,
  ...enPartsMisc,
  ...enPartsMenus,
  ...enPartsFeedback,
  ...enPartsStep3,
}
