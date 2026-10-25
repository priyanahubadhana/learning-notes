import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import {
  dayStartHour,
  goodSteps,
  newCardsPerDay,
  reviewsPerDay,
  settingsRegistry,
  theme,
} from './builtinSettings'
import { createSettingsRegistry, isRisingSteps } from './registry'
import {
  clearDeviceSettingsCache,
  getSetting,
  readDeviceSetting,
  resetSetting,
  setSetting,
  subscribeDeviceSettings,
  writeDeviceSetting,
} from './settingsService'

let db: LearningNotesDB

beforeEach(() => {
  db = createTestDb()
  clearDeviceSettingsCache()
})

afterEach(async () => {
  await db.delete()
})

describe('settings registry', () => {
  it('shows one setting in several categories', () => {
    for (const cat of ['general', 'review', 'journal']) {
      expect(settingsRegistry.inCategory(cat)).toContain(dayStartHour)
    }
    expect(settingsRegistry.inCategory('apis')).toEqual([])
  })

  it('sorts categories by order', () => {
    expect(settingsRegistry.categories().map((c) => c.id)).toEqual([
      'general',
      'review',
      'journal',
      'apis',
    ])
  })

  it('rejects duplicates, unknown categories and invalid defaults', () => {
    const r = createSettingsRegistry()
    r.registerCategory({ id: 'a', labelKey: 'settings.title', order: 1 })
    const def = { ...newCardsPerDay, category: 'a' }
    r.register(def)
    expect(() => r.register(def)).toThrow(/already/)
    expect(() => r.register({ ...def, id: 'x', alsoIn: ['nope'] })).toThrow(
      /Unknown/,
    )
    expect(() => r.register({ ...def, id: 'y', defaultValue: -1 })).toThrow(
      /default/,
    )
  })

  it('accepts only rising whole-number steps', () => {
    const ok = isRisingSteps(1, 100, 5)
    expect(ok([1, 3, 7])).toBe(true)
    expect(ok([3, 3])).toBe(false)
    expect(ok([1, 2.5])).toBe(false)
    expect(ok([])).toBe(false)
    expect(ok([1, 2, 3, 4, 5, 6])).toBe(false)
    expect(ok('1,3')).toBe(false)
  })
})

describe('synced settings', () => {
  it('returns the default until changed', async () => {
    expect(await getSetting(db, newCardsPerDay)).toBe(20)
    expect(await getSetting(db, goodSteps)).toEqual([1, 3, 7, 14, 30, 60])
  })

  it('saves, reads back and resets', async () => {
    await setSetting(db, newCardsPerDay, 35)
    expect(await getSetting(db, newCardsPerDay)).toBe(35)
    await resetSetting(db, newCardsPerDay)
    expect(await getSetting(db, newCardsPerDay)).toBe(20)
    expect(await db.settings.get(newCardsPerDay.id)).toBeDefined() // kept for sync
  })

  it('allows "no limit" (null) where the setting permits it', async () => {
    await setSetting(db, reviewsPerDay, 200)
    await setSetting(db, reviewsPerDay, null)
    expect(await getSetting(db, reviewsPerDay)).toBeNull()
  })

  it('never saves invalid values', async () => {
    await expect(setSetting(db, newCardsPerDay, -5)).rejects.toThrow(/Invalid/)
    await expect(setSetting(db, goodSteps, [7, 3])).rejects.toThrow(/Invalid/)
    expect(await db.settings.count()).toBe(0)
  })

  it('reads a corrupt stored value as the default', async () => {
    await db.settings.put({
      id: newCardsPerDay.id,
      value: 'lots',
      updatedAt: 1,
    })
    expect(await getSetting(db, newCardsPerDay)).toBe(20)
  })

  it('refuses to mix up synced and device settings', async () => {
    await expect(getSetting(db, theme)).rejects.toThrow(/not a synced/)
    expect(() => readDeviceSetting(newCardsPerDay)).toThrow(/not a device/)
  })
})

describe('device settings', () => {
  const fakeStorage = () => {
    const data = new Map<string, string>()
    return {
      data,
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    }
  }

  it('keeps the existing theme storage key', () => {
    const storage = fakeStorage()
    storage.data.set('learning-notes:theme', '"sepia"')
    expect(readDeviceSetting(theme, storage)).toBe('sepia')
    writeDeviceSetting(theme, 'night', storage)
    expect(storage.data.get('learning-notes:theme')).toBe('"night"')
  })

  it('notifies listeners and rejects invalid values', () => {
    const storage = fakeStorage()
    let calls = 0
    const stop = subscribeDeviceSettings(() => calls++)
    writeDeviceSetting(theme, 'day', storage)
    expect(calls).toBe(1)
    expect(() => writeDeviceSetting(theme, 'neon' as 'day', storage)).toThrow(
      /Invalid/,
    )
    stop()
    writeDeviceSetting(theme, 'sepia', storage)
    expect(calls).toBe(1)
  })
})
