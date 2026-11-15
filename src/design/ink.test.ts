import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEFAULT_INK, displayInk, INK_AUTO } from './ink'

const css = (f: string) => readFileSync(`src/design/${f}`, 'utf8')
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

describe('dark tokens (audit-toolbar-2026-11-15, 3 points), only with data-v9', () => {
  const tokens = css('tokens.css')
  it('keeps the default ink dark everywhere and light only in the v9 night block', () => {
    expect(tokens).toMatch(/--ink-auto: #1d1d1f/)
    const v9 = tokens.slice(
      tokens.indexOf(":root[data-v9][data-theme='night']"),
    )
    expect(v9).toMatch(/--ink-auto: #ececee/)
    expect(v9).toMatch(/--v9-thumb: #4a4955/)
    expect(v9).toMatch(/--v9-knob: #fff/)
  })
})

describe('shared parts sit in wells with raised thumbs (fallback = today)', () => {
  it('switch knob, segmented thumb, tile use the v9 tokens with old fallbacks', () => {
    const card = css('parts/Card.css')
    expect(card).toContain('var(--v9-knob, var(--color-surface-0))')
    expect(card).toContain('var(--v9-tile, transparent)')
    const onoff = css('parts/OnOff.css')
    expect(onoff).toContain('var(--v9-well, var(--color-neutral-fill))')
    expect(onoff).toContain('var(--v9-thumb, var(--color-surface-0))')
  })
})
