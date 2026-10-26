import type { LearningNotesDB } from '../core/db'
import type { Block, BlockTag, Page, Tag } from '../core/types'
import { CARD_BLOCK_TYPE } from '../recall/cardService'
import { titleEntryId } from '../search/searchText'
import { subTagIds, tagMap } from './tagService'

/**
 * Which tags search results have, worked out when searching (never
 * stored), so moving or renaming a tag, or editing a page's tags, is
 * always reflected at once:
 * - a page has its own tags (`Page.tagIds`);
 * - a note (block) has the tags written in it;
 * - a card has its page's tags, the tags in its question, and the tags in
 *   its answer (blocks nested inside it, up to the next card).
 * Each set also holds every parent tag, so #medicine covers #medicine/cardio.
 */

/** Above this many keys, reading a whole table is faster than lookups. */
const MANY_KEYS = 300

/** What `tagsOf` needs to know about a result. */
export interface TaggedThing {
  id: string
  type: 'page' | 'note' | 'card'
  pageId: string
  blockId?: string
}

/**
 * Tag ids of each result (by its `id`), own and inherited, with all their
 * parents. Results without tags are left out of the map.
 */
export async function tagsOf(
  db: LearningNotesDB,
  things: readonly TaggedThing[],
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>()
  if (things.length === 0) return out
  const tags = await tagMap(db)
  if (tags.size === 0) return out

  const pageIds = [...new Set(things.map((t) => t.pageId))]
  const blockIds = new Set(
    things.flatMap((t) => (t.blockId ? [t.blockId] : [])),
  )
  const [pages, rows] = await Promise.all([
    readMany(db.pages, pageIds),
    blockIds.size > 0 ? rowsOnPages(db, pageIds) : Promise.resolve([]),
  ])
  const pageTags = new Map(pages.map((p) => [p.id, p.tagIds ?? []]))

  // Tags written in each block, and the card each block's tags count for.
  const rowsOf = new Map<string, string[]>()
  for (const row of rows) {
    const list = rowsOf.get(row.blockId) ?? []
    list.push(row.tagId)
    rowsOf.set(row.blockId, list)
  }
  const cardOf = await enclosingCards(db, [...rowsOf.keys()])
  const answerTags = new Map<string, string[]>()
  for (const [blockId, tagIds] of rowsOf) {
    const card = cardOf.get(blockId)
    if (!card || card === blockId) continue
    answerTags.set(card, [...(answerTags.get(card) ?? []), ...tagIds])
  }

  for (const thing of things) {
    const own =
      thing.type === 'page'
        ? (pageTags.get(thing.pageId) ?? [])
        : thing.type === 'note'
          ? (rowsOf.get(thing.blockId!) ?? [])
          : [
              ...(pageTags.get(thing.pageId) ?? []),
              ...(rowsOf.get(thing.blockId!) ?? []),
              ...(answerTags.get(thing.blockId!) ?? []),
            ]
    const set = withParents(tags, own)
    if (set.size > 0) out.set(thing.id, set)
  }
  return out
}

/**
 * Names of the most specific tags in a set from `tagsOf` (parents that
 * are only there through a sub-tag left out), A→Z.
 */
