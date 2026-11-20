// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clipboardAsk,
  forgetAppCopy,
  pasteFailedMessage,
  pasteRefusedMessage,
  readClipboardData,
  rememberAppCopy,
} from './appClipboard'

type Clip = {
  read?: () => Promise<unknown[]>
  readText?: () => Promise<string>
}
const setClipboard = (c: Clip) =>
  Object.defineProperty(navigator, 'clipboard', {
    value: c,
    configurable: true,
  })
const refuse = () => Promise.reject(new DOMException('no', 'NotAllowedError'))

beforeEach(() => {
  forgetAppCopy()
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('C0-4 the app keeps its own copies (owner choice A)', () => {
  it('C0-4 an in-app copy pastes without reading the system clipboard', async () => {
    const read = vi.fn(refuse)
    const readText = vi.fn(refuse)
    setClipboard({ read, readText })
    rememberAppCopy('<p>x</p>', 'x')
    expect(await readClipboardData()).toEqual({
      html: '<p>x</p>',
      text: 'x',
      own: false,
    })
    expect(read).not.toHaveBeenCalled()
    expect(readText).not.toHaveBeenCalled()
  })

  it('C0-4 a normal copy event in the page is kept too', async () => {
    setClipboard({ read: refuse, readText: refuse })
    const e = new Event('copy', { bubbles: true }) as ClipboardEvent
    Object.defineProperty(e, 'clipboardData', {
      value: {
        getData: (type: string) => (type === 'text/plain' ? 'from event' : ''),
      },
    })
    document.body.dispatchEvent(e)
    expect((await readClipboardData())?.text).toBe('from event')
  })

  it('C0-4 when the window loses focus the copy is dropped (another app may copy)', async () => {
    const readText = vi.fn(async () => 'from another app')
    setClipboard({ read: undefined, readText })
    rememberAppCopy('', 'mine')
    window.dispatchEvent(new Event('blur'))
    expect((await readClipboardData())?.text).toBe('from another app')
    expect(readText).toHaveBeenCalledTimes(1)
  })

  it('C0-4 a hidden tab drops it too', async () => {
    setClipboard({ readText: async () => 'other' })
    rememberAppCopy('', 'mine')
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    })
    expect((await readClipboardData())?.text).toBe('other')
  })
})

describe('C0-4 C0-6 the system read and Safari bubble', () => {
  it('C0-4 a refusal is final: the plain read is not asked a second time', async () => {
    const readText = vi.fn(async () => 'x')
    setClipboard({ read: refuse, readText })
    expect(await readClipboardData()).toBeNull()
    expect(readText).not.toHaveBeenCalled()
  })

  it('C0-6 while the read waits the line shows after 300 ms, and goes when it ends', async () => {
    let done: (v: unknown[]) => void = () => {}
    setClipboard({ read: () => new Promise((r) => (done = r)) })
    const anchor = document.createElement('button')
    const p = readClipboardData(anchor)
    expect(clipboardAsk.get().phase).toBe('idle')
    await vi.advanceTimersByTimeAsync(301)
    expect(clipboardAsk.get()).toEqual({ phase: 'asking', anchor })
    done([
      {
        types: ['text/plain'],
        getType: async () => new Blob(['hi']),
      },
    ])
    expect((await p)?.text).toBe('hi')
    expect(clipboardAsk.get().phase).toBe('idle')
  })

  it('C0-6 a quick read never shows the line', async () => {
    setClipboard({ readText: async () => 'quick' })
    await readClipboardData(document.createElement('button'))
    await vi.advanceTimersByTimeAsync(400)
    expect(clipboardAsk.get().phase).toBe('idle')
  })
})

describe('C0-4 the refusal words', () => {
  const media = (coarse: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: coarse
        ? q === '(pointer: coarse)'
        : q === '(pointer: fine) and (hover: hover)',
    }))
  afterEach(() => vi.unstubAllGlobals())

  it('C0-4 on an iPad no message names a keyboard shortcut', () => {
    media(true)
    for (const m of [pasteRefusedMessage(), pasteFailedMessage()]) {
      expect(m).toBe(
        'Not pasted yet. Tap Paste again, then tap the black Paste button that pops up.',
      )
      expect(m).not.toMatch(/Ctrl|Cmd|keyboard/i)
    }
  })

  it('C0-4 on a computer with a keyboard the shortcut text stays', () => {
    media(false)
    expect(pasteRefusedMessage()).toMatch(/Ctrl\+Shift\+V/)
    expect(pasteFailedMessage()).toMatch(/keyboard/)
  })
})
