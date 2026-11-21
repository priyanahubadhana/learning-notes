import type { Annotation } from '../../core/types'
import type { SavedFilter } from './libraryPrefs'

export type KnowledgeFilter = Omit<SavedFilter, 'id' | 'name'>

export const NO_FILTER: KnowledgeFilter = {
  book: '',
  colour: '',
  type: 'all',
  date: 'any',
  tagId: '',
}

const DAY = 86_400_000

/** Does a filter narrow anything? */
export const isFiltered = (f: KnowledgeFilter): boolean =>
  f.book !== '' ||
  f.colour !== '' ||
  f.type !== 'all' ||
  f.date !== 'any' ||
  f.tagId !== ''

/**
 * Highlights, notes and bookmarks that pass the filter and the search words.
 * `pageTags` maps a book page id to its tag ids.
 */
export function filterKnowledge(
  rows: readonly Annotation[],
  f: KnowledgeFilter,
  opts: {
    search?: string
    now?: number
    pageTags?: ReadonlyMap<string, readonly string[]>
  } = {},
): Annotation[] {
  const needle = (opts.search ?? '').trim().toLocaleLowerCase()
  const now = opts.now ?? Date.now()
  const since =
    f.date === 'week' ? now - 7 * DAY : f.date === 'month' ? now - 30 * DAY : 0
  return rows.filter(
    (a) =>
      (!f.book || a.pageId === f.book) &&
      (!f.colour || a.colour === f.colour) &&
      (f.type === 'all' || a.kind === f.type) &&
      a.createdAt >= since &&
      (!f.tagId || (opts.pageTags?.get(a.pageId) ?? []).includes(f.tagId)) &&
      (!needle ||
        `${a.quote?.exact ?? ''} ${a.note ?? ''}`
          .toLocaleLowerCase()
          .includes(needle)),
  )
}
