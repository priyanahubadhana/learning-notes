import { prefStore, type Store } from '../store'

/**
 * The settings model of the ink tools (pen, highlighter, eraser, lasso).
 * The drawing engine is step 3; here the values are saved per device,
 * checked when read, and shown in the options pills and detail cards (with a
 * live preview). Every value is clamped, so a damaged saved value can never
 * break the bar.
 */

// ---- Colours ----

const HEX = /^#[0-9a-fA-F]{6}$/
export const isHex = (v: unknown): v is string =>
  typeof v === 'string' && HEX.test(v)

/** Colours of the pen (named for screen readers via `ink.colour.<id>`). */
export const PEN_COLOURS = [
  { id: 'black', hex: '#1d1d1f' },
  { id: 'blue', hex: '#0b6e99' },
  { id: 'red', hex: '#c62828' },
  { id: 'green', hex: '#2e7d4f' },
  { id: 'orange', hex: '#d9730d' },
  { id: 'purple', hex: '#6940a5' },
] as const

/** Highlighter colours (pale, so the text stays readable). */
export const HIGHLIGHT_COLOURS = [
  { id: 'yellow', hex: '#ffe58a' },
  { id: 'green', hex: '#b7e4c7' },
  { id: 'blue', hex: '#a9d6f5' },
  { id: 'pink', hex: '#f8c6dd' },
  { id: 'orange', hex: '#fbd0a0' },
  { id: 'purple', hex: '#d6c4f0' },
] as const

/** Colours the person added with ⊕ (newest first, at most 6). */
const isHexList = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length <= 6 && v.every(isHex)
export const customColours = prefStore<string[]>(
  'ink.customColours',
  isHexList,
  [],
)

export function addCustomColour(hex: string): void {
  if (!isHex(hex)) return
  const lower = hex.toLowerCase()
  const known = [...PEN_COLOURS, ...HIGHLIGHT_COLOURS].some(
    (c) => c.hex.toLowerCase() === lower,
  )
  if (known) return
  const rest = customColours.get().filter((c) => c.toLowerCase() !== lower)
  customColours.set([lower, ...rest].slice(0, 6))
}

// ---- A small model store: saved as one object, always normalised ----

type Shape<T> = { [K in keyof T]: (v: unknown) => T[K] }

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

export interface ModelStore<T> {
  get: () => T
  update: (patch: Partial<T>) => void
  reset: () => void
  useValue: () => T
  subscribe: (listener: () => void) => () => void
  clearCache: () => void
}

/**
 * Wraps a saved object: each field is read through its own `clean` function
 * (a missing or damaged field becomes its default), so old saved values keep
 * working when fields are added.
 */
function modelStore<T extends object>(
  key: string,
  defaults: T,
  clean: Shape<T>,
): ModelStore<T> {
  const raw: Store<Record<string, unknown>> = prefStore(
    key,
    isRecord as (v: unknown) => v is Record<string, unknown>,
    {},
  )
  let cache: { src: unknown; value: T } | undefined
  const normalise = (src: Record<string, unknown>): T => {
    if (cache?.src === src) return cache.value
    const out = { ...defaults } as Record<string, unknown>
    for (const field of Object.keys(clean) as (keyof T & string)[]) {
      out[field] = clean[field](src[field])
    }
    cache = { src, value: out as T }
    return cache.value
  }
  const get = () => normalise(raw.get())
  return {
    get,
    update: (patch) => {
      const next = normalise({ ...get(), ...patch } as Record<string, unknown>)
      raw.set({ ...next } as Record<string, unknown>)
    },
    reset: () => raw.set({}),
    useValue: () => normalise(raw.useValue()),
    subscribe: raw.subscribe,
    clearCache: () => {
      raw.clearCache()
      cache = undefined
    },
  }
}

const num =
  (min: number, max: number, fallback: number) =>
  (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v)
      ? Math.min(max, Math.max(min, v))
      : fallback
const pick =
  <T extends string>(values: readonly T[], fallback: T) =>
  (v: unknown): T =>
    (values as readonly unknown[]).includes(v) ? (v as T) : fallback
const flag =
  (fallback: boolean) =>
  (v: unknown): boolean =>
    typeof v === 'boolean' ? v : fallback
const hex =
  (fallback: string) =>
  (v: unknown): string =>
    isHex(v) ? v.toLowerCase() : fallback

// ---- Pen ----

export const PEN_TYPES = [
  'fountain',
  'ball',
  'brush',
  'pencil',
  'marker',
] as const
export type PenType = (typeof PEN_TYPES)[number]
export const LINE_STYLES = ['solid', 'dashed', 'dotted'] as const
export type LineStyle = (typeof LINE_STYLES)[number]
/** Can a finger draw? Auto: yes, unless in Pencil mode or a Pencil was used. */
export const FINGER_MODES = ['auto', 'on', 'off'] as const
export type FingerMode = (typeof FINGER_MODES)[number]
/** What a drag draws: freehand, or a clean shape, or Tape (a box that hides). */
export const DRAW_AS = [
  'free',
  'line',
  'arrow',
  'rect',
  'ellipse',
  'triangle',
  'tape',
] as const
export type DrawAs = (typeof DRAW_AS)[number]

