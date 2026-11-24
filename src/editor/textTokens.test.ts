import { describe, expect, it } from 'vitest'
import { charKind, tokenAround, tokenSpans } from './textTokens'

/** The owner's line from the combined test (C5). */
const LINE = 'Text ① → 6, a/b'
const pick = (text: string, r: [number, number] | null) =>
  r ? text.slice(r[0], r[1]) : null

describe('charKind (C5)', () => {
  it('letters, digits, circled numbers, accents and vowel signs are word', () => {
    for (const ch of ['a', 'Ä', '6', '①', '②', 'क', 'ि', '’', '-', '_'])
      expect(charKind(ch), ch).toBe('word')
  })
  it('arrows, commas, slashes and other marks are symbols', () => {
    for (const ch of ['→', ',', '/', '.', '(', '*', '•', '✓', '=', '>'])
      expect(charKind(ch), ch).toBe('symbol')
  })
  it('spaces (also no-break space and the line-break blank) split', () => {
    for (const ch of [' ', ' ', '\t', undefined])
      expect(charKind(ch)).toBe('space')
  })
  it('with symbols off a vowel sign is not a word letter (old rule)', () => {
    expect(charKind('ि', false)).toBe('symbol')
  })
})

describe('tokenAround (double tap)', () => {
  it('a symbol is selected by itself, never the word next to it', () => {
    const at = (s: string) => LINE.indexOf(s)
    expect(pick(LINE, tokenAround(LINE, at('→'), true, 'after'))).toBe('→')
    expect(pick(LINE, tokenAround(LINE, at('→') + 1, true, 'before'))).toBe('→')
    expect(pick(LINE, tokenAround(LINE, at(','), true, 'after'))).toBe(',')
    expect(pick(LINE, tokenAround(LINE, at('/'), true, 'after'))).toBe('/')
    expect(pick(LINE, tokenAround(LINE, at('①'), true, 'after'))).toBe('①')
    expect(pick(LINE, tokenAround(LINE, at('6'), true, 'after'))).toBe('6')
  })
  it('neighbouring symbols go together ("//", "->", "?!")', () => {
    const t = 'see // here -> there?!'
    expect(pick(t, tokenAround(t, t.indexOf('//') + 1, true))).toBe('//')
    expect(pick(t, tokenAround(t, t.indexOf('>'), true, 'after'))).toBe('->')
    expect(pick(t, tokenAround(t, t.indexOf('?'), true, 'after'))).toBe('?!')
  })
  it("a join (- ’ ') inside a word stays a word; elsewhere it is a symbol", () => {
    const t = "a -> b, it’s well-known, 'hi'"
    expect(pick(t, tokenAround(t, 2, true, 'after'))).toBe('->')
    expect(pick(t, tokenAround(t, t.indexOf('’'), true))).toBe('it’s')
    expect(pick(t, tokenAround(t, t.indexOf('-k'), true))).toBe('well-known')
    expect(pick(t, tokenAround(t, t.indexOf("'"), true, 'after'))).toBe("'")
    // The old rule (switch off) is unchanged: "-" was always a word letter.
    expect(pick(t, tokenAround(t, 2, false, 'after'))).toBe('-')
  })
  it('a word still wins when the lean is not known', () => {
    expect(pick(LINE, tokenAround(LINE, LINE.indexOf(','), true))).toBe('6')
    expect(pick(LINE, tokenAround(LINE, 2, true))).toBe('Text')
  })
  it('on a space alone: nothing', () => {
    expect(tokenAround('a  b', 2, true)).toBeNull()
  })
  it('with symbols off a symbol selects nothing (old rule)', () => {
    expect(tokenAround(LINE, LINE.indexOf('→'), false, 'after')).toBeNull()
    expect(pick(LINE, tokenAround(LINE, 2, false))).toBe('Text')
  })
  it('Hindi words with vowel signs are one word', () => {
    const t = 'किताब पढ़ो'
    expect(pick(t, tokenAround(t, 1, true))).toBe('किताब')
  })
})

describe('tokenSpans (Lasso Text pick)', () => {
  it('lists words and symbol runs in order', () => {
    expect(tokenSpans(LINE, true).map((r) => pick(LINE, r))).toEqual([
      'Text',
      '①',
      '→',
      '6',
      ',',
      'a',
      '/',
      'b',
    ])
  })
  it('with symbols off only the words', () => {
    expect(tokenSpans(LINE, false).map((r) => pick(LINE, r))).toEqual([
      'Text',
      '①',
      '6',
      'a',
      'b',
    ])
  })
})
