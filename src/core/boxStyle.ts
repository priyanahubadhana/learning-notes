/**
 * Box style (owner bug batch 2, item 8; docs/plans/text-tool-plan.md, 3).
 * A text box can have a background, border, rounded corners, a shadow and
 * padding. Colours are TOKEN NAMES, never hex, so Day, Night and Sepia each
 * draw them with their own theme (a tint mixed into the paper colour keeps
 * the text readable). Values are snapped to the 4-pt grid. The style is an
 * optional field of the box (`PaperBox.style`), so it needs no new database
 * version, and it rides on the existing sync of the page record.
 */

export const COLOUR_TOKENS = [
  'none',
  'dark',
  'lime',
  'peach',
  'white',
  'red',
  'yellow',
  'blue',
  'slate',
  'accent',
  'line',
] as const
export type ColourToken = (typeof COLOUR_TOKENS)[number]

export const BORDER_WIDTHS = [0, 1, 2, 3] as const
export const RADII = [0, 4, 8, 12, 16] as const
export const PADS = [0, 4, 8, 12, 16] as const

export interface BoxStyle {
  /** The id of the preset it came from (built-in or one of the person's own). */
  preset?: string
  bg?: ColourToken
  border?: ColourToken
  borderW?: (typeof BORDER_WIDTHS)[number]
  radius?: (typeof RADII)[number]
  shadow?: boolean
  pad?: (typeof PADS)[number]
}

const snap = <T extends number>(
  v: unknown,
  allowed: readonly T[],
): T | undefined => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined
  return allowed.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a))
}
const token = (v: unknown): ColourToken | undefined =>
  typeof v === 'string' && (COLOUR_TOKENS as readonly string[]).includes(v)
    ? (v as ColourToken)
    : undefined

/** Keeps only known keys, valid tokens and clamped values; an empty style is undefined. */
export function cleanStyle(v: unknown): BoxStyle | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined
  const o = v as Record<string, unknown>
  const out: BoxStyle = {}
  if (typeof o.preset === 'string' && o.preset.length <= 40)
    out.preset = o.preset
  const bg = token(o.bg)
  if (bg) out.bg = bg
  const border = token(o.border)
  if (border) out.border = border
  const borderW = snap(o.borderW, BORDER_WIDTHS)
  if (borderW !== undefined) out.borderW = borderW
  const radius = snap(o.radius, RADII)
  if (radius !== undefined) out.radius = radius
  if (typeof o.shadow === 'boolean') out.shadow = o.shadow
  const pad = snap(o.pad, PADS)
  if (pad !== undefined) out.pad = pad
  return Object.keys(out).length ? out : undefined
}

export const sameStyle = (
  a: BoxStyle | undefined,
  b: BoxStyle | undefined,
): boolean => JSON.stringify(cleanStyle(a)) === JSON.stringify(cleanStyle(b))

/** What a token looks like: a tint mixed into the theme's paper (readable text). */
const HUES: Record<string, string> = {
  lime: '#84cc16',
  peach: '#fb923c',
  red: '#ef4444',
  yellow: '#eab308',
  blue: '#38bdf8',
  slate: '#64748b',
}
export function tokenCss(tok: ColourToken | undefined): string | undefined {
  switch (tok) {
    case undefined:
    case 'none':
      return undefined
    case 'dark':
      return 'color-mix(in srgb, var(--color-ink) 14%, var(--color-surface-0))'
    case 'white':
      return 'var(--color-surface-2)'
    case 'accent':
      return 'var(--color-accent)'
    case 'line':
      return 'var(--color-line-strong)'
    default:
      return `color-mix(in srgb, ${HUES[tok]} 24%, var(--color-surface-0))`
  }
}

/** Inline CSS for the frame behind a box (border-box: it sits inside the cell). */
export function frameCss(s: BoxStyle | undefined): Record<string, string> {
  const c = cleanStyle(s)
  if (!c) return {}
  const css: Record<string, string> = {}
  const bg = tokenCss(c.bg)
  if (bg) css.backgroundColor = bg
  const w = c.borderW ?? (c.border && c.border !== 'none' ? 1 : 0)
  const bc = tokenCss(c.border ?? 'line')
  if (w > 0 && bc) css.border = `${w}px solid ${bc}`
  if (c.radius) css.borderRadius = `${c.radius}px`
  if (c.shadow) css.boxShadow = 'var(--elev-2)'
  return css
}

/** Padding inside the box (px), kept inside the cell. */
export const padOf = (s: BoxStyle | undefined): number =>
  cleanStyle(s)?.pad ?? 0

export interface BoxPreset {
  id: string
  /** Key suffix for the name: `boxStyle.preset.<id>`. */
  style: BoxStyle
}

/** The ten one-tap swatches of the Presets grid (owner screenshot). */
export const SWATCHES: readonly BoxPreset[] = [
  { id: 'none', style: {} },
  { id: 'dark', style: { bg: 'dark', radius: 8, pad: 8 } },
  { id: 'lime', style: { bg: 'lime', radius: 8, pad: 8 } },
  { id: 'peach', style: { bg: 'peach', radius: 8, pad: 8 } },
  { id: 'white', style: { bg: 'white', radius: 8, pad: 8 } },
  { id: 'red', style: { bg: 'red', radius: 8, pad: 8 } },
  { id: 'yellow', style: { bg: 'yellow', radius: 8, pad: 8 } },
  { id: 'blue', style: { bg: 'blue', radius: 8, pad: 8 } },
  { id: 'slate', style: { bg: 'slate', radius: 8, pad: 8 } },
  {
    id: 'outlined',
    style: { bg: 'white', border: 'line', borderW: 1, radius: 8, pad: 8 },
  },
]

/** The named styles under the swatches. */
export const NAMED_PRESETS: readonly BoxPreset[] = [
  { id: 'outline', style: { border: 'line', borderW: 1, radius: 8, pad: 8 } },
  { id: 'softCard', style: { bg: 'dark', radius: 12, pad: 12 } },
  { id: 'note', style: { bg: 'yellow', radius: 4, pad: 8 } },
  {
    id: 'callout',
    style: { bg: 'accent', border: 'accent', borderW: 0, radius: 8, pad: 12 },
  },
  {
    id: 'shadowCard',
    style: { bg: 'white', radius: 12, pad: 12, shadow: true },
  },
]

export const MAX_OWN_PRESETS = 8

export interface OwnPreset {
  id: string
  name: string
  style: BoxStyle
}

/** Checks the person's saved presets (settings sync, backups). */
export function isOwnPresets(v: unknown): v is OwnPreset[] {
  return (
    Array.isArray(v) &&
    v.length <= MAX_OWN_PRESETS &&
    v.every(
      (p) =>
        p &&
        typeof p === 'object' &&
        typeof (p as OwnPreset).id === 'string' &&
        typeof (p as OwnPreset).name === 'string' &&
        (p as OwnPreset).name.length <= 40 &&
        !!cleanStyle((p as OwnPreset).style),
    )
  )
}

/** Is a stored style value fine to keep? Unknown keys are dropped when it is read. */
export const isStyleValue = (v: unknown): boolean =>
  v === undefined || (!Array.isArray(v) && cleanStyle(v) !== undefined)
