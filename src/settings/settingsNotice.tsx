import { useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { readPref, writePref } from '../app/uiPrefs'
import type { JsonValue } from '../core/types'
import { t } from '../i18n/t'
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

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function SettingsNotice() {
  const s = useSyncExternalStore(subscribe, () => state)
  if (s.changes.length === 0) return null
  const button =
    '-my-1 min-h-9 shrink-0 rounded-md px-2.5 text-accent hover:bg-hover'
  return (
    <div
      role="status"
      data-chrome
      data-testid="settings-notice"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface-3 px-3.5 py-2 text-[13px] text-ink shadow-[var(--elev-2)]"
    >
      <span>{t('settingsNotice.text', { n: s.changes.length })}</span>
      <button
        type="button"
        onClick={undoSettingsNotice}
        className={`${button} font-semibold underline underline-offset-2`}
      >
        {t('settingsNotice.undo')}
      </button>
      <button type="button" onClick={dismissSettingsNotice} className={button}>
        {t('settingsNotice.ok')}
      </button>
    </div>
  )
}

/** Puts the notice on the page (its own small tree, outside the app). */
export function mountSettingsNotice(): void {
  const host = document.createElement('div')
  host.id = 'settings-notice-host'
  document.body.appendChild(host)
  createRoot(host).render(<SettingsNotice />)
}
