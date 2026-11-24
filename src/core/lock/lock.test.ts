import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LearningNotesDB } from '../db'
import { createTestDb } from '../testing'
import { getOrCreateDefaultWorkspace } from '../workspaceService'
import { createNotebook } from '../../notebooks/notebookService'
import { createPage } from '../../pages/pageService'
import {
  getLockConfig,
  lockIsSetUp,
  methodsOf,
  parseLockConfig,
  saveLockConfig,
} from './lockConfig'
import {
  hashSecret,
  isPassword,
  isPin,
  isSecretHash,
  verifySecret,
} from './lockCrypto'
import {
  hiddenPageIds,
  listLocked,
  lockRoot,
  removeAllLocks,
  setLocked,
} from './lockService'
import {
  FAIL_LIMIT,
  noteFailure,
  noteSuccess,
  relockAll,
  relockExcept,
  unlock,
  unlockedIds,
  waitSeconds,
} from './lockState'

// Few rounds keep the tests fast; the real default is much higher.
const ROUNDS = 1_000

describe('hashing', () => {
  it('verifies the right secret and refuses a wrong one', async () => {
    const h = await hashSecret('1234', ROUNDS)
    expect(await verifySecret('1234', h)).toBe(true)
    expect(await verifySecret('1235', h)).toBe(false)
    expect(await verifySecret('', h)).toBe(false)
  })

  it('never stores the secret, and salts every hash differently', async () => {
    const a = await hashSecret('hunter22', ROUNDS)
    const b = await hashSecret('hunter22', ROUNDS)
    expect(JSON.stringify(a)).not.toContain('hunter22')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
    expect(isSecretHash(a)).toBe(true)
  })

  it('uses the default number of rounds when none is given', async () => {
    const h = await hashSecret('9999')
    expect(h.iterations).toBeGreaterThanOrEqual(100_000)
    expect(await verifySecret('9999', h)).toBe(true)
  })

  it('checks PINs (4–6 digits) and passwords (6+ characters)', () => {
    expect(['1234', '123456'].every(isPin)).toBe(true)
    expect(['123', '1234567', '12a4', ''].some(isPin)).toBe(false)
    expect(isPassword('secret')).toBe(true)
    expect(isPassword('short')).toBe(false)
  })

  it('rejects damaged hash objects', () => {
    expect(isSecretHash(null)).toBe(false)
    expect(isSecretHash({ salt: 'a', hash: 'b', iterations: 1 })).toBe(false)
    expect(isSecretHash({ salt: 'a', hash: 'b' })).toBe(false)
  })
})

