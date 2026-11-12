// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReadAloud, type SpeechText } from '../../app/reading/readAloud'
import { setListenSleep, sleepChoice } from './listen'

class FakeUtterance {
  rate = 1
  voice: { voiceURI: string } | null = null
  lang = ''
  onstart = null
  onend = null
  onboundary = null
  onerror = null
  text: string
  constructor(text: string) {
    this.text = text
  }
}

const spoken: FakeUtterance[] = []
const voices = [
  { voiceURI: 'net', lang: 'en-US', name: 'Google', localService: false },
  { voiceURI: 'loc', lang: 'en-US', name: 'Samantha', localService: true },
]

const text = (): SpeechText & { text: string } => ({
  text: 'Hello there. Second one.',
  markWord: () => {},
  markSentence: () => {},
  clearMarks: () => {},
})

beforeEach(() => {
  vi.useFakeTimers()
  spoken.length = 0
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speak: (u: FakeUtterance) => spoken.push(u),
      cancel: () => {},
      pause: () => {},
      resume: () => {},
      getVoices: () => voices,
      speaking: false,
      paused: false,
    },
  })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Listen uses only the device voices (fake speechSynthesis)', () => {
  it('never speaks with a network voice, even if it was chosen before', () => {
    const r = new ReadAloud(
      text(),
      { rate: 1, voiceURI: 'net', lang: 'en', localOnly: true },
      {},
    )
    r.start(0)
    expect(spoken).toHaveLength(1)
    expect(spoken[0].voice?.voiceURI).toBe('loc')
  })

  it('uses the chosen on-device voice', () => {
    const r = new ReadAloud(
      text(),
      { rate: 1, voiceURI: 'loc', lang: 'en', localOnly: true },
      {},
    )
    r.start(0)
    expect(spoken[0].voice?.voiceURI).toBe('loc')
  })

  it('speaks nothing and says so when no on-device voice fits the language', () => {
    const only = [voices[0]]
    Object.defineProperty(window.speechSynthesis, 'getVoices', {
      configurable: true,
      value: () => only,
    })
    const noVoice = vi.fn()
    const state = vi.fn()
    const r = new ReadAloud(
      text(),
      { rate: 1, voiceURI: 'net', lang: 'en', localOnly: true },
      { noVoice, state },
    )
    r.start(0)
    expect(spoken).toHaveLength(0)
    expect(noVoice).toHaveBeenCalledTimes(1)
    expect(r.state).toBe('idle')
  })

  it('without the option the engine is unchanged (notes keep working)', () => {
    const r = new ReadAloud(text(), { rate: 1, voiceURI: 'net' }, {})
    r.start(0)
    expect(spoken[0].voice?.voiceURI).toBe('net')
  })
})

describe('Listen sleep timer', () => {
  it('goes back to off when the time is up', () => {
    setListenSleep(10)
    expect(sleepChoice.get()).toBe(10)
    vi.advanceTimersByTime(10 * 60_000 + 10)
    expect(sleepChoice.get()).toBe('off')
  })
  it('choosing Off cancels it', () => {
    setListenSleep(10)
    setListenSleep('off')
    vi.advanceTimersByTime(11 * 60_000)
    expect(sleepChoice.get()).toBe('off')
  })
})
