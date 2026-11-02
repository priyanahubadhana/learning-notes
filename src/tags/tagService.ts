import type { LearningNotesDB } from '../core/db'
import { getLive, newRecordFields } from '../core/records'
import type { Tag } from '../core/types'
import { fold } from '../search/searchText'
import { joinTagPath, splitTagPath, tagKey } from './tagNames'

/**
 * Tags: records with a name and an optional parent (nested tags). Pages
 * keep their tags in `Page.tagIds`; tags typed in text ("#") are inline
 * content of the block (see editor/mapping.ts), listed in `blockTags`.
 * Because notes store tag ids, renaming or moving a tag changes it
 * everywhere at once.
 *
 * Inheritance: a card has the tags of its own page, plus the tags written
 * in its question or answer. Sub-pages do not inherit their parent page's
 * tags. A tag also covers its sub-tags (#medicine finds #medicine/cardio).
 */

/** All tags that are not deleted. Tags are few, so they are read at once. */
export async function listTags(db: LearningNotesDB): Promise<Tag[]> {
  return (await db.tags.toArray()).filter((t) => t.deletedAt === null)
}

/** Live tags by id. */
export async function tagMap(db: LearningNotesDB): Promise<Map<string, Tag>> {
  return new Map((await listTags(db)).map((t) => [t.id, t]))
}

/** A tag and its parents, top level first; [] if it is missing or deleted. */
export function tagPathIn(tags: ReadonlyMap<string, Tag>, id: string): Tag[] {
  const path: Tag[] = []
  const seen = new Set<string>()
  let tag = tags.get(id)
  while (tag && !seen.has(tag.id)) {
    seen.add(tag.id)
    path.unshift(tag)
    tag = tag.parentId ? tags.get(tag.parentId) : undefined
  }
  return path
}

/** The full name of a tag ("medicine/cardio"), or '' if it is gone. */
export function tagPathName(tags: ReadonlyMap<string, Tag>, id: string) {
  return joinTagPath(tagPathIn(tags, id).map((t) => t.name))
}

/**
 * A tag and its parents read one by one (for a single chip; cheaper than
 * reading every tag). [] if the tag is missing or deleted.
 */
export async function getTagPath(
  db: LearningNotesDB,
  id: string,
): Promise<Tag[]> {
  const path: Tag[] = []
  let next: string | null = id
  while (next && path.length < 50) {
    const tag: Tag | undefined = await db.tags.get(next)
    if (!tag || tag.deletedAt !== null) return path.length ? path : []
    path.unshift(tag)
    next = tag.parentId
  }
  return path
}

/** Ids of a tag's sub-tags at any depth (not the tag itself). */
export function subTagIds(tags: Iterable<Tag>, id: string): string[] {
  const childrenOf = new Map<string, string[]>()
  for (const tag of tags) {
    if (!tag.parentId) continue
    const list = childrenOf.get(tag.parentId) ?? []
    list.push(tag.id)
    childrenOf.set(tag.parentId, list)
  }
  const out: string[] = []
  const queue = [...(childrenOf.get(id) ?? [])]
  while (queue.length > 0) {
    const next = queue.shift()!
    if (out.includes(next)) continue
    out.push(next)
    queue.push(...(childrenOf.get(next) ?? []))
  }
  return out
}

/** A tag offered by the pickers. */
export interface TagOption {
  tagId: string
  /** "medicine/cardio" */
  path: string
  /** The names of its levels, top first. */
  names: string[]
  color?: string
}

/** What a picker shows for some typed text. */
export interface TagChoices {
  options: TagOption[]
  /** The cleaned path to offer as "Create #…", or null (exists / empty). */
  create: string | null
}

/**
 * Tags matching typed text, for the "#" and "Add tag" pickers: every
 * level's name containing each typed level, ignoring case and accents
 * ("car" finds medicine/cardio; "med/car" too). Names starting with the
 * text come first. Empty text lists all tags (alphabetical).
 */
export async function findTagChoices(
  db: LearningNotesDB,
  text: string,
  options: TagChoiceOptions = {},
): Promise<TagChoices> {
  return tagChoicesIn(await tagMap(db), text, options)
}

