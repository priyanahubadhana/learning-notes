import { describe, expect, it } from 'vitest'
import { renderMath } from './render'
import {
  CATEGORIES,
  insertSnippet,
  PALETTE,
  SLOT,
  snippetLabel,
} from './snippets'

describe('insertSnippet', () => {
  it('puts the cursor in the first slot', () => {
    expect(insertSnippet('', 0, 0, '\\frac{@@}{}')).toEqual({
      value: '\\frac{}{}',
      caret: 6,
    })
  })

  it('wraps the selected text in the slot', () => {
    const r = insertSnippet('a+b', 0, 3, '\\sqrt{@@}')
    expect(r.value).toBe('\\sqrt{a+b}')
    expect(r.caret).toBe(9)
  })

  it('adds a slotless snippet at the cursor and moves past it', () => {
    const r = insertSnippet('x=', 2, 2, '\\pm ')
    expect(r).toEqual({ value: 'x=\\pm ', caret: 6 })
  })

  it('replaces a backwards selection too', () => {
    expect(insertSnippet('abcd', 3, 1, '^{@@}').value).toBe('a^{bc}d')
  })
})

describe('palette', () => {
  it('every button has LaTeX that KaTeX accepts, with at most one slot', () => {
    for (const category of CATEGORIES) {
      expect(PALETTE[category].length).toBeGreaterThan(5)
      for (const snippet of PALETTE[category]) {
        expect(snippet.tex.split(SLOT).length).toBeLessThanOrEqual(2)
        expect(renderMath(snippetLabel(snippet), false).ok, snippet.tex).toBe(
          true,
        )
        expect(renderMath(snippet.tex.replace(SLOT, 'x')).ok, snippet.tex).toBe(
          true,
        )
      }
    }
  })
})

describe('renderMath', () => {
  it('draws a fraction as HTML with maths text for screen readers', () => {
    const r = renderMath('\\frac{a}{b}')
    expect(r.ok).toBe(true)
    expect(r.html).toContain('katex')
    expect(r.html).toContain('<math')
  })

  it('shows broken LaTeX as an error instead of failing', () => {
    const r = renderMath('\\frac{a')
    expect(r.ok).toBe(false)
    expect(r.html).toContain('katex-error')
  })

  it('never turns a formula into a link or raw HTML', () => {
    const r = renderMath('\\href{https://evil.example}{x}')
    expect(r.html).not.toContain('<a ')
    expect(renderMath('\\htmlClass{x}{y}').html).not.toContain('class="x"')
    expect(renderMath('<img src=x onerror=alert(1)>').html).not.toContain(
      '<img',
    )
  })
})
