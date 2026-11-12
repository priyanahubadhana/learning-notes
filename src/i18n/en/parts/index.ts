/**
 * Words for the shared design parts (src/design/parts), registered with the
 * late texts so `t()` finds them and other languages can translate them.
 * A key missing in es/hi shows the English text, as everywhere.
 */
import { enPartsArrange } from './arrange'
import { enPartsCore } from './core'
import { enPartsDrag } from './drag'
import { enPartsMisc } from './misc'

export const enParts = {
  ...enPartsCore,
  ...enPartsDrag,
  ...enPartsArrange,
  ...enPartsMisc,
}
