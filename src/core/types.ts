import type { InkSnapshot } from './inkTypes'

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
  kind?: 'journal' | 'templates' | 'databases' | 'books' | 'sources'
  /**
   * Templates notebook only: the starter-template version already added
   * (unset = 1). Newer starters are added once when this is lower.
   */
  starterVersion?: number
  /**
   * How the page path shows for this notebook's pages (an override of the
   * Settings default). Unset = use the default.
   */
  pathStyle?: 'simple' | 'full' | 'page'
  /**
   * Privacy lock (batch 3): hidden behind the lock screen, with all its
   * pages. A flag only; the notes are not changed (not encryption).
   */
  locked?: true
  /** Edit lock (queue 3c): read-only with all its pages; one tap unlocks, no passcode. Not the privacy lock. */
  editLocked?: true
  /** Always opens in Reading mode (batch 3). */
  readFirst?: true
  /** Paused (E1): this notebook's cards stay out of reviews until resumed. */
  paused?: true
  /** The user allows their own AI to read text from this notebook (CR4). Off when unset. */
  allowAi?: true
  /** AI may also read this notebook's locked pages (R8-6). Off when unset; kept beside allowAi, no new Dexie version. */
  allowAiLocked?: true
  /** The key and model this notebook uses for AI (device-local key id; unset = the global default). */
  aiChoice?: { keyId: string; model: string }
  /** Made by "Load sample notebook" (testing); "Remove sample notebook" finds it by this. */
  sample?: true
  /**
   * The notebook's tabs (Notes · Database · Cards …), in display order.
   * Copied from the default tab template when the notebook is made (or on
   * the version 4 upgrade). Unset on special notebooks (journal, …).
   */
  tabs?: NotebookTab[]
  /** Optional page tabs switched on for this notebook's pages (mindMap, slides, audio, database). Unset = none. */
  pageTabs?: string[]
  /** I1: how the notebook shows its pages: covers and thumbnails, or coloured section tabs. Unset = default. */
  view?: 'shelf' | 'tabs'
  /** I1: the view each tab uses (tab id → view), remembered per notebook. */
  tabViews?: Record<string, TabView>
  /** Notebooks home: the cover colour (#rrggbb). Unset = one picked from the id. No new Dexie version. */
  colour?: string
  /** Notebooks home: 'page' shows the first page as the cover. Unset = the colour cover. */
  cover?: 'page'
  /** Notebooks home: pinned to the top of the shelf and the list. */
  starred?: true
}

/** Views a notebook tab can show its pages in (I1). */
export type TabView = 'list' | 'gallery' | 'table' | 'board'

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
  /**
   * A page of the sample notebook: its title is stored in English and shown
   * in the chosen language (`sampleName`) while it is still unchanged.
   */
  sample?: true
  /** Position among sibling pages (lower comes first). */
  order: OrderKey
  /** Journal day page: its local date, "YYYY-MM-DD". */
  journalDate?: string
  /** Journal month page: its month, "YYYY-MM". */
  journalMonth?: string
  /**
   * Journal day or month page renamed by the user: `title` is shown instead
   * of the automatic date in the current language. Unset = automatic.
   */
  customTitle?: true
  /** This page's own path style (wins over the notebook's). Unset = inherit. */
  pathStyle?: 'simple' | 'full' | 'page'
  /** Privacy lock on this page (batch 3); see Notebook.locked. */
  locked?: true
  /** Edit lock (queue 3c): read-only; see Notebook.editLocked. */
  editLocked?: true
  /** Always opens in Reading mode (batch 3). */
  readFirst?: true
  /** Paused (E1): this page and its sub-pages stay out of reviews. */
  paused?: true
  /** I1: colour of this page's section tab (one of the tag colours). Unset = none. */
  tabColour?: string
  /** Paper behind the ink: lined, grid or dots (step 3). Unset = plain. */
  inkBg?: 'lined' | 'grid' | 'dots'
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
  /** Where this page's material came from (C1/CR1). Unset = a normal page. */
  source?: PageSource
  /**
   * Phase Q: the page's block boxes on the paper, besides the default one.
   * Unset or empty = one full-width box holding every block (every page
   * made before Phase Q). See paper/boxes.ts.
   */
  boxes?: PaperBox[]
  /**
   * Box grid (bug batch item 26): how the boxes sit, in rows of 1-3 columns.
   * Unset = not arranged yet (derived from the boxes on open and written on
   * the first change). See paper/grid.ts.
   */
  rows?: GridRow[]
  /** Phase Q: sheet size. Unset = A4. */
  sheet?: 'A4' | 'Letter'
}

/**
 * Phase Q: a block box on the paper. Units are millimetres from the top-left
 * of the paper (sheets stacked top to bottom); the height follows the text.
 */
/** A column of a grid row: a width (fraction of the row) and 1-2 boxes stacked. */
export interface GridCol {
  w: number
  boxIds: string[]
}

/** A row of the box grid: 1-3 columns; `y` (mm) is the least top it may have. */
export interface GridRow {
  id: string
  y?: number
  cols: GridCol[]
}

