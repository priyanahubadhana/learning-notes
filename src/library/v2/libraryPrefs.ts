import { useSyncExternalStore } from 'react'
import type { SourceFilter } from '../libraryService'

/**
 * What Library v2 remembers on this device: the open shelf, filters, view
 * choices, your collections and the status you set by hand. Add-only and
 * local for now (see docs/plans/library-v2-spec.md, Decisions to review).
 */
export type ShelfId = 'all' | 'reading' | 'want' | 'finished' | `c:${string}`
export type ManualStatus = 'want' | 'reading' | 'finished'
export type SortKey = 'recent' | 'added' | 'title' | 'author' | 'progress'

export interface Collection {
  id: string
  name: string
}

export interface LibraryPrefs {
  shelf: ShelfId
  type: SourceFilter
  /** Professional status filter ('any' = no filter). */
  status: 'any' | ManualStatus
  tagIds: string[]
  tagMatch: 'any' | 'all'
  /** Include the sub-tags of the ticked tags. */
  tagSub: boolean
  view: 'grid' | 'list'
  sort: SortKey
  showProgress: boolean
  showAuthor: boolean
  /** Number tiles on Knowledge for everyone (always on in Professional). */
  knowStats: boolean
  collections: Collection[]
  /** Page id to collection ids. */
  membership: Record<string, string[]>
  /** Page id to the status set by hand (wins over the automatic one). */
  manual: Record<string, ManualStatus>
  recentAll: boolean
}

export const STORAGE_KEY = 'learning-notes:library.v2'

export const DEFAULT_PREFS: LibraryPrefs = {
  shelf: 'all',
  type: 'all',
  status: 'any',
  tagIds: [],
  tagMatch: 'any',
  tagSub: false,
  view: 'grid',
  sort: 'recent',
  showProgress: true,
  showAuthor: true,
  knowStats: false,
  collections: [],
  membership: {},
  manual: {},
  recentAll: false,
}

const TYPES = ['all', 'books', 'videos', 'articles', 'pasted']
const SORTS = ['recent', 'added', 'title', 'author', 'progress']
const STATUSES = ['want', 'reading', 'finished']
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, max = 200): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max

/** Keeps only valid values of a saved object; anything else falls back. */
export function cleanPrefs(raw: unknown): LibraryPrefs {
  const d = DEFAULT_PREFS
  if (!isObj(raw)) return { ...d }
  const collections = (Array.isArray(raw.collections) ? raw.collections : [])
    .filter(
      (c): c is Collection => isObj(c) && str(c.id, 64) && str(c.name, 80),
    )
    .slice(0, 200)
    .map((c) => ({ id: c.id, name: c.name }))
  const ids = new Set(collections.map((c) => c.id))
  const membership: Record<string, string[]> = {}
  if (isObj(raw.membership))
    for (const [k, v] of Object.entries(raw.membership))
      if (Array.isArray(v)) {
        const keep = v.filter(
          (x): x is string => typeof x === 'string' && ids.has(x),
        )
        if (keep.length) membership[k] = keep
      }
  const manual: Record<string, ManualStatus> = {}
  if (isObj(raw.manual))
    for (const [k, v] of Object.entries(raw.manual))
      if (typeof v === 'string' && STATUSES.includes(v))
        manual[k] = v as ManualStatus
  const shelf =
    typeof raw.shelf === 'string' &&
    (['all', 'reading', 'want', 'finished'].includes(raw.shelf) ||
      (raw.shelf.startsWith('c:') && ids.has(raw.shelf.slice(2))))
      ? (raw.shelf as ShelfId)
      : d.shelf
  return {
    shelf,
    type: TYPES.includes(raw.type as string)
      ? (raw.type as SourceFilter)
      : d.type,
    status: STATUSES.includes(raw.status as string)
      ? (raw.status as ManualStatus)
      : 'any',
    tagIds: Array.isArray(raw.tagIds)
      ? raw.tagIds
          .filter((x): x is string => typeof x === 'string')
          .slice(0, 50)
      : [],
    tagMatch: raw.tagMatch === 'all' ? 'all' : 'any',
    tagSub: raw.tagSub === true,
    view: raw.view === 'list' ? 'list' : 'grid',
    sort: SORTS.includes(raw.sort as string) ? (raw.sort as SortKey) : d.sort,
    showProgress: raw.showProgress !== false,
    showAuthor: raw.showAuthor !== false,
    knowStats: raw.knowStats === true,
    collections,
    membership,
    manual,
    recentAll: false,
  }
}

function read(): LibraryPrefs {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
    return cleanPrefs(raw == null ? null : JSON.parse(raw))
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

let state = read()
const listeners = new Set<() => void>()

export const getPrefs = (): LibraryPrefs => state

/** Changes the prefs and remembers them; returns the previous value (for Undo). */
export function setPrefs(patch: Partial<LibraryPrefs>): LibraryPrefs {
  const before = state
  state = cleanPrefs({ ...state, ...patch })
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage blocked: the choice still works until the app closes.
  }
  for (const l of listeners) l()
  return before
}

/** Puts back an earlier value (Undo). */
export const restorePrefs = (before: LibraryPrefs): void => {
  setPrefs(before)
}

/** Tests: re-read storage. */
export function reloadPrefs(): void {
  state = read()
  for (const l of listeners) l()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

export const useLibraryPrefs = (): LibraryPrefs =>
  useSyncExternalStore(subscribe, getPrefs, () => DEFAULT_PREFS)

/** A new collection id from its name (unique among the given ones). */
export function newCollectionId(
  name: string,
  taken: readonly Collection[],
): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30) || 'shelf'
  let id = base
  for (let n = 2; taken.some((c) => c.id === id); n += 1) id = `${base}-${n}`
  return id
}
