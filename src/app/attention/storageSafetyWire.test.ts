import { afterEach, describe, expect, it, vi } from 'vitest'
import { reportError } from '../errors'
import { getSignals, setSignals } from './attentionSignals'
import { startStorageSafety } from './storageSafetyWire'

const quota = () =>
  Object.assign(new Error('x'), { name: 'QuotaExceededError' })
const closed = () =>
  Object.assign(new Error('x'), { name: 'DatabaseClosedError' })

afterEach(() =>
  setSignals({ storageFull: 0, storageLost: 0, homeScreen: false }),
)

describe('storage safety wiring', () => {
  it('counts full and lost saves into the alert signals (SS-04a, SS-05a)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const stop = startStorageSafety({ userAgent: 'Chrome', maxTouchPoints: 0 })
    reportError(quota())
    reportError(quota())
    reportError(closed())
    expect(getSignals().storageFull).toBe(2)
    expect(getSignals().storageLost).toBe(1)
    stop()
    reportError(quota())
    expect(getSignals().storageFull).toBe(2)
  })
  it('the Home Screen notice is only for a Safari tab (SS-01a, SS-01b)', () => {
    const ipad = {
      userAgent: 'Mozilla/5.0 (Macintosh) Safari',
      maxTouchPoints: 5,
    }
    const check = (b: typeof ipad & { standalone?: boolean }) => {
      const stop = startStorageSafety(b)
      const shown = getSignals().homeScreen
      stop()
      return shown
    }
    expect(check(ipad)).toBe(true)
    expect(check({ ...ipad, standalone: true })).toBe(false)
    expect(check({ userAgent: 'Chrome', maxTouchPoints: 0 })).toBe(false)
  })
  it('the old once-a-minute full message stays quiet while it runs (SS-06)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { onStorageFull } = await import('../errors')
    const old = vi.fn()
    const off = onStorageFull(old)
    const stop = startStorageSafety({ userAgent: '', maxTouchPoints: 0 })
    reportError(quota())
    expect(old).not.toHaveBeenCalled()
    stop()
    reportError(quota())
    expect(old).toHaveBeenCalledTimes(1)
    off()
  })
})
