import { describe, expect, it } from 'vitest'
import {
  DAY_MS,
  isSnoozed,
  pickAttention,
  snooze,
  trackFailures,
  type AttentionInput,
  type SnoozeStore,
} from './attentionLevel'

const store = (): SnoozeStore => {
  const m = new Map<string, string>()
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v) }
}
const base: AttentionInput = {
  status: { phase: 'ready' },
  failStreak: 0,
  backupFailures: 0,
  storageHigh: false,
  updateReady: false,
  updateNeeded: false,
}
const pick = (i: Partial<AttentionInput>, s = store(), now = 1000) =>
  pickAttention({ ...base, ...i }, s, now, 1)

describe('attention level', () => {
  it('shows nothing when healthy, or for the quiet dot-only problems', () => {
    expect(pick({})).toBeNull()
    expect(pick({ status: { phase: 'ready', problem: 'offline' } })).toBeNull()
    expect(pick({ status: { phase: 'ready', problem: 'busy' } })).toBeNull()
    expect(pick({ status: { phase: 'ready', problem: 'failed' } })).toBeNull()
  })
  it('locked is level 1 and beats everything', () => {
    const a = pick({
      status: { phase: 'needsKey' },
      updateReady: true,
      storageHigh: true,
    })
    expect(a).toMatchObject({ code: 'locked', level: 1 })
  })
  it('highest level wins, one at a time', () => {
    const a = pick({
      status: { phase: 'ready', needsDriveTap: true },
      updateReady: true,
      storageHigh: true,
    })
    expect(a).toMatchObject({ code: 'driveTap', level: 2 })
    expect(pick({ updateReady: true, storageHigh: true })?.code).toBe('storage')
    expect(pick({ updateReady: true })).toMatchObject({
      code: 'update',
      level: 3,
    })
  })
  it('maps the sync problems and counters', () => {
    expect(
      pick({ status: { phase: 'ready', problem: 'driveFull' } })?.code,
    ).toBe('driveFull')
    expect(pick({ status: { phase: 'ready', problem: 'clock' } })?.code).toBe(
      'clock',
    )
    expect(
      pick({ status: { phase: 'ready', problem: 'failed' }, failStreak: 3 })
        ?.code,
    ).toBe('syncFailing')
    expect(pick({ backupFailures: 1 })).toBeNull()
    expect(pick({ backupFailures: 2 })?.code).toBe('backups')
    expect(pick({ status: { phase: 'needsSetup' } })?.code).toBe('setup')
  })
  it('level 2 dismiss lasts this start, returns when worse', () => {
    const s = store()
    const a = pick({ backupFailures: 2 }, s)!
    snooze(a, s, 1000, 1)
    expect(pick({ backupFailures: 2 }, s)).toBeNull()
    expect(pick({ backupFailures: 3 }, s)?.code).toBe('backups')
    expect(
      pickAttention({ ...base, backupFailures: 2 }, s, 1000, 2)?.code,
    ).toBe('backups') // next start
  })
  it('level 3 dismiss lasts 7 days', () => {
    const s = store()
    const a = pick({ storageHigh: true }, s)!
    snooze(a, s, 1000, 1)
    expect(isSnoozed(a, s, 1000 + 6 * DAY_MS, 1)).toBe(true)
    expect(isSnoozed(a, s, 1000 + 8 * DAY_MS, 1)).toBe(false)
  })
  it('a broken store never hides a banner', () => {
    const bad: SnoozeStore = { get: () => '{nope', set: () => {} }
    expect(pick({ storageHigh: true }, bad)?.code).toBe('storage')
  })
  it('counts failures in a row, or 30 minutes of them', () => {
    let f = { count: 0, since: 0 }
    f = trackFailures(f, true, 0)
    f = trackFailures(f, true, 1000)
    expect(f.count).toBe(2)
    expect(trackFailures(f, false, 2000).count).toBe(0)
    expect(trackFailures({ count: 1, since: 0 }, true, 31 * 60_000).count).toBe(
      3,
    )
  })
})