export function ownTagNames(
  tags: ReadonlyMap<string, Tag>,
  ids: ReadonlySet<string> | undefined,
): string[] {
  if (!ids) return []
  const parents = new Set(
    [...ids].flatMap((id) => tags.get(id)?.parentId ?? []),
  )
  return [...ids]
    .filter((id) => !parents.has(id))
    .flatMap((id) => tags.get(id)?.name ?? [])
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

/** The tags, and all their parents (deleted tags left out). */
function withParents(tags: ReadonlyMap<string, Tag>, ids: string[]) {
  const set = new Set<string>()
  for (const id of ids) {
    let tag = tags.get(id)
    while (tag && !set.has(tag.id)) {
      set.add(tag.id)
      tag = tag.parentId ? tags.get(tag.parentId) : undefined
    }
  }
  return set
}

/**
 * For each block, the card its tags count for: itself if it is a Card,
 * else the nearest Card it sits in (its answer), else none.
 */
async function enclosingCards(
  db: LearningNotesDB,
  blockIds: string[],
): Promise<Map<string, string>> {
  const known = new Map<string, Block>()
  let wanted = blockIds
  // One read per nesting level; tagged blocks are few.
  for (let depth = 0; wanted.length > 0 && depth < 20; depth++) {
    const found = await readMany(db.blocks, wanted)
    for (const block of found) known.set(block.id, block)
    wanted = [
      ...new Set(
        found.flatMap((b) =>
          b.type !== CARD_BLOCK_TYPE && b.parentId && !known.has(b.parentId)
            ? [b.parentId]
            : [],
        ),
      ),
    ]
  }
  const out = new Map<string, string>()
  for (const id of blockIds) {
    let block = known.get(id)
    while (block && block.type !== CARD_BLOCK_TYPE) {
      block = block.parentId ? known.get(block.parentId) : undefined
    }
    if (block) out.set(id, block.id)
  }
  return out
}

/** Block tag rows on some pages. */
async function rowsOnPages(
  db: LearningNotesDB,
  pageIds: string[],
): Promise<BlockTag[]> {
  if (pageIds.length <= MANY_KEYS) {
    return byKeys(pageIds, (id) =>
      db.blockTags.where('pageId').equals(id).toArray(),
    )
  }
  const wanted = new Set(pageIds)
  return db.blockTags.filter((r) => wanted.has(r.pageId)).toArray()
}

/**
 * Rows matching any of some index keys: one lookup per key, run together.
 * (Dexie's `anyOf` walks a cursor key by key, far slower on big ranges.)
 */
async function byKeys<T>(
  keys: readonly string[],
  lookup: (key: string) => Promise<T[]>,
): Promise<T[]> {
  return (await Promise.all(keys.map(lookup))).flat()
}

/** Records by id (missing ones left out). */
async function readMany<T extends Page | Block>(
  table: { bulkGet: (keys: string[]) => Promise<(T | undefined)[]> },
  ids: string[],
): Promise<T[]> {
  return (await table.bulkGet(ids)).filter((r): r is T => r !== undefined)
}

/**
 * Search entry ids of everything with a tag (or one of its sub-tags), for
 * browsing a tag without typing words: tagged pages' titles, tagged
 * blocks, the Cards those blocks sit in, and every card on tagged pages.
 * `null`: everything with any tag.
 */
export async function taggedEntryIds(
  db: LearningNotesDB,
  tagId: string | null,
): Promise<string[]> {
  const tags = await tagMap(db)
  if (tagId !== null && !tags.has(tagId)) return []
  const ids =
    tagId === null
      ? [...tags.keys()]
      : [tagId, ...subTagIds(tags.values(), tagId)]
  const [pages, rows] = await Promise.all([
    byKeys(ids, (id) => db.pages.where('tagIds').equals(id).toArray()),
    byKeys(ids, (id) => db.blockTags.where('tagId').equals(id).toArray()),
  ])
  const pageIds = [
    ...new Set(pages.filter((p) => p.purgedAt === undefined).map((p) => p.id)),
  ]
  const blockIds = [...new Set(rows.map((r) => r.blockId))]
  const [cardOf, cards] = await Promise.all([
    enclosingCards(db, blockIds),
    pageIds.length > 0
      ? byKeys(pageIds, (id) => db.cards.where('pageId').equals(id).toArray())
      : Promise.resolve([]),
  ])
  return [
    ...new Set([
      ...pageIds.map(titleEntryId),
      ...blockIds,
      ...cardOf.values(),
      ...cards.filter((c) => c.deletedAt === null).map((c) => c.blockId),
    ]),
  ]
}
