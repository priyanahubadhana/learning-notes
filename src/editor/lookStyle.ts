import type { CSSProperties } from 'react'
import {
  fontStack,
  isReadingFont,
  type ReadingFont,
} from '../app/reading/readingPrefs'

/**
 * The two text styles of the one bar (box bar part A): a size (any number of
 * px, the value is the number) and a font (a font id of the app's own list).
 * They are BlockNote styles like colour, so they live in the words and need no
 * new stored field.
 */
export const FONT_SIZE_STYLE = 'fontSize'
export const FONT_FACE_STYLE = 'fontFace'

/** The CSS of a size value; nothing for a value that is not a sane number. */
export function sizeCss(value: string): CSSProperties {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 && n <= 400 ? { fontSize: `${n}px` } : {}
}

/** The CSS of a font value (a built-in id, or an imported `custom:` one). */
export function faceCss(value: string): CSSProperties {
  if (!isReadingFont(value) || value === 'app') return {}
  return { fontFamily: fontStack(value as Exclude<ReadingFont, 'app'>) }
}
