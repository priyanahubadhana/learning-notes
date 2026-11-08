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

  it('asks when the backup fails or the storage is low', async () => {
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
    ).toEqual({ kind: 'backup', reason: 'error' })
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
