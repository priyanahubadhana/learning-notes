import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAutosaver } from './autosave'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createAutosaver', () => {
  it('saves once, 500 ms after the last change', async () => {
    const save = vi.fn(() => Promise.resolve())
    const autosaver = createAutosaver(save, 500)

    for (let i = 0; i < 10; i++) {
      autosaver.schedule()
      await vi.advanceTimersByTimeAsync(100) // typing, never pausing 500 ms
    }
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(500)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('flush saves immediately and cancels the timer', async () => {
    const save = vi.fn(() => Promise.resolve())
    const autosaver = createAutosaver(save, 500)

    autosaver.schedule()
    await autosaver.flush()
    expect(save).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('does nothing when there are no changes', async () => {
    const save = vi.fn(() => Promise.resolve())
    await createAutosaver(save).flush()
    expect(save).not.toHaveBeenCalled()
  })

  it('never overlaps saves; a change during a save causes one more', async () => {
    let active = 0
    let maxActive = 0
    const save = vi.fn(async () => {
      maxActive = Math.max(maxActive, ++active)
      await new Promise((resolve) => setTimeout(resolve, 300)) // slow save
      active--
    })
    const autosaver = createAutosaver(save, 500)

    autosaver.schedule()
    const first = autosaver.flush()
    autosaver.schedule() // edit while saving
    autosaver.schedule()
    const second = autosaver.flush()
    await vi.advanceTimersByTimeAsync(1000)
    await Promise.all([first, second])

    expect(save).toHaveBeenCalledTimes(2)
    expect(maxActive).toBe(1)
  })

  it('reports errors and keeps working', async () => {
    const onError = vi.fn()
    const save = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(undefined)
    const autosaver = createAutosaver(save, 500, onError)

    autosaver.schedule()
    await autosaver.flush()
    expect(onError).toHaveBeenCalledWith(new Error('boom'))

    autosaver.schedule()
    await autosaver.flush()
    expect(save).toHaveBeenCalledTimes(2)
  })
})
