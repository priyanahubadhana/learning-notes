import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { writePref } from '../app/uiPrefs'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { memoryConnectors as mem } from '../sync/connectors'
import { createMasterKey, type MasterKey } from '../sync/crypto'
import { setTracking } from '../sync/device'
import { syncOnce } from '../sync/engine'
import { newCardsPerDay, theme } from './builtinSettings'
import {
  readDeviceSetting,
  clearDeviceSettingsCache,
  writeDeviceSetting,
} from './settingsService'
import {
  restoreOverrides,
  startSettingsMirror,
  stopSettingsMirror,
} from './settingsMirror'
import { migrateSettings, settingsMigrated } from './settingsMigration'
import { getSetting } from './settingsService'
import { resetSyncPrefsForTests } from './syncPrefs'
import {
  dismissSettingsNotice,
  noticeChanges,
  openSettingsNotice,
  undoSettingsNotice,
  watchSettingsNotice,
} from './settingsNotice'

function fakeStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  }
}

let master: MasterKey
let a: LearningNotesDB
let b: LearningNotesDB
const settle = () => new Promise((r) => setTimeout(r, 30))

function become(db: LearningNotesDB) {
  stopSettingsMirror()
  vi.stubGlobal('localStorage', fakeStorage())
  clearDeviceSettingsCache()
  resetSyncPrefsForTests()
  return db
}

beforeEach(async () => {
  setTracking(true)
  master = await createMasterKey()
  a = createTestDb()
  b = createTestDb()
})
afterEach(() => {
  stopSettingsMirror()
  vi.unstubAllGlobals()
  setTracking(false)
})

describe('one-time migration (step 6)', () => {
  it('a fresh device with old local values does not overwrite the account', async () => {
    const conn = mem()
    // Device A already changed the setting in the new version.
    become(a)
    startSettingsMirror(a)
    writeDeviceSetting(theme, 'night')
    await a.settings.put({
      id: newCardsPerDay.id,
      value: 33,
      updatedAt: Date.now(),
    })
    await settle()
    await syncOnce(a, conn, master)
    stopSettingsMirror()

    // Device B has its own older values from before this version.
    become(b)
    setTracking(false) // before this version the settings table was never tracked
    writePref('theme', 'sepia')
    await b.settings.put({
      id: newCardsPerDay.id,
      value: 9,
      updatedAt: Date.now(),
    })
    setTracking(true)
    expect(await migrateSettings(b)).toBe(true)
    expect(settingsMigrated()).toBe(true)
    expect(await migrateSettings(b)).toBe(false)
    startSettingsMirror(b)
    await syncOnce(b, conn, master)
    await settle()
    // The account's values win on B.
    expect(readDeviceSetting(theme)).toBe('night')
    expect(await getSetting(b, newCardsPerDay)).toBe(33)
    // And A is unchanged after B pushes.
    await syncOnce(b, conn, master)
    stopSettingsMirror()
    become(a)
    await syncOnce(a, conn, master)
    expect((await a.settings.get(theme.id))?.value).toBe('night')
  })

  it('with nothing on the server, the local value becomes the account value', async () => {
    const conn = mem()
    become(b)
    writePref('theme', 'sepia')
    await migrateSettings(b)
    await syncOnce(b, conn, master)
    become(a)
    startSettingsMirror(a)
    await syncOnce(a, conn, master)
    await settle()
    expect(readDeviceSetting(theme)).toBe('sepia')
  })

  it('the notice lists values that changed, and Undo keeps the old ones', async () => {
    const conn = mem()
    become(a)
    startSettingsMirror(a)
    writeDeviceSetting(theme, 'night')
    await settle()
    await syncOnce(a, conn, master)
    stopSettingsMirror()

    become(b)
    writePref('theme', 'sepia')
    await migrateSettings(b)
    openSettingsNotice()
    const stop = watchSettingsNotice()
    startSettingsMirror(b)
    await syncOnce(b, conn, master)
    await settle()
    expect(readDeviceSetting(theme)).toBe('night')
    expect(noticeChanges().map((c) => c.id)).toEqual([theme.id])
    undoSettingsNotice()
    expect(readDeviceSetting(theme)).toBe('sepia')
    expect(noticeChanges()).toEqual([])
    stop()
    dismissSettingsNotice()
    restoreOverrides({})
  })
})
