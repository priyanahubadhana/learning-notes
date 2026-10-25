/**
 * Core data model: Workspace → Notebooks → Pages → Blocks.
 *
 * These are plain data shapes with no UI or editor dependencies, so they can
 * be reused by any front end (web now, iOS later) and synced to a server later.
 */

/** Any value that can be safely stored as JSON. */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/** A JSON object (used for block content). */
export type JsonObject = { [key: string]: JsonValue }

/**
 * Fields every stored record has. Timestamps are milliseconds since epoch.
 */
export interface BaseRecord {
  /** Random UUID generated on this device (see `createId`). */
  id: string
  createdAt: number
  updatedAt: number
  /**
   * Soft delete: when set, the record is treated as deleted but kept, so it
   * can be restored later and deletions can be synced. null = not deleted.
   */
  deletedAt: number | null
  /**
   * "Delete forever" (from Trash): the content is erased and this is set.
   * The record stays as an empty marker (id + times) so a future sync can
   * tell other devices it is gone. Unset = not erased.
   */
  purgedAt?: number
}

/**
 * Fractional-index key (a short string). Siblings sort by comparing keys as
 * plain strings; a new key can always be made between any two, so reordering
 * changes only the moved record. See `core/order.ts`.
 */
export type OrderKey = string

/** Top-level container. One per user for now; many later. */
export interface Workspace extends BaseRecord {
  name: string
}

/** A notebook groups pages inside a workspace. */
export interface Notebook extends BaseRecord {
  workspaceId: string
  title: string
  /** Position among sibling notebooks (lower comes first). */
  order: OrderKey
  /**
   * Special notebooks: 'journal' holds daily pages (by month); 'templates'
   * holds template pages and is shown in its own sidebar section.
   * Unset = a normal notebook.
   */
  kind?: 'journal' | 'templates'
}

/** A page lives in a notebook and can nest under another page. */
export interface Page extends BaseRecord {
  notebookId: string
  /** Parent page id, or null for a top-level page in the notebook. */
  parentId: string | null
  title: string
  /** Position among sibling pages (lower comes first). */
  order: OrderKey
  /** Journal day page: its local date, "YYYY-MM-DD". */
  journalDate?: string
  /** Journal month page: its month, "YYYY-MM". */
  journalMonth?: string
  /** 'daily': the protected template that fills new journal days. */
  templateRole?: 'daily'
}

/**
 * A single block of content (paragraph, heading, to-do, image, …).
 * Each block is its own record — pages are never stored as one text blob.
 */
export interface Block extends BaseRecord {
  /** The page this block belongs to. */
  pageId: string
  /** Parent block id for nested blocks (e.g. sub-list items), or null. */
  parentId: string | null
  /**
   * Block type name. A plain string (not a fixed list) so new block types
   * can be plugged in without changing the core model.
   */
  type: string
  /** Type-specific data; each block type defines its own shape. */
  content: JsonObject
  /** Position among sibling blocks (lower comes first). */
  order: OrderKey
}
