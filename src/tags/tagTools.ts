import type { LearningNotesDB } from '../core/db'
import { getLive } from '../core/records'
import type { Block, JsonObject, Tag } from '../core/types'
import { inlineTagIds, mapInlineTags } from '../editor/mapping'
import { cleanTagName, tagKey } from './tagNames'
import { listTags, subTagIds } from './tagService'

/**
 * Tag tools (sidebar ⋯ menu): rename, move, merge, delete, colour.
 *
 * Notes store tag ids, so renaming, moving and colouring change one tag
 * record and show everywhere at once. Merging and deleting also rewrite
 * what points at the tag: pages' `tagIds`, tags typed in text (the block's
 * inline tags) and saved searches. Each tool is one transaction.
 *
 * Two tags with the same name never sit side by side: a rename or move
 * that would do that is refused ('taken'; merge them instead), and sub-tags
 * moved next to a same-named tag are merged into it.
 */

/** Colours a tag can have (unset = grey). */
export const TAG_COLORS = [
  '#2f6feb',
  '#2e9e6b',
  '#d9822b',
  '#c8402f',
  '#8a5cf6',
  '#c2417f',
] as const

export type RenameResult = 'done' | 'empty' | 'taken'
export type MoveResult = 'done' | 'taken' | 'loop'

/** A live tag under `parentId` with this name (other than `exceptId`). */
function sibling(
  tags: readonly Tag[],
  parentId: string | null,
  name: string,
  exceptId: string,
): Tag | undefined {
  const key = tagKey(name)
  return tags.find(
    (t) =>
      t.id !== exceptId && t.parentId === parentId && tagKey(t.name) === key,
  )
}

/** Renames one level (its sub-tags keep their names). */
export async function renameTag(
  db: LearningNotesDB,
  id: string,
  text: string,
): Promise<RenameResult> {
  const name = cleanTagName(text)
  if (!name) return 'empty'
  return db.transaction('rw', db.tags, async () => {
    const tag = await getLive(db.tags, id)
    if (sibling(await listTags(db), tag.parentId, name, id)) return 'taken'
    if (name !== tag.name) {
      await db.tags.update(id, { name, updatedAt: Date.now() })
    }
    return 'done'
  })
}

/** Moves a tag (with its sub-tags) under another tag, or to the top level. */
export async function moveTag(
  db: LearningNotesDB,
  id: string,
  parentId: string | null,
): Promise<MoveResult> {
  return db.transaction('rw', db.tags, async () => {
    const tag = await getLive(db.tags, id)
    const tags = await listTags(db)
    if (parentId !== null) {
      await getLive(db.tags, parentId)
      if (parentId === id || subTagIds(tags, id).includes(parentId)) {
        return 'loop'
      }
    }
    if (sibling(tags, parentId, tag.name, id)) return 'taken'
    if (tag.parentId !== parentId) {
      await db.tags.update(id, { parentId, updatedAt: Date.now() })
    }
    return 'done'
  })
}

/** Sets or clears a tag's colour. */
export async function setTagColor(
  db: LearningNotesDB,
  id: string,
  color: string | null,
): Promise<void> {
  await db.transaction('rw', db.tags, async () => {
    const tag = await getLive(db.tags, id)
    const { color: _old, ...rest } = tag
    void _old
    await db.tags.put({
      ...rest,
      ...(color && { color }),
      updatedAt: Date.now(),
    })
  })
}

/**
 * Merges `fromId` into `intoId`: everything tagged with it gets `intoId`
 * instead, its sub-tags move under `intoId`, and it goes away. Returns the
 * ids of pages whose notes were rewritten (an open editor reloads them).
 */
export async function mergeTag(
  db: LearningNotesDB,
  fromId: string,
  intoId: string,
): Promise<string[]> {
  if (fromId === intoId) return []
  return rewriteTags(db, async (run) => {
    const tags = await listTags(db)
    if (subTagIds(tags, fromId).includes(intoId)) {
      throw new Error('tags: cannot merge a tag into its own sub-tag')
    }
    await run.merge(fromId, intoId)
  })
}

