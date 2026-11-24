import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import type { LearningNotesDB } from '../../core/db'
import type { Page, Tag } from '../../core/types'
import type { TagItem } from '../../design/parts/TagPicker/tagSearch'
import { listTags, subTagIds } from '../../tags/tagService'
import type { LibraryPrefs } from './libraryPrefs'

/** Live tags with how many of the given pages carry each (for sorting). */
export function useTagItems(
  db: LearningNotesDB,
  pages: readonly Page[],
): { tags: Tag[]; items: TagItem[] } {
  const live = useLiveQuery(() => listTags(db), [db])
  const tags = useMemo(() => live ?? [], [live])
  const items = useMemo(() => {
    const count = new Map<string, number>()
    for (const p of pages)
      for (const id of p.tagIds ?? []) count.set(id, (count.get(id) ?? 0) + 1)
    return tags.map((x) => ({
      id: x.id,
      name: x.name,
      parentId: x.parentId,
      count: count.get(x.id) ?? 0,
      color: x.color,
    }))
  }, [tags, pages])
  return { tags, items }
}

/** The tag ids a filter really matches: the ticked tags plus their sub-tags. */
export function effectiveTagIds(
  prefs: LibraryPrefs,
  tags: readonly Tag[],
): string[] {
  if (!prefs.tagSub) return prefs.tagIds
  return [
    ...new Set(prefs.tagIds.flatMap((id) => [id, ...subTagIds(tags, id)])),
  ]
}
