import { useLiveQuery } from 'dexie-react-hooks'
import { useSyncExternalStore } from 'react'
import type { LearningNotesDB } from '../core/db'
import type { JsonValue } from '../core/types'
import type { SettingDefinition } from './registry'
import {
  getSetting,
  readDeviceSetting,
  subscribeDeviceSettings,
  writeDeviceSetting,
} from './settingsService'
import { subscribeSyncPrefs, syncPrefsEpoch } from './syncPrefs'

/** A synced setting's live value (undefined while loading). */
export function useSyncedSetting<T extends JsonValue>(
  db: LearningNotesDB,
  definition: SettingDefinition<T>,
): T | undefined {
  // A group switch or an override changes what is read (not a database row).
  const epoch = useSyncExternalStore(subscribeSyncPrefs, syncPrefsEpoch)
  return useLiveQuery(() => getSetting(db, definition), [db, definition, epoch])
}

/** A device setting's value and setter; every user of it stays in step. */
export function useDeviceSetting<T extends JsonValue>(
  definition: SettingDefinition<T>,
): readonly [T, (value: T) => void] {
  const value = useSyncExternalStore(subscribeDeviceSettings, () =>
    readDeviceSetting(definition),
  )
  return [
    value,
    (next: T) => {
      writeDeviceSetting(definition, next)
      definition.onChange?.(next)
    },
  ] as const
}
