import { isBoolean } from '../../uiPrefs'
import { MAX_PINNED } from '../../deviceMode'
import { prefStore, memStore, cleanStore } from '../store'

/**
 * The state of the main bar and its options pill (redesign step 2).
 *
 * - The main bar is one row of tools. The selected tool IS the mode.
 * - Tapping a tool opens its options pill; the active option again opens a
 *   detail card (see OptionsPill.tsx, DetailCard.tsx).
 * - Which tools show, and in which order, and each pill's options, are saved
 *   per device and checked when read.
 * Nothing here is saved with the notes.
 */

export const MAIN_TOOLS = [
  'text',
  'pen',
  'highlighter',
  'eraser',
  'newLine',
  'backspace',
  'lasso',
  'insert',
  'read',
] as const
export type MainTool = (typeof MAIN_TOOLS)[number]
const isMainTool = (v: unknown): v is MainTool =>
  (MAIN_TOOLS as readonly unknown[]).includes(v)

/** Tools that are a mode (the selected one is what the page does now). */
export const MODE_TOOLS = [
  'text',
  'pen',
  'highlighter',
  'eraser',
  'lasso',
  'read',
] as const
export type ModeTool = (typeof MODE_TOOLS)[number]
export const isModeTool = (v: unknown): v is ModeTool =>
  (MODE_TOOLS as readonly unknown[]).includes(v)

/** Tools that draw ink (the drawing engine is step 3). */
const INK_TOOLS = ['pen', 'highlighter', 'eraser', 'lasso'] as const
export type InkTool = (typeof INK_TOOLS)[number]
export const isInkTool = (v: unknown): v is InkTool =>
  (INK_TOOLS as readonly unknown[]).includes(v)

/** Tools with an options pill (New line is a button, not a pill). */
export const PILL_TOOLS = [
  'text',
  'pen',
  'highlighter',
  'eraser',
  'lasso',
  'insert',
] as const
export type PillTool = (typeof PILL_TOOLS)[number]
const isPillTool = (v: unknown): v is PillTool =>
  (PILL_TOOLS as readonly unknown[]).includes(v)

/** Options a pill has but does not show until Edit bar turns them on. */
const HIDDEN_BY_DEFAULT: readonly string[] = ['lineFocus', 'lock', 'selfTest']

/** Every option of every pill, in the default order. */
export const PILL_OPTIONS: Record<PillTool, readonly string[]> = {
  text: [
    'style',
    'bold',
    'italic',
    'underline',
    'textColor',
    'highlightColor',
    'list',
    'align',
    'keyPoint',
  ],
  pen: ['type', 'thickness', 'colour'],
  highlighter: ['thickness', 'colour'],
  eraser: ['mode', 'size', 'highlightsOnly'],
  lasso: ['shape', 'filter'],
  insert: [
    'table',
    'shape',
    'picture',
    'camera',
    'file',
    'writePad',
    'callout',
    'audio',
    'card',
    'tape',
    'magnifier',
    'ruler',
  ],
}

// ---- Which tool is selected, which pill shows ----

/** The selected tool. It starts on Text and is not saved. */
export const activeTool = memStore<ModeTool>('text')

/** The pill that was opened (null = none). Insert has a pill but no mode. */
export const openPillTool = memStore<PillTool | null>(null)

/** 📌 keeps the options pill open (saved per device). */
export const pillPinned = prefStore('toolbar.pillPinned', isBoolean, false)

/** The mini toolbar near a selection made by a double or triple tap. */
export const miniToolbarOpen = memStore(false)

/** Height the main bar's stack keeps free for a pill that sits against it. */
export const pillReserve = memStore(0)

/** The detail card that is open: which tool, and which page of it. */
export interface CardState {
  tool: PillTool
  page: string
}
export const openCard = memStore<CardState | null>(null)

/** Names under the bar icons, always (the hover name needs no setting). */
export const showNames = prefStore('toolbar.showNames', isBoolean, false)

/** The pill showing now: the opened one, or (when pinned) the tool's own. */
export function shownPill(
  opened: PillTool | null,
  pinned: boolean,
  active: ModeTool,
): PillTool | null {
  if (opened) return opened
  return pinned && active !== 'read' ? active : null
}

/** Closes the pill and its card (the ✕, Esc, a tap outside). */
export function closePill(): void {
  openCard.set(null)
  openPillTool.set(null)
}

// ---- What is on the main bar and in the pills (Edit bar) ----

/**
 * A saved main bar, cleaned (R7-10): tools this build does not know are left
 * out and repeats dropped; the person's other choices and their order stay.
 * New tools are never added here: they wait in the Edit toolbar list.
 */
export function cleanMainList(v: unknown): MainTool[] | undefined {
  if (!Array.isArray(v)) return undefined
  const kept = [...new Set(v.filter(isMainTool))]
  return kept.length > 0 || v.length === 0 ? kept : undefined
}

/** The tools on the main bar, in order. */
export const mainList = cleanStore<MainTool[]>('toolbar.main', cleanMainList, [
  ...MAIN_TOOLS,
])

/** At least one tool always stays (and the ⋯ button is always there). */
export const shownMainTools = (list: readonly MainTool[]): MainTool[] =>
  list.length > 0 ? [...list] : [...MAIN_TOOLS]

/** The removed Read pill (polish 1): only old saved bars still have it. */
const LEGACY_READ_PILL = 'read'
type PillMap = Partial<Record<PillTool, string[]>>

