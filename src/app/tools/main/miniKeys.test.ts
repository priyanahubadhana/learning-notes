import { describe, expect, it, vi } from 'vitest'
import { finalText, speechCtor } from './miniKeys'

describe('mini keyboard speech', () => {
  it('keeps only the final phrases', () => {
    const e = {
      resultIndex: 0,
      results: [
        { isFinal: true, 0: { transcript: ' hello there' } },
        { isFinal: false, 0: { transcript: 'wor' } },
      ],
    }
    expect(finalText(e)).toBe('hello there')
  })
  it('has no recognizer where the browser lacks one', () => {
    vi.stubGlobal('window', {})
    expect(speechCtor()).toBeNull()
    class Fake {}
    vi.stubGlobal('window', { webkitSpeechRecognition: Fake })
    expect(speechCtor()).toBe(Fake)
    vi.unstubAllGlobals()
  })
})
