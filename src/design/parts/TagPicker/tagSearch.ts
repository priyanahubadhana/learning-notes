import { fold } from './tagText'

/** One tag as the picker sees it. Built from `src/tags/tagService.ts` data. */
export type TagItem = {
  id: string
  name: string
  parentId: string | null
  /** How many things carry it (sorts ties). */
  count: number
  color?: string
}

/** Every tag with its names from the top level down, e.g. ["Health", "Habits"]. */
export type TagEntry = TagItem & { path: string[] }

export type TagMatch = { tag: TagEntry; score: number }

export const SCORE = {
  exact: 100,
  prefix: 80,
  contains: 60,
  path: 40,
  subsequence: 30,
} as const

/** The tag with its parent chain filled in (loops and missing parents are cut). */
export function withPaths(tags: readonly TagItem[]): TagEntry[] {
  const byId = new Map(tags.map((t) => [t.id, t]))
  return tags.map((tag) => {
    const path: string[] = []
    const seen = new Set<string>()
    let cur: TagItem | undefined = tag
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id)
      path.unshift(cur.name)
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
    return { ...tag, path }
  })
}

const isSubsequence = (needle: string, hay: string): boolean => {
  let i = 0
  for (const ch of hay)
    if (ch === needle[i] && ++i === needle.length) return true
  return needle.length === 0
}

/**
 * Fuzzy score of a typed text against a tag name and path (LB2): exact 100,
 * prefix 80, contains 60, path match 40, subsequence 30; 0 = no match.
 * Ignores case and accents; a leading "#" is ignored.
 */
export function scoreTag(
  query: string,
  tag: Pick<TagEntry, 'name' | 'path'>,
): number {
  const q = fold(query.replace(/^#/, '')).trim()
  if (!q) return 0
  const name = fold(tag.name)
  if (name === q) return SCORE.exact
  if (name.startsWith(q)) return SCORE.prefix
  if (name.includes(q)) return SCORE.contains
  const path = fold(tag.path.join('/'))
  if (path.includes(q)) return SCORE.path
  if (q.length >= 2 && isSubsequence(q, name)) return SCORE.subsequence
  return 0
}

/** Matches best first; ties go to the more used tag, then A to Z. */
export function searchTags(
  query: string,
  tags: readonly TagEntry[],
  limit = 30,
): TagMatch[] {
  return tags
    .map((tag) => ({ tag, score: scoreTag(query, tag) }))
    .filter((m) => m.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.tag.count - a.tag.count ||
        a.tag.name.localeCompare(b.tag.name),
    )
    .slice(0, limit)
}

/** Edit distance (insert, delete, change one letter). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    prev = cur
  }
  return prev[b.length]
}

const singular = (w: string) =>
  w.endsWith('ies') && w.length > 4
    ? `${w.slice(0, -3)}y`
    : w.endsWith('es') && w.length > 4
      ? w.slice(0, -2)
      : w.endsWith('s') && w.length > 2
        ? w.slice(0, -1)
        : w

/**
 * The tag you probably meant when the typed name is not an exact tag: plural
 * versus singular, or edit distance 1 (2 when longer than 6 letters). Returns
 * null for an exact match (that is not a duplicate) or when nothing is close.
 */
export function nearDuplicate(
  typed: string,
  tags: readonly Pick<TagEntry, 'id' | 'name'>[],
): Pick<TagEntry, 'id' | 'name'> | null {
  const q = fold(typed.replace(/^#/, '')).trim()
  if (!q) return null
  if (tags.some((t) => fold(t.name) === q)) return null
  const limit = q.length > 6 ? 2 : 1
  let best: { tag: Pick<TagEntry, 'id' | 'name'>; d: number } | null = null
  for (const tag of tags) {
    const n = fold(tag.name)
    const d = singular(n) === singular(q) ? 1 : editDistance(n, q)
    if (d <= limit && (!best || d < best.d)) best = { tag, d }
  }
  return best?.tag ?? null
}

export type TriState = 'none' | 'some' | 'all'

/** Whether none, some or all of the chosen items carry a tag. */
export function triState(
  tagId: string,
  items: readonly (readonly string[])[],
): TriState {
  if (items.length === 0) return 'none'
  const has = items.filter((tags) => tags.includes(tagId)).length
  return has === 0 ? 'none' : has === items.length ? 'all' : 'some'
}

export type CategoryNode = {
  category: TagEntry
  /** Tags below it (any depth), flat, most used first. */
  tags: TagEntry[]
  total: number
}

/**
 * Browse by category: a top-level tag that has sub-tags is a category; the
 * categories sort by use. Tags with no category sit in `uncategorised`.
 */
export function browseTree(tags: readonly TagEntry[]): {
  categories: CategoryNode[]
  uncategorised: TagEntry[]
} {
  const kids = new Map<string, TagEntry[]>()
  for (const t of tags)
    if (t.parentId) kids.set(t.parentId, [...(kids.get(t.parentId) ?? []), t])
  const below = (id: string, seen = new Set<string>()): TagEntry[] =>
    (kids.get(id) ?? []).flatMap((k) =>
      seen.has(k.id) ? [] : (seen.add(k.id), [k, ...below(k.id, seen)]),
    )
  const byUse = (a: TagEntry, b: TagEntry) =>
    b.count - a.count || a.name.localeCompare(b.name)
  const top = tags.filter((t) => !t.parentId)
  const categories: CategoryNode[] = []
  const uncategorised: TagEntry[] = []
  for (const t of top) {
    const sub = below(t.id).sort(byUse)
    if (sub.length === 0) uncategorised.push(t)
    else
      categories.push({
        category: t,
        tags: sub,
        total: t.count + sub.reduce((n, s) => n + s.count, 0),
      })
  }
  categories.sort((a, b) => b.total - a.total)
  uncategorised.sort(byUse)
  return { categories, uncategorised }
}

/** Recent tags: newest first, no repeats, keeps 6 (the picker shows 4). */
export function pushRecent(recent: readonly string[], id: string): string[] {
  return [id, ...recent.filter((x) => x !== id)].slice(0, 6)
}
