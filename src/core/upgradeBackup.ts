/**
 * Backup before a database upgrade. When the app's code expects a newer
 * database version than the one saved in the browser, the saved data is
 * read as it is (plain IndexedDB, before Dexie upgrades it) and copied into
 * a separate backup database; the user can also download it as a file.
 * Restoring is done from Save & restore; the file and the backup database
 * hold every table as plain rows, so nothing is lost meanwhile.
 */

import { toBase64 } from './base64'

/** Everything in a database at one moment, table by table. */
export interface BackupSnapshot {
  app: 'learning-notes'
  /** Database it came from, e.g. "learning-notes". */
  dbName: string
  /** Database (Dexie) version the data was saved with. */
  version: number
  createdAt: number
  tables: Record<string, unknown[]>
}

/** Name of the backup database kept next to `dbName`. */
export const backupDbName = (dbName: string): string => `${dbName}-backup`

/** Name of the safety copy made before a restore (separate from the upgrade backup). */
export const safetyDbName = (dbName: string): string =>
  `${dbName}-before-restore`

// Dexie stores version n as IndexedDB version n × 10.
const DEXIE_FACTOR = 10

/** Wraps an IndexedDB request in a promise. */
function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Opens an existing database at its saved version without changing it.
 * Resolves undefined if there is none (it is not created).
 */
function openExisting(
  name: string,
  idb: IDBFactory,
): Promise<IDBDatabase | undefined> {
  return new Promise((resolve, reject) => {
    let missing = false
    const request = idb.open(name)
    request.onupgradeneeded = () => {
      // Only fires for a brand-new database: undo its creation.
      missing = true
      request.transaction?.abort()
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      if (missing) resolve(undefined)
      else reject(request.error)
    }
  })
}

/** Dexie version of the saved database (0 = none saved yet). */
export async function storedVersion(
  name: string,
  idb: IDBFactory = indexedDB,
): Promise<number> {
  const database = await openExisting(name, idb)
  if (!database) return 0
  const version = database.version / DEXIE_FACTOR
  database.close()
  return version
}

/** True if saved data exists and the code will upgrade it on opening. */
export async function needsUpgrade(
  name: string,
  codeVersion: number,
  idb: IDBFactory = indexedDB,
): Promise<boolean> {
  const version = await storedVersion(name, idb)
  return version > 0 && version < codeVersion
}

/** Reads every table of the saved database as it is now. */
export async function readSnapshot(
  name: string,
  idb: IDBFactory = indexedDB,
  now: number = Date.now(),
): Promise<BackupSnapshot> {
  const database = await openExisting(name, idb)
  if (!database) throw new Error(`No database named ${name}`)
  try {
    const names = [...database.objectStoreNames]
    const tables: Record<string, unknown[]> = {}
    if (names.length > 0) {
      const tx = database.transaction(names, 'readonly')
      await Promise.all(
        names.map(async (table) => {
          tables[table] = await done(tx.objectStore(table).getAll())
        }),
      )
    }
    return {
      app: 'learning-notes',
      dbName: name,
      version: database.version / DEXIE_FACTOR,
      createdAt: now,
      tables,
    }
  } finally {
    database.close()
  }
}

/**
 * Saves `snapshot` as the backup database (replacing the previous backup):
 * one record per table, plus an "info" record.
 */
export async function saveBrowserBackup(
  snapshot: BackupSnapshot,
  idb: IDBFactory = indexedDB,
  nameOf: (dbName: string) => string = backupDbName,
): Promise<void> {
  const name = nameOf(snapshot.dbName)
  await done(idb.deleteDatabase(name))
  const open = idb.open(name, 1)
  open.onupgradeneeded = () => {
    open.result.createObjectStore('tables')
    open.result.createObjectStore('info')
  }
  const database = await done(open)
  try {
    const tx = database.transaction(['tables', 'info'], 'readwrite')
    for (const [table, rows] of Object.entries(snapshot.tables)) {
      tx.objectStore('tables').put(rows, table)
    }
    const { tables, ...info } = snapshot
    tx.objectStore('info').put(
      { ...info, tableNames: Object.keys(tables) },
      'info',
    )
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    database.close()
  }
}

/**
 * Reads the backup database back (undefined if there is none). With `only`,
 * just those tables, so a screen need not load every picture to show a date.
 */
export async function readBrowserBackup(
  dbName: string,
  idb: IDBFactory = indexedDB,
  only?: readonly string[],
  nameOf: (dbName: string) => string = backupDbName,
): Promise<BackupSnapshot | undefined> {
  const database = await openExisting(nameOf(dbName), idb)
  if (!database) return undefined
  try {
    const tx = database.transaction(['tables', 'info'], 'readonly')
    const info = (await done(tx.objectStore('info').get('info'))) as
      (Omit<BackupSnapshot, 'tables'> & { tableNames: string[] }) | undefined
    if (!info) return undefined
    const { tableNames, ...rest } = info
    const tables: Record<string, unknown[]> = {}
    for (const table of only ?? tableNames) {
      tables[table] = (await done(tx.objectStore('tables').get(table))) ?? []
    }
    return { ...rest, tables }
  } finally {
    database.close()
  }
}

/** JSON has no bytes: a picture's `ArrayBuffer` is written as base64 text. */
const withBytes = (_key: string, value: unknown): unknown =>
  value instanceof ArrayBuffer ? toBase64(value) : value

/**
 * The snapshot as a JSON file, built table by table (row by row) so a big
 * database never becomes one giant string. Pictures are base64 text.
 */
export function backupFile(snapshot: BackupSnapshot): Blob {
  const { tables, ...info } = snapshot
  const parts: string[] = [JSON.stringify(info).slice(0, -1), ',"tables":{']
  Object.entries(tables).forEach(([table, rows], i) => {
    parts.push(`${i > 0 ? ',' : ''}${JSON.stringify(table)}:[`)
    rows.forEach((row, j) =>
      parts.push((j > 0 ? ',' : '') + JSON.stringify(row, withBytes)),
    )
    parts.push(']')
  })
  parts.push('}}')
  return new Blob(parts, { type: 'application/json' })
}

/** File name like "learning-notes-backup-v7-2026-10-27.json" (UTC date). */
export function backupFileName(snapshot: BackupSnapshot): string {
  const day = new Date(snapshot.createdAt).toISOString().slice(0, 10)
  return `${snapshot.dbName}-backup-v${snapshot.version}-${day}.json`
}

/** Deletes a whole backup database (a copy only; the notes are untouched). */
export async function deleteBrowserBackup(
  dbName: string,
  idb: IDBFactory = indexedDB,
  nameOf: (dbName: string) => string = backupDbName,
): Promise<void> {
  await done(idb.deleteDatabase(nameOf(dbName)))
}
