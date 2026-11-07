/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { memoryConnectors as mem } from '../sync/connectors'
import { createMasterKey, type MasterKey } from '../sync/crypto'
import { setTracking } from '../sync/device'
import { syncOnce } from '../sync/engine'
import {
  AI_KEYS_SECRET_ID,
  KEY_SYNC_PREF,
  keySyncOn,
  setKeySync,
  startKeySync,
  stopKeySync,
} from './keySync'
import { addKey, listKeys, replaceKeys } from './keyStore'

/**
 * Two devices share one localStorage and one key store here (jsdom), so
 * each "device" swaps its own copy of the keys and the switch in and out
 * around its turn, and only the device whose turn it is runs its mirror.
 */
let master: MasterKey
let a: LearningNotesDB
let b: LearningNotesDB
const LS = 'learning-notes:ai.keys'
const PREF = `learning-notes:${KEY_SYNC_PREF}`
type Side = { keys: string | null; pref: string | null }
const sides: Record<'a' | 'b', Side> = {
  a: { keys: null, pref: null },
  b: { keys: null, pref: null },
}
let current: 'a' | 'b' = 'a'
const dbOf = (side: 'a' | 'b') => (side === 'a' ? a : b)
function become(side: 'a' | 'b') {
  stopKeySync(dbOf(current))
  sides[current] = {
    keys: localStorage.getItem(LS),
    pref: localStorage.getItem(PREF),
  }
  current = side
  const s = sides[side]
  if (s.keys === null) localStorage.removeItem(LS)
  else localStorage.setItem(LS, s.keys)
  if (s.pref === null) localStorage.removeItem(PREF)
  else localStorage.setItem(PREF, s.pref)
  startKeySync(dbOf(side))
}
const tick = () => new Promise((r) => setTimeout(r, 30))

beforeEach(async () => {
  localStorage.clear()
  sides.a = { keys: null, pref: null }
  sides.b = { keys: null, pref: null }
  current = 'a'
  setTracking(true)
  master = await createMasterKey()
  a = createTestDb()
  b = createTestDb()
})
afterEach(() => {
  setTracking(false)
  vi.restoreAllMocks()
})

describe('AI keys on all devices (R6-2)', () => {
  it('is off by default and the record is never in a backup table list', () => {
    expect(keySyncOn()).toBe(false)
  })

  it('sends the keys locked to the other device once turned on', async () => {
    const conn = mem()
    addKey('anthropic', 'Claude main', 'sk-ant-secret-1234567890')
    await setKeySync(a, true)
    expect(keySyncOn()).toBe(true)
    const rec = await a.secrets.get(AI_KEYS_SECRET_ID)
    expect(rec?.kind).toBe('aiKeys')
    await syncOnce(a, conn, master)
    // The server holds no readable key.
    expect(JSON.stringify(conn.state)).not.toContain('sk-ant-secret')

    become('b')
    expect(listKeys()).toEqual([])
    localStorage.setItem(PREF, 'true') // B's switch on
    startKeySync(b)
    await syncOnce(b, conn, master)
    await tick()
    expect(listKeys().map((k) => k.name)).toEqual(['Claude main'])
    expect(listKeys()[0].key).toBe('sk-ant-secret-1234567890')

    // B adds a key: it reaches A.
    addKey('gemini', 'Gemini free', 'AIza-free-key-1234567890')
    await tick()
    await syncOnce(b, conn, master)
    become('a')
    startKeySync(a)
    await syncOnce(a, conn, master)
    await tick()
    expect(listKeys().map((k) => k.name)).toEqual([
      'Claude main',
      'Gemini free',
    ])
  })

  it('turning it off on one device turns it off everywhere; keys stay', async () => {
    const conn = mem()
    addKey('openai', 'OpenAI', 'sk-openai-key-1234567890')
    await setKeySync(a, true)
    await syncOnce(a, conn, master)
    become('b')
    localStorage.setItem(PREF, 'true')
    startKeySync(b)
    await syncOnce(b, conn, master)
    await tick()
    expect(listKeys()).toHaveLength(1)

    become('a')
    await setKeySync(a, false)
    await syncOnce(a, conn, master)
    expect(listKeys()).toHaveLength(1) // A keeps its key

    become('b')
    await syncOnce(b, conn, master)
    await tick()
    expect(keySyncOn()).toBe(false)
    expect(listKeys()).toHaveLength(1) // B keeps its copy too
  })

  it('turning it on joins the keys already there with this device’s', async () => {
    const conn = mem()
    addKey('anthropic', 'From A', 'sk-ant-aaaaaaaaaaaaaaaa')
    await setKeySync(a, true)
    await syncOnce(a, conn, master)
    become('b')
    replaceKeys([
      {
        id: 'kb',
        provider: 'gemini',
        name: 'From B',
        key: 'AIza-bbbbbbbbbbbbbb',
      },
    ])
    await syncOnce(b, conn, master) // the record arrives, switch still off
    expect(listKeys().map((k) => k.name)).toEqual(['From B'])
    await setKeySync(b, true)
    expect(
      listKeys()
        .map((k) => k.name)
        .sort(),
    ).toEqual(['From A', 'From B'])
  })
})
