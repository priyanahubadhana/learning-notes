import {
  readDeviceSetting,
  writeDeviceSetting,
} from '../../settings/settingsService'
import {
  readingAlignSetting,
  readingFontSetting,
  readingMarginSetting,
  readingSizeSetting,
  readingSpacingSetting,
  readingThemeSetting,
  readingWidthSetting,
} from '../../settings/readingSettings'
import { prefStore } from '../tools/store'
import {
  isAlign,
  isLineSpacing,
  isMargin,
  isReadingFont,
  isReadingTheme,
  isTextSize,
  isWidth,
  type Align,
  type Margin,
  type ReadingFont,
  type ReadingThemeName,
  type Width,
} from './readingPrefs'

/**
 * Saved reading looks (B1): four ready-made ones (Compact, Standard, Large,
 * Low vision) and up to eight of your own ("Save current as…"). A look is
 * the theme, font, size, spacing, margin, width and alignment together.
 * Kept on this device only; read back through `isSavedTheme`.
 */

export interface SavedTheme {
  name: string
  theme: ReadingThemeName
  font: ReadingFont
  size: number
  spacing: number
  margin: Margin
  width: Width
  align: Align
}

export const MAX_SAVED_THEMES = 8
const MAX_THEME_NAME = 40

/** The ready-made looks; `id` picks their name (`reading.theme.preset.<id>`). */
export const PRESET_THEMES: readonly (Omit<SavedTheme, 'name'> & {
  id: 'compact' | 'standard' | 'large' | 'lowVision'
})[] = [
  {
    id: 'compact',
    theme: 'app',
    font: 'app',
    size: 90,
    spacing: 130,
    margin: 'small',
    width: 'wide',
    align: 'left',
  },
  {
    id: 'standard',
    theme: 'app',
    font: 'app',
    size: 100,
    spacing: 155,
    margin: 'medium',
    width: 'medium',
    align: 'left',
  },
  {
    id: 'large',
    theme: 'app',
    font: 'app',
    size: 130,
    spacing: 180,
    margin: 'medium',
    width: 'medium',
    align: 'left',
  },
  {
    id: 'lowVision',
    theme: 'contrast',
    font: 'atkinson',
    size: 200,
    spacing: 180,
    margin: 'large',
    width: 'narrow',
    align: 'left',
  },
]

function isSavedTheme(v: unknown): v is SavedTheme {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.name === 'string' &&
    o.name.length > 0 &&
    o.name.length <= MAX_THEME_NAME &&
    isReadingTheme(o.theme) &&
    isReadingFont(o.font) &&
    isTextSize(o.size) &&
    isLineSpacing(o.spacing) &&
    isMargin(o.margin) &&
    isWidth(o.width) &&
    isAlign(o.align)
  )
}

export const isSavedThemes = (v: unknown): v is SavedTheme[] =>
  Array.isArray(v) && v.length <= MAX_SAVED_THEMES && v.every(isSavedTheme)

export const savedThemes = prefStore<SavedTheme[]>(
  'reading.savedThemes',
  isSavedThemes,
  [],
)

/** The look in use now. */
function currentLook(): Omit<SavedTheme, 'name'> {
  return {
    theme: readDeviceSetting(readingThemeSetting),
    font: readDeviceSetting(readingFontSetting),
    size: readDeviceSetting(readingSizeSetting),
    spacing: readDeviceSetting(readingSpacingSetting),
    margin: readDeviceSetting(readingMarginSetting),
    width: readDeviceSetting(readingWidthSetting),
    align: readDeviceSetting(readingAlignSetting),
  }
}

/** Makes this look the one in use (writes the device settings). */
export function applyLook(look: Omit<SavedTheme, 'name'>): void {
  writeDeviceSetting(readingThemeSetting, look.theme)
  writeDeviceSetting(readingFontSetting, look.font)
  writeDeviceSetting(readingSizeSetting, look.size)
  writeDeviceSetting(readingSpacingSetting, look.spacing)
  writeDeviceSetting(readingMarginSetting, look.margin)
  writeDeviceSetting(readingWidthSetting, look.width)
  writeDeviceSetting(readingAlignSetting, look.align)
}

/**
 * The list with `look` saved under `name` (a same name is replaced; with
 * eight saved, the oldest goes). Returns the new list.
 */
export function withSaved(
  list: readonly SavedTheme[],
  name: string,
  look: Omit<SavedTheme, 'name'>,
): SavedTheme[] {
  const clean = name.trim().slice(0, MAX_THEME_NAME)
  if (!clean) return [...list]
  const rest = list.filter((s) => s.name !== clean)
  return [...rest, { ...look, name: clean }].slice(-MAX_SAVED_THEMES)
}

/** Saves the look in use under a name. */
export function saveCurrentLook(name: string): void {
  savedThemes.set(withSaved(savedThemes.get(), name, currentLook()))
}

export function removeSavedLook(name: string): void {
  savedThemes.set(savedThemes.get().filter((s) => s.name !== name))
}
