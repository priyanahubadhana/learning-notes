import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetFlags, setFlag } from './flags'
import { UPDATE_LEVEL } from './updateLevel'
import {
  isUpdateRequired,
  latestVersion,
  onRequiredUpdate,
  resetUpdates,
  triggerMustHave,
  updateReason,
} from './updates'

describe('level rule (update.v2)', () => {
  const get = (body: object) =>
    (async () => new Response(JSON.stringify(body))) as unknown as typeof fetch
  afterEach(() => {
    resetFlags()
    resetUpdates()
  })

  it('flag off: only the marker counts, level is ignored', async () => {
    resetFlags()
    await latestVersion('a', get({ commit: 'b', required: false, level: 9 }))
    expect(isUpdateRequired()).toBe(false)
    await latestVersion('a', get({ commit: 'b', required: true, level: 1 }))
    expect(isUpdateRequired()).toBe(true)
  })
  it('flag on: higher level is must-have, even with no marker (skipped version)', async () => {
    setFlag('update.v2', true)
    await latestVersion('a', get({ commit: 'b', required: false, level: 3 }))
    expect(isUpdateRequired()).toBe(true)
  })
  it('flag on: same, missing, text and lower levels stay calm', async () => {
    setFlag('update.v2', true)
    for (const level of [UPDATE_LEVEL, undefined, '5', 0, -2]) {
      await latestVersion('a', get({ commit: 'b', required: true, level }))
      expect(isUpdateRequired()).toBe(false)
    }
  })
  it('flag on: the reason comes from version.json, default storage', async () => {
    setFlag('update.v2', true)
    await latestVersion('a', get({ commit: 'b', level: 9, reason: 'datafix' }))
    expect(updateReason()).toBe('datafix')
    await latestVersion('a', get({ commit: 'b', level: 9 }))
    expect(updateReason()).toBe('storage')
  })
  it('the other-tab trigger is must-have with no network', () => {
    const seen = vi.fn()
    onRequiredUpdate(seen)
    triggerMustHave('storage', () => {})
    expect(isUpdateRequired()).toBe(true)
    expect(seen).toHaveBeenCalledTimes(1)
  })
})
