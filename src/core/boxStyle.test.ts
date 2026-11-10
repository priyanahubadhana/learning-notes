import { describe, expect, it } from 'vitest'
import {
  cleanStyle,
  frameCss,
  isOwnPresets,
  isStyleValue,
  NAMED_PRESETS,
  SWATCHES,
  tokenCss,
} from './boxStyle'

describe('box style', () => {
  it('drops unknown keys and snaps values to the grid', () => {
    expect(
      cleanStyle({ bg: 'lime', hack: 'x', radius: 9, pad: 5, borderW: 7 }),
    ).toEqual({ bg: 'lime', radius: 8, pad: 4, borderW: 3 })
    expect(cleanStyle({ hack: 1 })).toBeUndefined()
    expect(cleanStyle('red')).toBeUndefined()
  })
  it('keeps colours as token names only, never hex', () => {
    expect(cleanStyle({ bg: '#ff0000' })).toBeUndefined()
    expect(cleanStyle({ bg: 'red', border: 'nope' })).toEqual({ bg: 'red' })
    for (const p of [...SWATCHES, ...NAMED_PRESETS])
      expect(JSON.stringify(p.style)).not.toMatch(/#[0-9a-f]{3}/i)
  })
  it('turns a style into CSS that uses theme variables', () => {
    const css = frameCss({
      bg: 'lime',
      border: 'line',
      borderW: 2,
      radius: 12,
      shadow: true,
    })
    expect(css.backgroundColor).toContain('var(--color-surface-0)')
    expect(css.border).toBe('2px solid var(--color-line-strong)')
    expect(css.borderRadius).toBe('12px')
    expect(css.boxShadow).toBeTruthy()
    expect(frameCss(undefined)).toEqual({})
    expect(tokenCss('none')).toBeUndefined()
  })
  it('checks stored values and saved presets', () => {
    expect(isStyleValue(undefined)).toBe(true)
    expect(isStyleValue({ bg: 'red' })).toBe(true)
    expect(isStyleValue([])).toBe(false)
    expect(isStyleValue({ foo: 1 })).toBe(false)
    expect(
      isOwnPresets([{ id: 'a', name: 'Mine', style: { bg: 'red' } }]),
    ).toBe(true)
    expect(
      isOwnPresets(Array(9).fill({ id: 'a', name: 'x', style: { bg: 'red' } })),
    ).toBe(false)
  })
})
