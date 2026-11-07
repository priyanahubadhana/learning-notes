import { isBoolean } from '../uiPrefs'
import {
  clearPinnedCache,
  readPinned,
  writePinned,
} from '../../settings/deviceModeSettings'
import { isPinnedList, MAX_PINNED } from '../deviceMode'
import { activeTool, isInkTool, openPillTool } from './main/mainTools'
import { memStore, prefStore } from './store'
import { TABS, type TabId } from './tabs'

/**
 * The state of the tool bar: which tool set shows (Write, Draw or Read),
 * whether it is kept, what is on each set, and the ribbon's tab and
 * behaviour. Saved on this device only; nothing goes with the notes.
 */

const BAR_SETS = ['write', 'draw', 'read'] as const
export type BarSet = (typeof BAR_SETS)[number]

/** The tools each set shows from the start. Write is DEFAULT_PINNED. */
export const DEFAULT_SET_TOOLS: Record<Exclude<BarSet, 'write'>, string[]> = {
  draw: [
    'undo',
    'redo',
    'pen',
    'highlighter',
    'eraser',
    'lasso',
    'shapes',
    'drawColor',
    'thickness',
    'newLine',
  ],
  read: [
    'undo',
    'redo',
    'textSize',
    'font',
    'theme',
    'find',
    'readAloud',
    'outline',
    'lineFocus',
    'hideBlanks',
    'lockReading',
    'exitReading',
    'newLine',
  ],
}

/** The set shown now. It changes by itself unless the set is kept. */
export const activeSet = memStore<BarSet>('write')

/**
 * The ribbon replaces the short bar while this is true. Saved per device
 * (Settings › Tool bar › Layout), so the app starts the way it was left.
 */
export const ribbonOpen = prefStore('toolbar.ribbon', isBoolean, false)
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

/**
 * One-time (batch 2f): Undo and Redo are on every set from the start. Sets
 * a person saved before get them added at the front once; they can remove
 * them again in Edit bar.
 */
const undoRedoAdded = prefStore('toolbar.undoRedoAdded', isBoolean, false)
export function addUndoRedoOnce(): void {
  if (undoRedoAdded.get()) return
  undoRedoAdded.set(true)
  for (const set of BAR_SETS) {
    const list = readSetTools(set)
    const missing = ['undo', 'redo'].filter((id) => !list.includes(id))
    if (missing.length === 0 || list.length + missing.length > MAX_PINNED) {
      continue
    }
    const at = list.indexOf('undo')
    // Redo goes right after an Undo that is there; otherwise both go first.
    writeSetTools(
      set,
      at >= 0
        ? [...list.slice(0, at + 1), 'redo', ...list.slice(at + 1)]
        : [...missing, ...list],
    )
  }
}

/** Tests only. */
export function resetToolbarState(): void {
  for (const store of [
    stayOpen,
    ribbonOpen,
    hiddenTabs,
    drawTools,
    readTools,
    undoRedoAdded,
  ]) {
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
/** Keeps the selected tool (the mode) in step with the set. */
function syncTool(set: BarSet): void {
  const tool = activeTool.get()
  if (set === 'read') {
    activeTool.set('read')
    // Reading mode has no pill: a pill of another tool would be left behind.
    const open = openPillTool.get()
    if (open && open !== 'insert') openPillTool.set(null)
  } else if (set === 'write') {
    if (tool === 'read' || isInkTool(tool)) activeTool.set('text')
  } else if (!isInkTool(tool)) activeTool.set('pen')
}

/**
 * Shows another set (Write = Text, Draw = an ink tool, Read = Reading mode).
 * Since redesign step 2 the selected tool is the mode: a tool change calls
 * this; the set only tells the ribbon which tab to open and Reading mode
 * whether to start. Nothing changes sets by itself any more.
 */
export function changeSet(set: BarSet, how: 'auto' | 'user' = 'user'): boolean {
  syncTool(set)
  if (activeSet.get() === set) return false
  activeSet.set(set)
  // A tool pick moves the ribbon to the matching tab. A toggle (Reading mode
  // on or off) is 'auto': the ribbon stays on the tab the person is using.
  if (how === 'user') ribbonTab.set(tabForSet(set))
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

// ---- The ribbon's display (batch 2e) ----

/** Where a bar sits: docked at an edge, or floating over the page. */
export const PLACES = ['top', 'bottom', 'free'] as const
export type Place = (typeof PLACES)[number]
const isPlace = (v: unknown): v is Place =>
  (PLACES as readonly unknown[]).includes(v)

/** "Ribbon replaces short bar" or "Ribbon + short bar" (both at once). */
export const RIBBON_MODES = ['replace', 'both'] as const
export type RibbonMode = (typeof RIBBON_MODES)[number]
export const ribbonMode = prefStore<RibbonMode>(
  'toolbar.ribbonMode',
  (v): v is RibbonMode => (RIBBON_MODES as readonly unknown[]).includes(v),
  'replace',
)

/** Where the ribbon sits; "same" follows the short bar's position. */
export type RibbonPlace = Place | 'same'
export const ribbonPlace = prefStore<RibbonPlace>(
  'toolbar.ribbonPlacement',
  (v): v is RibbonPlace => v === 'same' || isPlace(v),
  'same',
)

/** Full (icon and name) or Slim (one row of icons only). */
export const RIBBON_SIZES = ['full', 'slim'] as const
export type RibbonSize = (typeof RIBBON_SIZES)[number]
export const ribbonSize = prefStore<RibbonSize>(
  'toolbar.ribbonSize',
  (v): v is RibbonSize => (RIBBON_SIZES as readonly unknown[]).includes(v),
  'full',
)