export interface TagChoiceOptions {
  limit?: number
  allowNumbers?: boolean
}

/** `findTagChoices` on tags already in memory, so with no wait. */
export function tagChoicesIn(
  tags: ReadonlyMap<string, Tag>,
  text: string,
  { limit = 30, allowNumbers = true }: TagChoiceOptions = {},
): TagChoices {
  const parts = splitTagPath(text)
  const want = parts.map(fold)
  const options: (TagOption & { rank: number })[] = []
  let exact = false
  for (const tag of tags.values()) {
    const path = tagPathIn(tags, tag.id)
    const names = path.map((t) => t.name)
    const folded = names.map(fold)
    if (want.length > 0) {
      if (folded.join('/') === want.join('/')) exact = true
      if (!matchesPath(folded, want)) continue
    }
    const last = folded.at(-1)!
    const rank = want.length === 0 ? 1 : last.startsWith(want.at(-1)!) ? 0 : 1
    options.push({
      tagId: tag.id,
      path: joinTagPath(names),
      names,
      ...(tag.color && { color: tag.color }),
      rank,
    })
  }
  options.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.path.localeCompare(b.path, undefined, { sensitivity: 'base' }),
  )
  const path = joinTagPath(parts)
  const numberOnly = /^[\p{N}\p{P}]+$/u.test(path)
  return {
    options: options.slice(0, limit).map(({ rank: _rank, ...o }) => {
      void _rank
      return o
    }),
    create: path && !exact && (allowNumbers || !numberOnly) ? path : null,
  }
}

/**
 * The last typed level is part of the tag's own name; earlier typed levels
 * are part of its parents' names, in order.
 */
function matchesPath(names: string[], want: string[]): boolean {
  if (!names.at(-1)!.includes(want.at(-1)!)) return false
  let at = 0
  for (const w of want.slice(0, -1)) {
    while (at < names.length - 1 && !names[at].includes(w)) at++
    if (at >= names.length - 1) return false
    at++
  }
  return true
}

/**
 * The tag for a typed path ("medicine/cardio"), made if needed: each level
 * reuses a live tag of the same name (case/accents ignored) under the same
 * parent, else a new tag is created. Returns the last level's tag.
 */
export async function findOrCreateTagPath(
  db: LearningNotesDB,
  text: string,
): Promise<Tag> {
  const parts = splitTagPath(text)
  if (parts.length === 0) throw new Error('tags: empty tag name')
  return db.transaction('rw', db.tags, async () => {
    const tags = await listTags(db)
    let parent: Tag | null = null
    for (const name of parts) {
      const parentId: string | null = parent ? parent.id : null
      const found: Tag | undefined = tags.find(
        (t) => t.parentId === parentId && tagKey(t.name) === tagKey(name),
      )
      if (found) {
        parent = found
        continue
      }
      const made: Tag = { ...newRecordFields(), name, parentId }
      await db.tags.add(made)
      tags.push(made)
      parent = made
    }
    return parent!
  })
}

/** Adds a tag to a page (no change if it has it already). */
export async function addPageTag(
  db: LearningNotesDB,
  pageId: string,
  tagId: string,
): Promise<void> {
  await db.transaction('rw', db.pages, db.tags, async () => {
    const page = await getLive(db.pages, pageId)
    await getLive(db.tags, tagId)
    const tagIds = page.tagIds ?? []
    if (tagIds.includes(tagId)) return
    await db.pages.update(pageId, {
      tagIds: [...tagIds, tagId],
      updatedAt: Date.now(),
    })
  })
}

/** Removes a tag from a page (the tag itself stays). */
export async function removePageTag(
  db: LearningNotesDB,
  pageId: string,
  tagId: string,
): Promise<void> {
  await db.transaction('rw', db.pages, async () => {
    const page = await getLive(db.pages, pageId)
    const tagIds = page.tagIds ?? []
    if (!tagIds.includes(tagId)) return
    await db.pages.update(pageId, {
      tagIds: tagIds.filter((id) => id !== tagId),
      updatedAt: Date.now(),
    })
  })
}
