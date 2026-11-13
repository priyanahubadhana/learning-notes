import type { ProFeatureId } from '../../settings/proFeatures.gen'

export type SearchChip =
  'all' | 'page' | 'note' | 'card' | 'book' | 'highlight' | 'task' | 'feature'

/** What decides which chips show (SR-B04, SR-B17, SR-P01, SR-P02). */
export interface ChipInput {
  /** Professional features that are on (Professional: all). */
  unlocked: (id: ProFeatureId) => boolean
  /** The Library (books, highlights) can be searched: flag `library.v2`. */
  libraryOn: boolean
  /** The chip now chosen: it always shows, so the state is never hidden. */
  active: SearchChip
}

/**
 * The chips in order. Beginner: All, Pages, Notes, Cards. With
 * `search.moreChips`: also Books and Highlights (only when the Library can be
 * searched, never as "Soon"), Tasks and Features. The Features GROUP of
 * results and Ctrl+Shift+K stay for Beginner (decision D3).
 */
export function chipList(i: ChipInput): SearchChip[] {
  const out: SearchChip[] = ['all', 'page', 'note', 'card']
  if (i.unlocked('search.moreChips')) {
    if (i.libraryOn) out.push('book', 'highlight')
    out.push('task', 'feature')
  } else if (i.active === 'feature') out.push('feature')
  return out
}

/** Chips that search notes (the rest list tasks, features or library items). */
export const NOTE_CHIPS: readonly SearchChip[] = ['all', 'page', 'note', 'card']

/** Chips whose results this slice cannot list yet (Library search arrives with that slice). */
export const LIBRARY_CHIPS: readonly SearchChip[] = ['book', 'highlight']
