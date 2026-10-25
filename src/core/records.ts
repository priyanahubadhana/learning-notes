import type { InsertType, Table, UpdateSpec } from 'dexie'
import { createId } from './ids'
import type { BaseRecord } from './types'

/** Shared helpers used by all services for reading and writing records. */

/** Any of our tables (string `id` primary key). */
type RecordTable<T extends BaseRecord> = Table<T, string, InsertType<T, 'id'>>

/** Base fields for a brand-new record. */
export function newRecordFields(): BaseRecord {
  const now = Date.now()
  return { id: createId(), createdAt: now, updatedAt: now, deletedAt: null }
}

/** True if the record has not been soft-deleted. */
export function isLive(record: BaseRecord): boolean {
  return record.deletedAt === null
}

/** Loads a record by id; throws if it does not exist or is soft-deleted. */
export async function getLive<T extends BaseRecord>(
  table: RecordTable<T>,
  id: string,
): Promise<T> {
  const record = await table.get(id)
  if (!record || !isLive(record)) {
    throw new Error(`${table.name}: record not found (${id})`)
  }
  return record
}

/**
 * Soft-deletes many records at once. All share the same `deletedAt`, so
 * items deleted together (e.g. a page and its blocks) can be restored together.
 */
export async function softDeleteMany<T extends BaseRecord>(
  table: RecordTable<T>,
  ids: readonly string[],
  deletedAt: number,
): Promise<void> {
  // Cast needed: Dexie's update typings can't infer BaseRecord keys on a generic T.
  const changes = {
    deletedAt,
    updatedAt: deletedAt,
  } as unknown as UpdateSpec<T>
  await table.bulkUpdate(ids.map((key) => ({ key, changes })))
}

/** True if the record is in Trash: deleted but not erased. */
export function isInTrash(record: BaseRecord): boolean {
  return record.deletedAt !== null && record.purgedAt === undefined
}

/** Un-deletes many records at once (Trash → Restore). */
export async function restoreMany<T extends BaseRecord>(
  table: RecordTable<T>,
  ids: readonly string[],
  now: number,
): Promise<void> {
  const changes = {
    deletedAt: null,
    updatedAt: now,
  } as unknown as UpdateSpec<T>
  await table.bulkUpdate(ids.map((key) => ({ key, changes })))
}

/**
 * Erases many records (Trash → Delete forever): `emptied` blanks the content
 * fields, and `purgedAt` marks them. The empty records stay as markers.
 */
export async function purgeMany<T extends BaseRecord>(
  table: RecordTable<T>,
  ids: readonly string[],
  emptied: Partial<T>,
  now: number,
): Promise<void> {
  const changes = {
    ...emptied,
    purgedAt: now,
    updatedAt: now,
  } as unknown as UpdateSpec<T>
  await table.bulkUpdate(ids.map((key) => ({ key, changes })))
}

/**
 * Returns the ids of all descendants of `rootId` (not including it) in a
 * parent/child list, e.g. sub-pages of a page or child blocks of a block.
 */
export function descendantIds(
  items: readonly { id: string; parentId: string | null }[],
  rootId: string,
): string[] {
  const childrenOf = new Map<string, string[]>()
  for (const item of items) {
    if (item.parentId === null) continue
    const list = childrenOf.get(item.parentId) ?? []
    list.push(item.id)
    childrenOf.set(item.parentId, list)
  }

  const result: string[] = []
  const queue = [...(childrenOf.get(rootId) ?? [])]
  while (queue.length > 0) {
    const id = queue.shift()!
    result.push(id)
    queue.push(...(childrenOf.get(id) ?? []))
  }
  return result
}
