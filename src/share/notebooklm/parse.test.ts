import { describe, expect, it } from 'vitest'
import {
  kindOfFile,
  looksLikeCards,
  parseFlashcards,
  parseQuiz,
  parseTable,
} from './parse'

describe('kindOfFile', () => {
  it('tells NotebookLM downloads apart', () => {
    expect(kindOfFile('overview.m4a', 'audio/mp4')).toBe('audio')
    expect(kindOfFile('overview.wav', '')).toBe('audio')
    expect(kindOfFile('video.mp4', 'video/mp4')).toBe('video')
    expect(kindOfFile('deck.pdf', 'application/pdf')).toBe('slides')
    expect(kindOfFile('deck.pptx', '')).toBe('slides')
    expect(kindOfFile('map.png', 'image/png')).toBe('picture')
    expect(kindOfFile('cards.csv', 'text/csv')).toBe('csv')
    expect(kindOfFile('x.exe', '')).toBeNull()
  })
})

describe('parseFlashcards', () => {
  it('reads a CSV with a header', () => {
    expect(parseFlashcards('Front,Back\n"A, b",C\nD,E')).toEqual([
      { q: 'A, b', a: 'C' },
      { q: 'D', a: 'E' },
    ])
  })
  it('reads Question/Answer text', () => {
    const t = 'Question: What is ATP?\nAnswer: Energy\n\nQ: Two\nA: Three'
    expect(parseFlashcards(t)).toEqual([
      { q: 'What is ATP?', a: 'Energy' },
      { q: 'Two', a: 'Three' },
    ])
  })
  it('reads a front line then back lines', () => {
    expect(
      parseFlashcards('Mitosis\nCell division\n\nMeiosis\nGametes'),
    ).toEqual([
      { q: 'Mitosis', a: 'Cell division' },
      { q: 'Meiosis', a: 'Gametes' },
    ])
  })
  it('returns nothing for empty text', () => {
    expect(parseFlashcards('  ')).toEqual([])
  })
})

describe('parseQuiz', () => {
  it('uses the answer line or a check mark', () => {
    const t =
      '1. Capital of France?\nA) Rome\nB) Paris\nAnswer: B\n\n2. 2+2?\nA) 4 ✓\nB) 5'
    expect(parseQuiz(t)).toEqual([
      { q: 'Capital of France?\nA) Rome\nB) Paris', a: 'B) Paris' },
      { q: '2+2?\nA) 4\nB) 5', a: 'A) 4' },
    ])
  })
  it('keeps a question with no answer', () => {
    expect(parseQuiz('1. Why?')).toEqual([{ q: 'Why?', a: '' }])
  })
})

describe('parseTable', () => {
  it('reads tab text', () => {
    expect(parseTable('a\tb\n1\t2')).toEqual({
      headers: ['a', 'b'],
      body: [['1', '2']],
    })
  })
  it('reads a Markdown table', () => {
    const r = parseTable('| a | b |\n| --- | --- |\n| 1 | 2 |')
    expect(r).toEqual({ headers: ['a', 'b'], body: [['1', '2']] })
  })
  it('knows card-shaped rows', () => {
    expect(looksLikeCards([['a', 'b']])).toBe(true)
    expect(looksLikeCards([['a', 'b', 'c']])).toBe(false)
  })
})
