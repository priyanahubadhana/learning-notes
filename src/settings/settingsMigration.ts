import { readPref, writePref } from '../app/uiPrefs'
import type { LearningNotesDB } from '../core/db'
import type { JsonValue } from '../core/types'
import { getDeviceId } from '../sync/device'
import { formatHlc } from '../sync/hlc'
import { syncStateId } from '../sync/outbox'
import { mirroredSettings } from './settingsMirror'
import { looksLikeSecret } from './settingsService'
import { groupOn } from './syncPrefs'

/**
 * The one-time step per device when settings start to follow the account.
 *
 * - Values this device already has (set before this version) become records,
 *   so they can travel. A value still at its default needs no record.
 * - Every record that exists only here is stamped with the oldest possible
 *   clock. Anything already on the server is newer and wins, so a fresh or
 *   old device can never overwrite the account. If the server has nothing,
 *   the value is sent as it is.
 * - The browser keeps its old copy of each value (it is also the live copy),
 *   so an older tab or the previous release still reads it.
 */

const DONE = 'settings.migrated.v1'
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

/** A clock older than any real change. */
export const OLDEST_HLC = (): string =>
  formatHlc({ ms: 0, n: 0, deviceId: getDeviceId() })

export const settingsMigrated = (): boolean => readPref(DONE, isBool, false)

/** Browser storage holds a value for this key (not just the default). */
function hasStored(key: string): boolean {
  try {
    return globalThis.localStorage?.getItem(`learning-notes:${key}`) != null
  } catch {
    return false
  }
}

/** Returns true when it did the work (false if this device was done before). */
export async function migrateSettings(db: LearningNotesDB): Promise<boolean> {
  if (settingsMigrated()) return false
  const now = Date.now()
  const fresh: string[] = []

  for (const m of mirroredSettings()) {
    if (!groupOn(m.group) || !hasStored(m.key)) continue
    if (await db.settings.get(m.id)) continue
    const value = readPref(
      m.key,
      m.isValid as (v: unknown) => v is JsonValue,
      m.defaultValue,
    )
    if (JSON.stringify(value) === JSON.stringify(m.defaultValue)) continue
    if (looksLikeSecret(value)) continue
    await db.settings.put({ id: m.id, value, updatedAt: now })
    fresh.push(m.id)
  }

  // Every record without a sync mark (old ones and the ones just made) goes
  // out with the oldest clock.
  const oldest = OLDEST_HLC()
  const marks = await db.syncState.bulkGet(
    (await db.settings.toCollection().primaryKeys()).map((id) =>
      syncStateId('settings', id),
    ),
  )
  const ids = await db.settings.toCollection().primaryKeys()
  await db.syncState.bulkPut(
    ids
      .filter((id, i) => !marks[i] || fresh.includes(id))
      .map((id) => ({
        id: syncStateId('settings', id),
        table: 'settings',
        recordId: id,
        rev: 0,
        hlc: oldest,
        dirty: 1 as const,
      })),
  )

  writePref(DONE, true)
  return true
}
