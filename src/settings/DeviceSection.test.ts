import { describe, expect, it, vi } from 'vitest'
import { whileBusy } from './DeviceSection'

describe('Back up now button (SS-03)', () => {
  it('is busy while the job runs, then free', async () => {
    const set = vi.fn()
    await whileBusy(set, async () => {})
    expect(set.mock.calls).toEqual([[true], [false]])
  })
  it('is free again when the job throws (never stuck busy)', async () => {
    const set = vi.fn()
    await expect(
      whileBusy(set, async () => Promise.reject(new Error('no'))),
    ).rejects.toThrow('no')
    expect(set.mock.calls).toEqual([[true], [false]])
  })
})
