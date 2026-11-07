import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  installGestureWatchdog,
  onGestureReset,
  registerToolState,
  resetGestures,
  resetWatchdogForTests,
  toolState,
  toolStateReport,
  type ResetReason,
  type WatchdogWindow,
} from './gestureReset'

/** A fake window and document that remember their listeners. */
function fakeWindow(visibility = 'visible') {
  const win = new Map<string, (e: Event) => void>()
  const doc = new Map<string, (e: Event) => void>()
  const state = { visibility }
  const w: WatchdogWindow = {
    addEventListener: (t, fn) => void win.set(t, fn),
    removeEventListener: (t) => void win.delete(t),
    document: {
      get visibilityState() {
        return state.visibility
      },
      addEventListener: (t, fn) => void doc.set(t, fn),
      removeEventListener: (t) => void doc.delete(t),
    },
  }
  const fire = (where: 'win' | 'doc', type: string) =>
    (where === 'win' ? win : doc).get(type)?.(new Event(type))
  return { w, fire, state, win, doc }
}

beforeEach(() => resetWatchdogForTests())

describe('the gesture watchdog', () => {
  it('runs every reset on hide, show, pageshow, pagehide, focus and blur', () => {
    const seen: ResetReason[] = []
    onGestureReset((r) => seen.push(r))
    const { w, fire, state } = fakeWindow()
    installGestureWatchdog(w)
    state.visibility = 'hidden'
    fire('doc', 'visibilitychange')
    state.visibility = 'visible'
    fire('doc', 'visibilitychange')
    fire('win', 'pageshow')
    fire('win', 'pagehide')
    fire('win', 'focus')
    fire('win', 'blur')
    expect(seen).toEqual([
      'hidden',
      'visible',
      'pageshow',
      'pagehide',
      'focus',
      'blur',
    ])
  })

  it('a reset that throws does not stop the others', () => {
    const ok = vi.fn()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    onGestureReset(() => {
      throw new Error('boom')
    })
    onGestureReset(ok)
    resetGestures('manual')
    expect(ok).toHaveBeenCalledWith('manual')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('stops listening when told', () => {
    const fn = vi.fn()
    const off = onGestureReset(fn)
    off()
    resetGestures('visible')
    expect(fn).not.toHaveBeenCalled()
    const { w, win, doc } = fakeWindow()
    const stop = installGestureWatchdog(w)
    expect(win.size + doc.size).toBe(5)
    stop()
    expect(win.size + doc.size).toBe(0)
  })

  it('the tool-state dump lists every registered piece and the last reset', () => {
    registerToolState('ink', () => ({ gesture: 'none', captured: [3] }))
    registerToolState('bad', () => {
      throw new Error('no')
    })
    resetGestures('visible')
    const state = toolState()
    expect(state.watchdog.resets).toBe(1)
    expect(String(state.watchdog.lastReset)).toMatch(/^visible/)
    expect(state.ink).toEqual({ gesture: 'none', captured: [3] })
    expect(String(state.bad.error)).toContain('no')
    const text = toolStateReport(state, { tool: 'pen', frozen: false })
    expect(text.split('\n')[0]).toBe('tool: pen')
    expect(text).toContain('ink.captured: [3]')
    expect(text).toContain('watchdog.listeners: 0')
  })
})
