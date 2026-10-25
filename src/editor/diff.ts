import type { BlockChanges, BlockUpsert } from '../core/blockService'
import { assignOrders } from '../core/order'
import type { Block, JsonObject, OrderKey } from '../core/types'

/**
 * Change detection between the editor and the database. Works only on our
 * own editor-independent `BlockDraft` shape (see mapping.ts for conversion).
 */

/**
 * A block as it currently appears in the editor. Drafts are listed so that
 * siblings appear in display order.
 */
export interface BlockDraft {
  id: string
  parentId: string | null
  type: string
  content: JsonObject
}

/** What was last saved for one block. order null = not in the database yet. */
interface SavedBlock {
  parentId: string | null
  type: string
  /** Content as a JSON string, for cheap comparison. */
  content: string
  order: OrderKey | null
}

/** Last-saved state of every block shown in the editor, by id. */
export type Snapshot = ReadonlyMap<string, SavedBlock>

/**
 * Snapshot of the editor right after a page is loaded. Taken from the editor
 * itself (so any normalising the editor does is not seen as an edit), with
 * order keys from the loaded records.
 */
export function createSnapshot(
  drafts: readonly BlockDraft[],
  records: readonly Block[],
): Snapshot {
  const orderById = new Map(records.map((r) => [r.id, r.order]))
  return new Map(
    drafts.map((d) => [
      d.id,
      {
        parentId: d.parentId,
        type: d.type,
        content: JSON.stringify(d.content),
        order: orderById.get(d.id) ?? null,
      },
    ]),
  )
}

/**
 * Compares the editor's current blocks with the last saved snapshot and
 * returns only the real changes, plus the snapshot to use once they are saved.
 *
 * Deletes only blocks that are in the snapshot (i.e. were shown in the
 * editor), so blocks hidden from the editor, such as unknown block types,
 * are never deleted.
 */
export function diffBlocks(
  snapshot: Snapshot,
  drafts: readonly BlockDraft[],
): { changes: BlockChanges; next: Snapshot } {
  // Final order key for every block, per sibling group, keeping existing
  // keys wherever possible so unmoved blocks are not rewritten.
  const siblingsOf = new Map<string | null, BlockDraft[]>()
  for (const d of drafts) {
    const group = siblingsOf.get(d.parentId) ?? []
    group.push(d)
    siblingsOf.set(d.parentId, group)
  }
  const orderOf = new Map<string, OrderKey>()
  for (const siblings of siblingsOf.values()) {
    const keys = assignOrders(
      siblings.map((d) => snapshot.get(d.id)?.order ?? null),
    )
    siblings.forEach((d, i) => orderOf.set(d.id, keys[i]))
  }

  const upserts: BlockUpsert[] = []
  const next = new Map<string, SavedBlock>()
  for (const d of drafts) {
    const order = orderOf.get(d.id)!
    const content = JSON.stringify(d.content)
    const old = snapshot.get(d.id)

    const edited =
      !old ||
      old.parentId !== d.parentId ||
      old.type !== d.type ||
      old.content !== content
    // An untouched block not yet in the database (e.g. the editor's empty
    // starting line) is not saved until it is actually edited.
    const moved = old?.order != null && old.order !== order

    if (edited || moved) {
      upserts.push({ ...d, order })
      next.set(d.id, { parentId: d.parentId, type: d.type, content, order })
    } else {
      next.set(d.id, old)
    }
  }

  const current = new Set(drafts.map((d) => d.id))
  const deletes = [...snapshot]
    .filter(([id, saved]) => !current.has(id) && saved.order !== null)
    .map(([id]) => id)

  return { changes: { upserts, deletes }, next }
}
