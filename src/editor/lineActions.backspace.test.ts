import { describe, expect, it } from 'vitest'
import { keepLength } from './lineActions'

describe('keepLength (what stays after ⌫)', () => {
  it('drops one character', () => expect(keepLength('hello', 'char')).toBe(4))
  it('drops a whole emoji, not half of it', () =>
    expect(keepLength('a😀', 'char')).toBe(1))
  it('drops the last word and the space before it', () => {
    expect(keepLength('one two', 'word')).toBe(4)
    expect(keepLength('one two  ', 'word')).toBe(4)
  })
  it('handles an empty start', () => expect(keepLength('', 'char')).toBe(0))
})
