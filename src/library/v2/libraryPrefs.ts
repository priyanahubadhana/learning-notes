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

export interface SavedFilter {
  id: string
  name: string
  book: string
  colour: string
  type: 'all' | 'highlight' | 'note' | 'bookmark'
  date: 'any' | 'week' | 'month'
  tagId: string
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
  /** Knowledge filters saved by name (Professional). */
  saved: SavedFilter[]
  /** Daily Highlights a day: 3, 5 or 10. */
  dailyCount: 3 | 5 | 10
  /** A saved filter to apply when Knowledge opens (set by the side panel). */
  openSaved: string
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
  saved: [],
  dailyCount: 5,
  openSaved: '',
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
    saved: cleanSaved(raw.saved),
    dailyCount:
      raw.dailyCount === 3 || raw.dailyCount === 10 ? raw.dailyCount : 5,
    openSaved:
      typeof raw.openSaved === 'string' ? raw.openSaved.slice(0, 64) : '',
  }
}

const SAVED_TYPES = ['all', 'highlight', 'note', 'bookmark']
const SAVED_DATES = ['any', 'week', 'month']
function cleanSaved(raw: unknown): SavedFilter[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (x): x is Record<string, unknown> =>
        isObj(x) && str(x.id, 64) && str(x.name, 80),
    )
    .slice(0, 100)
    .map((x) => ({
      id: x.id as string,
      name: x.name as string,
      book: typeof x.book === 'string' ? x.book.slice(0, 64) : '',
      colour: typeof x.colour === 'string' ? x.colour.slice(0, 12) : '',
      type: SAVED_TYPES.includes(x.type as string)
        ? (x.type as SavedFilter['type'])
        : 'all',
      date: SAVED_DATES.includes(x.date as string)
        ? (x.date as SavedFilter['date'])
        : 'any',
      tagId: typeof x.tagId === 'string' ? x.tagId.slice(0, 64) : '',
    }))
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

/**
 * Changes some choices and returns a function that puts back only those
 * (later changes to other choices stay): the Undo of a toast.
 */
export function setPrefsWithUndo(patch: Partial<LibraryPrefs>): () => void {
  const before = state
  setPrefs(patch)
  return () => {
    const back: Record<string, unknown> = {}
    for (const k of Object.keys(patch))
      back[k] = before[k as keyof LibraryPrefs]
    setPrefs(back as Partial<LibraryPrefs>)
  }
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
