import type { LearningNotesDB } from '../core/db'
import type { Block, DbColumn, Page, SearchEntry } from '../core/types'
import { linkRowRange, linkRows } from '../links/linkRows'
import { blockTagRowRange, blockTagRows } from '../tags/tagRows'
import {
  blockEntry,
  pageEntry,
  rowTagIds,
  SEARCH_INDEX_VERSION,
  searchWords,
  titleEntryId,
} from './searchText'

/**
 * Search over the word index. The index is kept up to date by
 * `searchIndexMiddleware` on every save; `ensureSearchIndex` fills it for
 * notes saved before it existed (upgrades) or after an index format change.
 */

export type SearchKind = SearchEntry['kind']

export interface SearchOptions {
  /** Most matches to return (best first). Default 50. */
  limit?: number
  /** Also find things in the Trash. Default false. */
  includeDeleted?: boolean
}

export interface SearchMatch {
  entry: SearchEntry
  score: number
}

export interface SearchResult {
  /** Best matches first, at most `limit`. */
  matches: SearchMatch[]
  /** How many entries matched in all (for "See all" and counts). */
  total: number
}

/** Ranking: a title beats a card, a card beats plain text. */
const KIND_SCORE: Record<SearchKind, number> = {
  title: 300,
  card: 200,
  ink: 150, // a labelled drawing: between a card and plain text
  text: 100,
}
/** Extra for each search word that is a whole word (not just a prefix). */
const WHOLE_WORD_SCORE = 10

/**
 * Finds entries containing every search word, each as a word start
 * ("mito" finds "mitochondria"), ignoring case and accents. Text with no
 * letters or digits finds nothing.
 */
export async function searchIndex(
  db: LearningNotesDB,
  text: string,
  { limit = 50, includeDeleted = false }: SearchOptions = {},
): Promise<SearchResult> {
  const matches = (await findMatches(db, searchWords(text))).filter(
    (m) => includeDeleted || !m.entry.deleted,
  )
  matches.sort(
    (a, b) => b.score - a.score || b.entry.updatedAt - a.entry.updatedAt,
  )
  return { matches: matches.slice(0, limit), total: matches.length }
}

/**
 * Every entry containing all `words` (already split and folded, see
 * `searchWords`), each as a word start, with its score; unsorted, Trash
 * included. Reads only the entries matching the rarest word (an index
 * lookup), then checks the other words on those.
 */
export async function findMatches(
  db: LearningNotesDB,
  words: string[],
): Promise<SearchMatch[]> {
  if (words.length === 0) return []

  const counts = await Promise.all(
    words.map((w) => db.searchEntries.where('words').startsWith(w).count()),
  )
  if (Math.min(...counts) === 0) return []
  const rarest = words[counts.indexOf(Math.min(...counts))]

  // One read of the whole range. An entry with several words starting with
  // `rarest` comes back once per word; skipped here (Dexie's `distinct()`
  // would walk the range one row at a time, far slower).
  const candidates = await db.searchEntries
    .where('words')
    .startsWith(rarest)
    .toArray()

  const seen = new Set<string>()
  const matches: SearchMatch[] = []
  for (const entry of candidates) {
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    let score = KIND_SCORE[entry.kind]
    let all = true
    for (const word of words) {
      if (entry.words.includes(word)) score += WHOLE_WORD_SCORE
      else if (!entry.words.some((w) => w.startsWith(word))) {
        all = false
        break
      }
    }
    if (all) matches.push({ entry, score })
  }
  return matches
}

/** `meta` record holding the index state. */
const META_ID = 'searchIndex'

interface IndexState {
  version: number
  /** Unset when finished; else the next table and the last id done. */
  next?: { table: 'pages' | 'blocks'; after: string }
}

/** Records indexed per transaction during a backfill. */
const CHUNK = 500

/** True when the index covers every note (no backfill pending). */
export async function isSearchIndexReady(db: LearningNotesDB) {
  const state = (await db.meta.get(META_ID))?.value as IndexState | undefined
  return state?.version === SEARCH_INDEX_VERSION && state.next === undefined
}

