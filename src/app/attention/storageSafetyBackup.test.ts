import { describe, expect, it, vi } from 'vitest'
import { backUpNow } from './storageSafetyBackup'

const deps = (over = {}) => ({
  make: vi.fn(async () => ({ blob: new Blob(['x']), name: 'b.json' })),
  save: vi.fn(async () => {}),
  record: vi.fn(async () => {}),
  ...over,
})

describe('one-tap backup (SS-03)', () => {
  it('saves one file with no question (SS-03a)', async () => {
    const d = deps()
    expect(await backUpNow(d)).toBe(true)
    expect(d.save).toHaveBeenCalledTimes(1)
    expect(d.record).toHaveBeenCalledTimes(1)
  })
  it('two quick taps make one file (SS-03c)', async () => {
    const d = deps()
    const [a, b] = await Promise.all([backUpNow(d), backUpNow(d)])
    expect(a && b).toBe(true)
    expect(d.make).toHaveBeenCalledTimes(1)
    expect(d.save).toHaveBeenCalledTimes(1)
  })
  it('a failure says so and changes nothing (SS-03b)', async () => {
    const d = deps({ make: vi.fn(async () => Promise.reject(new Error('no'))) })
    expect(await backUpNow(d)).toBe(false)
    expect(d.save).not.toHaveBeenCalled()
    expect(d.record).not.toHaveBeenCalled()
  })
})
