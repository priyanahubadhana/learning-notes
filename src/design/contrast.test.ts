import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/*
 * WCAG 2.2 contrast of every text/background token pair in all three themes.
 * Reads src/design/tokens.css, so a changed colour is re-checked at once.
 * Text needs 4.5:1; borders of inputs/controls, focus rings 3:1.
 */
const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

type Rgba = [number, number, number, number]
type Vars = Record<string, string>

function block(selector: string): Vars {
  const start = css.indexOf(selector)
  const open = css.indexOf('{', start)
  let depth = 0
  let end = open
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}' && --depth === 0) {
      end = i
      break
    }
  }
  const vars: Vars = {}
  for (const m of css.slice(open, end).matchAll(/(--[\w-]+):\s*([^;]+?);/g)) {
    vars[m[1]] = m[2].replace(/\s+/g, ' ').trim()
  }
  return vars
}

const LIGHT = block('@theme static')
const THEMES: Record<string, Vars> = {
  day: LIGHT,
  night: { ...LIGHT, ...block(":root[data-theme='night']") },
  sepia: { ...LIGHT, ...block(":root[data-theme='sepia']") },
}

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const lin2srgb = (c: number): number => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, v)) * 255)
}

function oklch(l: number, c: number, h: number, a: number): Rgba {
  const hr = (h * Math.PI) / 180
  const A = c * Math.cos(hr)
  const B = c * Math.sin(hr)
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [
    lin2srgb(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    lin2srgb(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    lin2srgb(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
    a,
  ]
}

/** A token value as a colour (hex, rgba, an alias, or color-mix with white/black). */
function colour(vars: Vars, name: string): Rgba {
  const v = vars[name]
  if (!v) throw new Error(`no token ${name}`)
  return parse(vars, v)
}
function parse(vars: Vars, v: string): Rgba {
  let m = /^var\((--[\w-]+)\)$/.exec(v)
  if (m) return colour(vars, m[1])
  m = /^#([0-9a-f]{6})$/i.exec(v)
  if (m) {
    const n = parseInt(m[1], 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]
  }
  m = /^rgba?\(([^)]+)\)$/.exec(v)
  if (m) {
    const p = m[1].split(',').map((x) => parseFloat(x))
    return [p[0], p[1], p[2], p[3] ?? 1]
  }
  m = /^color-mix\(in srgb, (.+?) (\d+)%, (white|black)\)$/.exec(v)
  if (m) {
    const base = parse(vars, m[1])
    const t = m[3] === 'white' ? 255 : 0
    const k = Number(m[2]) / 100
    return [
      Math.round(base[0] * k + t * (1 - k)),
      Math.round(base[1] * k + t * (1 - k)),
      Math.round(base[2] * k + t * (1 - k)),
      1,
    ]
  }
  throw new Error(`cannot read colour: ${v}`)
}

/** `top` laid over the opaque `bottom`. */
function over(top: Rgba, bottom: Rgba): Rgba {
  const a = top[3]
  return [
    Math.round(top[0] * a + bottom[0] * (1 - a)),
    Math.round(top[1] * a + bottom[1] * (1 - a)),
    Math.round(top[2] * a + bottom[2] * (1 - a)),
    1,
  ]
}
function luminance(c: Rgba): number {
  return (
    0.2126 * srgbToLinear(c[0]) +
    0.7152 * srgbToLinear(c[1]) +
    0.0722 * srgbToLinear(c[2])
  )
}
function contrast(a: Rgba, b: Rgba): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The blobs of the gradient wash, each at its strongest, over the canvas. */
function washColours(vars: Vars): Rgba[] {
  const canvas = colour(vars, '--color-canvas')
  const blobs = [
    ...vars['--wash'].matchAll(
      /oklch\(([\d.]+) ([\d.]+) ([\d.]+) \/ ([\d.]+)\)/g,
    ),
  ].map((m) => oklch(+m[1], +m[2], +m[3], +m[4]))
  return [
    canvas,
    ...blobs.map((b) => over(b, canvas)),
    over(blobs[1], over(blobs[0], canvas)),
  ]
}

type Pair = { fg: string; bg: string; min: number; fgC: Rgba; bgC: Rgba }

function pairsOf(vars: Vars): Pair[] {
  const out: Pair[] = []
  const t = (name: string) => colour(vars, name)
  const add = (fg: string, fgC: Rgba, bg: string, bgC: Rgba, min = 4.5) =>
    out.push({ fg, bg, min, fgC, bgC })
  const surfaces = [
    '--color-canvas',
    '--color-surface-0',
    '--color-surface-1',
    '--color-surface-2',
    '--color-surface-3',
  ]
  const s0 = t('--color-surface-0')
  const s1 = t('--color-surface-1')

  for (const fg of ['--color-ink', '--color-ink-soft', '--color-muted']) {
    for (const bg of surfaces) add(fg, t(fg), bg, t(bg))
  }
  for (const fg of ['--color-ink', '--color-ink-soft']) {
    add(fg, t(fg), '--color-neutral-fill', over(t('--color-neutral-fill'), s0))
    for (const f of ['--color-hover', '--color-pressed']) {
      add(fg, t(fg), `${f} on surface-0`, over(t(f), s0))
      add(fg, t(fg), `${f} on surface-1`, over(t(f), s1))
    }
  }
  for (const bg of surfaces) {
    add('--color-accent (links)', t('--color-accent'), bg, t(bg))
    add('--color-select', t('--color-select'), bg, t(bg))
  }
  for (const bg of [
    '--color-accent',
    '--color-accent-hover',
    '--color-accent-active',
  ])
    add('--color-on-accent', t('--color-on-accent'), bg, t(bg))
  add(
    '--color-surface-0 (danger button text)',
    s0,
    '--color-danger',
    t('--color-danger'),
  )

  for (const c of ['accent', 'success', 'warn', 'danger']) {
    const fg = t(`--color-${c}`)
    const soft = t(`--color-${c}-soft`)
    for (const bg of surfaces.slice(1, 4)) add(`--color-${c}`, fg, bg, t(bg))
    add(`--color-${c}`, fg, `--color-${c}-soft on surface-0`, over(soft, s0))
    add(`--color-${c}`, fg, `--color-${c}-soft on surface-1`, over(soft, s1))
  }

  // Controls: input/control borders and the focus ring, 3:1 against what they sit on.
  for (const bg of surfaces) {
    add(
      '--color-line-strong (input border)',
      t('--color-line-strong'),
      bg,
      t(bg),
      3,
    )
  }
  for (const bg of ['--color-canvas', '--color-surface-0', '--color-surface-1'])
    add('--color-accent (focus ring)', t('--color-accent'), bg, t(bg), 3)

  // Glass: text over the fill, over every backdrop it can sit on (the wash
  // blobs at full strength, the canvas, the paper and the paper's own text).
  const fill = t('--glass-fill')
  const backdrops: [string, Rgba][] = [
    ...washColours(vars).map((c, i): [string, Rgba] => [`wash ${i}`, c]),
    ['surface-0', s0],
    // Text under a bar is blurred (20px): about 20% ink coverage at most.
    [
      'paper with text under the bar',
      over([...t('--color-ink').slice(0, 3), 0.2] as Rgba, s0),
    ],
  ]
  for (const [name, back] of backdrops) {
    const glass = over(fill, back)
    for (const fg of [
      '--color-ink',
      '--color-ink-soft',
      '--color-muted',
      '--color-accent',
    ])
      add(fg, t(fg), `glass over ${name}`, glass)
  }
  return out
}

describe('design tokens: WCAG AA contrast', () => {
  for (const [theme, vars] of Object.entries(THEMES)) {
    describe(theme, () => {
      it('every text and control pair passes', () => {
        const failures = pairsOf(vars)
          .map((p) => ({ ...p, ratio: contrast(p.fgC, p.bgC) }))
          .filter((p) => p.ratio < p.min)
          .map(
            (p) => `${p.fg} on ${p.bg}: ${p.ratio.toFixed(2)} (needs ${p.min})`,
          )
        expect(failures).toEqual([])
      })
    })
  }

  it('checks a decent number of pairs per theme', () => {
    for (const vars of Object.values(THEMES))
      expect(pairsOf(vars).length).toBeGreaterThan(80)
  })

  it('computes known ratios correctly', () => {
    const black: Rgba = [0, 0, 0, 1]
    const white: Rgba = [255, 255, 255, 1]
    expect(contrast(black, white)).toBeCloseTo(21, 5)
    expect(contrast(white, white)).toBeCloseTo(1, 5)
  })
})
