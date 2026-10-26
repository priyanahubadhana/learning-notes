import { describe, expect, it } from 'vitest'
import type { JsonObject } from '../core/types'
import { plainText } from '../editor/mapping'
import { blockText, fold, searchWords } from './searchText'

describe('fold', () => {
  it('ignores case and accents', () => {
    expect(fold('Café NAÏVE Ñandú')).toBe('cafe naive nandu')
  })

  it('folds Turkish dotted capital I to i', () => {
    expect(fold('İstanbul')).toBe('istanbul')
  })

  it('keeps letters that need their marks (Hindi, Korean)', () => {
    expect(fold('क्षमा')).toBe('क्षमा')
    expect(fold('한국어')).toBe('한국어')
  })

  it('drops optional Arabic vowel marks', () => {
    expect(fold('كَتَبَ')).toBe('كتب')
  })
})

describe('searchWords', () => {
  it('splits into folded words, each once, without punctuation', () => {
    expect(searchWords('The cell, the CELL — and ATP!')).toEqual([
      'the',
      'cell',
      'and',
      'atp',
    ])
  })

  it('splits languages written without spaces', () => {
    expect(searchWords('東京に行きます').length).toBeGreaterThan(1)
  })

  it('has no words for text without letters or digits', () => {
    expect(searchWords('  — !? … ')).toEqual([])
  })

  it('keeps digits', () => {
    expect(searchWords('Lesson 12')).toEqual(['lesson', '12'])
  })
})

describe('blockText', () => {
  it('reads rich text, links and table cells at any depth, plus captions', () => {
    const content: JsonObject = {
      text: [
        { type: 'text', text: 'See ', styles: {} },
        { type: 'link', href: 'x', content: [{ type: 'text', text: 'docs' }] },
      ],
      caption: 'Figure one',
    }
    expect(blockText(content)).toBe('See  docs Figure one')
    const table = {
      text: {
        type: 'tableContent',
        rows: [{ cells: [plainText('alpha'), plainText('beta')] }],
      },
    }
    expect(searchWords(blockText(table))).toEqual(['alpha', 'beta'])
  })
})