/** A saved pill map without the removed Read pill. */
export function withoutReadPill(map: PillMap): PillMap {
  const { [LEGACY_READ_PILL as PillTool]: _gone, ...rest } = map
  void _gone
  return rest
}
/**
 * A saved pill map, cleaned (R7-10): unknown tools and unknown options are
 * left out (the old Read pill too); every pill keeps its other choices.
 */
export function cleanPillMap(v: unknown): PillMap | undefined {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return undefined
  const out: PillMap = {}
  for (const [tool, list] of Object.entries(v)) {
    if (!isPillTool(tool) || !Array.isArray(list)) continue
    const kept = [
      ...new Set(
        list.filter(
          (id): id is string =>
            typeof id === 'string' && PILL_OPTIONS[tool].includes(id),
        ),
      ),
    ]
    // Nothing left of a non-empty list: that pill goes back to its defaults.
    if (kept.length > 0 || list.length === 0) out[tool] = kept
  }
  return out
}

/** Each pill's own options, in order (a missing pill uses its defaults). */
export const pillLists = cleanStore<PillMap>('toolbar.pills', cleanPillMap, {})

export function pillOptionsOf(tool: PillTool, map: PillMap): string[] {
  const own = map[tool]
  return own
    ? own.filter((id) => PILL_OPTIONS[tool].includes(id))
    : PILL_OPTIONS[tool].filter((id) => !HIDDEN_BY_DEFAULT.includes(id))
}

export function setPillOptions(tool: PillTool, list: readonly string[]): void {
  pillLists.set({ ...pillLists.get(), [tool]: [...list] })
}

/** Pinned extra tools from the control panel (shown after the main tools). */
const EXTRA_ID = /^[a-zA-Z][a-zA-Z0-9:-]{0,60}$/
/**
 * Saved extras, cleaned (R7-10): the old cap of 8 here was lower than the 40
 * the pin button allows, so a ninth pin made the whole saved list unreadable
 * and the bar fell back to its defaults. Now only bad ids drop out.
 */
export function cleanExtras(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  return [
    ...new Set(
      v.filter(
        (id): id is string => typeof id === 'string' && EXTRA_ID.test(id),
      ),
    ),
  ].slice(0, MAX_PINNED)
}
export const extraTools = cleanStore<string[]>(
  'toolbar.extras',
  cleanExtras,
  [],
)

/** Back to the standard main bar and pills (Edit bar › Reset). */
export function resetMainBar(): void {
  mainList.set([...MAIN_TOOLS])
  pillLists.set({})
  extraTools.set([])
}

/** Moves an id `delta` places inside a list (stays inside it). */
export function moveIn<T>(list: readonly T[], id: T, delta: number): T[] {
  const from = list.indexOf(id)
  if (from < 0) return [...list]
  const to = Math.min(list.length - 1, Math.max(0, from + delta))
  const next = [...list]
  next.splice(from, 1)
  next.splice(to, 0, id)
  return next
}

/**
 * Show or hide an item while keeping the default order for the ones that are
 * shown: a hidden item that comes back goes to its default place.
 */
export function toggleIn<T>(list: readonly T[], id: T, all: readonly T[]): T[] {
  if (list.includes(id)) return list.filter((x) => x !== id)
  const order = new Map(all.map((x, i) => [x, i]))
  const rank = (x: T) => order.get(x) ?? all.length
  // Goes after the last shown item that comes before it by default.
  let at = 0
  list.forEach((x, i) => {
    if (rank(x) < rank(id)) at = i + 1
  })
  const next = [...list]
  next.splice(at, 0, id)
  return next
}

// ---- Settings that belong to the bar ----

export const NEW_LINE_EXTRAS = ['hold', 'doubleTap', 'off'] as const
export type NewLineExtras = (typeof NEW_LINE_EXTRAS)[number]
const isNewLineExtras = (v: unknown): v is NewLineExtras =>
  (NEW_LINE_EXTRAS as readonly unknown[]).includes(v)

/** How the extras of ↵ New line open: press and hold, double-tap, or never. */
export const newLineExtras = prefStore<NewLineExtras>(
  'toolbar.newLineExtras',
  isNewLineExtras,
  'hold',
)

export const HOLD_CHOICES = [400, 600, 800, 1000] as const
export const DEFAULT_HOLD_MS = 600
const isHoldMs = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 300 && v <= 1500
/** How long ↵ New line is held before the extras open (ms). */
export const newLineHoldMs = prefStore<number>(
  'toolbar.newLineHoldMs',
  isHoldMs,
  DEFAULT_HOLD_MS,
)

/** Two taps this close together are a double-tap (ms). */
export const DOUBLE_TAP_MS = 350

/** Press and hold on a tool this long, then slide onto an option (ms). */
export const TOOL_HOLD_MS = 350

/** The Pencil touching the page picks the Pen tool (off by default). */
export const penPicksPen = prefStore('toolbar.penPicksPen', isBoolean, false)

/** Toolbar: finger only. Pencil taps on any bar are ignored (off by default). */
export const fingerOnlyBars = prefStore('toolbar.fingerOnly', isBoolean, false)

/** Tests only. */
export function resetMainState(): void {
  for (const store of [
    pillPinned,
    mainList,
    pillLists,
    extraTools,
    newLineExtras,
    newLineHoldMs,
    penPicksPen,
    fingerOnlyBars,
    showNames,
  ]) {
    store.clearCache()
  }
  activeTool.set('text')
  openPillTool.set(null)
  openCard.set(null)
  pillReserve.set(0)
  miniToolbarOpen.set(false)
}
