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
  /**
   * Templates notebook only: the starter-template version already added
   * (unset = 1). Newer starters are added once when this is lower.
   */
  starterVersion?: number
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
  /** Tags on the whole page (chips under the title). Unset = none. */
  tagIds?: string[]
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
  /**
   * Where the content came from. An open string so new sources need no core
   * change: `typed` (default when unset), later `ai`, `voice`, `handwriting`.
   */
  source?: string
  /**
   * The block this one was made from (e.g. typed text converted from
   * handwriting). Unset = not derived. Kept even if that block is deleted.
   */
  derivedFrom?: string
}

/** How well a card was remembered (the four review buttons). */
export type Rating = 'again' | 'hard' | 'good' | 'easy'

/**
 * Scheduling state of one recall card, stored apart from the card's text so
 * editing a card never resets its schedule. One block can produce several
 * cards (a Card block makes one; each fill-in-the-blank makes one).
 * Can always be rebuilt by replaying the card's review log.
 */
export interface Card extends BaseRecord {
  /** Block that produces the card (a Card block, or a block with blanks). */
  blockId: string
  /** Which card of that block: 'main' for a Card block, else the blank id. */
  part: string
  /** Copied from the block for fast "review this page/notebook" lookups. */
  pageId: string
  notebookId: string
  /** Next review time (UTC ms). New cards: their creation time. */
  due: number
  /** Current gap between reviews in days (0 = new or relearning). */
  intervalDays: number
  /** Position on the fixed-step ladder (fixed-steps scheduler). */
  step: number
  /** Times reviewed (normal reviews only) and times forgotten. */
  reps: number
  lapses: number
  /** Suspended cards stay saved but never appear in reviews. null = active. */
  suspendedAt: number | null
  /** Extra state a scheduler may keep (e.g. FSRS stability/difficulty). */
  schedulerData?: JsonObject
}

/**
 * One review of one card. Append-only: entries are never edited or deleted,
 * so schedulers (e.g. FSRS) and future sync can replay the full history.
 * The only exception is "Delete forever", which erases the details.
 */
export interface ReviewLog {
  id: string
  cardId: string
  rating: Rating
  /** When the review happened (UTC ms). */
  createdAt: number
  /** Time from showing the card to rating it, in ms. */
  durationMs: number
  /** 'cram' = Practice anyway on a card that was not due; it changed nothing. */
  kind: 'review' | 'cram'
  /** Scheduler that made the decision, e.g. 'fixed' or 'fsrs'. */
  scheduler: string
  dueBefore: number
  dueAfter: number
  intervalBefore: number
  intervalAfter: number
  stepAfter: number
  /** True for a card's first normal review (counts toward the new-card limit). */
  isNew: boolean
  /** Scheduler state after the review, if the scheduler keeps any. */
  schedulerDataAfter?: JsonObject
  /** Set when the card was deleted forever; the details are erased. */
  purgedAt?: number
}

/**
 * A stored value for a synced setting (see the settings registry). Settings
 * marked "this device only" are kept in the browser instead.
 */
export interface SettingValue {
  /** The setting's registry id, e.g. 'review.newPerDay'. */
  id: string
  value: JsonValue
  updatedAt: number
}

/**
 * A tag. Tags are records (not text), so renaming or moving one updates it
 * everywhere it is used. Nested tags ("medicine/cardio") use `parentId`.
 */
export interface Tag extends BaseRecord {
  name: string
  /** Parent tag id, or null for a top-level tag. */
  parentId: string | null
  /** Optional colour (CSS colour string). Unset = grey. */
  color?: string
}

/** A search the user saved; shown in the sidebar. Card searches are decks. */
export interface SavedSearch extends BaseRecord {
  name: string
  /** The search text and filters; shape owned by the search feature. */
  query: JsonObject
  /** Position among saved searches (lower comes first). */
  order: OrderKey
}

/*
 * Helper lists (indexes) built from the notes. They are copies, not user
 * data: they can always be rebuilt from pages and blocks, so rows are
 * replaced or removed directly (no soft delete) and are never synced —
 * each device builds its own.
 */

/** The words of one page title or one block, for search. */
export interface SearchEntry {
  /** `title:<pageId>` for a page title, else the block id. */
  id: string
  /** What was indexed; used for ranking (title > card > text). */
  kind: 'title' | 'card' | 'text'
  pageId: string
  notebookId: string
  /** Set for block entries. */
  blockId?: string
  /** Normalised words (lower case, no accents), each once. */
  words: string[]
  /** When the title/block last changed (ties; "Recently changed" sort). */
  updatedAt: number
  /** Set while the page/block is in the Trash (found only on request). */
  deleted?: true
  /** A Card with no question yet: listed as "Empty", never reviewed. */
  empty?: true
}

/** One link written in a block, to a page, or a heading/card on it. */
export interface LinkRef {
  /** `<fromBlockId>|<index>` (a block can hold several links). */
  id: string
  fromBlockId: string
  fromPageId: string
  toPageId: string
  /** Heading or card block linked to; unset = the page itself. */
  toBlockId?: string
}

/** One tag written in a block (tags that block, or its card). */
export interface BlockTag {
  /** `<blockId>|<tagId>`. */
  id: string
  blockId: string
  pageId: string
  tagId: string
}

/** Small app bookkeeping values, e.g. which search index version is built. */
export interface MetaValue {
  id: string
  value: JsonValue
}
