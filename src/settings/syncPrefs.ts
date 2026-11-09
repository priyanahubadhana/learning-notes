import { readPref, writePref } from '../app/uiPrefs'
import type { JsonValue } from '../core/types'
import { SYNC_GROUPS, type SyncGroupId } from './syncGroups'

/**
 * What stays on this device about settings that follow you: the group
 * switches and the per-setting overrides ("keep on this device only").
 * Neither is ever synced, backed up or exported: they describe this device
 * (like Obsidian and VS Code). Memory is the source of truth and the browser
 * storage is its copy, so everything also works where storage is blocked.
 */

const OVERRIDES_KEY = 'settings.override.v1'
const GROUPS_KEY = 'settings.syncGroups.v1'

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

let overrides: Record<string, JsonValue> | null = null
let switches: Record<string, boolean> | null = null
const listeners = new Set<() => void>()
let epoch = 0

const loadOverrides = (): Record<string, JsonValue> =>
  (overrides ??= readPref(
    OVERRIDES_KEY,
    (v): v is Record<string, JsonValue> => isRecord(v),
    {},
  ))
const loadSwitches = (): Record<string, boolean> =>
  (switches ??= readPref(
    GROUPS_KEY,
    (v): v is Record<string, boolean> =>
      isRecord(v) && Object.values(v).every((x) => typeof x === 'boolean'),
    {},
  ))

function changed() {
  epoch++
  for (const l of listeners) l()
}

/** Calls `fn` whenever an override or a group switch changes. */
export function subscribeSyncPrefs(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
/** A number that goes up with every change (for useSyncExternalStore). */
export const syncPrefsEpoch = (): number => epoch

// ---- Overrides ----

export const hasOverride = (id: string): boolean => id in loadOverrides()
export const getOverride = (id: string): JsonValue | undefined =>
  loadOverrides()[id]
export const overrideIds = (): string[] => Object.keys(loadOverrides())

export function setOverride(id: string, value: JsonValue): void {
  overrides = { ...loadOverrides(), [id]: value }
  writePref(OVERRIDES_KEY, overrides)
  changed()
}

export function clearOverrides(ids: readonly string[]): void {
  const next = { ...loadOverrides() }
  let any = false
  for (const id of ids) {
    if (id in next) {
      delete next[id]
      any = true
    }
  }
  if (!any) return
  overrides = next
  writePref(OVERRIDES_KEY, overrides)
  changed()
}

// ---- Group switches ----

export function groupOn(group: SyncGroupId): boolean {
  const own = loadSwitches()[group]
  return own ?? SYNC_GROUPS.find((g) => g.id === group)?.defaultOn ?? false
}

export function setGroupSwitch(group: SyncGroupId, on: boolean): void {
  switches = { ...loadSwitches(), [group]: on }
  writePref(GROUPS_KEY, switches)
  changed()
}

/** Tests only: forget what was read from storage. */
export function resetSyncPrefsForTests(): void {
  overrides = null
  switches = null
  epoch = 0
}

// ---- Writes that come from sync (not from a click) ----

let applying = 0
/** True while a value from another device is being put in place here. */
export const isApplying = (): boolean => applying > 0
export function whileApplying(fn: () => void): void {
  applying++
  try {
    fn()
  } finally {
    applying--
  }
}
