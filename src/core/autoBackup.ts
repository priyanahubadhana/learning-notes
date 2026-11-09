/**
 * Silent safe updates (R7-2). Before the app opens a database whose version
 * is older than the code, or when a new build of the app starts on saved
 * data, everything is copied into a rolling backup in this browser (the last
 * 3 are kept) without asking. The person is asked only when that copy fails
 * or the browser is nearly out of space (see UpgradeGate).
 */

import { readPref, writePref } from '../app/uiPrefs'
import {
  readBrowserBackup,
  readSnapshot,
  saveBrowserBackup,
  storedVersion,
  backupDbName,
  type BackupSnapshot,
} from './upgradeBackup'

export const AUTO_KEEP = 3
/** Less free space than this (bytes) counts as "storage is low". */
export const LOW_SPACE = 25 * 1024 * 1024

export interface AutoBackupEntry {
  slot: number
  at: number
  version: number
  build: string
}

const INDEX_KEY = 'backup.auto'
const BUILD_KEY = 'backup.lastBuild'

const isEntry = (v: unknown): v is AutoBackupEntry => {
  const e = v as AutoBackupEntry
  return (
    typeof e === 'object' &&
    e !== null &&
    Number.isInteger(e.slot) &&
    e.slot >= 1 &&
    e.slot <= AUTO_KEEP &&
    typeof e.at === 'number' &&
    typeof e.version === 'number' &&
    typeof e.build === 'string'
  )
}
const isIndex = (v: unknown): v is AutoBackupEntry[] =>
  Array.isArray(v) && v.every(isEntry)

export const autoBackupName = (dbName: string, slot: number): string =>
  `${dbName}-auto-${slot}`

/** The rolling backups, newest first. */
export const listAutoBackups = (): AutoBackupEntry[] =>
  [...readPref(INDEX_KEY, isIndex, [])].sort((a, b) => b.at - a.at)

export type AutoResult =
  | { kind: 'none' }
  | { kind: 'saved'; entry: AutoBackupEntry; snapshot: BackupSnapshot }
  | { kind: 'failed'; reason: 'space' | 'error'; message: string }

export interface AutoOptions {
  idb?: IDBFactory
  /** Free bytes in the browser (undefined = unknown). */
  freeBytes?: () => Promise<number | undefined>
  now?: number
}

async function browserFreeBytes(): Promise<number | undefined> {
  try {
    const { quota, usage } = (await navigator.storage?.estimate?.()) ?? {}
    return quota !== undefined && usage !== undefined
      ? quota - usage
      : undefined
  } catch {
    return undefined
  }
}

/** True if a backup is due: older database version, or a new app build. */
export async function backupDue(
  dbName: string,
  codeVersion: number,
  build: string,
  idb: IDBFactory = indexedDB,
): Promise<boolean> {
  const version = await storedVersion(dbName, idb)
  if (version === 0) return false
  return (
    version < codeVersion ||
    readPref(BUILD_KEY, (v): v is string => typeof v === 'string', '') !== build
  )
}

/**
 * Makes the silent backup when one is due. A fresh install (no saved data)
 * only remembers the build. Never throws.
 */
export async function runAutoBackup(
  dbName: string,
  codeVersion: number,
  build: string,
  options: AutoOptions = {},
): Promise<AutoResult> {
  const idb = options.idb ?? indexedDB
  try {
    if (!(await backupDue(dbName, codeVersion, build, idb))) {
      if ((await storedVersion(dbName, idb)) === 0) writePref(BUILD_KEY, build)
      return { kind: 'none' }
    }
    const free = await (options.freeBytes ?? browserFreeBytes)()
    if (free !== undefined && free < LOW_SPACE) {
      return { kind: 'failed', reason: 'space', message: 'low space' }
    }
    const snapshot = await readSnapshot(dbName, idb, options.now)
    const index = listAutoBackups() // newest first
    // An unused slot, else the oldest one is replaced; the others stay.
    const used = new Set(index.map((e) => e.slot))
    const slot =
      [1, 2, 3].find((s) => !used.has(s)) ?? index[index.length - 1].slot
    await saveBrowserBackup(snapshot, idb, (n) => autoBackupName(n, slot))
    const entry: AutoBackupEntry = {
      slot,
      at: snapshot.createdAt,
      version: snapshot.version,
      build,
    }
    writePref(INDEX_KEY, [...index.filter((e) => e.slot !== slot), entry])
    writePref(BUILD_KEY, build)
    return { kind: 'saved', entry, snapshot }
  } catch (error) {
    return { kind: 'failed', reason: 'error', message: String(error) }
  }
}

/**
 * The newest backup in this browser (an automatic one, else the older
 * single backup). `only` limits which tables are read.
 */
export async function readLatestBackup(
  dbName: string,
  only?: readonly string[],
  idb: IDBFactory = indexedDB,
): Promise<BackupSnapshot | undefined> {
  for (const entry of listAutoBackups()) {
    const found = await readBrowserBackup(dbName, idb, only, (n) =>
      autoBackupName(n, entry.slot),
    )
    if (found) return found
  }
  return readBrowserBackup(dbName, idb, only, backupDbName)
}

/** Tests only. */
export const AUTO_KEYS = { INDEX_KEY, BUILD_KEY }

/**
 * Opens once the silent backup before an upgrade is done (or was not needed).
 * Anything that touches the database at start-up waits for it: opening the
 * database first would run the upgrade before its backup was taken.
 */
export const backupGate = (() => {
  let open = () => {}
  const ready = new Promise<void>((resolve) => (open = resolve))
  return { ready, open: () => open() }
})()
