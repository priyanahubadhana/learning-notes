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
   * 'databases' is the hidden home of row pages of databases that belong
   * to no notebook. Unset = a normal notebook.
   */
  kind?: 'journal' | 'templates' | 'databases'
  /**
   * Templates notebook only: the starter-template version already added
   * (unset = 1). Newer starters are added once when this is lower.
   */
  starterVersion?: number
  /** Made by "Load sample notebook" (testing); "Remove sample notebook" finds it by this. */
  sample?: true
  /**
   * The notebook's tabs (Notes · Database · Cards …), in display order.
   * Copied from the default tab template when the notebook is made (or on
   * the version 4 upgrade). Unset on special notebooks (journal, …).
   */
  tabs?: NotebookTab[]
}

/**
 * One tab of a notebook. `kind` is an open string so new tab kinds (e.g.
 * 'revise' in Phase 5B) need no core change.
 */
export interface NotebookTab {
  /** Unique within the notebook (built-in tabs use their kind). */
  id: string
  /** 'notes' | 'database' | 'cards', later 'revise'. */
  kind: string
  /** Own name; unset = the translated default name of the kind. */
  title?: string
  /** Hidden tabs stay saved but are not shown. */
  hidden?: boolean
  /** 'database' tabs: the database shown. */
  databaseId?: string
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
  /** A lesson's own summary (Revise tab); top-level pages only. */
  summary?: string
  /** 'daily': the protected template that fills new journal days. */
  templateRole?: 'daily'
  /** Tags on the whole page (chips under the title). Unset = none. */
  tagIds?: string[]
  /**
   * Set when this page is a row of a database. Row pages live in the
   * database's notebook but are not listed in its Notes tree.
   */
  databaseId?: string
  /**
   * Cell values when this page is a database row (a row page, or a lesson
   * in its notebook's Study tracker), by column id. The value shape is
   * owned by the column type; computed columns store nothing. Unset = empty.
   */
  values?: JsonObject
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
  /**
   * Last time the card was answered (review or practice) and that answer.
   * Copies of the newest review log entry, kept so the Study tracker reads
   * cards only, not the whole history. Unset = never answered.
   */
  lastReviewAt?: number
  lastRating?: Rating
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

/**
 * A database: columns + rows (pages) + views. Belongs to a notebook, or to
 * none (its row pages then live in the hidden 'databases' notebook).
 */
export interface Database extends BaseRecord {
  workspaceId: string
  /** Notebook it belongs to; null = outside any notebook. */
  notebookId: string | null
  title: string
  /** Position in the "All databases" list (lower comes first). */
  order: OrderKey
  /**
   * 'studyTracker': the notebook's Study tracker; its rows are the
   * notebook's top-level pages (lessons), not row pages. Unset = normal.
   */
  kind?: 'studyTracker'
  /**
   * Name of the title column (the row page's title), e.g. "Name" or
   * "Lesson"; formulas refer to it as `[Name]`. Unset = "Name".
   */
  titleName?: string
  /** View to open on; unset = Dashboard once it has rows, else Table. */
  openViewId?: string
}

/** One column (property) of a database. */
export interface DbColumn extends BaseRecord {
  databaseId: string
  name: string
  /**
   * Column type name, an open string so new types plug in: 'text',
   * 'number', 'date', 'choice', 'choices', 'checkbox', 'url', 'tag',
   * 'noteLink', 'formula', 'relation', 'rollup', Study tracker auto columns.
   */
  type: string
  /** Type-specific settings (choice options, number format, formula, …). */
  config: JsonObject
  /** Position among the database's columns (lower comes first). */
  order: OrderKey
}

/**
 * One saved view of a database (Table, Dashboard, Board …). Sorts, filters,
 * hidden columns and charts live in `config`, owned by the view type.
 */
export interface DbView extends BaseRecord {
  databaseId: string
  name: string
  /** View type name, an open string: 'table', 'dashboard', 'board', … */
  type: string
  config: JsonObject
  /** Position among the database's views (lower comes first). */
  order: OrderKey
  /**
   * Set for the own view of a "/database" block inside a note; such views
   * are not listed with the database's views.
   */
  blockId?: string
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

/**
 * One Relation cell value (row → row), so a row can list the rows that
 * point to it. Built from `Page.values`.
 */
export interface RowRef {
  /** `<fromPageId>|<columnId>|<toPageId>`. */
  id: string
  fromPageId: string
  columnId: string
  toPageId: string
}

/** Small app bookkeeping values, e.g. which search index version is built. */
export interface MetaValue {
  id: string
  value: JsonValue
}

/** A block as kept inside a page version (no times; ids are the live ids). */
export interface VersionBlock {
  id: string
  parentId: string | null
  type: string
  content: JsonObject
  order: OrderKey
}

/**
 * A saved copy of a page's title and blocks at one moment (Phase 6, page
 * version history). Restoring one writes it back as the live blocks.
 */
export interface PageVersion extends BaseRecord {
  pageId: string
  title: string
  blocks: VersionBlock[]
}

/** A picture added from the device (Phase 6). Referenced as `lnimg:<id>`. */
export interface StoredImage extends BaseRecord {
  name: string
  /** MIME type of `data` (png, jpeg, webp or gif). */
  type: string
  width: number
  height: number
  data: ArrayBuffer
}
