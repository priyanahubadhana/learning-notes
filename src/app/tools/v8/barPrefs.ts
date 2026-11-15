import { useSyncExternalStore } from 'react'
import {
  getLevel,
  isUnlocked,
  subscribeLevel,
  type Level,
} from '../../../settings/level'
import type { ProFeatureId } from '../../../settings/proFeatures.gen'
import { prefStore, type Store } from '../store'

/**
 * Tool bar v9 (owner answer 2A, 15 Nov): every Beginner / Professional
 * difference of the bar is its own setting. Each one is "auto" until a person
 * (or a starter) sets it: auto follows the level (Beginner or Professional)
 * and, for a Beginner, the Professional switch named here. Settings code
 * reads and writes through `setBarPref`; the bar reads `useBarPref`.
 */
export const BAR_PREF_IDS = [
  'toolNames',
  'formatTabs',
  'backToPen',
  'eraserMenus',
  'biggerLasso',
] as const
export type BarPrefId = (typeof BAR_PREF_IDS)[number]

export type BarPrefChoice = 'auto' | 'on' | 'off'
const isChoice = (v: unknown): v is BarPrefChoice =>
  v === 'auto' || v === 'on' || v === 'off'

/** The Professional switch that opens each one for a Beginner (none for names: the setting is its own switch). */
const UNLOCK: Record<BarPrefId, ProFeatureId | null> = {
  toolNames: null,
  formatTabs: 'tb.textFonts',
  backToPen: 'tb.layouts',
  eraserMenus: 'tb.eraserOptions',
  biggerLasso: 'tb.lassoOptions',
}

const stores: Record<BarPrefId, Store<BarPrefChoice>> = {
  toolNames: prefStore('toolbar.v9.toolNames', isChoice, 'auto'),
  formatTabs: prefStore('toolbar.v9.formatTabs', isChoice, 'auto'),
  backToPen: prefStore('toolbar.v9.backToPen', isChoice, 'auto'),
  eraserMenus: prefStore('toolbar.v9.eraserMenus', isChoice, 'auto'),
  biggerLasso: prefStore('toolbar.v9.biggerLasso', isChoice, 'auto'),
}

/** Beginner values (the Simple starter) and Professional values (Everything on): all of them off / on. */
export const BAR_PREF_STARTERS = {
  simple: {
    toolNames: false,
    formatTabs: false,
    backToPen: false,
    eraserMenus: false,
    biggerLasso: false,
  },
  everything: {
    toolNames: true,
    formatTabs: true,
    backToPen: true,
    eraserMenus: true,
    biggerLasso: true,
  },
} as const satisfies Record<string, Record<BarPrefId, boolean>>

/** What a choice means now: true = the Professional look of that part. */
export function resolveBarPref(
  id: BarPrefId,
  choice: BarPrefChoice,
  level: Level = getLevel(),
): boolean {
  if (choice !== 'auto') return choice === 'on'
  if (level === 'professional')
    return UNLOCK[id] ? isUnlocked(UNLOCK[id]) : true
  return UNLOCK[id] ? isUnlocked(UNLOCK[id]) : false
}

export const getBarPref = (id: BarPrefId): boolean =>
  resolveBarPref(id, stores[id].get())

export const setBarPref = (id: BarPrefId, on: boolean): void =>
  stores[id].set(on ? 'on' : 'off')

/** Back to "follow Beginner or Professional". */
export const resetBarPref = (id: BarPrefId): void => stores[id].set('auto')

export const barPrefStore = (id: BarPrefId): Store<BarPrefChoice> => stores[id]

/** Re-draws when the choice, the level or an unlock switch changes. */
export function useBarPref(id: BarPrefId): boolean {
  const choice = stores[id].useValue()
  // Level and unlock changes re-evaluate "auto".
  const key = useSyncExternalStore(
    subscribeLevel,
    () => `${getLevel()}${UNLOCK[id] ? isUnlocked(UNLOCK[id]) : ''}`,
    () => '',
  )
  void key
  return resolveBarPref(id, choice)
}

/** True while the screen is upright (taller than wide). */
function subscribePortrait(cb: () => void): () => void {
  const q = window.matchMedia?.('(orientation: portrait)')
  q?.addEventListener('change', cb)
  return () => q?.removeEventListener('change', cb)
}
const isPortrait = (): boolean =>
  !!window.matchMedia?.('(orientation: portrait)').matches

/**
 * Do the bar tools show their names? The setting says yes, except upright on
 * a Pencil-mode device: icons only there, and the names come back sideways
 * (owner, 15 Nov, E). A hover or long press still shows the name.
 */
export function useToolNames(pencilMode: boolean): boolean {
  const on = useBarPref('toolNames')
  const portrait = useSyncExternalStore(
    subscribePortrait,
    isPortrait,
    () => false,
  )
  return on && !(pencilMode && portrait)
}