/**
 * Indexes notes saved before the index existed, or rebuilds it after
 * `SEARCH_INDEX_VERSION` changes. Works in small transactions, pausing
 * between them so the app stays responsive; progress is saved, so a reload
 * carries on where it stopped. Saves made meanwhile are indexed by the
 * middleware as usual. Safe to call on every start.
 */
export async function ensureSearchIndex(
  db: LearningNotesDB,
  chunk: number = CHUNK,
): Promise<void> {
  const stored = (await db.meta.get(META_ID))?.value as IndexState | undefined
  let state: IndexState =
    stored?.version === SEARCH_INDEX_VERSION
      ? stored
      : { version: SEARCH_INDEX_VERSION, next: { table: 'pages', after: '' } }

  while (state.next) {
    const { table, after } = state.next
    state = await db.transaction(
      'rw',
      [
        db.pages,
        db.blocks,
        db.searchEntries,
        db.links,
        db.blockTags,
        db.dbColumns,
        db.tags,
        db.meta,
      ],
      async () => {
        const records = await db[table]
          .where(':id')
          .above(after)
          .limit(chunk)
          .toArray()
        await indexRecords(db, table, records)
        const last = records.at(-1)?.id
        const next: IndexState['next'] = last
          ? { table, after: last }
          : table === 'pages'
            ? { table: 'blocks', after: '' }
            : undefined
        const nextState: IndexState = next
          ? { version: SEARCH_INDEX_VERSION, next }
          : { version: SEARCH_INDEX_VERSION }
        await db.meta.put({ id: META_ID, value: { ...nextState } })
        return nextState
      },
    )
    await new Promise((resolve) => setTimeout(resolve, 0)) // let the UI breathe
  }
}

/** Writes the entries for some pages or blocks (inside a transaction). */
async function indexRecords(
  db: LearningNotesDB,
  table: 'pages' | 'blocks',
  records: (Page | Block)[],
): Promise<void> {
  let entries: (SearchEntry | null)[]
  if (table === 'pages') {
    const pages = records as Page[]
    const columns = new Map<string, DbColumn[]>()
    for (const id of new Set(
      pages.filter((p) => p.databaseId && p.values).map((p) => p.databaseId!),
    )) {
      columns.set(
        id,
        (await db.dbColumns.where('databaseId').equals(id).toArray()).filter(
          (c) => c.deletedAt === null,
        ),
      )
    }
    const tagIds = [
      ...new Set(
        pages.flatMap((p) =>
          p.databaseId && p.values
            ? rowTagIds(p.values, columns.get(p.databaseId) ?? [])
            : [],
        ),
      ),
    ]
    const tagNames = new Map(
      (await db.tags.bulkGet(tagIds)).flatMap((x) =>
        x ? [[x.id, x.name]] : [],
      ),
    )
    entries = pages.map((p) =>
      pageEntry(
        p,
        p.databaseId ? columns.get(p.databaseId) : undefined,
        tagNames,
      ),
    )
  } else {
    const blocks = records as Block[]
    const pageIds = [...new Set(blocks.map((b) => b.pageId))]
    const pages = await db.pages.bulkGet(pageIds)
    const notebookOf = new Map(
      pageIds.map((id, i) => [id, pages[i]?.notebookId]),
    )
    entries = blocks.map((b) => blockEntry(b, notebookOf.get(b.pageId) ?? ''))
    // The links and block tags lists are rebuilt with the index. A chunk
    // is a run of consecutive block ids, so one key range covers all its
    // old rows (and stale rows of blocks no longer there).
    if (blocks.length > 0) {
      const first = blocks[0].id
      const last = blocks.at(-1)!.id
      await db.links
        .where(':id')
        .between(linkRowRange(first)[0], linkRowRange(last)[1], true, true)
        .delete()
      await db.blockTags
        .where(':id')
        .between(
          blockTagRowRange(first)[0],
          blockTagRowRange(last)[1],
          true,
          true,
        )
        .delete()
    }
    await db.links.bulkPut(blocks.flatMap(linkRows))
    await db.blockTags.bulkPut(blocks.flatMap(blockTagRows))
  }
  const ids = records.map((r) =>
    table === 'pages' ? titleEntryId(r.id) : r.id,
  )
  await db.searchEntries.bulkPut(entries.filter((e) => e !== null))
  await db.searchEntries.bulkDelete(ids.filter((_, i) => entries[i] === null))
}
