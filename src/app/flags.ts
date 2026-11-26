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
  'toolbar.menu',
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
  'update.versionLine',
  'security.m1',
  'page.menus',
  'page.objects',
  'media.v2',
  'study.v2',
  'safety.v2',
  'system.v2',
  'storage.safety',
  'journal.monthRepair',
  'look.calmEdge',
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

/** The test host (build-next preview); the live host is never listed. */
const PREVIEW_HOST = 'build-next.learning-notes-app.pages.dev'

/** Is this the build-next preview (not the live site)? */
export function isPreviewHost(): boolean {
  try {
    return globalThis.location?.hostname === PREVIEW_HOST
  } catch {
    return false
  }
}

/** Parts under test that start ON on the preview host, until the user chooses. */
export const PREVIEW_DEFAULT_ON: readonly FlagId[] = [
  'foundation.shell',
  'toolbar.v8',
  'toolbar.menu',
  'settings.v3',
  'notebooks.v2',
  'search.v2',
  'home.v2',
  'library.v2',
  'review.v2',
  'ai.framework',
  'update.v2',
  'update.versionLine',
  'page.menus',
  'storage.safety',
  'journal.monthRepair',
]

/**
 * Parts ON on the preview host only, until the owner says yes (the live site
 * does not get them). 'look.calmEdge': the paper look "B Calm edge" (27 Nov 2026).
 */
const PREVIEW_ONLY_ON: readonly FlagId[] = ['look.calmEdge']

/** The live site. Owner, 25 Nov 2026 (phase 1A live, option A): it starts with the preview's parts ON. */
const LIVE_HOST = 'learning-notes-app.pages.dev'

/**
 * What a device with no saved choice gets: the tested parts ON on the preview
 * host; on the live host the same parts plus the phase under test (what the
 * owner tested on the preview); everything OFF elsewhere (local, test hosts).
 * Once the user flips any switch the whole list is saved, so their own choice
 * always wins. The live host never gets the once-per-phase marker.
 */
function defaults(): Set<FlagId> {
  if (isPreviewHost())
    return new Set([...PREVIEW_DEFAULT_ON, ...PREVIEW_ONLY_ON])
  if (globalThis.location?.hostname === LIVE_HOST)
    return new Set([...PREVIEW_DEFAULT_ON, ...presetFlags(PREVIEW_PHASE)])
  return new Set()
}

/*
 * Why this block sits above readStored(): readStored() runs when the module
 * loads and uses PHASE_ADDS. Below it, the table was not yet built (a
 * "before initialization" error), the catch gave an empty list, and every
 * reload lost the saved switches on the preview host (re-test 18 Nov, bug 2).
 */
/**
 * Test a phase (task 0.6): each preset is the set of switches that are ON
 * for that phase; every other switch is OFF. A row adds to the rows above it.
 */
const PHASE_ADDS = [
  {
    id: 'phase1',
    adds: [
      'foundation.shell',
      'settings.v3',
      'storage.safety',
      'update.v2',
      'security.m1',
    ],
  },
  { id: 'phase2a', adds: ['toolbar.v8', 'toolbar.menu', 'page.menus'] },
  { id: 'phase2b', adds: ['textbox.v2'] },
  { id: 'phase3', adds: ['notebooks.v2'] },
  { id: 'phase4', adds: ['search.v2'] },
  { id: 'phase5', adds: ['home.v2', 'library.v2'] },
  { id: 'phase6', adds: ['review.v2', 'study.v2'] },
  { id: 'phase7', adds: ['reader.v2'] },
  { id: 'phase8', adds: ['ai.framework'] },
  { id: 'everything', adds: 'all' },
] as const satisfies readonly {
  id: string
  adds: readonly FlagId[] | 'all'
}[]

export type PresetId = (typeof PHASE_ADDS)[number]['id']
export const PHASE_PRESETS: readonly { id: PresetId }[] = PHASE_ADDS.map(
  ({ id }) => ({ id }),
)

/** The phase now under test on the preview host; bump it when a phase is published there. */
export const PREVIEW_PHASE: PresetId = 'phase2b'
/** Remembers which phase was last switched on for this device (preview host only). */
export const PREVIEW_PHASE_KEY = 'learning-notes:preview-phase'

function readStored(): Set<FlagId> {
  try {
    const ls = globalThis.localStorage
    const raw = ls?.getItem(FLAG_STORAGE_KEY)
    let out = defaults()
    if (raw != null) {
      const value: unknown = JSON.parse(raw)
      out = Array.isArray(value) ? clean(value) : new Set()
    }
    if (isPreviewHost() && ls?.getItem(PREVIEW_PHASE_KEY) !== PREVIEW_PHASE) {
      // Once per published phase: switch it on; the user's own choices win after.
      out = new Set([...out, ...presetFlags(PREVIEW_PHASE)])
      ls?.setItem(
        FLAG_STORAGE_KEY,
        JSON.stringify(FLAG_IDS.filter((id) => out.has(id))),
      )
      ls?.setItem(PREVIEW_PHASE_KEY, PREVIEW_PHASE)
    }
    return out
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

/** The ids of every switch that is ON right now (a copy). */
export const onFlags = (): ReadonlySet<FlagId> => new Set(snapshot)

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

/** The switches that are ON in a preset. */
export function presetFlags(id: PresetId): ReadonlySet<FlagId> {
  const out = new Set<FlagId>()
  for (const row of PHASE_ADDS) {
    if (row.adds === 'all') FLAG_IDS.forEach((f) => out.add(f))
    else row.adds.forEach((f) => out.add(f))
    if (row.id === id) break
  }
  return out
}

/** Is this device's set of switches exactly one preset's set? Which one? */
export function matchingPreset(): PresetId | null {
  for (const { id } of PHASE_PRESETS) {
    const set = presetFlags(id)
    if (set.size === snapshot.size && [...set].every((f) => snapshot.has(f)))
      return id
  }
  return null
}

/** Makes the switches exactly the preset's set (also drops web-address ones). */
export function applyPreset(id: PresetId): void {
  stored = new Set(presetFlags(id))
  forced = new Set()
  save()
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

/** Non-React read: is this switch ON right now? */
export const isFlagOn = (id: FlagId): boolean => snapshot.has(id)
