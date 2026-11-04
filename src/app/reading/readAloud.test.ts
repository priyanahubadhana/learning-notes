// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOUNDARY_WAIT_MS, ReadAloud, type SpeechText } from './readAloud'

/** A pretend speechSynthesis that lets the test play the events. */
class FakeUtterance {
  rate = 1
  voice: unknown = null
  lang = ''
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onboundary: ((e: { name: string; charIndex: number }) => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  text: string
  constructor(text: string) {
    this.text = text
  }
}

let spoken: FakeUtterance[] = []
let speaking = false
let paused = false
let cancels = 0

beforeEach(() => {
  vi.useFakeTimers()
  spoken = []
  speaking = false
  paused = false
  cancels = 0
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speak: (u: FakeUtterance) => {
        spoken.push(u)
        speaking = true
      },
      cancel: () => {
        cancels++
        speaking = false
      },
      pause: () => (paused = true),
      resume: () => (paused = false),
      getVoices: () => [{ voiceURI: 'v1', lang: 'en-GB', name: 'Daniel' }],
      get speaking() {
        return speaking
      },
      get paused() {
        return paused
      },
    },
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function source(text: string) {
  const words: [number, number][] = []
  const sentences: [number, number][] = []
  let cleared = 0
  const s: SpeechText & {
    words: typeof words
    sentences: typeof sentences
    cleared: () => number
  } = {
    text,
    words,
    sentences,
    cleared: () => cleared,
    markWord: (a, b) => words.push([a, b]),
    markSentence: (a, b) => sentences.push([a, b]),
    clearMarks: () => cleared++,
  }
  return s
}

const opts = { rate: 1, voiceURI: '' }

describe('ReadAloud', () => {
  it('speaks piece by piece and marks the spoken word at its place in the text', () => {
    const src = source('One two. Three four.')
    const finished = vi.fn()
    const r = new ReadAloud(src, opts, { finished })
    r.start()
    expect(spoken.map((u) => u.text)).toEqual(['One two.'])
    spoken[0].onstart?.()
    spoken[0].onboundary?.({ name: 'word', charIndex: 4 })
    expect(src.words).toEqual([[4, 8]])
    spoken[0].onend?.()
    expect(spoken[1].text).toBe('Three four.')
    spoken[1].onboundary?.({ name: 'word', charIndex: 6 })
    expect(src.words[1]).toEqual([9 + 6, 9 + 11])
    spoken[1].onend?.()
    expect(finished).toHaveBeenCalledOnce()
    expect(r.state).toBe('idle')
    r.dispose()
  })

  it('starts from a tapped place', () => {
    const src = source('First one. Second one.')
    const r = new ReadAloud(src, opts)
    r.start(src.text.indexOf('Second'))
    expect(spoken[0].text).toBe('Second one.')
    r.dispose()
  })

  it('uses the chosen speed (kept between 0.5 and 2) and voice', () => {
    const src = source('Hello there.')
    const r = new ReadAloud(src, { rate: 5, voiceURI: 'v1' })
    r.start()
    expect(spoken[0].rate).toBe(2)
    expect(spoken[0].lang).toBe('en-GB')
    r.configure({ rate: 0.1 })
    expect(spoken[1].rate).toBe(0.5) // restarted with the new speed
    r.dispose()
  })

  it('falls back to marking the sentence when no word boundaries come (Safari)', () => {
    const src = source('No boundaries here.')
    const r = new ReadAloud(src, opts)
    r.start()
    spoken[0].onstart?.()
    vi.advanceTimersByTime(BOUNDARY_WAIT_MS + 50)
    expect(src.sentences).toEqual([[0, 19]])
    expect(src.words).toEqual([])
    r.dispose()
  })

  it('does not fall back when boundaries do come', () => {
    const src = source('Boundaries here.')
    const r = new ReadAloud(src, opts)
    r.start()
    spoken[0].onstart?.()
    spoken[0].onboundary?.({ name: 'word', charIndex: 0 })
    vi.advanceTimersByTime(BOUNDARY_WAIT_MS + 50)
    expect(src.sentences).toEqual([])
    r.dispose()
  })

  it('pause stops speaking and resume says the piece again', () => {
    const src = source('A long piece. Another.')
    const r = new ReadAloud(src, opts)
    r.start()
    r.pause()
    expect(r.state).toBe('paused')
    expect(speaking).toBe(false)
    r.resume()
    expect(r.state).toBe('playing')
    expect(spoken.at(-1)?.text).toBe('A long piece.')
    r.dispose()
  })

  it('ignores the errors our own cancel causes, and skips a piece that fails', () => {
    const src = source('First. Second.')
    const r = new ReadAloud(src, opts)
    r.start()
    spoken[0].onerror?.({ error: 'canceled' })
    expect(spoken).toHaveLength(1)
    spoken[0].onerror?.({ error: 'synthesis-failed' })
    expect(spoken.at(-1)?.text).toBe('Second.')
    r.dispose()
  })

  it('an old piece cannot move the reading after a newer one started', () => {
    const src = source('One. Two. Three.')
    const r = new ReadAloud(src, opts)
    r.start()
    const old = spoken[0]
    r.configure({ rate: 1.5 }) // restarts piece one
    old.onend?.() // the cancelled one ends late
    expect(spoken.map((u) => u.text)).toEqual(['One.', 'One.'])
    r.dispose()
  })

  it('goes on after the screen was locked and speech died', () => {
    const src = source('Keep going. Please.')
    const r = new ReadAloud(src, opts)
    r.start()
    speaking = false // the system stopped it
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(spoken).toHaveLength(2)
    expect(spoken[1].text).toBe('Keep going.')
    r.dispose()
  })

  it('also restarts when the system left it paused', () => {
    const src = source('Paused by the system.')
    const r = new ReadAloud(src, opts)
    r.start()
    paused = true
    document.dispatchEvent(new Event('visibilitychange'))
    expect(spoken).toHaveLength(2)
    r.dispose()
  })

  it('stop clears the marks and nothing more is spoken', () => {
    const src = source('One. Two.')
    const r = new ReadAloud(src, opts)
    r.start()
    r.stop()
    expect(r.state).toBe('idle')
    expect(src.cleared()).toBeGreaterThan(0)
    spoken[0].onend?.()
    expect(spoken).toHaveLength(1)
    expect(cancels).toBeGreaterThan(0)
    r.dispose()
  })
})
