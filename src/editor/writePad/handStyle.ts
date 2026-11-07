import type { CSSProperties } from 'react'
import { fontStack } from '../../app/reading/readingPrefs'

/**
 * The `hand` text style: the look of text that came from the Write pad. Its
 * value is "font.weight.size", e.g. "caveat.bold.125" (size in percent).
 * Colour and highlight use BlockNote's own textColor / backgroundColor.
 */
export const HAND_STYLE = 'hand'

export const PAD_FONTS = ['caveat', 'kalam', 'app'] as const
export type PadFont = (typeof PAD_FONTS)[number]
export const PAD_WEIGHTS = ['light', 'normal', 'bold'] as const
export type PadWeight = (typeof PAD_WEIGHTS)[number]
export const PAD_SIZES = [100, 125, 150, 200] as const

export interface HandLook {
  font: PadFont
  weight: PadWeight
  size: number
}

export const WEIGHT_NUMBER: Record<PadWeight, number> = {
  light: 300,
  normal: 400,
  bold: 700,
}

export const encodeHand = (look: HandLook): string =>
  `${look.font}.${look.weight}.${look.size}`

export function decodeHand(value: string): HandLook | null {
  const [font, weight, size] = value.split('.')
  const n = Number(size)
  if (
    !(PAD_FONTS as readonly string[]).includes(font) ||
    !(PAD_WEIGHTS as readonly string[]).includes(weight) ||
    !Number.isFinite(n) ||
    n < 50 ||
    n > 400
  ) {
    return null
  }
  return { font: font as PadFont, weight: weight as PadWeight, size: n }
}

/** The plain look needs no `hand` mark. */
export const isPlainLook = (look: HandLook): boolean =>
  look.font === 'app' && look.weight === 'normal' && look.size === 100

/** The CSS of a look (also used by the pad's own box and preview line). */
export function handCss(look: HandLook): CSSProperties {
  return {
    ...(look.font === 'app' ? {} : { fontFamily: fontStack(look.font) }),
    fontWeight: WEIGHT_NUMBER[look.weight],
    ...(look.size === 100 ? {} : { fontSize: `${look.size}%` }),
  }
}
