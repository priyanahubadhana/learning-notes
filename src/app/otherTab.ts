/**
 * Another tab already upgraded the stored notes (update.v2, U11).
 *
 * This tab's code is older than the database on the device. Old code writing
 * into a newer database can damage notes, so the tab asks for the must-have
 * update at once (no network check) and stops using the database.
 */

/** The part of the Dexie database used here. */
export interface WatchedDb {
  verno: number
  on: (
    name: 'versionchange',
    fn: (event: { oldVersion: number; newVersion: number | null }) => void,
  ) => unknown
  close: () => void
  open: () => Promise<unknown>
}

/** Dexie says the stored version is newer than the code's (VersionError). */
export const isVersionError = (e: unknown): boolean =>
  typeof e === 'object' &&
  e !== null &&
  (e as { name?: unknown }).name === 'VersionError'

/**
 * Calls `onNewer` once when another tab upgrades the database past this
 * tab's version, or when opening fails because the stored version is newer.
 * The connection is closed (and not reopened) so this tab cannot write.
 */
export function watchOtherTabUpgrade(
  database: WatchedDb,
  onNewer: () => void,
): void {
  let fired = false
  const fire = () => {
    if (fired) return
    fired = true
    try {
      database.close()
    } catch {
      // Already closed.
    }
    onNewer()
  }
  database.on('versionchange', (e) => {
    // The browser counts versions in tens: Dexie version 23 is 230.
    if (e.newVersion !== null && e.newVersion > database.verno * 10) fire()
  })
  database.open().catch((e: unknown) => {
    if (isVersionError(e)) fire()
  })
}
