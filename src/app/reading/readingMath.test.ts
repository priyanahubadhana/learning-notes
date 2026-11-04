import { describe, expect, it } from 'vitest'
import {
  clampPage,
  countWords,
  minutesLeft,
  pageCount,
  pagedProgress,
  scrollProgress,
  swipeDirection,
  tapZone,
  WORDS_PER_MINUTE,
} from './readingMath'
import {
  colorsFor,
  READING_THEMES,
  THEME_COLORS,
  TEXT_SIZES,
} from './readingPrefs'
import { makeChunks, wordAt, chunkIndexAt } from './speechChunks'
import { readingOrder } from './nextPage'
import type { Page } from '../../core/types'

describe('progress and time left', () => {
  it('counts words in any script', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('  one two\nthree ')).toBe(3)
  })

  it('says about how many minutes are left, never 0 while text is left', () => {
    expect(minutesLeft(WORDS_PER_MINUTE * 10, 0)).toBe(10)
    expect(minutesLeft(WORDS_PER_MINUTE * 10, 0.5)).toBe(5)
    expect(minutesLeft(100, 0.1)).toBe(1)
    expect(minutesLeft(100, 1)).toBe(0)
    expect(minutesLeft(0, 0)).toBe(0)
  })

  it('scroll progress is 0 at the top, 1 at the end, and 1 when nothing scrolls', () => {
    expect(scrollProgress(0, 2000, 800)).toBe(0)
    expect(scrollProgress(1200, 2000, 800)).toBe(1)
    expect(scrollProgress(600, 2000, 800)).toBe(0.5)
    expect(scrollProgress(0, 500, 800)).toBe(1)
  })

  it('paged progress runs from the first page to the last', () => {
    expect(pagedProgress(0, 5)).toBe(0)
    expect(pagedProgress(4, 5)).toBe(1)
    expect(pagedProgress(0, 1)).toBe(1)
    expect(pageCount(2400, 800)).toBe(3)
    expect(pageCount(100, 800)).toBe(1)
    expect(clampPage(9, 3)).toBe(2)
    expect(clampPage(-1, 3)).toBe(0)
  })

  it('taps: the edges turn pages, the middle shows the controls', () => {
    expect(tapZone(10, 400)).toBe('previous')
    expect(tapZone(390, 400)).toBe('next')
    expect(tapZone(200, 400)).toBe('middle')
  })

  it('swipes need to be long and mostly sideways', () => {
    expect(swipeDirection(-80, 5)).toBe('next')
    expect(swipeDirection(80, 5)).toBe('previous')
    expect(swipeDirection(-20, 0)).toBeNull()
    expect(swipeDirection(-60, 60)).toBeNull()
  })
})

describe('themes', () => {
  const ratio = (a: string, b: string) => {
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => {
        const v = parseInt(hex.slice(i, i + 2), 16) / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
    }
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
    return (x + 0.05) / (y + 0.05)
  }

  it('text, quiet text and the spoken word all pass AA contrast in every theme', () => {
    for (const [name, c] of Object.entries(THEME_COLORS)) {
      expect(ratio(c.fg, c.bg), `${name} text`).toBeGreaterThanOrEqual(4.5)
      expect(ratio(c.soft, c.bg), `${name} quiet`).toBeGreaterThanOrEqual(4.5)
      expect(ratio(c.markText, c.mark), `${name} mark`).toBeGreaterThanOrEqual(
        4.5,
      )
    }
  })

  it('the app theme follows Day, Night and Sepia', () => {
    expect(colorsFor('app', 'night')).toBe(THEME_COLORS.night)
    expect(colorsFor('app', 'sepia')).toBe(THEME_COLORS.sepia)
    expect(colorsFor('app', 'day')).toBe(THEME_COLORS.day)
    expect(colorsFor('paper', 'night')).toBe(THEME_COLORS.paper)
    expect(READING_THEMES).toContain('contrast')
    expect(TEXT_SIZES[0]).toBeLessThan(100)
  })
})

describe('speech pieces', () => {
  it('splits at sentence ends and new lines', () => {
    const chunks = makeChunks('One two. Three four!\nFive')
    expect(chunks.map((c) => c.text)).toEqual([
      'One two.',
      'Three four!',
      'Five',
    ])
  })

  it('every piece points at its place in the text', () => {
    const text = 'Alpha beta. Gamma.'
    for (const c of makeChunks(text)) {
      expect(text.slice(c.start, c.end)).toBe(c.text)
    }
  })

  it('starts at an offset (the word that was tapped)', () => {
    const text = 'First sentence. Second sentence here.'
    const chunks = makeChunks(text, text.indexOf('Second'))
    expect(chunks[0].text).toBe('Second sentence here.')
    expect(chunkIndexAt(makeChunks(text), text.indexOf('Second'))).toBe(1)
  })

  it('cuts a very long sentence so no piece is too long', () => {
    const text = Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ')
    const chunks = makeChunks(text, 0, 100)
    expect(chunks.length).toBeGreaterThan(3)
    expect(chunks.every((c) => c.text.length <= 100)).toBe(true)
  })

  it('finds the word at an offset', () => {
    expect(wordAt('hello big world', 7)).toEqual([6, 9])
    expect(wordAt('hello big world', 5)).toEqual([0, 5])
  })

  it('handles Hindi and Spanish sentence marks', () => {
    expect(makeChunks('यह पहला है। यह दूसरा है।').length).toBe(2)
    expect(makeChunks('¿Qué tal? Muy bien.').length).toBe(2)
  })
})

describe('reading order (next page)', () => {
  const page = (id: string, parentId: string | null) =>
    ({ id, parentId }) as Page
  it('goes into sub-pages before the next sibling', () => {
    const pages = [
      page('a', null),
      page('b', null),
      page('a1', 'a'),
      page('a2', 'a'),
    ]
    expect(readingOrder(pages).map((p) => p.id)).toEqual(['a', 'a1', 'a2', 'b'])
  })
})
