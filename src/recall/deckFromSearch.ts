import type { LearningNotesDB } from '../core/db'
import type { Deck, SavedSearch } from '../core/types'
import { readSavedQuery } from '../search/savedSearchService'
import { createDeck } from './deckService'

/**
 * A deck made from a saved card search (E1): the notebook and tag filters
 * carry over, and "new" or "due" becomes the deck's state. Words typed in
 * the search box do not (a deck filters by place, tags and state).
 */
export function deckDraftFromSearch(saved: SavedSearch): Partial<Deck> & {
  name: string
} {
  const query = readSavedQuery(saved.query)
  const status = query.filters.status
  return {
    name: saved.name,
    scope: {
      notebookIds: query.filters.notebookId ? [query.filters.notebookId] : [],
      pageIds: [],
      withSubpages: true,
    },
    tagIds: query.filters.tagId ? [query.filters.tagId] : [],
    tagMode: 'any',
    states: status === 'new' || status === 'due' ? [status] : ['all'],
  }
}

/** Makes one deck from each saved search; returns how many were made. */
export async function decksFromSearches(
  db: LearningNotesDB,
  searches: readonly SavedSearch[],
): Promise<number> {
  for (const saved of searches) {
    await createDeck(db, deckDraftFromSearch(saved))
  }
  return searches.length
}
