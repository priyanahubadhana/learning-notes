import { useSyncExternalStore } from 'react'
import { settingsRegistry } from '../builtinSettings'
import {
  getLevel,
  isProFeatureId,
  isUnlocked,
  setLevel,
  subscribeLevel,
  levelVersion,
} from '../level'

/**
 * "Your experience" (SET-B17 to B20): how much Settings shows. Kept on this
 * device (`learning-notes:experience`). New shows the essentials; Used a
 * little adds the common rows; Experienced shows everything. It only decides
 * what Settings lists: the app view stays the two-level Beginner /
 * Professional of `level.ts`, which choosing New / Used a little (Beginner)
 * or Experienced (Professional) also sets.
 */
export type Experience = 'new' | 'little' | 'expert'
export const EXPERIENCES: readonly Experience[] = ['new', 'little', 'expert']

export const EXPERIENCE_KEY = 'learning-notes:experience'

export const isExperience = (v: unknown): v is Experience =>
  v === 'new' || v === 'little' || v === 'expert'

interface State {
  /** null until the person chooses. */
  choice: Experience | null
  /** Show "Your experience" first (default) or last. */
  top: boolean
}

function read(): State {
  const fallback: State = { choice: null, top: true }
  try {
    const raw = globalThis.localStorage?.getItem(EXPERIENCE_KEY)
    if (raw == null) return fallback
    const v: unknown = JSON.parse(raw)
    if (typeof v !== 'object' || v === null) return fallback
    const { choice, top } = v as Record<string, unknown>
    return {
      choice: isExperience(choice) ? choice : null,
      top: top !== false,
    }
  } catch {
    return fallback
  }
}

let state = read()
let version = 0
const listeners = new Set<() => void>()

function commit(next: State) {
  state = next
  version++
  try {
    globalThis.localStorage?.setItem(EXPERIENCE_KEY, JSON.stringify(next))
  } catch {
    // Storage blocked: the choice lasts until the app closes.
  }
  for (const l of listeners) l()
}

export const getExperience = (): Experience | null => state.choice
export const experienceOnTop = (): boolean => state.top

/** Chooses an experience and sets the matching app view. */
export function setExperience(choice: Experience | null) {
  if (choice !== null && !isExperience(choice)) return
  if (choice !== null)
    setLevel(choice === 'expert' ? 'professional' : 'beginner')
  if (choice !== state.choice) commit({ ...state, choice })
}

export function setExperienceOnTop(top: boolean) {
  if (top !== state.top) commit({ ...state, top })
}

/** Tests: forget memory and re-read storage. */
export function reloadExperience() {
  state = read()
  version++
  for (const l of listeners) l()
}

const subscribe = (fn: () => void) => {
  listeners.add(fn)
  const off = subscribeLevel(fn)
  return () => {
    listeners.delete(fn)
    off()
  }
}
const snapshot = () => version * 100000 + levelVersion()

/** Re-renders when the experience, the level or an unlock switch changes. */
export const useGateVersion = (): number =>
  useSyncExternalStore(subscribe, snapshot, () => 0)

export const useExperience = (): Experience | null =>
  useSyncExternalStore(subscribe, getExperience, () => null)

export const useExperienceOnTop = (): boolean =>
  useSyncExternalStore(subscribe, experienceOnTop, () => true)

/** Mock tags: E = essential, C = common, A = Professional (own unlock switch). */
const ESSENTIAL = new Set([
  'general.theme',
  'general.language',
  'general.deviceMode',
  'general.showHelp',
  'general.autoUpdate',
  'general.openNotebookAt',
  'general.defaultPaper',
  'about.check',
  'account.signIn',
  'account.signOut',
  'account.syncNow',
  'sync.status',
  'sync.setup',
  'lock.pin',
  'lock.device',
  'lock.idleMinutes',
  'ai.enable',
  'ai.keys',
  'ai.cap',
  'ai.allowNotebook',
  'conn.status',
  'claude.state',
  'ai.connect',
  'claude.choice',
  'toolbar.show',
  'advanced.barPlacement',
  'toolbar.layout',
  'advanced.barSize',
  'toolbar.showNames',
  'toolbar.fingerOnly',
  'advanced.pencilWrites',
  'advanced.autoSwitch',
  'reading.entry',
  'reading.theme',
  'reading.font',
  'reading.size',
  'review.newPerDay',
  'review.scheduler',
  'help.experience',
  'help.replay',
  'help.tours',
  'experience.pin',
])

export type RowTag = 'E' | 'C' | 'A'

/** A row with its own unlock switch is Professional; unlisted rows are common. */
export const tagOf = (id: string): RowTag =>
  isProFeatureId(id) ? 'A' : ESSENTIAL.has(id) ? 'E' : 'C'

/**
 * Does Settings list this row now? Professional shows everything. In
 * Beginner a Professional row shows only when its switch is on; the rest
 * follow the experience (New: essentials; Used a little: plus common).
 */
/**
 * Rows that always show: their Professional switch only widens the control
 * (Start new pages as: every template, not only Blank and Study notes).
 */
const ALWAYS = new Set(['general.newPageStudy'])

export function rowShown(id: string): boolean {
  if (getLevel() === 'professional' || ALWAYS.has(id)) return true
  const tag = tagOf(id)
  if (tag === 'A') return isUnlocked(id as never)
  if (tag === 'E') return true
  return state.choice !== 'new'
}

/** How many settings an experience shows (the same rule as `rowShown`). */
export function countFor(exp: Experience): number {
  return settingsRegistry
    .list()
    .filter((s) => !s.searchOnly)
    .filter((s) => {
      const tag = tagOf(s.id)
      return (
        exp === 'expert' || tag === 'E' || (tag === 'C' && exp === 'little')
      )
    }).length
}
