import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import {
  applyDeviceMode,
  autoSwitchSetting,
  barAutoHideSetting,
  barPlacementSetting,
  barSizeSetting,
  dayStartHour,
  deviceModeSetting,
  hoverTipsSetting,
  shortcutHintsSetting,
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
      'toolbar',
      'advanced',
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
    const hidden = { settingId: 'missing', values: [1] }
    expect(() => r.register({ ...def, id: 'z', shownWhen: hidden })).toThrow(
      /shownWhen/,
    )
    r.register({ ...def, id: 'w', shownWhen: { ...hidden, settingId: def.id } })
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

describe('device modes', () => {
  const fake = (initial: Record<string, string> = {}) => {
    const data = new Map(Object.entries(initial))
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    }
  }

  it('switching mode writes every preset setting', () => {
    applyDeviceMode('pencil')
    expect(readDeviceSetting(deviceModeSetting)).toBe('pencil')
    expect(readDeviceSetting(barPlacementSetting)).toBe('top')
    expect(readDeviceSetting(barSizeSetting)).toBe('large')
    applyDeviceMode('computer')
    expect(readDeviceSetting(barPlacementSetting)).toBe('floating')
    expect(readDeviceSetting(hoverTipsSetting)).toBe('on')
    expect(readDeviceSetting(shortcutHintsSetting)).toBe('on')
    expect(readDeviceSetting(barAutoHideSetting)).toBe('off')
  })

  it('choosing a mode in Settings applies its preset', () => {
    deviceModeSetting.onChange?.('touch')
    expect(readDeviceSetting(barPlacementSetting)).toBe('top')
    expect(readDeviceSetting(barSizeSetting)).toBe('normal')
  })

  it('each bar setting can be changed on its own', () => {
    applyDeviceMode('touch')
    writeDeviceSetting(barSizeSetting, 'large')
    expect(readDeviceSetting(barSizeSetting)).toBe('large')
    expect(readDeviceSetting(barPlacementSetting)).toBe('top')
  })

  it('a stored value that is not valid reads as the default', () => {
    const storage = fake({
      'learning-notes:advanced.barSize': JSON.stringify('huge'),
      'learning-notes:general.deviceMode': JSON.stringify('tablet'),
    })
    expect(readDeviceSetting(barSizeSetting, storage)).toBe('compact')
    expect(readDeviceSetting(deviceModeSetting, storage)).toBe('computer')
  })

  it('Auto switch defaults to Pencil only, is per device and validated', () => {
    expect(readDeviceSetting(autoSwitchSetting)).toBe('pen')
    expect(autoSwitchSetting.scope).toBe('device')
    writeDeviceSetting(autoSwitchSetting, 'both')
    expect(readDeviceSetting(autoSwitchSetting)).toBe('both')
    expect(() => writeDeviceSetting(autoSwitchSetting, 'x' as never)).toThrow()
    const storage = fake({
      'learning-notes:advanced.autoSwitch': JSON.stringify('sometimes'),
    })
    clearDeviceSettingsCache()
    expect(readDeviceSetting(autoSwitchSetting, storage)).toBe('pen')
  })

  it('refuses to save an invalid value', () => {
    expect(() => writeDeviceSetting(barSizeSetting, 'huge' as never)).toThrow()
  })
})
