import { isOneOf } from '../../settings/registry'

/**
 * The choices of Reading mode, as plain values with their looks. The
 * settings (src/settings/readingSettings.ts) store these on this device.
 */

export const READING_THEMES = [
  'app',
  'day',
  'night',
  'sepia',
  'paper',
  'contrast',
] as const
export type ReadingThemeName = (typeof READING_THEMES)[number]
export const isReadingTheme = isOneOf(READING_THEMES)

export interface ReadingColors {
  bg: string
  fg: string
  /** Quiet text and borders. */
  soft: string
  /** Highlight of the word being read aloud. */
  mark: string
  markText: string
}

/** Colours of the real themes ("app" follows the app's own theme). */
export const THEME_COLORS: Record<
  Exclude<ReadingThemeName, 'app'>,
  ReadingColors
> = {
  day: {
    bg: '#ffffff',
    fg: '#1c1c1e',
    soft: '#5c5c60',
    mark: '#ffe58a',
    markText: '#1c1c1e',
  },
  night: {
    bg: '#16161a',
    fg: '#d9d9de',
    soft: '#a0a0a8',
    mark: '#5b4a00',
    markText: '#fff3c4',
  },
  sepia: {
    bg: '#f4ecd8',
    fg: '#4a3827',
    soft: '#6b5844',
    mark: '#e8c97a',
    markText: '#3a2a1b',
  },
  paper: {
    bg: '#faf7f0',
    fg: '#2a2a2a',
    soft: '#5a5a5a',
    mark: '#fde08a',
    markText: '#2a2a2a',
  },
  contrast: {
    bg: '#000000',
    fg: '#ffffff',
    soft: '#d0d0d0',
    mark: '#ffff00',
    markText: '#000000',
  },
}

/** The app's themes (Day, Night, Sepia) as reading colours. */
export const colorsFor = (
  theme: ReadingThemeName,
  appTheme: string,
): ReadingColors => {
  const name: Exclude<ReadingThemeName, 'app'> =
    theme === 'app'
      ? appTheme === 'night' || appTheme === 'sepia'
        ? appTheme
        : 'day'
      : theme
  return THEME_COLORS[name]
}

/** Fonts that ship with the app. The first three need no download. */
export const BUILT_IN_FONTS = [
  'serif',
  'sans',
  'dyslexia',
  'literata',
  'sourceSerif',
  'atkinson',
  'lexend',
  'caveat',
  'kalam',
  'patrick',
  'shantell',
] as const
export type BuiltInFont = (typeof BUILT_IN_FONTS)[number]
export const READING_FONTS = ['app', ...BUILT_IN_FONTS] as const

/** A font the user imported: `custom:<id of the stored file>`. */
export type CustomFont = `custom:${string}`
export type ReadingFont = (typeof READING_FONTS)[number] | CustomFont
export const isCustomFont = (v: unknown): v is CustomFont =>
  typeof v === 'string' && /^custom:[A-Za-z0-9-]{8,64}$/.test(v)
export const isReadingFont = (v: unknown): v is ReadingFont =>
  (READING_FONTS as readonly unknown[]).includes(v) || isCustomFont(v)

export const FONT_STACKS: Record<BuiltInFont, string> = {
  serif: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  dyslexia: '"OpenDyslexic", "Comic Sans MS", system-ui, sans-serif',
  literata: '"Literata", Georgia, serif',
  sourceSerif: '"Source Serif 4", Georgia, serif',
  atkinson: '"Atkinson Hyperlegible Next", system-ui, sans-serif',
  lexend: '"Lexend", system-ui, sans-serif',
  caveat: '"Caveat", "Comic Sans MS", cursive',
  kalam: '"Kalam", "Comic Sans MS", cursive',
  patrick: '"Patrick Hand", "Comic Sans MS", cursive',
  shantell: '"Shantell Sans", "Comic Sans MS", cursive',
}

/** The CSS font stack of a font (not "app"/"default"). */
export const fontStack = (font: Exclude<ReadingFont, 'app'>): string =>
  isCustomFont(font)
    ? `"${customFamily(font)}", system-ui, sans-serif`
    : FONT_STACKS[font]

/** The CSS family name an imported font is registered under. */
export const customFamily = (font: CustomFont): string => `LN ${font.slice(7)}`

/** Text size in percent of the normal size. */
export const TEXT_SIZES = [80, 90, 100, 115, 130, 150, 175, 200, 250] as const
export const isTextSize = isOneOf(TEXT_SIZES)

/** Line spacing in hundredths (155 = 1.55). */
export const LINE_SPACINGS = [130, 155, 180, 210] as const
export const isLineSpacing = isOneOf(LINE_SPACINGS)

export const MARGINS = ['none', 'small', 'medium', 'large'] as const
export type Margin = (typeof MARGINS)[number]
export const isMargin = isOneOf(MARGINS)
export const MARGIN_PX: Record<Margin, number> = {
  none: 0,
  small: 16,
  medium: 40,
  large: 80,
}

export const WIDTHS = ['narrow', 'medium', 'wide', 'full'] as const
export type Width = (typeof WIDTHS)[number]
export const isWidth = isOneOf(WIDTHS)
export const WIDTH_PX: Record<Width, number> = {
  narrow: 520,
  medium: 700,
  wide: 920,
  full: 4000,
}

export const FLOWS = ['scroll', 'paged'] as const
export type Flow = (typeof FLOWS)[number]
export const isFlow = isOneOf(FLOWS)

export const RULERS = ['off', 'focus', 'ruler'] as const
export type Ruler = (typeof RULERS)[number]
export const isRuler = isOneOf(RULERS)

export const ENTRIES = ['inPlace', 'reader'] as const
export type Entry = (typeof ENTRIES)[number]
export const isEntry = isOneOf(ENTRIES)

export const BLANK_MODES = ['soft', 'hide'] as const
export type BlankMode = (typeof BLANK_MODES)[number]
export const isBlankMode = isOneOf(BLANK_MODES)

/** Read aloud speed in percent of normal (0.5× to 2×). */
export const SPEEDS = [50, 75, 100, 125, 150, 175, 200] as const
export const isSpeed = isOneOf(SPEEDS)

export const SLEEP_MINUTES = [10, 20, 30, 60] as const

export const ON_OFF = ['on', 'off'] as const
export type OnOffValue = (typeof ON_OFF)[number]
export const isOnOffValue = isOneOf(ON_OFF)
