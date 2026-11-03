import { isBoolean } from '../uiPrefs'
import {
  clearPinnedCache,
  readPinned,
  usePinned,
  writePinned,
} from '../../settings/deviceModeSettings'
import { isPinnedList } from '../deviceMode'
import { memStore, prefStore } from './store'
import { TABS, type TabId } from './tabs'

/**
 * The state of the tool bar: which tool set shows (Write, Draw or Read),
 * whether it is kept, what is on each set, and the ribbon's tab and
 * behaviour. Saved on this device only; nothing goes with the notes.
 */

export const BAR_SETS = ['write', 'draw', 'read'] as const
export type BarSet = (typeof BAR_SETS)[number]
export const isBarSet = (v: unknown): v is BarSet =>
  (BAR_SETS as readonly unknown[]).includes(v)

/** The tools each set shows from the start. Write is DEFAULT_PINNED. */
export const DEFAULT_SET_TOOLS: Record<Exclude<BarSet, 'write'>, string[]> = {
  draw: [
    'pen',
    'highlighter',
    'eraser',
    'lasso',
    'shapes',
    'drawColor',
    'thickness',
    'undo',
  ],
  read: [
    'textSize',
    'font',
    'theme',
    'find',
    'readAloud',
    'lockReading',
    'exitReading',
  ],
}

/** The set shown now. It changes by itself unless the set is kept. */
export const activeSet = memStore<BarSet>('write')

/** "Keep this set": the bar stops switching sets by itself. */
export const keepSet = prefStore('toolbar.keepSet', isBoolean, false)

/** The ribbon replaces the short bar while this is true. */
export const ribbonOpen = memStore(false)
/** The ribbon's tab. */
export const ribbonTab = memStore<TabId>('home')
/** True while the tab's tools are showing under the tab names. */
export const ribbonExpanded = memStore(false)

/** "Tools stay open" (true) or "Tools close after use" (false). */
export const stayOpen = prefStore('toolbar.stayOpen', isBoolean, false)

const isTabList = (v: unknown): v is TabId[] =>
  Array.isArray(v) &&
  v.length <= TABS.length &&
  v.every((x) => (TABS as readonly unknown[]).includes(x))

/** Tabs the user hid in Edit bar (at least one always stays). */
export const hiddenTabs = prefStore<TabId[]>(
  'toolbar.hiddenTabs',
  isTabList,
  [],
)

export const visibleTabs = (hidden: readonly TabId[]): TabId[] => {
  const shown = TABS.filter((tab) => !hidden.includes(tab))
  return shown.length > 0 ? shown : [...TABS]
}

const drawTools = prefStore(
  'formatBar.pinned.draw',
  isPinnedList,
  DEFAULT_SET_TOOLS.draw,
)
const readTools = prefStore(
  'formatBar.pinned.read',
  isPinnedList,
  DEFAULT_SET_TOOLS.read,
)

/** The tool ids on a set, in order (what the user chose, checked on read). */
export function readSetTools(set: BarSet): readonly string[] {
  return set === 'write'
    ? readPinned()
    : (set === 'draw' ? drawTools : readTools).get()
}

export function writeSetTools(set: BarSet, list: readonly string[]): void {
  if (set === 'write') writePinned(list)
  else (set === 'draw' ? drawTools : readTools).set([...list])
}

/** The tool ids on a set; re-draws when they change. */
export function useSetTools(set: BarSet): readonly string[] {
  // Hooks are called in the same order every time; unused ones just read.
  const write = usePinned()
  const draw = drawTools.useValue()
  const read = readTools.useValue()
  return set === 'write' ? write : set === 'draw' ? draw : read
}

/** Tests only. */
export function resetToolbarState(): void {
  for (const store of [keepSet, stayOpen, hiddenTabs, drawTools, readTools]) {
    store.clearCache()
  }
  clearPinnedCache()
  activeSet.set('write')
  ribbonOpen.set(false)
  ribbonTab.set('home')
  ribbonExpanded.set(false)
}

/** The ribbon tab that matches a set (Write → Home …). */
export const tabForSet = (set: BarSet): TabId =>
  set === 'draw' ? 'draw' : set === 'read' ? 'view' : 'home'

/** Shows another set. `auto` changes are ignored while the set is kept. */
export function changeSet(set: BarSet, how: 'auto' | 'user'): boolean {
  if (how === 'auto' && keepSet.get()) return false
  if (activeSet.get() === set) return false
  activeSet.set(set)
  // The ribbon follows the set: it opens on the matching tab.
  ribbonTab.set(tabForSet(set))
  return true
}

/**
 * Switches between "Tools close after use" and "Tools stay open" (Ctrl/Cmd+F1,
 * the ribbon button, View › Keep tools open). The ribbon opens if needed.
 */
export function toggleRibbonBehaviour(): boolean {
  const next = !stayOpen.get()
  stayOpen.set(next)
  ribbonOpen.set(true)
  ribbonExpanded.set(next)
  return next
}
