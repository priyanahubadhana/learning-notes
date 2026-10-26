import { useLiveQuery } from 'dexie-react-hooks'
import { useDebounced } from '../app/useDebounced'
import type { LearningNotesDB } from '../core/db'
import { useMinuteClock } from '../recall/useMinuteClock'
import {
  describeHits,
  runSearch,
  type HitDetails,
  type ResultType,
  type SearchHit,
  type SearchOutcome,
  type SearchQuery,
} from './searchQuery'

/**
 * Running a search as the user types (popup and Search screen).
 */

/** Live search results (re-run when notes change); undefined while loading. */
export function useSearch(
  db: LearningNotesDB,
  query: SearchQuery,
): { outcome: SearchOutcome | undefined; now: number } {
  const settled = useDebounced(query, 120)
  const now = useMinuteClock()
  const outcome = useLiveQuery(
    () => runSearch(db, settled, now),
    [db, JSON.stringify(settled), now],
  )
  return { outcome, now }
}

/** Titles and text for the results on screen. */
export function useHitDetails(
  db: LearningNotesDB,
  hits: SearchHit[],
): Map<string, HitDetails> | undefined {
  return useLiveQuery(
    () => describeHits(db, hits),
    [db, hits.map((h) => h.id).join('|')],
  )
}

export const TYPE_ICON: Record<ResultType, string> = {
  page: '▤',
  note: '¶',
  card: '◫',
}
