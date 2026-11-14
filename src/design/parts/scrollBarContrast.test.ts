import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * SC-04 (rewritten in P1.1b, owner 14 Nov: "in dark colour mode it is not
 * visible"). The old check read ONE token (--color-muted) against two
 * surfaces (1 and 2) and never saw the page itself (surface-0), the canvas,
 * the raised surface-3, the track the thumb sits on, or the colour the bar
 * really uses. Now: the colour the bar USES (--sbar-thumb, resolved through
 * its var() chain, theme by theme) is measured against EVERY surface it can
 * sit on, and against the track drawn under it (the track's alpha blended
 * over the surface, like the eye sees it).
 */
const css = readFileSync('src/design/tokens.css', 'utf8')
type Rgb = [number, number, number]

/** Every block that starts with `selector` (a theme has several), joined. */
const blocks = (selector: string) => {
  let out = ''
  let from = 0
  for (;;) {
    const at = css.indexOf('\n' + selector, from)
    if (at < 0) return out
    const end = css.indexOf('\n}', at)
    out += css.slice(at, end)
    from = end
  }
}
const THEMES = {
  Light: blocks('@theme static {') + blocks(':root {'),
  Dark: blocks(":root[data-theme='night'] {"),
  Sepia: blocks(":root[data-theme='sepia'] {"),
} as const
const LIGHT = THEMES.Light

/** A token's raw value in a theme (falls back to Light, like the cascade). */
const raw = (theme: keyof typeof THEMES, name: string): string => {
  for (const src of [THEMES[theme], LIGHT]) {
    const m = new RegExp(`--${name}: *([^;]+);`).exec(src)
    if (m) return m[1].trim()
  }
  return ''
}
/** Follows var(--x) chains to a hex or rgba value. */
const resolve = (theme: keyof typeof THEMES, name: string): string => {
  let v = raw(theme, name)
  for (let i = 0; i < 6; i++) {
    const m = /^var\(--([a-z0-9-]+)\)$/.exec(v)
    if (!m) break
    v = raw(theme, m[1])
  }
  return v
}
const parse = (v: string): { rgb: Rgb; a: number } => {
  const hex = /^#([0-9a-f]{6})$/i.exec(v)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], a: 1 }
  }
  const m = /^rgba?\(([^)]+)\)$/.exec(v)
  if (!m) throw new Error(`not a colour: "${v}"`)
  const p = m[1].split(',').map((s) => parseFloat(s))
  return { rgb: [p[0], p[1], p[2]], a: p[3] ?? 1 }
}
const over = (top: { rgb: Rgb; a: number }, base: Rgb): Rgb =>
  top.rgb.map((c, i) => c * top.a + base[i] * (1 - top.a)) as Rgb
const lum = (c: Rgb) => {
  const [r, g, b] = c.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: Rgb, b: Rgb) => {
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

const SURFACES = ['canvas', 'surface-0', 'surface-1', 'surface-2', 'surface-3']

describe('SC-04 scroll bar thumb contrast, what the eye sees', () => {
  for (const theme of Object.keys(THEMES) as (keyof typeof THEMES)[]) {
    it(`${theme}: the thumb colour the bar uses is at least 3:1 on every surface and on its track`, () => {
      const thumb = parse(resolve(theme, 'sbar-thumb'))
      expect(thumb.a, 'thumb is opaque').toBe(1)
      const track = parse(resolve(theme, 'sbar-track'))
      for (const s of SURFACES) {
        const bg = parse(resolve(theme, 'color-' + s)).rgb
        expect(
          ratio(thumb.rgb, bg),
          `${theme} thumb on ${s}`,
        ).toBeGreaterThanOrEqual(3)
        // The track is drawn over the surface; the thumb over the track.
        expect(
          ratio(thumb.rgb, over(track, bg)),
          `${theme} thumb on track on ${s}`,
        ).toBeGreaterThanOrEqual(3)
      }
    })
    it(`${theme}: the hover / press colour is stronger than the rest colour`, () => {
      const rest = parse(resolve(theme, 'sbar-thumb')).rgb
      const hover = parse(resolve(theme, 'sbar-thumb-hover')).rgb
      const bg = parse(resolve(theme, 'color-surface-0')).rgb
      expect(ratio(hover, bg)).toBeGreaterThan(ratio(rest, bg))
    })
  }
})
