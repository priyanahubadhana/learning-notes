import { liveQuery } from 'dexie'
import {
  announcePrefChanged,
  isStringArray,
  readPref,
  setPrefWriteHook,
  writePref,
} from '../app/uiPrefs'
import type { LearningNotesDB } from '../core/db'
import type { JsonValue } from '../core/types'
import { costCurrencySetting } from '../ai/costCurrency'
import { isCap } from '../ai/usage'
import { settingsRegistry } from './builtinSettings'
import { groupOf, type SettingDefinition } from './registry'
import {
  applyDeviceValue,
  getSetting,
  looksLikeSecret,
  readDeviceSetting,
} from './settingsService'
import type { SyncGroupId } from './syncGroups'
import {
  clearOverrides,
  getOverride,
  groupOn,
  hasOverride,
  isApplying,
  overrideIds,
  setGroupSwitch,
  setOverride,
  subscribeSyncPrefs,
  whileApplying,
} from './syncPrefs'

/**
 * Settings that follow you, the device side. A device setting that belongs to
 * a sync group (or one of the AI prefs below) keeps its effective value in
 * this browser as before, so every reader stays as it was and the first
 * paint is right. This module makes that value follow the account:
 *
 * - A change made here goes to the `settings` record (and so to the other
 *   devices), unless its group is off or the setting is kept on this device
 *   only: then it goes to the override instead and nothing is sent.
 * - A record that arrives is put in place here (open screens update at once),
 *   unless the group is off or this device has its own override. The record
 *   is stored either way, so turning a group on again is instant.
 * - Settings kept in the database (`scope: 'synced'`) read through
 *   `getSetting`, which honours the same overrides and switches.
 */

/** One value that follows the account, whatever way it is stored here. */
export interface Mirrored {
  id: string
  /** Browser storage key (without the app prefix). */
  key: string
  group: SyncGroupId
  isValid: (value: unknown) => boolean
  defaultValue: JsonValue
  def?: SettingDefinition
}

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isStringMap = (v: unknown): v is Record<string, string> =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.values(v).every((x) => typeof x === 'string')

const aiPref = (
  id: string,
  isValid: (v: unknown) => boolean,
  defaultValue: JsonValue,
): Mirrored => ({ id, key: id, group: 'ai', isValid, defaultValue })

/**
 * AI choices kept as plain browser prefs (they have no row on the Settings
 * screen). Key ids only: a key's secret never goes here.
 */
export const AI_PREF_SETTINGS: readonly Mirrored[] = [
  aiPref('ai.enabled', isBool, false),
  aiPref('ai.cap', isCap, 5),
  aiPref('ai.privacyOk', isBool, false),
  aiPref('ai.modelOrder', isStringArray, []),
  aiPref('ai.modelKeys', isStringMap, {}),
]

let cachedFor = -1
let cached: Mirrored[] = []
/** Every device-stored value that follows the account. */
export function mirroredSettings(): Mirrored[] {
  const defs = settingsRegistry.list()
  if (defs.length !== cachedFor) {
    cachedFor = defs.length
    cached = [
      ...defs
        .filter((d) => d.scope === 'device' && !d.derived && groupOf(d))
        .map((d) => ({
          id: d.id,
          key: d.storageKey ?? d.id,
          group: groupOf(d) as SyncGroupId,
          isValid: d.isValid as (v: unknown) => boolean,
          defaultValue: d.defaultValue,
          def: d,
        })),
      ...AI_PREF_SETTINGS,
    ]
  }
  return cached
}

/** The settings kept in the database that follow the account. */
const databaseSettings = (): SettingDefinition[] => [
  ...settingsRegistry.list().filter((d) => d.scope === 'synced'),
  // Not drawn as a Settings row (the AI page has its own picker).
  costCurrencySetting as unknown as SettingDefinition,
]

const byKey = (key: string) => mirroredSettings().find((m) => m.key === key)
const byId = (id: string) => mirroredSettings().find((m) => m.id === id)

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

let db: LearningNotesDB | null = null
/** The latest record values (kept in step by the live query and local writes). */
let rows = new Map<string, JsonValue>()

const current = (m: Mirrored): JsonValue =>
  m.def
    ? readDeviceSetting(m.def)
    : readPref(
        m.key,
        m.isValid as (v: unknown) => v is JsonValue,
        m.defaultValue,
      )

/** Called when a value from another device really changed a value here. */
type ChangeListener = (id: string, before: JsonValue, after: JsonValue) => void
const changeListeners = new Set<ChangeListener>()
export function onSettingArrived(fn: ChangeListener): () => void {
  changeListeners.add(fn)
  return () => changeListeners.delete(fn)
}

function put(m: Mirrored, value: JsonValue) {
  const before = current(m)
  if (m.def) applyDeviceValue(m.def, value)
  else {
    whileApplying(() => writePref(m.key, value))
    announcePrefChanged(m.key, value)
  }
  for (const l of changeListeners) l(m.id, before, value)
}

