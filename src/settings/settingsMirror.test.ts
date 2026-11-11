import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { costCurrencySetting } from '../ai/costCurrency'
import { readPref, writePref } from '../app/uiPrefs'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { memoryConnectors as mem } from '../sync/connectors'
import { createMasterKey, type MasterKey } from '../sync/crypto'
import { setTracking } from '../sync/device'
import { syncOnce } from '../sync/engine'
import {
  newCardsPerDay,
  settingsRegistry,
  theme,
  languageSetting,
} from './builtinSettings'
import {
  AI_PREF_SETTINGS,
  keepOnThisDevice,
  resetAllToSynced,
  resetToSynced,
  setGroupOn,
  startSettingsMirror,
  stopSettingsMirror,
  shareThisDeviceValue,
} from './settingsMirror'
import {
  clearDeviceSettingsCache,
  getSetting,
  readDeviceSetting,
  setSetting,
  writeDeviceSetting,
} from './settingsService'
import './readingSettings'
import './lockSettings'
import { SETTING_GROUPS } from './syncGroups'
import { hasOverride, resetSyncPrefsForTests } from './syncPrefs'

/** A fake browser storage, so one test can play two devices. */
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
let conn: ReturnType<typeof mem>

/** Becomes device A or B: its own database, its own browser storage. */
function become(db: LearningNotesDB, storage = fakeStorage()) {
  stopSettingsMirror()
  vi.stubGlobal('localStorage', storage)
  clearDeviceSettingsCache()
  resetSyncPrefsForTests()
  startSettingsMirror(db)
  return storage
}

const settle = () => new Promise((r) => setTimeout(r, 30))

beforeEach(async () => {
  setTracking(true)
  master = await createMasterKey()
  a = createTestDb()
  b = createTestDb()
  conn = mem()
})
afterEach(() => {
  stopSettingsMirror()
  vi.unstubAllGlobals()
  setTracking(false)
})

async function aToB(storageB = fakeStorage()) {
  // A's change is written to its settings table (wait for that, not a pause).
  await vi.waitFor(async () =>
    expect(await a.settings.count()).toBeGreaterThan(0),
  )
  await syncOnce(a, conn, master)
  const storageA = globalThis.localStorage
  const sb = become(b, storageB)
  await syncOnce(b, conn, master)
  await vi.waitFor(async () =>
    expect(await b.settings.count()).toBeGreaterThan(0),
  )
  await settle()
  return { storageA, storageB: sb }
}

describe('registry and groups', () => {
  it('every setting named in a group exists', () => {
    const known = new Set([
      ...settingsRegistry.list().map((d) => d.id),
      ...AI_PREF_SETTINGS.map((m) => m.id),
      costCurrencySetting.id,
    ])
    for (const id of Object.keys(SETTING_GROUPS)) {
      expect(known.has(id), id).toBe(true)
    }
  })
})

describe('AI settings follow the account (step 3)', () => {
  it('the spending limit and AI on/off reach another device', async () => {
    become(a)
    writePref('ai.cap', 12)
    writePref('ai.enabled', true)
    writePref('ai.modelOrder', ['m1', 'm2'])
    await aToB()
    await vi.waitFor(() => {
      expect(
        readPref('ai.cap', (v): v is number => typeof v === 'number', 5),
      ).toBe(12)
      expect(
        readPref('ai.enabled', (v): v is boolean => v === true, false),
      ).toBe(true)
      expect(
        readPref('ai.modelOrder', (v): v is string[] => Array.isArray(v), []),
      ).toEqual(['m1', 'm2'])
    })
  })

  it('a key-like value is never put in a settings record', async () => {
    become(a)
    writePref('ai.modelKeys', { m: 'sk-ant-abcdefghijklmnopqrstuvwx' })
    await settle()
    expect(await a.settings.get('ai.modelKeys')).toBeUndefined()
    expect(JSON.stringify(await a.settings.toArray())).not.toContain('sk-')
  })

  it('writing the default when nothing is saved sends nothing', async () => {
    become(a)
    writePref('ai.cap', 5)
    await settle()
    expect(await a.settings.count()).toBe(0)
  })

  it('no synced value looks like a key', () => {
    for (const m of AI_PREF_SETTINGS) {
      expect(JSON.stringify(m.defaultValue)).not.toMatch(/sk-|AIza/)
    }
  })
})

