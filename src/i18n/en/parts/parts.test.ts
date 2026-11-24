import { describe, expect, it } from 'vitest'
import { enLate } from '../late'
import { enParts } from '.'

describe('shared parts words', () => {
  it('are registered with the late English texts, word for word', () => {
    for (const [key, text] of Object.entries(enParts))
      expect((enLate as Record<string, string>)[key]).toBe(text)
  })

  it('do not clash with any other late key', () => {
    const others = Object.keys(enLate).filter((k) => !(k in enParts))
    expect(others.filter((k) => k.startsWith('parts.'))).toEqual([])
  })
})
