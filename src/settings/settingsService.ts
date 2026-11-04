import type { LearningNotesDB } from '../core/db'
import type { JsonValue } from '../core/types'
import { readPref, writePref, type PrefStorage } from '../app/uiPrefs'
import type { SettingDefinition } from './registry'

/**
 * Reading and saving settings. Synced settings live in the database (they
 * belong with the notes and will sync later); device settings live in the
 * browser (see uiPrefs.ts). Invalid values are never saved, and an invalid
 * stored value (e.g. from an older version) reads as the default.
 */

function assertValid<T extends JsonValue>(
  definition: SettingDefinition<T>,
  value: unknown,
): asserts value is T {
  if (!definition.isValid(value)) {
    throw new Error(`Invalid value for setting ${definition.id}`)
  }
}

function assertScope(definition: { id: string; scope: string }, scope: string) {
  if (definition.scope !== scope) {
    throw new Error(`Setting ${definition.id} is not a ${scope} setting`)
  }
}

// ---- Synced settings (database) ----

export async function getSetting<T extends JsonValue>(
  db: LearningNotesDB,
  definition: SettingDefinition<T>,
): Promise<T> {
  assertScope(definition, 'synced')
  const row = await db.settings.get(definition.id)
  return row && definition.isValid(row.value)
    ? row.value
    : definition.defaultValue
}

export async function setSetting<T extends JsonValue>(
  db: LearningNotesDB,
  definition: SettingDefinition<T>,
  value: T,
  now: number = Date.now(),
): Promise<void> {
  assertScope(definition, 'synced')
  assertValid(definition, value)
  await db.settings.put({ id: definition.id, value, updatedAt: now })
}

/** Back to the default. Saved as a value (not removed) so sync can see it. */
export async function resetSetting<T extends JsonValue>(
  db: LearningNotesDB,
  definition: SettingDefinition<T>,
  now: number = Date.now(),
): Promise<void> {
  await setSetting(db, definition, definition.defaultValue, now)
}

// ---- Device settings (browser storage) ----

const deviceCache = new Map<string, JsonValue>()
const listeners = new Set<() => void>()

const storageKeyOf = (definition: { id: string; storageKey?: string }) =>
  definition.storageKey ?? definition.id

/** Current value on this device (cached, so repeated reads are cheap). */
export function readDeviceSetting<T extends JsonValue>(
  definition: SettingDefinition<T>,
  storage?: PrefStorage | null,
): T {
  assertScope(definition, 'device')
  if (definition.derived) return definition.derived.read()
  if (!deviceCache.has(definition.id)) {
    deviceCache.set(
      definition.id,
      readPref(
        storageKeyOf(definition),
        definition.isValid,
        definition.defaultValue,
        storage,
      ),
    )
  }
  return deviceCache.get(definition.id) as T
}

export function writeDeviceSetting<T extends JsonValue>(
  definition: SettingDefinition<T>,
  value: T,
  storage?: PrefStorage | null,
): void {
  assertScope(definition, 'device')
  assertValid(definition, value)
  if (definition.derived) {
    definition.derived.write(value)
  } else {
    deviceCache.set(definition.id, value)
    writePref(storageKeyOf(definition), value, storage)
  }
  for (const listener of listeners) listener()
}

/** Calls `listener` whenever a device setting changes. Returns "unsubscribe". */
export function subscribeDeviceSettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Tests only: forget cached device values. */
export function clearDeviceSettingsCache(): void {
  deviceCache.clear()
}
