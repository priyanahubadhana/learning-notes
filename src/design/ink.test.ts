import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEFAULT_INK, displayInk, INK_AUTO } from './ink'

const css = (f: string) => readFileSync(`src/design/${f}`, 'utf8')
const night = (src: string) =>
  src.slice(
    src.indexOf(":root[data-theme='night'] {", src.indexOf('Card frame')),
  )

describe('displayInk (v9: the default ink follows the page, 2A.5)', () => {
  it('shows the default black pen through the theme token', () => {
    expect(displayInk(DEFAULT_INK)).toBe(INK_AUTO)
    expect(displayInk('#1D1D1F')).toBe(INK_AUTO)
  })
  it('leaves every other colour as chosen, and never rewrites anything', () => {
    expect(displayInk('#c62828')).toBe('#c62828')
    expect(displayInk('#000000')).toBe('#000000')
  })
})

describe('dark tokens (audit-toolbar-2026-11-15, 3 points)', () => {
  const tokens = css('tokens.css')
  it('defines a light default ink in dark and a dark one in day and sepia', () => {
    expect(tokens).toMatch(/--ink-auto: #1d1d1f/)
    expect(night(tokens)).toMatch(/--ink-auto: #ececee/)
  })
  it('gives dark a raised thumb and a white knob (v9 --thumb, --knob)', () => {
    const n = night(tokens)
    expect(n).toMatch(/--card-thumb: #4a4955/)
    expect(n).toMatch(/--card-knob: #fff/)
    expect(tokens).toMatch(/--card-knob:/)
  })
})

describe('shared parts sit in wells with raised thumbs', () => {
  it('switch knob, segmented thumb, slider and tile use the tokens', () => {
    const card = css('parts/Card.css')
    expect(card).toMatch(/\.pcard-switch::after \{[^}]*var\(--card-knob\)/)
    expect(card).toMatch(/\.pcard-tile \{[^}]*background: var\(--card-well\)/)
    const onoff = css('parts/OnOff.css')
    expect(onoff).toMatch(/\.onoff-choice \{[^}]*var\(--card-well\)/)
    expect(onoff).toMatch(
      /\.onoff-opt\[aria-checked='true'\] \{[^}]*var\(--card-thumb\)/,
    )
    expect(onoff).toMatch(/\.onoff-thumb \{[^}]*var\(--card-knob\)/)
  })
})