export interface PaperBox {
  id: string
  x: number
  y: number
  w: number
  locked?: true
  colour?: string
  /** Bug batch 2, item 8: background, border, corners, shadow, padding (core/boxStyle.ts). */
  style?: import('./boxStyle').BoxStyle
}

/** What a source page is: a book, an article, a video, … */
export type SourceKind =
  'book' | 'article' | 'video' | 'audio' | 'file' | 'paste'

/**
 * The origin of a source page (Library). Books have a stored file
 * (`fileId`); captured sources keep the `url` and what was pasted as
 * ordinary blocks. Optional on `Page`, so no Dexie version was needed.
 */
export interface PageSource {
  kind: SourceKind
  /** https address of the source, if it came from the web. */
  url?: string
  durationSec?: number
  /** UTC ms the source was captured or imported. */
  capturedAt?: number
  /** YouTube: video id and start time in seconds. */
  videoId?: string
  startSec?: number
  /** Books (kind 'book'): the stored file and its format. */
  fileId?: string
  format?: 'pdf' | 'epub' | 'docx'
  author?: string
  /** Cover picture (`images` row). */
  coverImageId?: string
  pageCount?: number
  /** 0 to 1. */
  progress?: number
  /** Where reading stopped: `pdf:<page>:<yFraction>` or `epub:<cfi>`. */
  at?: string
  /** The furthest 0 to 1 ever read, and where (item 45: Sync to furthest page). */
  furthest?: number
  furthestAt?: string
  /** UTC ms the book was last opened. */
  openedAt?: number
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
  /** One AI result (CR2/CR4): every block made together shares it. */
  batchId?: string
  /**
   * Phase Q: the box (Page.boxes) a top-level block sits in. Unset = the
   * default box. Nested blocks follow their parent.
   */
  boxId?: string
  /**
   * Set when two devices changed this block at the same moment: the version
   * that lost, kept here until the person chooses (Keep mine / Use other /
   * Keep both). Synced with the block, so the choice shows on every device.
   */
  clash?: BlockClash
}

/** The other version of a block changed on two devices. */
export interface BlockClash {
  type: string
  content: JsonObject
  /** When the clash was noticed (tells one clash from the next). */
  at: number
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
  /** The highlight or note this card was made from (CR3). */
  sourceAnnotationId?: string
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
  kind?: 'studyTracker' | 'promptLibrary'
  /**
   * Name of the title column (the row page's title), e.g. "Name" or
   * "Lesson"; formulas refer to it as `[Name]`. Unset = "Name".
   */
  titleName?: string
  /** View to open on; unset = Dashboard once it has rows, else Table. */
  openViewId?: string
  /** Privacy lock on this database and its rows (batch 3). */
  locked?: true
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
  /** `title:<pageId>` for a page title, `ink:<pageId>` for the labels of a page's drawings, else the block id. */
  id: string
  /** What was indexed; used for ranking (title > card > text). */
  kind: 'title' | 'card' | 'text' | 'ink'
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
  /** The paper box the block sat in (unset = the main box). */
  boxId?: string
}

/**
 * A saved copy of a page's title and blocks at one moment (Phase 6, page
 * version history). Restoring one writes it back as the live blocks.
 */
export interface PageVersion extends BaseRecord {
  pageId: string
  title: string
  blocks: VersionBlock[]
  /** The page's ink at that moment (step 3). Unset = no ink. */
  ink?: InkSnapshot
  /** Items 4 and 8: the paper boxes and paper settings at that moment. */
  layout?: {
    boxes?: PaperBox[]
    inkBg?: 'lined' | 'grid' | 'dots'
    sheet?: 'A4' | 'Letter'
  }
  /** Why the copy was taken (shown in History). */
  reason?: 'timed' | 'big' | 'leave' | 'before-restore'
  /** Rough size in bytes, for the storage budget. */
  bytes?: number
}

/** A font file the user imported (H1). Used as `custom:<id>`. */
export interface StoredFont extends BaseRecord {
  /** Shown name (the file name without its ending). */
  name: string
  format: 'ttf' | 'otf' | 'woff2'
  data: ArrayBuffer
}

/** Which cards of a deck count as "new", "learning" or "due" (E1). */
export type DeckState = 'new' | 'learning' | 'due' | 'all'

/**
 * A layer that was added (I2): which items it made, and a hash of each as
 * it was added, so Remove can tell what you changed since.
 */
export interface LayerInstall extends BaseRecord {
  packId: string
  version: number
  /** Layer name when added (shown even if the layer is not available now). */
  name: string
  installedAt: number
  createdIds: {
    table: 'notebooks' | 'pages' | 'databases'
    id: string
    hash: string
  }[]
}

/**
 * One line of a page's Summary (Phase M). A linked line (`sourceBlockId`)
 * shows the note's live text and keeps `text` as a snapshot for when the
 * note is gone; an own line is typed in the Summary.
 */
export interface SummaryItem extends BaseRecord {
  /** The page whose Summary holds this line. */
  pageId: string
  notebookId: string
  order: OrderKey
  text: string
  /** The note line this one is linked to. Unset = an own line. */
  sourceBlockId?: string
  /** A link back (a saved highlight): `https://…` or `#/…`. */
  href?: string
  /** The label of the link ("p. 12"). */
  where?: string
}

