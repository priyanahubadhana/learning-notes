import { useSyncExternalStore } from 'react'
import { PRO_FEATURES, type ProFeatureId } from './proFeatures.gen'

/**
 * Beginner or Professional, plus a list of Professional features a Beginner
 * switched on one by one. Kept per device in localStorage
 * (`learning-notes:level`). It has no Settings row of its own and nothing
 * in the app reads it yet. Default: Professional (what people see today).
 */
export type Level = 'beginner' | 'professional'

export const LEVEL_STORAGE_KEY = 'learning-notes:level'

const known = new Set<string>(PRO_FEATURES.map((f) => f.id))
export const isProFeatureId = (value: unknown): value is ProFeatureId =>
  typeof value === 'string' && known.has(value)

const isLevel = (value: unknown): value is Level =>
  value === 'beginner' || value === 'professional'

interface State {
  level: Level
  unlocked: ReadonlySet<ProFeatureId>
}

function read(): State {
  const fallback: State = { level: 'professional', unlocked: new Set() }
  try {
    const raw = globalThis.localStorage?.getItem(LEVEL_STORAGE_KEY)
    if (raw == null) return fallback
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return fallback
    const { level, unlocked } = value as Record<string, unknown>
    return {
      level: isLevel(level) ? level : 'professional',
      unlocked: new Set(
        Array.isArray(unlocked) ? unlocked.filter(isProFeatureId) : [],
      ),
    }
  } catch {
    return fallback
  }
}

let state = read()
let version = 0
const listeners = new Set<() => void>()

function commit(next: State): void {
  state = next
  version++
  try {
    globalThis.localStorage?.setItem(
      LEVEL_STORAGE_KEY,
      JSON.stringify({
        level: next.level,
        unlocked: PRO_FEATURES.map((f) => f.id).filter((id) =>
          next.unlocked.has(id),
        ),
      }),
    )
  } catch {
    // Storage blocked or full: the choice still works until the app closes.
  }
  for (const l of listeners) l()
}

export const getLevel = (): Level => state.level

export function setLevel(level: Level): void {
  if (isLevel(level) && level !== state.level) commit({ ...state, level })
}

/** Professional: always true. Beginner: only if that feature was unlocked. */
export const isUnlocked = (id: ProFeatureId): boolean =>
  state.level === 'professional' || state.unlocked.has(id)

export function setUnlocked(id: ProFeatureId, on: boolean): void {
  if (!isProFeatureId(id) || state.unlocked.has(id) === on) return
  const unlocked = new Set(state.unlocked)
  if (on) unlocked.add(id)
  else unlocked.delete(id)
  commit({ ...state, unlocked })
}

/** Tests: forget memory and re-read storage. */
export function reloadLevel(): void {
  state = read()
  version++
  for (const l of listeners) l()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Counts up on every change of the level or of any unlock switch. */
export const levelVersion = (): number => version

/** The unlock switches that are on (all of them stay stored in Professional). */
export const unlockedIds = (): ProFeatureId[] =>
  PRO_FEATURES.map((f) => f.id).filter((id) => state.unlocked.has(id))

/** Listens for any change of the level or of an unlock switch. */
export const subscribeLevel = subscribe

/** Re-renders on any change of the level or of an unlock switch. */
export const useLevelVersion = (): number =>
  useSyncExternalStore(subscribe, levelVersion, () => 0)

export const useLevel = (): Level =>
  useSyncExternalStore(subscribe, getLevel, () => 'professional' as const)

export const useUnlocked = (id: ProFeatureId): boolean =>
  useSyncExternalStore(
    subscribe,
    () => isUnlocked(id),
    () => true,
  )
