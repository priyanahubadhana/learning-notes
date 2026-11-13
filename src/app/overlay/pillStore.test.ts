import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPillStore, type PillSpec } from './pillStore'

const spec = (over: Partial<PillSpec> = {}): PillSpec => ({
  id: 'z',
  kind: 'zoom',
  icon: 'zoom',
  label: '120%',
  ...over,
})

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('pill store', () => {
  it('shows, updates and removes one pill', () => {
    const s = createPillStore()
    s.set(spec())
    s.set(spec({ label: '130%' }))
    expect(s.entries()).toHaveLength(1)
    expect(s.entries()[0].spec.label).toBe('130%')
    s.leave('z')
    expect(s.entries()[0].leaving).toBe(true)
    vi.advanceTimersByTime(200)
    expect(s.entries()).toHaveLength(0)
  })
  it('S3-25 a ttl pill fades after its time and stays away until it changes', () => {
    const s = createPillStore()
    s.set(spec({ ttl: 2000 }))
    vi.advanceTimersByTime(1999)
    expect(s.entries()[0].leaving).toBe(false)
    vi.advanceTimersByTime(1)
    expect(s.entries()[0].leaving).toBe(true)
    vi.advanceTimersByTime(200)
    expect(s.entries()).toHaveLength(0)
    s.set(spec({ ttl: 2000 })) // the owner re-renders: same spec stays away
    expect(s.entries()).toHaveLength(0)
    s.set(spec({ ttl: 2000, label: '140%' })) // a new zoom shows again
    expect(s.entries()).toHaveLength(1)
  })
  it('S3-25 holding a pill keeps it; letting go starts the time again', () => {
    const s = createPillStore()
    s.set(spec({ ttl: 2000 }))
    s.hold('z', true)
    vi.advanceTimersByTime(5000)
    expect(s.entries()[0].leaving).toBe(false)
    s.hold('z', false)
    vi.advanceTimersByTime(2000)
    expect(s.entries()[0].leaving).toBe(true)
  })
  it('S3-26 the cross removes the pill and tells its owner', () => {
    const s = createPillStore()
    const onDismiss = vi.fn()
    s.set(spec({ id: 'u', kind: 'update', dismissable: true, onDismiss }))
    s.dismiss('u')
    expect(onDismiss).toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(s.entries()).toHaveLength(0)
  })
  it('S3-27 a problem is announced assertively; a running time is not re-announced', () => {
    const s = createPillStore()
    s.set(spec({ id: 'r', kind: 'recording', label: 'Recording 00:01' }))
    const n = s.said().n
    s.set(spec({ id: 'r', kind: 'recording', label: 'Recording 00:02' }))
    expect(s.said().n).toBe(n)
    s.set(spec({ id: 'y', kind: 'sync', label: 'Syncing' }))
    s.set(
      spec({ id: 'y', kind: 'sync', label: 'Sync problem', tone: 'problem' }),
    )
    expect(s.said()).toMatchObject({ text: 'Sync problem', assertive: true })
  })
})
