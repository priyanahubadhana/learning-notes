import type { Annotation, Page, Tag } from '../../core/types'
import { subTagIds } from '../../tags/tagService'

export interface ThemeItems {
  books: Page[]
  highlights: Annotation[]
  /** The tag and all its sub-tags. */
  family: string[]
}

/**
 * Everything that carries a tag (or one of its sub-tags): the books, and the
 * highlights, notes and bookmarks of those books.
 */
export function themeItems(
  tagId: string,
  tags: readonly Tag[],
  pages: readonly Page[],
  annotations: readonly Annotation[],
): ThemeItems {
  const family = [tagId, ...subTagIds(tags, tagId)]
  const books = pages.filter((p) =>
    (p.tagIds ?? []).some((id) => family.includes(id)),
  )
  const ids = new Set(books.map((b) => b.id))
  return {
    books,
    highlights: annotations.filter((a) => ids.has(a.pageId)),
    family,
  }
}

export interface TagNode {
  tag: Tag
  /** Books carrying this tag or a sub-tag. */
  count: number
  children: TagNode[]
}

/** Category > Tag > Sub-tag map (any depth), sorted by name. */
export function tagTree(
  tags: readonly Tag[],
  pages: readonly Page[],
): TagNode[] {
  const own = new Map<string, Set<string>>()
  for (const p of pages)
    for (const id of p.tagIds ?? []) {
      const set = own.get(id) ?? new Set<string>()
      set.add(p.id)
      own.set(id, set)
    }
  const byParent = new Map<string | null, Tag[]>()
  for (const tag of tags) {
    const list = byParent.get(tag.parentId) ?? []
    list.push(tag)
    byParent.set(tag.parentId, list)
  }
  const build = (parent: string | null, seen: Set<string>): TagNode[] =>
    (byParent.get(parent) ?? [])
      .filter((tag) => !seen.has(tag.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((tag) => {
        const next = new Set(seen).add(tag.id)
        const children = build(tag.id, next)
        const books = new Set(own.get(tag.id))
        const collect = (n: TagNode) => {
          for (const b of own.get(n.tag.id) ?? []) books.add(b)
          n.children.forEach(collect)
        }
        children.forEach(collect)
        return { tag, count: books.size, children }
      })
  return build(null, new Set())
}
