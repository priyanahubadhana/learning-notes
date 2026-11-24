import { describe, expect, it, vi } from 'vitest'
import {
  FOREGROUND_MS,
  IDLE_MS,
  isSafeMoment,
  POLL_MS,
  prepareUpdate,
  waitForSafeMoment,
  type Moment,
} from './autoUpdate'
import {
  createAutosaver,
  flushAllSaves,
  hasPendingSaves,
} from '../editor/autosave'

const quiet: Moment = {
  visible: true,
  idleMs: IDLE_MS,
  sinceForeground: Infinity,
  penDown: false,
  fingerDown: false,
  pendingSave: false,
  padDraft: false,
  dialogOpen: false,
}

describe('the safe moment for an automatic update', () => {
  it('is safe when idle long enough with nothing going on', () => {
    expect(IDLE_MS).toBe(1500) // the first pause
    expect(isSafeMoment(quiet)).toBe(true)
    expect(isSafeMoment({ ...quiet, idleMs: IDLE_MS - 1 })).toBe(false)
  })

  it('is safe right after coming back to the front, even if not idle', () => {
    const back = { ...quiet, idleMs: 0, sinceForeground: FOREGROUND_MS }
    expect(isSafeMoment(back)).toBe(true)
    expect(isSafeMoment({ ...back, sinceForeground: FOREGROUND_MS + 1 })).toBe(
      false,
    )
  })

  it.each([
    ['hidden', { visible: false }],
    ['pen down', { penDown: true }],
    ['finger down', { fingerDown: true }],
    ['a save waiting', { pendingSave: true }],
    ['a Write pad draft', { padDraft: true }],
    ['a dialog open', { dialogOpen: true }],
    ['an IME composition', { composing: true }],
  ])('is never safe with %s', (_name, change) => {
    expect(isSafeMoment({ ...quiet, ...change })).toBe(false)
    expect(
      isSafeMoment({ ...quiet, ...change, idleMs: 0, sinceForeground: 0 }),
    ).toBe(false)
  })
})

describe('waiting for the safe moment', () => {
  it('keeps looking until it is safe, then resolves', async () => {
    let busy = 3
    const timers: (() => void)[] = []
    const wait = waitForSafeMoment(
      () => ({ ...quiet, penDown: busy-- > 0 }),
      (run, ms) => {
        expect(ms).toBe(POLL_MS)
        timers.push(run)
      },
    )
    const settled = vi.fn()
    void wait.done.then(settled)
    for (let i = 0; i < 3; i++) {
      await Promise.resolve()
      expect(settled).not.toHaveBeenCalled()
      timers.shift()!()
    }
    await wait.done
    expect(settled).toHaveBeenCalled()
  })

  it('stops when cancelled', () => {
    const timers: (() => void)[] = []
    const read = vi.fn(() => ({ ...quiet, penDown: true }))
    const wait = waitForSafeMoment(read, (run) => void timers.push(run))
    wait.cancel()
    timers.shift()!()
    expect(read).toHaveBeenCalledTimes(1)
  })
})

describe('preparing an update', () => {
  const ok = {
    flush: async () => {},
    hasUnsaved: () => false,
    backup: async () => 'ok' as const,
  }

  it('flushes first, then backs up, and is safe when both work', async () => {
    const order: string[] = []
    const risk = await prepareUpdate({
      flush: async () => void order.push('flush'),
      hasUnsaved: () => false,
      backup: async () => {
        order.push('backup')
        return 'ok'
      },
    })
    expect(risk).toBeNull()
    expect(order).toEqual(['flush', 'backup'])
  })

  it('asks when changes could not be saved, and takes no backup', async () => {
    const backup = vi.fn(async () => 'ok' as const)
    const risk = await prepareUpdate({ ...ok, hasUnsaved: () => true, backup })
    expect(risk).toEqual({ kind: 'unsaved' })
    expect(backup).not.toHaveBeenCalled()
  })

  it('asks only when the storage is low; a failing backup never blocks', async () => {
    expect(await prepareUpdate({ ...ok, backup: async () => 'space' })).toEqual(
      { kind: 'backup', reason: 'space' },
    )
    expect(
      await prepareUpdate({
        ...ok,
        backup: async () => {
          throw new Error('x')
        },
      }),
    ).toBeNull()
  })

  it('treats a flush that throws as unsaved when a save is still failing', async () => {
    const risk = await prepareUpdate({
      ...ok,
      flush: async () => {
        throw new Error('x')
      },
      hasUnsaved: () => true,
    })
    expect(risk).toEqual({ kind: 'unsaved' })
  })
})

describe('waiting saves are counted', () => {
  it('shows pending from a change until it is written, and flushes it', async () => {
    const save = vi.fn(async () => {})
    const saver = createAutosaver(save, 10_000)
    expect(hasPendingSaves()).toBe(false)
    saver.schedule()
    expect(hasPendingSaves()).toBe(true)
    await flushAllSaves()
    expect(save).toHaveBeenCalledTimes(1)
    expect(hasPendingSaves()).toBe(false)
    saver.dispose()
  })

  it('forgets a saver that is disposed', () => {
    const saver = createAutosaver(async () => {}, 10_000)
    saver.schedule()
    saver.dispose()
    expect(hasPendingSaves()).toBe(false)
  })
})

describe('the 3-second prompt (update.v2)', () => {
  // Why: a second offer that was still waiting for a safe moment asked again
  // 2 s after Cancel (S6 flaked). Cancel is final until the next start.
  it('Cancel is final: an offer made during the prompt does not ask again', async () => {
    vi.useFakeTimers()
    try {
      const { startAutoUpdate, promptControls } = await import('./autoUpdate')
      const { updateStatus } = await import('./updateStatus')
      const offer = startAutoUpdate({
        enabled: () => true,
        win: {
          document: {
            visibilityState: 'visible',
            addEventListener: () => {},
            querySelector: () => null,
          },
          addEventListener: () => {},
          setInterval: (f: () => void, ms: number) => setInterval(f, ms),
          clearInterval: (id: number) => clearInterval(id),
          setTimeout: (f: () => void, ms: number) => setTimeout(f, ms),
        } as unknown as Window,
        penDown: () => false,
        hasPendingSaves: () => false,
        hasUnsaved: () => false,
        padDraft: () => false,
        flush: async () => {},
        backup: async () => 'ok',
        onReset: () => {},
        v2: () => true,
      })
      const apply = vi.fn()
      void offer(apply)
      await vi.advanceTimersByTimeAsync(500)
      expect(updateStatus.get().countdown).toBe(3)
      void offer(apply) // asked again while the prompt is on screen
      await vi.advanceTimersByTimeAsync(600)
      promptControls.cancel()
      expect(updateStatus.get().phase).toBe('postponed')
      await vi.advanceTimersByTimeAsync(8000)
      expect(updateStatus.get().phase).toBe('postponed')
      expect(apply).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