/** Brings one value in line with the record, if this device follows it. */
function syncOne(m: Mirrored, force: boolean) {
  if (!groupOn(m.group) || hasOverride(m.id)) return
  const row = rows.get(m.id)
  let target: JsonValue
  if (row !== undefined && m.isValid(row)) target = row
  else if (force) target = m.defaultValue
  else return
  if (!same(target, current(m))) put(m, target)
}

const syncAll = () => {
  for (const m of mirroredSettings()) syncOne(m, false)
}

async function writeRow(m: Mirrored, value: JsonValue) {
  if (!db || looksLikeSecret(value)) return
  const old = await db.settings.get(m.id)
  if (old ? same(old.value, value) : same(value, m.defaultValue)) return
  await db.settings.put({ id: m.id, value, updatedAt: Date.now() })
}

/** A browser pref was saved here (a click, or a screen that saves its state). */
function onPrefWrite(key: string, value: unknown) {
  if (isApplying() || !db) return
  const m = byKey(key)
  if (!m || !m.isValid(value)) return
  const v = value as JsonValue
  if (!groupOn(m.group) || hasOverride(m.id)) {
    setOverride(m.id, v)
    return
  }
  rows.set(m.id, v) // so a refresh from older records cannot undo it
  void writeRow(m, v)
}

let stopper: (() => void) | null = null

/** Starts following the account for this database. Returns "stop". */
export function startSettingsMirror(database: LearningNotesDB): () => void {
  stopSettingsMirror()
  db = database
  setPrefWriteHook(onPrefWrite)
  const sub = liveQuery(() => database.settings.toArray()).subscribe({
    next: (list) => {
      rows = new Map(list.map((r) => [r.id, r.value]))
      syncAll()
    },
    error: () => {},
  })
  const off = subscribeSyncPrefs(syncAll)
  stopper = () => {
    sub.unsubscribe()
    off()
    setPrefWriteHook(null)
    db = null
    rows = new Map()
  }
  return stopSettingsMirror
}

/** Reads the settings table again and applies it (the health check, after the app was away). */
export async function rereadSettings(): Promise<void> {
  if (!db) return
  const list = await db.settings.toArray()
  rows = new Map(list.map((r) => [r.id, r.value]))
  syncAll()
}

export function stopSettingsMirror(): void {
  stopper?.()
  stopper = null
}

// ---- What the person can do ----

/** Every setting (any kind) that belongs to a group. */
const idsInGroup = (group: SyncGroupId): string[] => [
  ...mirroredSettings()
    .filter((m) => m.group === group)
    .map((m) => m.id),
  ...databaseSettings()
    .filter((d) => groupOf(d) === group)
    .map((d) => d.id),
]

/** The value this device shows now. */
async function effective(id: string): Promise<JsonValue | undefined> {
  const m = byId(id)
  if (m) return current(m)
  const def = databaseSettings().find((d) => d.id === id)
  if (def && db) return getSetting(db, def)
  return undefined
}

/**
 * Turns a group on or off on this device. Off: today's values stay as this
 * device's own, and records that arrive are kept but not applied. On: the
 * records apply (this device's own values for the group are dropped).
 */
export async function setGroupOn(group: SyncGroupId, on: boolean) {
  if (!on) {
    for (const id of idsInGroup(group)) {
      if (hasOverride(id)) continue
      const value = await effective(id)
      if (value !== undefined) setOverride(id, value)
    }
    setGroupSwitch(group, false)
    return
  }
  clearOverrides(idsInGroup(group))
  setGroupSwitch(group, true)
}

/** "Keep on this device only". */
export async function keepOnThisDevice(id: string) {
  const value = await effective(id)
  if (value !== undefined) setOverride(id, value)
}

/** "Reset to synced value": the override goes, the account's value shows. */
export function resetToSynced(id: string) {
  clearOverrides([id])
  const m = byId(id)
  if (m) syncOne(m, true)
}

/** "Use this device's value everywhere": it becomes the account's value. */
export async function shareThisDeviceValue(id: string) {
  const value = await effective(id)
  if (value === undefined || !db || looksLikeSecret(value)) return
  clearOverrides([id])
  rows.set(id, value)
  await db.settings.put({ id, value, updatedAt: Date.now() })
}

/** Clears every override. Returns what they were, for Undo. */
export function resetAllToSynced(): Record<string, JsonValue> {
  const before: Record<string, JsonValue> = {}
  const ids = overrideIds()
  for (const id of ids) before[id] = getOverride(id) as JsonValue
  clearOverrides(ids)
  for (const id of ids) {
    const m = byId(id)
    if (m) syncOne(m, true)
  }
  return before
}

/** Puts overrides back (Undo). */
export function restoreOverrides(saved: Record<string, JsonValue>) {
  for (const [id, value] of Object.entries(saved)) {
    setOverride(id, value)
    const m = byId(id)
    if (m && !same(current(m), value)) put(m, value)
  }
}
