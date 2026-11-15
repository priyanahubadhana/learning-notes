import { t } from '../../../i18n/t'
import { getLevel, isUnlocked } from '../../../settings/level'
import type { ProFeatureId } from '../../../settings/proFeatures.gen'
import { cleanStore, memStore, type Store } from '../store'
import { allTools, findTool } from '../toolRegistry'
import { metaOf } from '../toolRegistryMeta'
import { currentRunner } from '../toolRuntime'
import { followMode, v8Tool } from './barState'
import { V8_TOOL_IDS, type V8ToolId } from './registryV8'

/**
 * Editing the tool bar on the tool bar itself (toolbar.v8, 2A.15; Settings v5
 * S5-22, S5-23). Which tools are on the bar is saved on this device only
 * (`toolbar.v9.tools`, not synced). Text, Pen and Eraser are locked, and so
 * are Backspace, New line and More (they are not in the list at all, so they
 * can never be taken off). A removed tool waits in the tray and can be added
 * back with one tap.
 */

export const LOCKED_IDS = ['text', 'pen', 'eraser'] as const
/** Tools the phone keeps inside ⋯ More while editing. */
export const PHONE_FOLD: readonly string[] = ['shapes', 'insert']
export const DEFAULT_BAR: readonly string[] = [...V8_TOOL_IDS]

/** Other tools of the app that can sit on the bar (ids of the tool registry). */
export const EXTRA_IDS = [
  'highlighter',
  'camera',
  'audio',
  'zoom',
  'find',
  'table',
  'link',
  'readAloud',
] as const

/** Tools that are fixed parts of the bar or cannot be pinned (as in the old Edit toolbar sheet). */
const NOT_PINNABLE = new Set(['undo', 'redo', 'more', 'newLine'])

const isMark = (id: string) => id.startsWith('mark:')

let fixed: { list: string[]; set: Set<string> } | undefined
/** The tools that never change (the six bar tools, the extras, the app's tool list), worked out once. */
function fixedIds(): { list: string[]; set: Set<string> } {
  if (!fixed) {
    const list = [
      ...new Set([
        ...V8_TOOL_IDS,
        ...EXTRA_IDS,
        ...allTools()
          .map((x) => x.id)
          .filter((id) => !NOT_PINNABLE.has(id) && !isMark(id)),
      ]),
    ]
    fixed = { list, set: new Set(list) }
  }
  return fixed
}

/** Every tool a person may put on the bar: the six bar tools and every tool of the app the old Edit toolbar sheet offered (with this notebook's Revise marks). */
export const knownIds = (): string[] => [
  ...fixedIds().list,
  ...allTools()
    .map((x) => x.id)
    .filter(isMark),
]
const isKnown = (id: string): boolean =>
  fixedIds().set.has(id) || (isMark(id) && findTool(id) !== undefined)
export const isLocked = (id: string): boolean =>
  (LOCKED_IDS as readonly string[]).includes(id)
export const isCore = (id: string): id is V8ToolId =>
  (V8_TOOL_IDS as readonly string[]).includes(id)

/** A saved bar, cleaned: unknown tools and repeats go; a lost locked tool comes back. */
export function cleanBar(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const kept = [
    ...new Set(v.filter((x): x is string => typeof x === 'string')),
  ].filter(isKnown)
  const missing = LOCKED_IDS.filter((id) => !kept.includes(id))
  return [...missing, ...kept].length > 0 ? [...missing, ...kept] : undefined
}

/** The tools on the bar on this device, in order. */
export const barTools: Store<string[]> = cleanStore<string[]>(
  'toolbar.v9.tools',
  cleanBar,
  [...DEFAULT_BAR],
)

/** The unsaved bar while editing (null = not editing). */
export const barDraft: Store<string[] | null> = memStore<string[] | null>(null)

/** A tool a person may add: Professional tools only once their switch is on. */
export function toolAvailable(id: string): boolean {
  // The six tools of the bar can always be added back (the bar shows them all today).
  if (isCore(id)) return true
  const meta = metaOf(id)
  // Revise marks are the person's own labels, open to every level. Any other
  // tool without level facts is not offered, so no Professional tool slips in.
  if (!meta) return isMark(id)
  const unlock = meta.unlock as ProFeatureId | undefined
  if (unlock) return isUnlocked(unlock)
  return meta.level === 'beginner' || getLevel() === 'professional'
}

/** What waits in the tray: every known tool that is not on the bar. */
export const trayOf = (list: readonly string[]): string[] =>
  knownIds().filter((id) => !list.includes(id) && toolAvailable(id))

export const removeFrom = (list: readonly string[], id: string): string[] =>
  isLocked(id) ? [...list] : list.filter((x) => x !== id)

export function addTo(
  list: readonly string[],
  id: string,
  index = list.length,
): string[] {
  if (!isKnown(id) || list.includes(id)) return [...list]
  const next = [...list]
  next.splice(Math.min(next.length, Math.max(0, index)), 0, id)
  return next
}

export type DragTarget = 'tray' | 'bar' | { tool: string }

/** The bar after the dragged tool moves over something (live reflow). */
export function dragOver(
  list: readonly string[],
  id: string,
  over: DragTarget,
): string[] {
  const inBar = list.includes(id)
  if (over === 'tray') return inBar ? removeFrom(list, id) : [...list]
  if (over === 'bar') return inBar ? [...list] : addTo(list, id)
  if (over.tool === id) return [...list]
  const at = list.indexOf(over.tool)
  if (at < 0) return [...list]
  const rest = list.filter((x) => x !== id)
  return addTo(rest, id, at)
}

export const editing = (): boolean => barDraft.get() !== null

export function startEdit(): void {
  if (!editing()) barDraft.set([...barTools.get()])
}

/** Back to the standard bar on this device, with a toast and Undo (leaves edit mode). */
export function resetBar(): void {
  const before = barTools.get()
  barDraft.set(null)
  barTools.set([...DEFAULT_BAR])
  const now = v8Tool.get()
  if (!DEFAULT_BAR.includes(now)) v8Tool.set('text')
  currentRunner().app?.toast(t('v8.edit.resetDone'), {
    label: t('v8.bar.undo'),
    icon: 'undo',
    onSelect: () => barTools.set(before),
  })
}

export function cancelEdit(): void {
  barDraft.set(null)
}

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i])

/** Saves the edited bar on this device; true when it changed. The toast can undo it. */
export function doneEdit(): boolean {
  const draft = barDraft.get()
  barDraft.set(null)
  if (!draft) return false
  const before = barTools.get()
  const next = cleanBar(draft) ?? [...DEFAULT_BAR]
  if (same(before, next)) return false
  barTools.set(next)
  // The tool that was on is gone: go back to Text, the one that is always there.
  const now = v8Tool.get()
  if (!next.includes(now)) {
    v8Tool.set('text')
    followMode('text', now)
  }
  currentRunner().app?.toast(t('v8.edit.changed'), {
    label: t('v8.bar.undo'),
    icon: 'undo',
    onSelect: () => barTools.set(before),
  })
  return true
}