/**
 * A deck (E1): a live filter over cards. It is refilled by itself as notes
 * and cards change; it never holds cards. Empty scope lists = everything.
 */
export interface Deck extends BaseRecord {
  name: string
  order: OrderKey
  colour?: string
  scope: {
    notebookIds: string[]
    pageIds: string[]
    /** Also the sub-pages of the listed pages. */
    withSubpages: boolean
    /** Notebook kinds to include (e.g. a Books collection later). */
    notebookKinds?: string[]
  }
  tagIds: string[]
  tagMode: 'any' | 'all'
  states: DeckState[]
  routeOrder?: boolean
}

/** A picture added from the device (Phase 6). Referenced as `lnimg:<id>`. */
export interface StoredImage extends BaseRecord {
  name: string
  /** MIME type of `data` (png, jpeg, webp or gif). */
  type: string
  width: number
  height: number
  data: ArrayBuffer
  /**
   * Set on an edited copy (picture editor): the picture it came from. The
   * original is never changed or deleted, so "Restore original" works.
   */
  originalId?: string
}

/**
 * A voice recording made while taking notes (audio step, Dexie 14). The sound
 * stays on this device, in `data`. `startedAt` is the UTC time the sound
 * began, so strokes (`at`) can be matched to the recording later. Deleting is
 * soft (`deletedAt`); "Delete forever" blanks `data` and sets `purgedAt`.
 */
export interface Recording extends BaseRecord {
  pageId: string
  /** Shown name, e.g. "Recording 6 Nov, 14:32". */
  name: string
  /** MIME type of `data` (audio/mp4, audio/webm, audio/ogg). */
  type: string
  /** UTC ms the sound began. */
  startedAt: number
  durationMs: number
  data: ArrayBuffer
}

/**
 * A book file kept on this device (C1, Dexie 17). Large; "Notes only" backups
 * keep the row with empty bytes (like pictures). Deleting the book page
 * soft-deletes the row; "Delete forever" blanks `data`.
 */
export interface BookFile extends BaseRecord {
  pageId: string
  name: string
  mime: string
  size: number
  data: ArrayBuffer
  /** An attached file (G2) opened in the reader: its Library page. */
  readerPageId?: string
  /** Brought in from NotebookLM as a slide deck: the page's Slides tab shows it. */
  slides?: true
}

/** Colours of a highlight. */
export const HIGHLIGHT_COLOURS = [
  'yellow',
  'green',
  'blue',
  'pink',
  'purple',
] as const
export type HighlightColour = (typeof HIGHLIGHT_COLOURS)[number]

/** Where an annotation sits. */
export type AnnotationAnchor =
  | { type: 'block'; blockId: string; from?: number; to?: number }
  /** `rects`: groups of x, y, w, h, each 0 to 1 of the page. */
  | { type: 'pdf'; page: number; rects: number[] }
  | { type: 'epub'; cfi: string }
  | { type: 'time'; seconds: number; endSeconds?: number }

/** A highlight, note or bookmark on a book or a note page (C1/C4). */
export interface Annotation extends BaseRecord {
  /** The book page or note page. */
  pageId: string
  kind: 'highlight' | 'note' | 'bookmark'
  colour?: HighlightColour
  anchor: AnnotationAnchor
  /** W3C text-quote selector, to find the spot again if it moved. */
  quote?: { exact: string; prefix: string; suffix: string }
  /** The user's note (at most 20,000 characters). */
  note?: string
  /** Chapter label at creation, for filters. */
  chapter?: string
  /** Pages and blocks this was saved to. */
  savedTo?: { pageId: string; blockId: string }[]
  /** Cards made from it (CR3). */
  cardIds?: string[]
  origin: 'user' | 'ai'
}

/**
 * A device secret that the person chose to keep on all their devices (R6-2,
 * Dexie 22): today the AI keys. One record per kind, with a fixed id, so
 * every device writes the same one. It syncs encrypted like any record and
 * is never written to a backup file (share/fullFile.ts).
 */
export interface SecretRecord extends BaseRecord {
  kind: 'aiKeys' | 'toolbarLayout'
  /** The secret itself, as the owner feature defines it. */
  value: JsonObject
}

/**
 * Sync fields of one synced record (L6, Dexie 18), kept beside the record so
 * no other table changes. Never sent as is: the clock travels inside the
 * encrypted copy. See docs/features/sync.md.
 */
export interface SyncState {
  /** `${table}/${recordId}`. */
  id: string
  table: string
  recordId: string
  /** Server revision this device last saw (0 = never saved there). */
  rev: number
  /** Hybrid clock of the last change (see sync/hlc.ts). */
  hlc: string
  /** 1 = changed here, not yet accepted by the server (indexed; 0/1, not boolean). */
  dirty: 0 | 1
  /**
   * File tables only: 'up' = bytes wait for upload, 'down' = waiting for
   * download, 'ok' = in step. Unset = not a file.
   */
  fileState?: 'up' | 'down' | 'ok'
  /** Drive file id of the encrypted bytes. */
  fileRef?: string
}