describe('General, Appearance and the rest follow the account (step 4)', () => {
  it('theme and language change on A and show on B', async () => {
    become(a)
    writeDeviceSetting(theme, 'night')
    writeDeviceSetting(languageSetting, 'es')
    await aToB()
    await vi.waitFor(() => {
      expect(readDeviceSetting(theme)).toBe('night')
      expect(readDeviceSetting(languageSetting)).toBe('es')
    })
  })

  it('a setting kept in the database follows too', async () => {
    become(a)
    await setSetting(a, newCardsPerDay, 41)
    await aToB()
    await vi.waitFor(async () =>
      expect(await getSetting(b, newCardsPerDay)).toBe(41),
    )
  })

  it('device-only settings never get a record', async () => {
    become(a)
    writePref('advanced.barSize', 'big')
    writePref('general.deviceMode', 'ipad')
    await settle()
    expect(await a.settings.count()).toBe(0)
  })
})

describe('overrides and group switches (step 5)', () => {
  it('a value kept on this device wins over the synced one', async () => {
    become(a)
    writeDeviceSetting(theme, 'night')
    const { storageB } = await aToB()
    await keepOnThisDevice(theme.id)
    expect(hasOverride(theme.id)).toBe(true)
    // A changes it again.
    become(a)
    writeDeviceSetting(theme, 'day')
    await settle()
    await syncOnce(a, conn, master)
    become(b, storageB)
    await syncOnce(b, conn, master)
    await settle()
    expect(readDeviceSetting(theme)).toBe('night')
    // Reset to synced: B takes A's value.
    resetToSynced(theme.id)
    expect(readDeviceSetting(theme)).toBe('day')
    expect(hasOverride(theme.id)).toBe(false)
  })

  it('a local edit on a kept setting stays on this device', async () => {
    become(a)
    writeDeviceSetting(theme, 'night')
    await settle()
    await keepOnThisDevice(theme.id)
    writeDeviceSetting(theme, 'sepia')
    await settle()
    expect((await a.settings.get(theme.id))?.value).toBe('night')
    expect(readDeviceSetting(theme)).toBe('sepia')
  })

  it('"use this device\'s value everywhere" writes the record', async () => {
    become(a)
    writeDeviceSetting(theme, 'night')
    await settle()
    await keepOnThisDevice(theme.id)
    writeDeviceSetting(theme, 'sepia')
    await shareThisDeviceValue(theme.id)
    expect(hasOverride(theme.id)).toBe(false)
    expect((await a.settings.get(theme.id))?.value).toBe('sepia')
  })

  it('a group that is off keeps incoming records unapplied until turned on', async () => {
    become(a)
    writeDeviceSetting(theme, 'night')
    await settle()
    await syncOnce(a, conn, master)
    const sb = become(b)
    await setGroupOn('appearance', false)
    await syncOnce(b, conn, master)
    await settle()
    // The record is stored, the value is not applied.
    expect((await b.settings.get(theme.id))?.value).toBe('night')
    expect(readDeviceSetting(theme)).toBe(theme.defaultValue)
    // Local edits while off stay local.
    writeDeviceSetting(theme, 'sepia')
    await settle()
    expect((await b.settings.get(theme.id))?.value).toBe('night')
    expect(sb).toBeTruthy()
    // Turning it on applies the stored record at once.
    await setGroupOn('appearance', true)
    expect(readDeviceSetting(theme)).toBe('night')
  })

  it('a setting in the database reads override, then record, then default', async () => {
    become(a)
    expect(await getSetting(a, newCardsPerDay)).toBe(
      newCardsPerDay.defaultValue,
    )
    await setSetting(a, newCardsPerDay, 30)
    expect(await getSetting(a, newCardsPerDay)).toBe(30)
    await keepOnThisDevice(newCardsPerDay.id)
    await setSetting(a, newCardsPerDay, 5)
    expect(await getSetting(a, newCardsPerDay)).toBe(5)
    expect((await a.settings.get(newCardsPerDay.id))?.value).toBe(30)
    await setGroupOn('review', false)
    await setGroupOn('review', true)
    expect(await getSetting(a, newCardsPerDay)).toBe(30)
  })

  it('reset all returns what was overridden, for Undo', async () => {
    become(a)
    writeDeviceSetting(theme, 'night')
    await settle()
    await keepOnThisDevice(theme.id)
    writeDeviceSetting(theme, 'sepia')
    const before = resetAllToSynced()
    expect(before[theme.id]).toBe('sepia')
    expect(readDeviceSetting(theme)).toBe('night')
  })
})