describe('config', () => {
  let db: LearningNotesDB
  beforeEach(() => {
    db = createTestDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('starts empty and keeps only well-formed hashes', async () => {
    expect(await getLockConfig(db)).toEqual({})
    const pin = await hashSecret('4321', ROUNDS)
    await saveLockConfig(db, { pin })
    expect((await getLockConfig(db)).pin).toEqual(pin)
    expect(parseLockConfig({ pin: 'x', password: 5 })).toEqual({})
    expect(parseLockConfig('nope')).toEqual({})
  })

  it('lives in the settings table, so backups carry it (hash only)', async () => {
    const pin = await hashSecret('4321', ROUNDS)
    // Fixed clock: a real Date.now() can end in "4321" (CI run 43492276792)
    // and falsely trip the check below; the PIN itself was never stored.
    await saveLockConfig(db, { pin }, 1_000)
    const row = await db.settings.get('lock.config')
    expect(JSON.stringify(row)).not.toContain('4321')
    expect(row?.value).toHaveProperty('pin.hash')
  })

  it('the lock is set up when any way to unlock exists', () => {
    expect(lockIsSetUp(methodsOf({}, false))).toBe(false)
    expect(lockIsSetUp(methodsOf({}, true))).toBe(true)
  })
})

describe('locked things', () => {
  let db: LearningNotesDB
  let nb: string
  beforeEach(async () => {
    db = createTestDb()
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    nb = (await createNotebook(db, ws, 'Diary')).id
    relockAll()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('a page lock hides that page, a notebook lock hides its pages', async () => {
    const secret = await createPage(db, nb, null)
    const other = await createPage(db, nb, null)
    await saveLockConfig(db, { pin: await hashSecret('1234', ROUNDS) })

    await setLocked(db, 'page', secret.id, true)
    expect([...(await hiddenPageIds(db, [secret.id, other.id]))]).toEqual([
      secret.id,
    ])

    await setLocked(db, 'notebook', nb, true)
    expect((await hiddenPageIds(db, [secret.id, other.id])).size).toBe(2)
  })

  it('unlocking shows it; leaving locks again', async () => {
    const page = await createPage(db, nb, null)
    await saveLockConfig(db, { pin: await hashSecret('1234', ROUNDS) })
    await setLocked(db, 'page', page.id, true)
    expect((await hiddenPageIds(db, [page.id])).size).toBe(1)
    unlock(page.id)
    expect((await hiddenPageIds(db, [page.id])).size).toBe(0)
    relockExcept([])
    expect((await hiddenPageIds(db, [page.id])).size).toBe(1)
  })

  it('shows everything when no way to unlock exists (never a dead end)', async () => {
    const page = await createPage(db, nb, null)
    await setLocked(db, 'page', page.id, true)
    expect((await hiddenPageIds(db, [page.id])).size).toBe(0)
  })

  it('lists locked things and removes every lock and code', async () => {
    const page = await createPage(db, nb, null)
    await saveLockConfig(db, { pin: await hashSecret('1234', ROUNDS) })
    await setLocked(db, 'page', page.id, true)
    await setLocked(db, 'notebook', nb, true)
    const items = await listLocked(db)
    expect(items.pages.map((p) => p.id)).toEqual([page.id])
    expect(items.notebooks.map((n) => n.id)).toEqual([nb])

    await removeAllLocks(db)
    const after = await listLocked(db)
    expect(after.pages.length + after.notebooks.length).toBe(0)
    expect(await getLockConfig(db)).toEqual({})
    // The notes themselves were never touched.
    expect((await db.pages.get(page.id))?.title).toBe(page.title)
  })

  it('lockRoot: the page, else the notebook, else the database', () => {
    expect(lockRoot({ id: 'p', locked: true }, { id: 'n', locked: true })).toBe(
      'p',
    )
    expect(lockRoot({ id: 'p' }, { id: 'n', locked: true })).toBe('n')
    expect(lockRoot({ id: 'p' }, { id: 'n' }, { id: 'd', locked: true })).toBe(
      'd',
    )
    expect(lockRoot({ id: 'p' }, { id: 'n' })).toBeNull()
  })

  it('unlock state only grows with unlock() and empties with relockAll()', () => {
    unlock('a')
    unlock('a')
    unlock('b')
    expect(unlockedIds.get()).toEqual(['a', 'b'])
    relockExcept(['b'])
    expect(unlockedIds.get()).toEqual(['b'])
    relockAll()
    expect(unlockedIds.get()).toEqual([])
  })
})

describe('wrong-code pause', () => {
  const store = new Map<string, string>()
  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
    noteSuccess()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('waits after three wrong tries, longer each round, and clears on success', () => {
    const now = 1_000_000
    for (let i = 0; i < FAIL_LIMIT - 1; i++) noteFailure(now)
    expect(waitSeconds(now)).toBe(0)
    noteFailure(now)
    expect(waitSeconds(now)).toBe(30)
    noteFailure(now)
    expect(waitSeconds(now)).toBe(60)
    noteFailure(now)
    expect(waitSeconds(now)).toBe(300)
    expect(waitSeconds(now + 301_000)).toBe(0)
    noteSuccess()
    expect(waitSeconds(now)).toBe(0)
  })

  it('caps the wait at one hour', () => {
    const now = 1_000_000
    for (let i = 0; i < 30; i++) noteFailure(now)
    expect(waitSeconds(now)).toBe(3600)
  })

  it('survives a reload (kept in storage) and a clock set far back', () => {
    const now = 5_000_000
    for (let i = 0; i < FAIL_LIMIT; i++) noteFailure(now)
    expect(store.size).toBe(1)
    expect(waitSeconds(now + 1000)).toBe(29)
    expect(waitSeconds(now - 10 * 3_600_000)).toBe(3600)
  })

  it('ignores damaged stored data', () => {
    store.set('learning-notes:lock-throttle-v1', '{nonsense')
    expect(waitSeconds()).toBe(0)
    store.set(
      'learning-notes:lock-throttle-v1',
      '{"failures":"x","blockedUntil":"y"}',
    )
    expect(waitSeconds()).toBe(0)
  })
})
