import type { ResultType, SearchOutcome } from '../searchQuery'

/** SR-B05: where the Search looks. */
export type Scope = 'page' | 'notebook' | 'all'
export const isScope = (v: unknown): v is Scope =>
  v === 'page' || v === 'notebook' || v === 'all'

/** "This page": only the hits on that page, with the counts recomputed. */
export function scopeCounts(
  found: SearchOutcome,
  pageId: string,
): SearchOutcome {
  const hits = found.hits.filter((h) => h.pageId === pageId)
  const typeCounts: Record<ResultType | 'all', number> = {
    all: hits.length,
    page: 0,
    note: 0,
    card: 0,
  }
  for (const h of hits) typeCounts[h.type]++
  return { ...found, hits, typeCounts }
}
