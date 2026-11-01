import { describe, expect, it, vi } from 'vitest'
import { isStorageFull, onStorageFull, reportError } from './errors'

const full = Object.assign(new Error('full'), { name: 'QuotaExceededError' })

describe('storage full', () => {
  it('is found directly and inside a database error', () => {
    expect(isStorageFull(full)).toBe(true)
    expect(isStorageFull({ name: 'AbortError', inner: full })).toBe(true)
  })

  it('is not confused with other failures', () => {
    expect(isStorageFull(new Error('other'))).toBe(false)
    expect(isStorageFull(undefined)).toBe(false)
  })

  it('tells the listener, and only for a full device', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const listen = vi.fn()
    const stop = onStorageFull(listen)
    reportError(new Error('other'))
    expect(listen).not.toHaveBeenCalled()
    reportError(full)
    expect(listen).toHaveBeenCalledTimes(1)
    stop()
    reportError(full)
    expect(listen).toHaveBeenCalledTimes(1)
    log.mockRestore()
  })
})
