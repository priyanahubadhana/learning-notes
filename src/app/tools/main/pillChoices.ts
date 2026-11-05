import type { PenType } from './inkSettings'
import type { IconName } from '../icons'
import { BACKGROUND_HEX, TEXT_HEX } from '../../../editor/colorData'
import { prefStore } from '../store'

export const PEN_ICON: Record<PenType, IconName> = {
  fountain: 'penTool',
  ball: 'pen',
  brush: 'brush',
  pencil: 'pencil',
  marker: 'penLine',
}

const isOneOfName =
  (names: readonly string[]) =>
  (v: unknown): v is string =>
    typeof v === 'string' && names.includes(v)

/** The last text and highlight colour picked (the colour buttons apply them). */
export const textColourChoice = prefStore(
  'text.colourChoice',
  isOneOfName(Object.keys(TEXT_HEX)),
  'red',
)
export const highlightChoice = prefStore(
  'text.highlightChoice',
  isOneOfName(Object.keys(BACKGROUND_HEX)),
  'yellow',
)