/** The three thicknesses of each pen type, in pixels. */
export const PEN_WIDTHS: Record<PenType, readonly [number, number, number]> = {
  fountain: [1.5, 3, 5],
  ball: [1, 2, 4],
  brush: [3, 6, 12],
  pencil: [1, 2.5, 5],
  marker: [4, 8, 14],
}

export interface PenSettings {
  type: PenType
  /** Which of the 3 thicknesses (0, 1, 2). */
  size: 0 | 1 | 2
  /** An exact width in px; null = use the thickness above. */
  exact: number | null
  colour: string
  sharpness: number
  pressure: number
  stabilisation: number
  /** Fountain pens only: how flat the nib is. */
  flatness: number
  tilt: boolean
  speedWidth: boolean
  lowLatency: boolean
  holdShape: boolean
  scribbleErase: boolean
  circleLasso: boolean
  line: LineStyle
  /** Draw and hold: snap lines to angles, squares and circles. */
  shapeSnap: boolean
  /** Draw and hold: fill closed shapes. */
  shapeFill: boolean
  finger: FingerMode
  /** What a drag draws (the Shapes and Tape tools set this). */
  drawAs: DrawAs
}

export const PEN_DEFAULTS: PenSettings = {
  type: 'fountain',
  size: 1,
  exact: null,
  colour: PEN_COLOURS[0].hex,
  sharpness: 50,
  pressure: 60,
  stabilisation: 30,
  flatness: 20,
  tilt: true,
  speedWidth: false,
  lowLatency: true,
  holdShape: true,
  scribbleErase: false,
  circleLasso: false,
  line: 'solid',
  shapeSnap: true,
  shapeFill: false,
  finger: 'auto',
  drawAs: 'free',
}

const size3 = (v: unknown): 0 | 1 | 2 => (v === 0 || v === 1 || v === 2 ? v : 1)
const exactWidth = (v: unknown): number | null =>
  v === null || v === undefined ? null : num(0.5, 30, 3)(v)

export const penSettings = modelStore<PenSettings>('ink.pen', PEN_DEFAULTS, {
  type: pick(PEN_TYPES, 'fountain'),
  size: size3,
  exact: exactWidth,
  colour: hex(PEN_DEFAULTS.colour),
  sharpness: num(0, 100, 50),
  pressure: num(0, 100, 60),
  stabilisation: num(0, 100, 30),
  flatness: num(0, 100, 20),
  tilt: flag(true),
  speedWidth: flag(false),
  lowLatency: flag(true),
  holdShape: flag(true),
  scribbleErase: flag(false),
  circleLasso: flag(false),
  line: pick(LINE_STYLES, 'solid'),
  shapeSnap: flag(true),
  shapeFill: flag(false),
  finger: pick(FINGER_MODES, 'auto'),
  drawAs: pick(DRAW_AS, 'free'),
})

/** The width of the pen's line in px (the exact width wins). */
export const penWidth = (p: PenSettings): number =>
  p.exact ?? PEN_WIDTHS[p.type][p.size]

// ---- Highlighter ----

export const HIGHLIGHT_WIDTHS = [10, 16, 26] as const

export interface HighlighterSettings {
  size: 0 | 1 | 2
  colour: string
  snapToText: boolean
  behindInk: boolean
  /** How see-through it is, 20 to 90 per cent. */
  opacity: number
  saveToNotes: boolean
}

export const HIGHLIGHTER_DEFAULTS: HighlighterSettings = {
  size: 1,
  colour: HIGHLIGHT_COLOURS[0].hex,
  snapToText: true,
  behindInk: true,
  opacity: 55,
  saveToNotes: false,
}

export const highlighterSettings = modelStore<HighlighterSettings>(
  'ink.highlighter',
  HIGHLIGHTER_DEFAULTS,
  {
    size: size3,
    colour: hex(HIGHLIGHTER_DEFAULTS.colour),
    snapToText: flag(true),
    behindInk: flag(true),
    opacity: num(20, 90, 55),
    saveToNotes: flag(false),
  },
)

// ---- Eraser ----

export const ERASER_MODES = ['precise', 'standard', 'stroke'] as const
export type EraserMode = (typeof ERASER_MODES)[number]
export const ERASER_SIZES = [8, 18, 32] as const

export interface EraserSettings {
  mode: EraserMode
  size: 0 | 1 | 2
  highlightsOnly: boolean
}

export const ERASER_DEFAULTS: EraserSettings = {
  mode: 'standard',
  size: 1,
  highlightsOnly: false,
}

export const eraserSettings = modelStore<EraserSettings>(
  'ink.eraser',
  ERASER_DEFAULTS,
  {
    mode: pick(ERASER_MODES, 'standard'),
    size: size3,
    highlightsOnly: flag(false),
  },
)

// ---- Lasso ----

