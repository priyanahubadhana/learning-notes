/**
 * The reader's look (item 34, the Kindle-style Aa sheet): font, spacing,
 * alignment, margins, page colour, dim, progress line, clock. Remembered on
 * this device as one object. Pure functions; the sheet and the EPUB frame
 * both read them.
 */
export const FONTS = [
  'book',
  'bookerly',
  'serif',
  'georgia',
  'baskerville',
  'sans',
  'hyper',
] as const
export const PAGE_COLOURS = [
  'theme',
  'white',
  'sepia',
  'mint',
  'black',
] as const
export const PROGRESS = ['location', 'chapter', 'book'] as const
export const THEMES = ['compact', 'standard', 'large', 'low', 'custom'] as const

export interface ReadStyle {
  font: (typeof FONTS)[number]
  /** Line height, 1.2 to 2.2. */
  spacing: number
  align: 'left' | 'justify'
  margin: 's' | 'm' | 'l'
  page: (typeof PAGE_COLOURS)[number]
  /** Dim overlay, 0 to 60 percent (a web app cannot set screen brightness). */
  dim: number
  progress: (typeof PROGRESS)[number]
  clock: boolean
  /** Show the highlight menu when text is selected. */
  menuOnSelect: boolean
  /** Saved Custom theme (font, spacing, align, margin, size). */
  custom: { size: number; spacing: number; margin: 's' | 'm' | 'l' } | null
}

export const DEFAULT_STYLE: ReadStyle = {
  font: 'book',
  spacing: 1.6,
  align: 'left',
  margin: 'm',
  page: 'theme',
  dim: 0,
  progress: 'location',
  clock: false,
  menuOnSelect: true,
  custom: null,
}

const oneOf = <T extends string>(list: readonly T[], v: unknown, d: T): T =>
  list.includes(v as T) ? (v as T) : d
const num = (v: unknown, lo: number, hi: number, d: number) =>
  typeof v === 'number' && v >= lo && v <= hi ? v : d

/** Anything stored becomes a complete, valid style. */
export function cleanStyle(raw: unknown): ReadStyle {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >
  const c = o.custom as Record<string, unknown> | null | undefined
  return {
    font: oneOf(FONTS, o.font, DEFAULT_STYLE.font),
    spacing: num(o.spacing, 1.2, 2.2, DEFAULT_STYLE.spacing),
    align: o.align === 'justify' ? 'justify' : 'left',
    margin: oneOf(['s', 'm', 'l'] as const, o.margin, 'm'),
    page: oneOf(PAGE_COLOURS, o.page, 'theme'),
    dim: num(o.dim, 0, 60, 0),
    progress: oneOf(PROGRESS, o.progress, 'location'),
    clock: o.clock === true,
    menuOnSelect: o.menuOnSelect !== false,
    custom:
      c && typeof c === 'object'
        ? {
            size: num(c.size, 50, 300, 100),
            spacing: num(c.spacing, 1.2, 2.2, 1.6),
            margin: oneOf(['s', 'm', 'l'] as const, c.margin, 'm'),
          }
        : null,
  }
}
export const isReadStyle = (v: unknown): v is ReadStyle =>
  typeof v === 'object' && v !== null

export const FONT_STACK: Record<ReadStyle['font'], string> = {
  book: 'inherit',
  // Literata: a free, licence-safe look-alike for Bookerly (see epub/bookFont.ts).
  bookerly: '"Literata", Georgia, "Iowan Old Style", serif',
  serif: 'Georgia, "Times New Roman", serif',
  georgia: 'Georgia, serif',
  baskerville: 'Baskerville, "Baskerville Old Face", Georgia, serif',
  sans: 'system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif',
  // Used when the device has it; otherwise the system sans.
  hyper: '"Atkinson Hyperlegible", system-ui, sans-serif',
}

/** Page colours: background, text. `theme` follows the app. */
export const PAGE_PALETTE: Record<
  Exclude<ReadStyle['page'], 'theme'>,
  { bg: string; ink: string }
> = {
  white: { bg: '#ffffff', ink: '#111111' },
  sepia: { bg: '#f4ecd8', ink: '#5b4636' },
  mint: { bg: '#e3f2e6', ink: '#1f3a2b' },
  black: { bg: '#000000', ink: '#d6d6d6' },
}

/** Side margin of the text column, in em. */
export const MARGIN_EM = { s: 0.5, m: 2, l: 4 } as const

/** The look a Themes preset sets (size in percent). */
export function themePreset(
  id: (typeof THEMES)[number],
  custom: ReadStyle['custom'],
): { size: number; spacing: number; margin: 's' | 'm' | 'l' } {
  switch (id) {
    case 'compact':
      return { size: 90, spacing: 1.3, margin: 's' }
    case 'large':
      return { size: 150, spacing: 1.8, margin: 'm' }
    case 'low':
      return { size: 200, spacing: 2, margin: 'l' }
    case 'custom':
      return custom ?? { size: 100, spacing: 1.6, margin: 'm' }
    default:
      return { size: 100, spacing: 1.6, margin: 'm' }
  }
}

/** Extra CSS for a style, added to the EPUB frames. */
export function styleCss(s: ReadStyle): string {
  const m = MARGIN_EM[s.margin]
  const font =
    s.font === 'book' ? '' : `font-family: ${FONT_STACK[s.font]} !important;`
  return `
    body { ${font} padding-inline: ${m}em !important; }
    p, li, blockquote, dd { line-height: ${s.spacing} !important; text-align: ${s.align === 'justify' ? 'justify' : 'start'} !important; }
  `
}

/** The CSS filter that tints a PDF page picture to the page colour. */
export function pdfFilter(page: ReadStyle['page']): string {
  switch (page) {
    case 'sepia':
      return 'sepia(0.45) brightness(0.96)'
    case 'mint':
      return 'sepia(0.25) hue-rotate(60deg) brightness(0.97)'
    case 'black':
      return 'invert(1) hue-rotate(180deg)'
    default:
      return 'none'
  }
}

/** The page colour for the surface behind the book (null = the app's). */
export function pageSurface(page: ReadStyle['page']) {
  return page === 'theme' ? null : PAGE_PALETTE[page]
}

/** The first word of a selection, without punctuation (for the Dictionary). */
export const dictionaryWord = (text: string): string =>
  text.match(/[\p{L}\p{M}'’-]+/u)?.[0]?.replace(/^['’-]+|['’-]+$/g, '') ?? ''

/** How rich the reader's Pen strip is (item 41). */
export type InkBarMode = 'simple' | 'compact' | 'full'
export const isInkBarMode = (v: unknown): v is InkBarMode =>
  v === 'simple' || v === 'compact' || v === 'full'
