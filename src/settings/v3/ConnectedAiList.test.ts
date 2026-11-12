import { describe, expect, it } from 'vitest'
import { aiListOrder } from './ConnectedAiList'

describe('Connected AI list order (SET-B25)', () => {
  it('lists Claude first whatever else is connected', () => {
    expect(aiListOrder([])).toEqual(['claude'])
    expect(aiListOrder(['openai', 'anthropic', 'gemini', 'openai'])).toEqual([
      'claude',
      'openai',
      'gemini',
    ])
  })
})
