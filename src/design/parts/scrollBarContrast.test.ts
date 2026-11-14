import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Design check 14 Nov: the scroll bar thumb (--color-muted) is at least 3:1
 * against the surfaces it sits on, in Light, Dark and Sepia. Measured from the
 * real tokens (4.95 to 6.41 on 14 Nov).
 */
const css = readFileSync('src/design/tokens.css', 'utf8')
const lum = (hex: string) => {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
/** The first block that starts with `selector`. */
const block = (selector: string) => {
  const at = css.indexOf(selector)
  return css.slice(at, css.indexOf('\n}', at))
}
const token = (b: string, name: string) =>
  new RegExp(`--color-${name}: *(#[0-9a-fA-F]{6})`).exec(b)?.[1] ?? ''

describe('scroll bar thumb contrast', () => {
  for (const [theme, selector] of [
    ['Light', '@theme static {'],
    ['Dark', ":root[data-theme='night'] {"],
    ['Sepia', ":root[data-theme='sepia'] {"],
  ] as const) {
    it(`${theme}: thumb against the surfaces is at least 3:1`, () => {
      const b = block(selector)
      const muted = token(b, 'muted')
      expect(muted).not.toBe('')
      for (const s of ['surface-1', 'surface-2']) {
        const bg = token(b, s)
        expect(bg, s).not.toBe('')
        expect(ratio(muted, bg), `${theme} ${s}`).toBeGreaterThanOrEqual(3)
      }
    })
  }
})
