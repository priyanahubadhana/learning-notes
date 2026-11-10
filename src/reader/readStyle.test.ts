import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STYLE,
  cleanStyle,
  dictionaryWord,
  pageSurface,
  pdfFilter,
  styleCss,
  themePreset,
} from './readStyle'

describe('reader style (Aa sheet)', () => {
  it('turns anything stored into a complete valid style', () => {
    expect(cleanStyle(null)).toEqual(DEFAULT_STYLE)
    const s = cleanStyle({ font: 'nope', spacing: 9, page: 'sepia', dim: 20 })
    expect(s.font).toBe('book')
    expect(s.spacing).toBe(1.6)
    expect(s.page).toBe('sepia')
    expect(s.dim).toBe(20)
  })
  it('builds CSS for margins, spacing and alignment', () => {
    const css = styleCss({ ...DEFAULT_STYLE, align: 'justify', margin: 'l' })
    expect(css).toContain('justify')
    expect(css).toContain('4em')
  })
  it('tints a PDF only for coloured pages', () => {
    expect(pdfFilter('theme')).toBe('none')
    expect(pdfFilter('black')).toContain('invert')
    expect(pageSurface('theme')).toBeNull()
    expect(pageSurface('sepia')?.bg).toBe('#f4ecd8')
  })
  it('themes set size, spacing and margins', () => {
    expect(themePreset('low', null).size).toBe(200)
    expect(themePreset('custom', null).size).toBe(100)
  })
  it('takes the first word of a selection for the dictionary', () => {
    expect(dictionaryWord('  "Hello," she said')).toBe('Hello')
    expect(dictionaryWord('123 !!')).toBe('')
  })
})
