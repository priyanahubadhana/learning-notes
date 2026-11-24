import type { Page, PageSource } from '../../core/types'
import { progressPercent, type SourceFilter } from '../libraryService'
import type {
  LibraryPrefs,
  ManualStatus,
  ShelfId,
  SortKey,
} from './libraryPrefs'

const KINDS: Record<Exclude<SourceFilter, 'all'>, string[]> = {
  books: ['book', 'file'],
  videos: ['video', 'audio'],
  articles: ['article'],
  pasted: ['paste'],
}

/** The status shelf a source belongs to: your choice wins, else by progress. */
export function statusOf(
  page: Page,
  manual: Record<string, ManualStatus>,
): ManualStatus {
  const own = manual[page.id]
  if (own) return own
  const s: PageSource | undefined = page.source
  if ((s?.progress ?? 0) >= 0.98) return 'finished'
  return (s?.progress ?? 0) > 0 || s?.at || s?.openedAt ? 'reading' : 'want'
}

const recency = (p: Page) =>
  p.source?.openedAt ?? p.source?.capturedAt ?? p.createdAt

export function inShelf(page: Page, shelf: ShelfId, p: LibraryPrefs): boolean {
  if (shelf === 'all') return true
  if (shelf.startsWith('c:'))
    return (p.membership[page.id] ?? []).includes(shelf.slice(2))
  return statusOf(page, p.manual) === shelf
}

export function matchesType(page: Page, type: SourceFilter): boolean {
  return type === 'all' || KINDS[type].includes(page.source?.kind ?? '')
}

/** Shelf counts for the side panel. */
export function shelfCounts(pages: readonly Page[], p: LibraryPrefs) {
  const out = { all: pages.length, reading: 0, want: 0, finished: 0 }
  for (const page of pages) out[statusOf(page, p.manual)] += 1
  const collections: Record<string, number> = {}
  for (const c of p.collections)
    collections[c.id] = pages.filter((x) =>
      (p.membership[x.id] ?? []).includes(c.id),
    ).length
  return { ...out, collections }
}

const LAST = '￿'

export function sortSources(pages: readonly Page[], sort: SortKey): Page[] {
  const title = (x: Page) => (x.title || '').toLocaleLowerCase()
  const by: Record<SortKey, (a: Page, b: Page) => number> = {
    recent: (a, b) => recency(b) - recency(a),
    added: (a, b) =>
      (b.source?.capturedAt ?? b.createdAt) -
      (a.source?.capturedAt ?? a.createdAt),
    title: (a, b) => title(a).localeCompare(title(b)),
    author: (a, b) =>
      (a.source?.author ?? LAST).localeCompare(b.source?.author ?? LAST),
    progress: (a, b) => progressPercent(b.source) - progressPercent(a.source),
  }
  return [...pages].sort(by[sort])
}

export interface QueryInput {
  /** Page id to its tag ids (defaults to the page's own `tagIds`). */
  tags?: ReadonlyMap<string, readonly string[]>
  search?: string
}

/** The books shown: shelf, type, status, tags, search, then sorted. */
export function querySources(
  pages: readonly Page[],
  p: LibraryPrefs,
  q: QueryInput = {},
): Page[] {
  const needle = (q.search ?? '').trim().toLocaleLowerCase()
  const kept = pages.filter((page) => {
    if (!inShelf(page, p.shelf, p)) return false
    if (!matchesType(page, p.type)) return false
    if (p.status !== 'any' && statusOf(page, p.manual) !== p.status)
      return false
    if (p.tagIds.length) {
      const own = q.tags?.get(page.id) ?? page.tagIds ?? []
      const hit = (id: string) => own.includes(id)
      if (!(p.tagMatch === 'all' ? p.tagIds.every(hit) : p.tagIds.some(hit)))
        return false
    }
    if (needle) {
      const hay =
        `${page.title} ${page.source?.author ?? ''}`.toLocaleLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })
  return sortSources(kept, p.sort)
}

/** Filters that are on, each shown as a chip with a ✕. */
export function activeFilters(p: LibraryPrefs): ('type' | 'status' | 'tags')[] {
  const out: ('type' | 'status' | 'tags')[] = []
  if (p.type !== 'all') out.push('type')
  if (p.status !== 'any') out.push('status')
  if (p.tagIds.length) out.push('tags')
  return out
}

/** Up to `max` opened, unfinished books, last opened first. Empty = no block. */
export function continueReading(
  pages: readonly Page[],
  p: LibraryPrefs,
  max = 3,
): Page[] {
  return pages
    .filter(
      (x) =>
        x.source?.openedAt != null &&
        x.source.kind === 'book' &&
        statusOf(x, p.manual) !== 'finished',
    )
    .sort((a, b) => (b.source?.openedAt ?? 0) - (a.source?.openedAt ?? 0))
    .slice(0, max)
}

/** The last `n` sources opened or captured (side panel "Recent"). */
export function recentSources(pages: readonly Page[], n: number): Page[] {
  return sortSources(pages, 'recent').slice(0, n)
}

/**
 * How the Professional filter row fits the free width (px): all labels,
 * icons only, or a sideways scroll. It never wraps onto a second line.
 */
export function proRowMode(width: number): 'full' | 'icons' | 'scroll' {
  if (width >= 760) return 'full'
  if (width >= 420) return 'icons'
  return 'scroll'
}