/**
 * Deletes a tag: it is taken off every page, note and card (the notes and
 * cards stay), its sub-tags move up one level, and saved searches using it
 * use its parent instead. Returns the ids of pages whose notes changed.
 */
export async function deleteTag(
  db: LearningNotesDB,
  id: string,
): Promise<string[]> {
  return rewriteTags(db, (run) => run.remove(id))
}

/** Merge and delete steps, sharing one transaction and its tag list. */
interface Rewrite {
  merge: (fromId: string, intoId: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

async function rewriteTags(
  db: LearningNotesDB,
  body: (run: Rewrite) => Promise<void>,
): Promise<string[]> {
  return db.transaction(
    'rw',
    [db.tags, db.pages, db.blocks, db.blockTags, db.savedSearches],
    async () => {
      const now = Date.now()
      const tags = await listTags(db)
      const byId = new Map(tags.map((t) => [t.id, t]))
      const pagesTouched = new Set<string>()

      /** Gives a tag a new parent; same-named tags there are merged. */
      const reparent = async (child: Tag, parentId: string | null) => {
        const twin = sibling([...byId.values()], parentId, child.name, child.id)
        if (twin) return merge(child.id, twin.id)
        child.parentId = parentId
        await db.tags.update(child.id, { parentId, updatedAt: now })
      }

      /**
       * Swaps (or with `toId` null, removes) the tag where it is used;
       * saved searches on it switch to `savedTo`.
       */
      const replaceUses = async (
        fromId: string,
        toId: string | null,
        savedTo: string | null = toId,
      ) => {
        const to = toId ? byId.get(toId) : undefined
        const pages = await db.pages.where('tagIds').equals(fromId).toArray()
        for (const page of pages) {
          const kept = (page.tagIds ?? []).filter((id) => id !== fromId)
          if (toId && !kept.includes(toId)) kept.push(toId)
          await db.pages.update(page.id, { tagIds: kept, updatedAt: now })
        }
        const rows = await db.blockTags.where('tagId').equals(fromId).toArray()
        const blocks = await db.blocks.bulkGet(rows.map((r) => r.blockId))
        const changed: Block[] = []
        for (const block of blocks) {
          if (!block) continue
          const has = inlineTagIds(block).includes(toId ?? '')
          const content = mapInlineTags(block.content, (tag) =>
            tag.tagId !== fromId
              ? tag
              : to && !has
                ? { tagId: to.id, label: to.name }
                : null,
          ) as JsonObject
          changed.push({ ...block, content, updatedAt: now })
          pagesTouched.add(block.pageId)
        }
        await db.blocks.bulkPut(changed)
        const saved = await db.savedSearches.toArray()
        for (const s of saved) {
          const filters = s.query.filters as JsonObject | undefined
          if (filters?.tagId !== fromId) continue
          await db.savedSearches.update(s.id, {
            query: { ...s.query, filters: { ...filters, tagId: savedTo } },
            updatedAt: now,
          })
        }
      }

      const children = (id: string) =>
        [...byId.values()].filter((t) => t.parentId === id)

      const retire = async (id: string) => {
        byId.delete(id)
        await db.tags.update(id, { deletedAt: now, updatedAt: now })
      }

      const merge = async (fromId: string, intoId: string): Promise<void> => {
        if (!byId.has(fromId) || !byId.has(intoId)) {
          throw new Error(`tags: tag not found (${fromId} → ${intoId})`)
        }
        const kids = children(fromId)
        byId.delete(fromId) // a same-named sub-tag is never merged into it
        for (const child of kids) await reparent(child, intoId)
        await replaceUses(fromId, intoId)
        await retire(fromId)
      }

      const remove = async (id: string): Promise<void> => {
        const tag = byId.get(id)
        if (!tag) throw new Error(`tags: tag not found (${id})`)
        const kids = children(id)
        byId.delete(id) // a same-named sub-tag is never merged into it
        for (const child of kids) await reparent(child, tag.parentId)
        // Saved searches on it fall back to its parent (or no tag).
        await replaceUses(id, null, tag.parentId)
        await retire(id)
      }

      await body({ merge, remove })
      return [...pagesTouched]
    },
  )
}
