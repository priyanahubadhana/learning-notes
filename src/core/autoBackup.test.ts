import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createId } from './ids'
import {
  LOW_SPACE,
  listAutoBackups,
  readLatestBackup,
  runAutoBackup,
} from './autoBackup'
import { writePref } from '../app/uiPrefs'

let name = ''
beforeEach(() => {
  const m = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    clear: () => m.clear(),
  })
})
afterEach(async () => {
  await Dexie.delete(name)
  for (const s of [1, 2, 3]) await Dexie.delete(`${name}-auto-${s}`)
  vi.unstubAllGlobals()
})

async function saved(version: number, rows = 2) {
  name = name || `auto-${createId()}`
  const old = new Dexie(name)
  old.version(version).stores({ notebooks: 'id', cards: 'id' })
  await old.table('cards').clear()
  await old
    .table('cards')
    .bulkPut(Array.from({ length: rows }, (_, i) => ({ id: `c${i}`, due: i })))
  old.close()
}

describe('silent safe updates (R7-2)', () => {
  it('backs up silently before a database upgrade and keeps every row', async () => {
    await saved(7, 5)
    const r = await runAutoBackup(name, 8, 'b1')
    expect(r.kind).toBe('saved')
    const copy = await readLatestBackup(name)
    expect(copy?.tables.cards).toHaveLength(5)
    // The upgrade itself keeps all rows (a new version only adds tables).
    const upgraded = new Dexie(name)
    upgraded.version(8).stores({ notebooks: 'id', cards: 'id', tags: 'id' })
    expect(await upgraded.table('cards').count()).toBe(5)
    upgraded.close()
  })

  it('also backs up when only the app version changed, once per build', async () => {
    await saved(8)
    expect((await runAutoBackup(name, 8, 'b1')).kind).toBe('saved')
    expect((await runAutoBackup(name, 8, 'b1')).kind).toBe('none')
    expect((await runAutoBackup(name, 8, 'b2')).kind).toBe('saved')
  })

  it('keeps only the last 3', async () => {
    await saved(8)
    let at = 1_000
    for (const b of ['a', 'b', 'c', 'd', 'e']) {
      await runAutoBackup(name, 8, b, { now: (at += 1_000) })
    }
    const list = listAutoBackups()
    expect(list).toHaveLength(3)
    expect(list.map((e) => e.build)).toEqual(['e', 'd', 'c'])
  })

  it('does nothing on a fresh install', async () => {
    name = `auto-${createId()}`
    expect((await runAutoBackup(name, 8, 'b1')).kind).toBe('none')
    expect(listAutoBackups()).toHaveLength(0)
  })

  it('asks only when storage is low', async () => {
    await saved(7)
    const r = await runAutoBackup(name, 8, 'b1', {
      freeBytes: async () => LOW_SPACE - 1,
    })
    expect(r).toMatchObject({ kind: 'failed', reason: 'space' })
  })

  it('leaves the saved toolbar layout untouched', async () => {
    writePref('toolbar.main', ['text', 'pen', 'read'])
    await saved(7)
    await runAutoBackup(name, 8, 'b1')
    expect(localStorage.getItem('learning-notes:toolbar.main')).toBe(
      '["text","pen","read"]',
    )
  })
})
