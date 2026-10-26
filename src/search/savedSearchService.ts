import type { LearningNotesDB } from '../core/db'
import { orderBetween } from '../core/order'
import { newRecordFields } from '../core/records'
import type { JsonObject, SavedSearch } from '../core/types'
import {
  DEFAULT_FILTERS,
  RESULT_TYPES,
  STATUS_FILTERS,
  type SearchFilters,
  type SearchQuery,
} from './searchQuery'

/**
 * Saved searches, listed in the sidebar. A saved search with cards in its
 * results is a deck: it can be reviewed. The stored query is read back
 * through `readSavedQuery`, so searches saved by an older version still
 * open (missing or unknown fields fall back to defaults).
 */

/** Saved searches in sidebar order (not deleted). */
export async function listSavedSearches(
  db: LearningNotesDB,
): Promise<SavedSearch[]> {
  const all = await db.savedSearches.toArray()
  return all
    .filter((s) => s.deletedAt === null)
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
}

/** Saves a search at the end of the list. */
export async function createSavedSearch(
  db: LearningNotesDB,
  name: string,
  query: SearchQuery,
): Promise<SavedSearch> {
  return db.transaction('rw', db.savedSearches, async () => {
    const last = (await listSavedSearches(db)).at(-1)
    const saved: SavedSearch = {
      ...newRecordFields(),
      name: name.trim(),
      query: toJson(query),
      order: orderBetween(last?.order ?? null, null),
    }
    await db.savedSearches.add(saved)
    return saved
  })
}

export async function renameSavedSearch(
  db: LearningNotesDB,
  id: string,
  name: string,
): Promise<void> {
  await db.savedSearches.update(id, {
    name: name.trim(),
    updatedAt: Date.now(),
  })
}

/** Replaces the search a saved search runs. */
export async function updateSavedSearchQuery(
  db: LearningNotesDB,
  id: string,
  query: SearchQuery,
): Promise<void> {
  await db.savedSearches.update(id, {
    query: toJson(query),
    updatedAt: Date.now(),
  })
}

/** Removes a saved search (soft delete; no notes are touched). */
export async function deleteSavedSearch(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  const now = Date.now()
  await db.savedSearches.update(id, { deletedAt: now, updatedAt: now })
}

function toJson(query: SearchQuery): JsonObject {
  return {
    text: query.text,
    type: query.type,
    filters: { ...query.filters },
  }
}

/** The stored query as a valid `SearchQuery` (defaults for anything odd). */
export function readSavedQuery(stored: JsonObject): SearchQuery {
  const f = (
    stored.filters &&
    typeof stored.filters === 'object' &&
    !Array.isArray(stored.filters)
      ? stored.filters
      : {}
  ) as Record<string, unknown>
  const d = DEFAULT_FILTERS
  const bool = (v: unknown, fallback: boolean) =>
    typeof v === 'boolean' ? v : fallback
  const oneOf = <T extends string>(
    v: unknown,
    values: readonly T[],
    fallback: T,
  ) => (values.includes(v as T) ? (v as T) : fallback)
  const filters: SearchFilters = {
    notebookId: typeof f.notebookId === 'string' ? f.notebookId : null,
    tagId: typeof f.tagId === 'string' ? f.tagId : null,
    status: STATUS_FILTERS.includes(f.status as never)
      ? (f.status as SearchFilters['status'])
      : null,
    changed: oneOf(f.changed, ['any', 'week', 'month'] as const, d.changed),
    journal: bool(f.journal, d.journal),
    templates: bool(f.templates, d.templates),
    trash: bool(f.trash, d.trash),
    sort: oneOf(f.sort, ['best', 'recent', 'failed'] as const, d.sort),
  }
  return {
    text: typeof stored.text === 'string' ? stored.text : '',
    type: oneOf(stored.type, ['all', ...RESULT_TYPES] as const, 'all'),
    filters,
  }
}

/** A saved search, or undefined if it is missing or deleted. */
export async function getSavedSearch(
  db: LearningNotesDB,
  id: string,
): Promise<SavedSearch | undefined> {
  const saved = await db.savedSearches.get(id)
  return saved && saved.deletedAt === null ? saved : undefined
}
