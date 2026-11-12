import { useSyncExternalStore } from 'react'

/**
 * Feature switches for new parts of the app. All start OFF, so with nothing
 * changed every screen looks exactly as before. Names and one-line
 * descriptions are texts `flags.<id>.name` and `flags.<id>.desc`.
 *
 * Stored per device in localStorage (`learning-notes:flags`, a JSON list of
 * the ON ids). Tests can force switches ON for one run with `?flags=a,b`.
 */
export const FLAG_IDS = [
  'foundation.events',
  'foundation.gestures',
  'foundation.selection',
  'foundation.overlay',
  'foundation.parts',
  'foundation.shell',
  'foundation.toolRegistry',
  'toolbar.v8',
  'textbox.v2',
  'settings.v3',
  'notebooks.v2',
  'search.v2',
  'home.v2',
  'library.v2',
  'reader.v2',
  'review.v2',
  'ai.framework',
  'update.v2',
  'security.m1',
  'page.menus',
  'page.objects',
  'media.v2',
  'study.v2',
  'safety.v2',
  'system.v2',
] as const

export type FlagId = (typeof FLAG_IDS)[number]

export const FLAG_STORAGE_KEY = 'learning-notes:flags'

const known = new Set<string>(FLAG_IDS)
export const isFlagId = (value: unknown): value is FlagId =>
  typeof value === 'string' && known.has(value)

/** Keeps only known ids, each once, in list order. */
function clean(ids: Iterable<unknown>): Set<FlagId> {
  const out = new Set<FlagId>()
  for (const id of ids) if (isFlagId(id)) out.add(id)
  return out
}

function readStored(): Set<FlagId> {
  try {
    const raw = globalThis.localStorage?.getItem(FLAG_STORAGE_KEY)
    if (raw == null) return new Set()
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? clean(value) : new Set()
  } catch {
    return new Set()
  }
}

function readForced(): Set<FlagId> {
  try {
    const param = new URLSearchParams(globalThis.location?.search ?? '').get(
      'flags',
    )
    return clean((param ?? '').split(',').map((s) => s.trim()))
  } catch {
    return new Set()
  }
}

let stored = readStored()
let forced = readForced()
/** What `isOn` answers; a new Set each change, so React can see it. */
let snapshot: ReadonlySet<FlagId> = new Set([...stored, ...forced])
const listeners = new Set<() => void>()

function publish(): void {
  snapshot = new Set([...stored, ...forced])
  for (const l of listeners) l()
}

function save(): void {
  try {
    globalThis.localStorage?.setItem(
      FLAG_STORAGE_KEY,
      JSON.stringify(FLAG_IDS.filter((id) => stored.has(id))),
    )
  } catch {
    // Storage blocked or full: the switch still works until the app closes.
  }
}

/** Is this switch ON? Answers at once from memory. */
export const isOn = (id: FlagId): boolean => snapshot.has(id)

/** Turns a switch on or off and remembers it on this device. */
export function setFlag(id: FlagId, on: boolean): void {
  if (!isFlagId(id)) return
  stored = new Set(stored)
  forced = new Set(forced)
  if (on) stored.add(id)
  else {
    stored.delete(id)
    forced.delete(id)
  }
  save()
  publish()
}

/** Turns every switch OFF (also the ones forced by the web address). */
export function resetFlags(): void {
  stored = new Set()
  forced = new Set()
  save()
  publish()
}

/** Re-reads storage and the web address (tests; startup does it once). */
export function reloadFlags(): void {
  stored = readStored()
  forced = readForced()
  publish()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** React: is this switch ON? Re-renders when it changes. */
export function useFlag(id: FlagId): boolean {
  return useSyncExternalStore(
    subscribe,
    () => snapshot.has(id),
    () => false,
  )
}
