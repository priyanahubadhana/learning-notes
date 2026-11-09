import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { newCardsPerDay } from '../settings/builtinSettings'
import { getSetting, setSetting } from '../settings/settingsService'
import { memoryConnectors as mem } from './connectors'
import { createMasterKey, type MasterKey } from './crypto'
import { setTracking } from './device'
import { syncOnce } from './engine'

let master: MasterKey
let a: LearningNotesDB
let b: LearningNotesDB

beforeEach(async () => {
  setTracking(true)
  master = await createMasterKey()
  a = createTestDb()
  b = createTestDb()
})
afterEach(() => setTracking(false))

describe('settings that follow you (step 1)', () => {
  it('a setting changed on A shows up on B', async () => {
    const conn = mem()
    await setSetting(a, newCardsPerDay, 33)
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    expect(await getSetting(b, newCardsPerDay)).toBe(33)
    // Pulled rows are not sent back.
    expect(await b.syncState.where('dirty').equals(1).count()).toBe(0)
  })

  it('both devices change it: the newer edit wins on both', async () => {
    const conn = mem()
    await setSetting(a, newCardsPerDay, 10)
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    await setSetting(a, newCardsPerDay, 11)
    await new Promise((r) => setTimeout(r, 5))
    await setSetting(b, newCardsPerDay, 12)
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    await syncOnce(a, conn, master)
    expect(await getSetting(a, newCardsPerDay)).toBe(12)
    expect(await getSetting(b, newCardsPerDay)).toBe(12)
  })

  it('an invalid incoming value reads as the default, never crashes', async () => {
    const conn = mem()
    await a.settings.put({
      id: newCardsPerDay.id,
      value: 'many',
      updatedAt: Date.now(),
    })
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    expect(await getSetting(b, newCardsPerDay)).toBe(
      newCardsPerDay.defaultValue,
    )
  })
})
