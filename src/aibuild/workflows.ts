import { readPref, writePref } from '../app/uiPrefs'

/**
 * Workflows (A4): saved plans you can run again, shown as a filterable list.
 * Kept on this device with the other small preferences (no database table
 * yet; sync waits for the main manager's version number). Pure functions
 * here, the screen only shows them.
 */

export const FOR_TYPES = ['video', 'article', 'book', 'audio'] as const
export type ForType = (typeof FOR_TYPES)[number]
export const SORTS = ['rating', 'used', 'name', 'recent'] as const
export type Sort = (typeof SORTS)[number]

export interface Workflow {
  id: string
  name: string
  /** Ids from the app's tags (the shared Tag picker). */
  tagIds: string[]
  /** What it is for; empty = anything. */
  forType: ForType | ''
  rating: number
  uses: number
  /** UTC milliseconds of the last run; 0 = never. */
  lastRun: number
  plan: Record<string, unknown>
}

export interface WfFilter {
  q: string
  tagIds: string[]
  tagMatch: 'any' | 'all'
  forTypes: string[]
  minRating: number
  minUses: number
  sort: Sort
}

export const EMPTY_FILTER: WfFilter = {
  q: '',
  tagIds: [],
  tagMatch: 'any',
  forTypes: [],
  minRating: 0,
  minUses: 0,
  sort: 'rating',
}

const SORT_FN: Record<Sort, (a: Workflow, b: Workflow) => number> = {
  rating: (a, b) => b.rating - a.rating || a.name.localeCompare(b.name),
  used: (a, b) => b.uses - a.uses || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
  recent: (a, b) => b.lastRun - a.lastRun || a.name.localeCompare(b.name),
}

export function filterWorkflows(
  list: readonly Workflow[],
  f: WfFilter,
): Workflow[] {
  const q = f.q.trim().toLowerCase()
  return list
    .filter(
      (w) =>
        (!q || w.name.toLowerCase().includes(q)) &&
        (!f.tagIds.length ||
          (f.tagMatch === 'all'
            ? f.tagIds.every((id) => w.tagIds.includes(id))
            : f.tagIds.some((id) => w.tagIds.includes(id)))) &&
        (!f.forTypes.length || f.forTypes.includes(w.forType)) &&
        w.rating >= f.minRating &&
        w.uses >= f.minUses,
    )
    .sort(SORT_FN[f.sort])
}

export type ChipKind = 'q' | 'tag' | 'all' | 'for' | 'rating' | 'uses'
export interface Chip {
  kind: ChipKind
  value?: string
}

/** One chip per active filter (sorting is not a filter). */
export function chipsOf(f: WfFilter): Chip[] {
  const out: Chip[] = []
  if (f.q.trim()) out.push({ kind: 'q' })
  for (const id of f.tagIds) out.push({ kind: 'tag', value: id })
  if (f.tagIds.length > 1 && f.tagMatch === 'all') out.push({ kind: 'all' })
  for (const v of f.forTypes) out.push({ kind: 'for', value: v })
  if (f.minRating) out.push({ kind: 'rating' })
  if (f.minUses) out.push({ kind: 'uses' })
  return out
}

export function clearChip(f: WfFilter, c: Chip): WfFilter {
  switch (c.kind) {
    case 'q':
      return { ...f, q: '' }
    case 'tag':
      return { ...f, tagIds: f.tagIds.filter((x) => x !== c.value) }
    case 'all':
      return { ...f, tagMatch: 'any' }
    case 'for':
      return { ...f, forTypes: f.forTypes.filter((x) => x !== c.value) }
    case 'rating':
      return { ...f, minRating: 0 }
    case 'uses':
      return { ...f, minUses: 0 }
  }
}

/** Clear all keeps the sort the person chose. */
export const clearAll = (f: WfFilter): WfFilter => ({
  ...EMPTY_FILTER,
  sort: f.sort,
})

// ---- Keeping them ----

const KEY = 'aifw.workflows'
const isWorkflow = (v: unknown): v is Workflow => {
  const w = v as Workflow
  return (
    !!w &&
    typeof w === 'object' &&
    typeof w.id === 'string' &&
    typeof w.name === 'string' &&
    Array.isArray(w.tagIds) &&
    w.tagIds.every((x) => typeof x === 'string') &&
    typeof w.rating === 'number' &&
    typeof w.uses === 'number' &&
    typeof w.lastRun === 'number' &&
    !!w.plan &&
    typeof w.plan === 'object'
  )
}
const isList = (v: unknown): v is Workflow[] =>
  Array.isArray(v) && v.every(isWorkflow)

export const loadWorkflows = (): Workflow[] => readPref(KEY, isList, [])
export const saveWorkflows = (list: readonly Workflow[]): void =>
  writePref(KEY, list.slice(0, 200))

/** A run counts one use and the time. */
export const noteRun = (
  list: readonly Workflow[],
  id: string,
  now: number,
): Workflow[] =>
  list.map((w) => (w.id === id ? { ...w, uses: w.uses + 1, lastRun: now } : w))
