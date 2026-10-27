import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { createId } from './ids'
import {
  backupDbName,
  backupFile,
  backupFileName,
  needsUpgrade,
  readBrowserBackup,
  readSnapshot,
  saveBrowserBackup,
  storedVersion,
} from './upgradeBackup'

const T = Date.UTC(2026, 9, 27, 12)
let name = ''

afterEach(async () => {
  await Dexie.delete(name)
  await Dexie.delete(backupDbName(name))
})

/** A saved database at Dexie version 7 with a little data. */
async function savedAtVersion7() {
  name = `backup-${createId()}`
  const old = new Dexie(name)
  old.version(7).stores({ notebooks: 'id', cards: 'id, notebookId' })
  await old.table('notebooks').add({ id: 'nb1', title: 'Biology' })
  await old.table('cards').bulkAdd([
    { id: 'c1', notebookId: 'nb1', due: 1 },
    { id: 'c2', notebookId: 'nb1', due: 2 },
  ])
  old.close()
}

describe('backup before an upgrade', () => {
  it('reads the saved version without creating a missing database', async () => {
    name = `backup-${createId()}`
    expect(await storedVersion(name)).toBe(0)
    expect(await Dexie.exists(name)).toBe(false)
    expect(await needsUpgrade(name, 8)).toBe(false) // new users: nothing to back up

    await savedAtVersion7()
    expect(await storedVersion(name)).toBe(7)
    expect(await needsUpgrade(name, 8)).toBe(true)
    expect(await needsUpgrade(name, 7)).toBe(false)
  })

  it('copies every table into the backup database, unchanged', async () => {
    await savedAtVersion7()
    const snapshot = await readSnapshot(name, indexedDB, T)
    expect(snapshot.version).toBe(7)
    expect(snapshot.tables.cards).toHaveLength(2)
    await saveBrowserBackup(snapshot)
    expect(await readBrowserBackup(name)).toEqual(snapshot)
    // The original is not touched (still version 7, same rows).
    expect(await storedVersion(name)).toBe(7)
    // A later backup replaces the earlier one.
    await saveBrowserBackup({ ...snapshot, tables: { notebooks: [] } })
    expect((await readBrowserBackup(name))?.tables).toEqual({ notebooks: [] })
  })

  it('makes a JSON file that reads back to the same data', async () => {
    await savedAtVersion7()
    const snapshot = await readSnapshot(name, indexedDB, T)
    const text = await backupFile(snapshot).text()
    expect(JSON.parse(text)).toEqual(snapshot)
    expect(backupFileName(snapshot)).toBe(`${name}-backup-v7-2026-10-27.json`)
    const empty = { ...snapshot, tables: {} }
    expect(JSON.parse(await backupFile(empty).text())).toEqual(empty)
  })
})
