/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { freezeWatchHost } from './slowMomentsSwitch'
import {
  clearSlowMoments,
  readSlowMoments,
  slowMomentsReport,
  startSlowMoments,
} from './slowMoments'

describe('F7 freeze recorder: preview only', () => {
  it('runs on the preview address only, never on the live host', () => {
    expect(freezeWatchHost('build-next.learning-notes-app.pages.dev')).toBe(
      true,
    )
    // Deploy hash addresses can be production builds: never there.
    expect(freezeWatchHost('a1b2c3d4.learning-notes-app.pages.dev')).toBe(false)
    expect(freezeWatchHost('learning-notes-app.pages.dev')).toBe(false)
    expect(freezeWatchHost('example.com')).toBe(false)
    // The test machine only with its switch (for the browser tests).
    expect(freezeWatchHost('localhost')).toBe(false)
    expect(freezeWatchHost('localhost', true)).toBe(true)
    expect(freezeWatchHost('learning-notes-app.pages.dev', true)).toBe(false)
  })
})

describe('F7 freeze recorder: blocks over 500 ms with what was going on', () => {
  let now = 0
  beforeEach(() => {
    clearSlowMoments()
    vi.useFakeTimers()
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    document.body.innerHTML = `
      <div role="dialog" aria-label="Search everything"></div>
      <button aria-label="Open page">x</button>
      <button aria-label="Close search">x</button>`
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('notes a 700 ms block with route, open panel and last action; skips a 300 ms one', () => {
    const stop = startSlowMoments({ minMs: 500 })
    location.hash = '#/page/123'
    document
      .querySelector('button')!
      .dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    now += 400 // 300 ms late: below the freeze line
    vi.advanceTimersByTime(100)
    now += 800 // 700 ms late
    vi.advanceTimersByTime(100)
    stop()
    const list = readSlowMoments()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      kind: 'stall',
      ms: 700,
      route: '#/page/123',
      panel: 'dialog:Search everything',
      action: 'tap button:Open page',
    })
    expect(slowMomentsReport(list)).toContain('panel=dialog:Search everything')
  })

  it('keeps the letter s in labels and names arrow keys', () => {
    const stop = startSlowMoments({ minMs: 500 })
    const close = document.querySelectorAll('button')[1]
    close.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    now += 800
    vi.advanceTimersByTime(100)
    close.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    )
    now += 800
    vi.advanceTimersByTime(100)
    stop()
    const [a, b] = readSlowMoments()
    expect(a.action).toBe('tap button:Close search')
    expect(b.action).toBe('ArrowDown button:Close search')
  })

  it('never records typed text: a key press notes only its kind', () => {
    const stop = startSlowMoments({ minMs: 500 })
    const box = document.createElement('div')
    box.setAttribute('contenteditable', 'true')
    document.body.append(box)
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }))
    now += 1600
    vi.advanceTimersByTime(500)
    stop()
    const [m] = readSlowMoments()
    expect(m.action).toBe('type editor')
    expect(JSON.stringify(m)).not.toContain('"s"')
  })
})
