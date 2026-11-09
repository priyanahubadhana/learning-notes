import { useSyncExternalStore } from 'react'
import { writePref } from '../app/uiPrefs'
import { AI_KEYS } from './route'

let version = 0
const listeners = new Set<() => void>()
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Turns AI on (the same switch as Settings › AI) and tells every screen. */
export function turnOnAi(): void {
  writePref(AI_KEYS.enabled, true)
  version += 1
  listeners.forEach((fn) => fn())
}

/** Re-renders the caller when AI is turned on from a card. */
export const useAiTick = (): number =>
  useSyncExternalStore(subscribe, () => version)
