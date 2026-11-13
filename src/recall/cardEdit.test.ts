import { describe, expect, it } from 'vitest'
import { isPlainQuestion, questionText, withQuestion } from './cardEdit'

describe('card editor question helpers (ST2)', () => {
  it('plain text runs can be rewritten', () => {
    const runs = [{ type: 'text', text: 'Why?', styles: {} }]
    expect(isPlainQuestion(runs)).toBe(true)
    expect(isPlainQuestion(undefined)).toBe(true)
    expect(questionText({ text: runs })).toBe('Why?')
  })

  it('styled, linked or blank runs are kept as they are', () => {
    expect(
      isPlainQuestion([{ type: 'text', text: 'x', styles: { bold: true } }]),
    ).toBe(false)
    expect(isPlainQuestion([{ type: 'link', href: 'a', content: [] }])).toBe(
      false,
    )
    expect(
      isPlainQuestion([{ type: 'text', text: 'x', styles: { blank: 'b1' } }]),
    ).toBe(false)
  })

  it('withQuestion keeps the other content fields', () => {
    const next = withQuestion({ text: [], keep: 1 }, 'New?')
    expect(next).toEqual({
      keep: 1,
      text: [{ type: 'text', text: 'New?', styles: {} }],
    })
    expect(withQuestion({ text: [] }, '').text).toEqual([])
  })
})
