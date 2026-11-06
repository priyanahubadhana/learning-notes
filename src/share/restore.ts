import type { LearningNotesDB } from '../core/db'
import {
  deleteBrowserBackup,
  readBrowserBackup,
  readSnapshot,
  safetyDbName,
  saveBrowserBackup,
  type BackupSnapshot,
} from '../core/upgradeBackup'
import { t } from '../i18n/t'
import {
  BundleError,
  bundleFromSnapshot,
  checkBundle,
  type Bundle,
} from './bundle'
import type { ParsedFull } from './readFull'

/**
 * "Replace my notes" and "Undo restore".
 *
 * Replace, in order: (1) check the file completely (done before, by
 * `readFullFile`); (2) copy the whole current database into a separate
 * database, `<name>-before-restore`; if that fails nothing else happens;
 * (3) clear every table and write the file's rows in ONE transaction, so a
 * failure leaves the notes as they were. Undo puts the safety copy back the
 * same way. Older files (database version below this app's) are refused for
 * Replace: bringing their rows up through the upgrade steps is not built
 * yet; "Add as copies" still works for them.
 */

/** Row in `meta` that remembers the last restore (for the Undo row). */
export const RESTORE_MARK = 'restoreUndo'

/**
 * Oldest file version "Replace" accepts. Versions 12 and 13 differ only by
 * added tables (13: ink), so a version 12 file's rows are valid as they are.
 */
export const REPLACE_MIN_VERSION = 12

/** Can a file saved at `fileVersion` replace the notes of a database at `current`? */
export const canReplaceFrom = (fileVersion: number, current: number): boolean =>
  fileVersion >= Math.min(current, REPLACE_MIN_VERSION)

export interface RestoreMark {
  /** When the restore was done. */
  restoredAt: number
  /** When the restored file was saved. */
  fileSavedAt: number
  /** When the safety copy was made. */
  safetyAt: number
}

/** What went wrong while restoring; nothing was changed. */
export class RestoreError extends BundleError {}

export async function readRestoreMark(
  db: LearningNotesDB,
): Promise<RestoreMark | undefined> {
  return (await db.meta.get(RESTORE_MARK))?.value as RestoreMark | undefined
}

/** Tables rebuilt from the notes by the app; written last, as the file has them. */
const DERIVED = new Set(['searchEntries', 'links', 'blockTags'])

/** Clears every table and writes `tables` (rows as stored), in one transaction. */
async function writeTables(
  db: LearningNotesDB,
  tables: Record<string, readonly unknown[]>,
  mark: RestoreMark | null,
): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
    for (const phase of ['notes', 'derived'] as const) {
      for (const table of db.tables) {
        if (DERIVED.has(table.name) !== (phase === 'derived')) continue
        // Writing notes also makes search/link rows; the file's own win.
        if (phase === 'derived') await table.clear()
        const rows = (tables[table.name] ?? []).filter(
          (r) =>
            !(
              table.name === 'meta' && (r as { id: string }).id === RESTORE_MARK
            ),
        )
        if (rows.length > 0) await table.bulkPut(rows as never[])
      }
    }
    if (mark) await db.meta.put({ id: RESTORE_MARK, value: { ...mark } })
  })
}

export interface ReplaceOptions {
  /** Saves the safety copy (tests make it fail). */
  saveSafety?: (snapshot: BackupSnapshot) => Promise<void>
  now?: number
}

/** Replaces all notes with the file's. Returns what the Undo row needs. */
export async function replaceWithFile(
  db: LearningNotesDB,
  parsed: ParsedFull,
  options: ReplaceOptions = {},
): Promise<RestoreMark> {
  if (!canReplaceFrom(parsed.manifest.dbVersion, db.verno)) {
    throw new RestoreError(t('restore.err.older'))
  }
  const now = options.now ?? Date.now()
  try {
    const snapshot = await readSnapshot(db.name, indexedDB, now)
    await (
      options.saveSafety ??
      ((s) => saveBrowserBackup(s, indexedDB, safetyDbName))
    )(snapshot)
  } catch (e) {
    console.error('Could not keep a safety copy', e)
    throw new RestoreError(t('restore.err.safety'))
  }
  const mark: RestoreMark = {
    restoredAt: now,
    fileSavedAt: parsed.manifest.createdAt,
    safetyAt: now,
  }
  await writeTables(db, parsed.tables, mark)
  return mark
}

/** When the safety copy was made, if there is one. */
export async function safetyCopyDate(
  db: LearningNotesDB,
): Promise<number | undefined> {
  const info = await readBrowserBackup(db.name, indexedDB, [], safetyDbName)
  return info?.createdAt
}

/** Puts the safety copy back and removes it (it equals the notes again). */
export async function undoRestore(db: LearningNotesDB): Promise<void> {
  const snapshot = await readBrowserBackup(
    db.name,
    indexedDB,
    undefined,
    safetyDbName,
  )
  if (!snapshot) throw new RestoreError(t('restore.err.noCopy'))
  if (snapshot.version !== db.verno) {
    throw new RestoreError(t('restore.err.undoOlder'))
  }
  const known = new Set(db.tables.map((tb) => tb.name))
  const tables = Object.fromEntries(
    Object.entries(snapshot.tables).filter(([name]) => known.has(name)),
  )
  await writeTables(db, tables, null)
  await deleteBrowserBackup(db.name, indexedDB, safetyDbName)
}

/** A full file as a bundle, for "Add as copies". */
export function fullToBundle(parsed: ParsedFull): Bundle {
  const tables = { ...parsed.tables }
  // Pictures with no bytes (older "notes only" files) have nothing to copy.
  tables.images = (tables.images ?? []).filter(
    (r) => r.data instanceof ArrayBuffer && r.data.byteLength > 0,
  )
  return checkBundle(
    bundleFromSnapshot({
      app: 'learning-notes',
      dbName: '',
      version: parsed.manifest.dbVersion,
      createdAt: parsed.manifest.createdAt,
      tables,
    }),
  )
}
