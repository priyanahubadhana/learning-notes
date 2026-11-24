import { useLiveQuery } from 'dexie-react-hooks'
import { useSyncExternalStore } from 'react'
import type { LearningNotesDB } from '../../core/db'
import type { JsonValue } from '../../core/types'
import { settingsRegistry } from '../builtinSettings'
import {
  getSetting,
  readDeviceSetting,
  subscribeDeviceSettings,
} from '../settingsService'
import { subscribeSyncPrefs, syncPrefsEpoch } from '../syncPrefs'

/**
 * Live stored values of several settings at once (database ones and device
 * ones), for the previews. It reads the same stored values as the rows; a
 * value that is still loading is missing from the result.
 */
export function useSettingValues(
  db: LearningNotesDB,
  ids: readonly string[],
): Record<string, JsonValue | undefined> {
  const defs = ids.flatMap((id) => {
    const d = settingsRegistry.get(id)
    return d ? [d] : []
  })
  const device = defs.filter((d) => d.scope === 'device')
  const synced = defs.filter((d) => d.scope !== 'device')

  // A string snapshot, so React sees one stable value until something changes.
  const deviceJson = useSyncExternalStore(subscribeDeviceSettings, () =>
    JSON.stringify(device.map((d) => readDeviceSetting(d))),
  )
  const epoch = useSyncExternalStore(subscribeSyncPrefs, syncPrefsEpoch)
  const key = synced.map((d) => d.id).join()
  const stored = useLiveQuery(
    () => Promise.all(synced.map((d) => getSetting(db, d))),
    [db, key, epoch],
  )

  const out: Record<string, JsonValue | undefined> = {}
  const deviceValues = JSON.parse(deviceJson) as JsonValue[]
  device.forEach((d, i) => (out[d.id] = deviceValues[i]))
  synced.forEach((d, i) => (out[d.id] = stored?.[i]))
  return out
}