export const LASSO_SHAPES = ['free', 'rect'] as const
export type LassoShape = (typeof LASSO_SHAPES)[number]

export interface LassoSettings {
  shape: LassoShape
  ink: boolean
  pictures: boolean
  text: boolean
}

export const LASSO_DEFAULTS: LassoSettings = {
  shape: 'free',
  ink: true,
  pictures: true,
  text: true,
}

export const lassoSettings = modelStore<LassoSettings>(
  'ink.lasso',
  LASSO_DEFAULTS,
  {
    shape: pick(LASSO_SHAPES, 'free'),
    ink: flag(true),
    pictures: flag(true),
    text: flag(true),
  },
)

/** Tests only. */
export function resetInkSettings(): void {
  for (const store of [
    penSettings,
    highlighterSettings,
    eraserSettings,
    lassoSettings,
  ]) {
    store.clearCache()
  }
  customColours.clearCache()
}

// ---- The live preview stroke (shown in the pen and highlighter cards) ----

export interface PreviewStroke {
  /** The outline, as an SVG path. */
  d: string
  fill: string
  opacity: number
  /** A dashed or dotted line is drawn as a stroke instead of an outline. */
  stroke: { width: number; dash: string; cap: 'round' | 'butt' } | null
}

const WIDTH = 240
const HEIGHT = 56

/** A hand-drawn wave. The wobble shrinks as stabilisation grows. */
function wavePoints(stabilisation: number): { x: number; y: number }[] {
  const wobble = ((100 - stabilisation) / 100) * 3.2
  const points: { x: number; y: number }[] = []
  for (let i = 0; i <= 48; i += 1) {
    const x = 12 + (i / 48) * (WIDTH - 24)
    const y =
      HEIGHT / 2 +
      Math.sin((i / 48) * Math.PI * 2) * (HEIGHT * 0.28) +
      // A fixed pseudo-random wobble (the same on every draw).
      Math.sin(i * 12.9898) * wobble
    points.push({ x, y })
  }
  return points
}

/** Width along the stroke: thinner at the ends the more sharpness; pressure varies it. */
export function widthAt(
  t: number,
  base: number,
  sharpness: number,
  pressure: number,
): number {
  const taper = Math.min(1, Math.sin(Math.PI * t) * 2.2)
  const ends = 1 - (sharpness / 100) * (1 - taper)
  const press =
    1 - (pressure / 100) * 0.45 * (1 - Math.abs(Math.cos(t * Math.PI * 3)))
  return Math.max(0.4, base * ends * press)
}

/** Builds the preview of a pen (or, with `forceWidth`, any line). */
export function penPreview(p: PenSettings): PreviewStroke {
  const base = penWidth(p)
  const pts = wavePoints(p.stabilisation)
  if (p.line !== 'solid') {
    const dash =
      p.line === 'dashed' ? `${base * 3} ${base * 2}` : `0.1 ${base * 2}`
    const line = pts
      .map(
        (q, i) => `${i === 0 ? 'M' : 'L'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`,
      )
      .join(' ')
    return {
      d: line,
      fill: 'none',
      opacity: p.type === 'marker' ? 0.75 : 1,
      stroke: {
        width: base,
        dash,
        cap: p.line === 'dotted' ? 'round' : 'butt',
      },
    }
  }
  const left: string[] = []
  const right: string[] = []
  pts.forEach((q, i) => {
    const t = i / (pts.length - 1)
    const next = pts[Math.min(pts.length - 1, i + 1)]
    const prev = pts[Math.max(0, i - 1)]
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const len = Math.hypot(dx, dy) || 1
    // A flat nib (Fountain) is wider across the stroke than along it.
    const flat =
      p.type === 'fountain'
        ? 1 + (p.flatness / 100) * 0.9 * Math.abs(dy / len)
        : 1
    const w = (widthAt(t, base, p.sharpness, p.pressure) * flat) / 2
    const nx = -dy / len
    const ny = dx / len
    left.push(`${(q.x + nx * w).toFixed(1)} ${(q.y + ny * w).toFixed(1)}`)
    right.push(`${(q.x - nx * w).toFixed(1)} ${(q.y - ny * w).toFixed(1)}`)
  })
  const d = `M${left.join(' L')} L${right.reverse().join(' L')} Z`
  return {
    d,
    fill: p.colour,
    // Marker and pencil are a little see-through, like the real tools.
    opacity: p.type === 'marker' ? 0.75 : p.type === 'pencil' ? 0.85 : 1,
    stroke: null,
  }
}

/** The highlighter preview: a wide, see-through band. */
export function highlighterPreview(h: HighlighterSettings): PreviewStroke {
  const w = HIGHLIGHT_WIDTHS[h.size]
  const y = HEIGHT / 2
  return {
    d: `M16 ${y} L${WIDTH - 16} ${y}`,
    fill: 'none',
    opacity: h.opacity / 100,
    stroke: { width: w, dash: 'none', cap: 'butt' },
  }
}

export const PREVIEW_SIZE = { width: WIDTH, height: HEIGHT } as const
