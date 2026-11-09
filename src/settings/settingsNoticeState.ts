import { readPref, writePref } from '../app/uiPrefs'
import type { JsonValue } from '../core/types'
import { onSettingArrived, restoreOverrides } from './settingsMirror'

/**
 * The one quiet notice after settings start to follow you: "Settings now
 * follow you. 3 changed to match your other devices. Undo". It lists only
 * values that changed on this device during the first minutes after the
 * one-time step; Undo keeps the old values as this device's own.
 */

interface Change {
  id: string
  before: JsonValue
}

const KEY = 'settings.notice.v1'
const WINDOW_MS = 2 * 60 * 1000

interface State {
  /** Changes are recorded until this time. */
  until: number
  changes: Change[]
}

const isState = (v: unknown): v is State =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as State).until === 'number' &&
  Array.isArray((v as State).changes)

let state: State = readPref(KEY, isState, { until: 0, changes: [] })
const listeners = new Set<() => void>()
const set = (next: State) => {
  state = next
  writePref(KEY, state)
  for (const l of listeners) l()
}

/** Starts listening for the minutes after the one-time step. */
export function openSettingsNotice(now = Date.now()): void {
  set({ until: now + WINDOW_MS, changes: [] })
}

/** Records arrivals while the window is open. Returns "stop". */
export function watchSettingsNotice(): () => void {
  return onSettingArrived((id, before) => {
    if (Date.now() > state.until) return
    if (state.changes.some((c) => c.id === id)) return
    set({ ...state, changes: [...state.changes, { id, before }] })
  })
}

export const noticeChanges = (): readonly Change[] => state.changes

export function dismissSettingsNotice(): void {
  set({ until: 0, changes: [] })
}

export function undoSettingsNotice(): void {
  restoreOverrides(
    Object.fromEntries(state.changes.map((c) => [c.id, c.before])),
  )
  dismissSettingsNotice()
}

export const subscribeNotice = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
export const noticeState = (): State => state
