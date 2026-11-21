import { describe, expect, it, vi } from 'vitest'
import { errorKind, startDictation, type DictationError } from './dictation'

class Fake {
  static all: Fake[] = []
  lang = ''
  continuous = false
  interimResults = false
  onstart: (() => void) | null = null
  onresult: ((e: unknown) => void) | null = null
  onerror: ((e: { error?: string }) => void) | null = null
  onend: (() => void) | null = null
  started = 0
  constructor() {
    Fake.all.push(this)
  }
  start() {
    this.started++
    this.onstart?.()
  }
  stop() {
    this.onend?.()
  }
}

function setup() {
  Fake.all = []
  const log = {
    said: [] as string[],
    interim: [] as string[],
    on: [] as boolean[],
    errors: [] as DictationError[],
    closed: 0,
  }
  const d = startDictation({
    ctor: Fake as never,
    lang: 'en',
    insert: (t) => log.said.push(t),
    interim: (t) => log.interim.push(t),
    listening: (v) => log.on.push(v),
    error: (k) => log.errors.push(k),
    closed: () => log.closed++,
  })
  return { d, log, r: () => Fake.all[Fake.all.length - 1] }
}
const res = (final: boolean, transcript: string) => ({
  resultIndex: 0,
  results: [{ isFinal: final, 0: { transcript } }],
})

describe('dictation', () => {
  it('shows the guess, then types the final words', () => {
    const { log, r } = setup()
    expect(r().interimResults).toBe(true)
    r().onresult?.(res(false, 'hel'))
    expect(log.interim.at(-1)).toBe('hel')
    expect(log.said).toEqual([])
    r().onresult?.(res(true, 'hello'))
    expect(log.said).toEqual(['hello '])
    expect(log.interim.at(-1)).toBe('')
  })
  it('glows only once the mic is really open, and not after stop', () => {
    const { d, log } = setup()
    expect(log.on).toEqual([true])
    d.stop()
    expect(log.on).toEqual([true, false])
    expect(log.closed).toBe(1)
  })
  it('restarts when the session ends early', () => {
    const { log, r } = setup()
    const first = r()
    first.onend?.()
    expect(Fake.all).toHaveLength(2)
    expect(log.on).toEqual([true, false, true])
    expect(log.closed).toBe(0) // still one session for the strip
  })
  it('gives up after repeated empty sessions', () => {
    const { log, r } = setup()
    for (let i = 0; i < 6; i++) r().onend?.()
    expect(log.errors).toEqual(['other'])
    expect(log.on.at(-1)).toBe(false)
  })
  it('does not restart after stop', () => {
    const { d } = setup()
    d.stop()
    expect(Fake.all).toHaveLength(1)
  })
  it.each([
    ['not-allowed', 'denied'],
    ['service-not-allowed', 'denied'],
    ['network', 'network'],
    ['audio-capture', 'noMic'],
    ['language-not-supported', 'language'],
    ['something-new', 'other'],
  ])('error %s gives %s and no restart', (code, kind) => {
    const { log, r } = setup()
    const cur = r()
    cur.onerror?.({ error: code })
    cur.onend?.()
    expect(log.errors).toEqual([kind])
    expect(Fake.all).toHaveLength(1)
    expect(log.on.at(-1)).toBe(false)
  })
  it('no-speech and aborted are quiet', () => {
    expect(errorKind('no-speech')).toBeNull()
    expect(errorKind('aborted')).toBeNull()
  })
  it('a constructor that throws gives an error', () => {
    const log: string[] = []
    vi.spyOn(Fake.prototype, 'start').mockImplementationOnce(() => {
      throw new Error('x')
    })
    startDictation({
      ctor: Fake as never,
      lang: 'en',
      insert: () => {},
      interim: () => {},
      listening: () => {},
      error: (k) => log.push(k),
      closed: () => {},
    })
    expect(log).toEqual(['other'])
  })
})
