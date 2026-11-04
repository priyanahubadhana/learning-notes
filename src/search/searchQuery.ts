import { displayName, sampleName } from '../i18n/defaultNames'
import { hiddenPageIds } from '../core/lock/lockService'
import type { LearningNotesDB } from '../core/db'
import type { Card, Notebook, SearchEntry } from '../core/types'
import { cardStatus, type CardStatus } from '../recall/cardList'
import { failCounts, wrongCardIds } from '../recall/reviewService'
import { ownTagNames, taggedEntryIds, tagsOf } from '../tags/tagQuery'
import { tagMap } from '../tags/tagService'
import { findMatches } from './searchService'
import { blockText, searchWords } from './searchText'

/**
 * The search the user sees (popup and Search screen): words + result type
 * + filters → every matching result, sorted, with counts for the filter
 * menus. Built on the word index (`findMatches`); everything after the
 * index lookup happens in memory on the matches only.
 *
 * Filters live in one registry (`FILTERS`), so a new filter is one more
 * entry: it is applied to results and its menu counts come free.
 */

/** What a result is. A block that makes cards is a card, else a note. */
export type ResultType = 'page' | 'note' | 'card'
export const RESULT_TYPES: readonly ResultType[] = ['page', 'note', 'card']
const TYPE_OF: Record<SearchEntry['kind'], ResultType> = {
  title: 'page',
  text: 'note',
  card: 'card',
}

/**
 * Card status filter: the card statuses, plus "Got wrong" (7 days) and
 * "Empty" (Cards with no question; they have no other status).
 */
export type StatusFilter = CardStatus | 'wrong' | 'empty'
export const STATUS_FILTERS: readonly StatusFilter[] = [
  'due',
  'new',
  'wrong',
  'later',
  'suspended',
  'empty',
]

export type ChangedFilter = 'any' | 'week' | 'month'
/** 'failed' = cards rated Again most often first (then everything else). */
export type SortOrder = 'best' | 'recent' | 'failed'

export interface SearchFilters {
  notebookId: string | null
  /** A tag: results with it or one of its sub-tags (see tags/tagQuery.ts). */
  tagId: string | null
  status: StatusFilter | null
  changed: ChangedFilter
  /** Include journal days / templates / Trash. */
  journal: boolean
  templates: boolean
  trash: boolean
  sort: SortOrder
}

export const DEFAULT_FILTERS: SearchFilters = {
  notebookId: null,
  tagId: null,
  status: null,
  changed: 'any',
  journal: true,
  templates: true,
  trash: false,
  sort: 'best',
}

export interface SearchQuery {
  text: string
  type: ResultType | 'all'
  filters: SearchFilters
}

export interface SearchHit {
  /** The index entry id (`title:<pageId>` or the block id). */
  id: string
  type: ResultType
  pageId: string
  notebookId: string
  blockId?: string
  score: number
  updatedAt: number
  deleted: boolean
  /** Set when the notebook is the Journal or Templates. */
  place: 'journal' | 'templates' | null
  /** Card results: the most urgent status of the block's cards. */
  status?: CardStatus
  /** Card results: soonest due of the block's cards. */
  due?: number
  /** Card results: every status filter the block matches. */
  statuses?: Set<StatusFilter>
  /** An empty Card (no question): no status, never reviewed. */
  empty?: boolean
  /** Card results, "Most failed" sort only: Again ratings, all time. */
  fails?: number
  /** Its tags, own and inherited, with their parents; unset = none. */
  tags?: Set<string>
  /** The page is locked and not unlocked: only its title shows (with a 🔒). */
  locked?: true
}

export interface SearchOutcome {
  /** True when there was something to search for (words or browsing). */
  active: boolean
  /** Every result passing all filters, in order. */
  hits: SearchHit[]
  /** Results per type, all other filters applied (for the type chips). */
  typeCounts: Record<ResultType | 'all', number>
  /** Results per notebook, all other filters applied. */
  notebookCounts: Map<string, number>
  /** Card results per status, all other filters applied. */
  statusCounts: Map<StatusFilter, number>
  /** Results per tag (a tag counts its sub-tags' results), others applied. */
  tagCounts: Map<string, number>
  /** Matches found only in the Trash while it is not included. */
  trashCount: number
}

const DAY = 24 * 60 * 60 * 1000

/** Above this many keys, reading a whole table is faster than lookups. */
const MANY_KEYS = 300

/** One filter: whether a hit passes it. */
interface SearchFilter {
  id: string
  passes: (hit: SearchHit, query: SearchQuery, now: number) => boolean
}

/**
 * Every filter. Menu counts for one filter apply all the others (so a
 * menu shows what picking each value would give).
 */
const FILTERS: SearchFilter[] = [
  {
    id: 'type',
    passes: (hit, q) => q.type === 'all' || hit.type === q.type,
  },
  {
    id: 'notebook',
    passes: (hit, q) =>
      !q.filters.notebookId || hit.notebookId === q.filters.notebookId,
  },
  {
    id: 'tag',
    passes: (hit, q) => !q.filters.tagId || !!hit.tags?.has(q.filters.tagId),
  },
  {
    id: 'status',
    passes: (hit, q) =>
      !q.filters.status || !!hit.statuses?.has(q.filters.status),
  },
  {
    id: 'changed',
    passes: (hit, q, now) =>
      q.filters.changed === 'any' ||
      hit.updatedAt >= now - (q.filters.changed === 'week' ? 7 : 31) * DAY,
  },
  {
    id: 'place',
    passes: (hit, q) =>
      (hit.place !== 'journal' || q.filters.journal) &&
      (hit.place !== 'templates' || q.filters.templates),
  },
  { id: 'trash', passes: (hit, q) => !hit.deleted || q.filters.trash },
]

const passesAll = (
  hit: SearchHit,
  query: SearchQuery,
  now: number,
  skip?: string,
) => FILTERS.every((f) => f.id === skip || f.passes(hit, query, now))

const noResults = (active: boolean): SearchOutcome => ({
  active,
  hits: [],
  typeCounts: { all: 0, page: 0, note: 0, card: 0 },
  notebookCounts: new Map(),
  statusCounts: new Map(),
  tagCounts: new Map(),
  trashCount: 0,
})

/** Most urgent first: shown when a block makes several cards. */
const STATUS_RANK: CardStatus[] = ['due', 'new', 'later', 'suspended']

/**
 * Runs a search. With no words, a tag can be browsed (everything with it),
 * and so can the Cards type (every card, soonest due first); anything else
 * is an empty search.
 */
export async function runSearch(
  db: LearningNotesDB,
  query: SearchQuery,
  now: number = Date.now(),
): Promise<SearchOutcome> {
  const words = searchWords(query.text)
  const tagId = query.filters.tagId
  const browsing =
    words.length === 0 && (query.type === 'card' || tagId !== null)
  if (words.length === 0 && !browsing) return noResults(false)
  const entries =
    words.length > 0
      ? await findWithTags(db, words)
      : tagId !== null
        ? await entriesByIds(db, await taggedEntryIds(db, tagId))
        : await allCardEntries(db)
  return collect(db, query, entries, browsing && query.type === 'card', now)
}

/** Score of a result found only through its tags (below text matches). */
const TAG_MATCH_SCORE = 50

/**
 * Entries matching every word in their text or in their tags' names
 * ("exam" finds what is tagged #exam; "valve exam" finds a note saying
 * "valve" tagged #exam). A tag word covers the tag's sub-tags too.
 */
async function findWithTags(db: LearningNotesDB, words: string[]) {
  const [textMatches, tags] = await Promise.all([
    findMatches(db, words),
    tagMap(db),
  ])
  const tagWords = [...tags.values()].map((t) => ({
    id: t.id,
    words: searchWords(t.name),
  }))
  // For each word, the tags whose name has a word starting with it.
  const tagsFor = words.map((w) =>
    tagWords
      .filter((t) => t.words.some((x) => x.startsWith(w)))
      .map((t) => t.id),
  )
  if (tagsFor.every((ids) => ids.length === 0)) return textMatches

  const ids = new Set(
    (
      await Promise.all(
        [...new Set(tagsFor.flat())].map((id) => taggedEntryIds(db, id)),
      )
    ).flat(),
  )
  for (const { entry } of textMatches) ids.delete(entry.id)
  if (ids.size === 0) return textMatches
  const more = await entriesByIds(db, [...ids])
  const tagSets = await tagsOf(
    db,
    more.map(({ entry }) => ({ ...entry, type: TYPE_OF[entry.kind] })),
  )
  const found = more.filter(({ entry }) =>
    words.every(
      (w, i) =>
        entry.words.some((x) => x.startsWith(w)) ||
        tagsFor[i].some((id) => tagSets.get(entry.id)?.has(id)),
    ),
  )
  return [
    ...textMatches,
    ...found.map(({ entry }) => ({ entry, score: TAG_MATCH_SCORE })),
  ]
}

/**
 * Results per tag with the usual filters (Trash left out), for the
 * sidebar: each count is what browsing that tag in Search would list.
 */
export async function countTagged(
  db: LearningNotesDB,
  now: number = Date.now(),
): Promise<Map<string, number>> {
  const entries = await entriesByIds(db, await taggedEntryIds(db, null))
  const query = { text: '', type: 'all' as const, filters: DEFAULT_FILTERS }
  return (await collect(db, query, entries, false, now)).tagCounts
}

/** Index entries → results passing the filters, sorted, with counts. */
async function collect(
  db: LearningNotesDB,
  query: SearchQuery,
  entries: { entry: SearchEntry; score: number }[],
  /** Browsing cards: soonest due first. */
  byDue: boolean,
  now: number,
): Promise<SearchOutcome> {
  const notebooks = await db.notebooks.toArray()
  const placeOf = new Map(notebooks.map((n) => [n.id, placeFor(n)]))
  const trashed = await trashedPageIds(db, entries)
  const hits: SearchHit[] = entries.flatMap(({ entry, score }) => {
    // A block deleted on a page that is not in the Trash is gone for good
    // (it can't be restored), so it is never a result.
    if (entry.deleted && !trashed.has(entry.pageId)) return []
    return [
      {
        id: entry.id,
        type: TYPE_OF[entry.kind],
        pageId: entry.pageId,
        notebookId: entry.notebookId,
        blockId: entry.blockId,
        score,
        updatedAt: entry.updatedAt,
        deleted: !!entry.deleted,
        place: placeOf.get(entry.notebookId) ?? null,
        ...(entry.empty && { empty: true }),
      },
    ]
  })
  // Locked pages: their notes and cards never show; their title may.
  const hidden = await hiddenPageIds(db, [
    ...new Set(hits.map((h) => h.pageId)),
  ])
  if (hidden.size > 0) {
    for (let i = hits.length - 1; i >= 0; i--) {
      if (!hidden.has(hits[i].pageId)) continue
      if (hits[i].type === 'page') hits[i].locked = true
      else hits.splice(i, 1)
    }
  }
  await addCardStatus(db, hits, now, query.filters.sort === 'failed')
  const tagSets = await tagsOf(db, hits)
  for (const hit of hits) hit.tags = tagSets.get(hit.id)

  const result = noResults(true)
  for (const hit of hits) {
    if (passesAll(hit, query, now, 'type')) {
      result.typeCounts[hit.type]++
      result.typeCounts.all++
    }
    if (passesAll(hit, query, now, 'notebook')) {
      const n = result.notebookCounts.get(hit.notebookId) ?? 0
      result.notebookCounts.set(hit.notebookId, n + 1)
    }
    if (hit.tags && passesAll(hit, query, now, 'tag')) {
      for (const id of hit.tags) {
        result.tagCounts.set(id, (result.tagCounts.get(id) ?? 0) + 1)
      }
    }
    if (hit.statuses && passesAll(hit, query, now, 'status')) {
      for (const s of hit.statuses) {
        result.statusCounts.set(s, (result.statusCounts.get(s) ?? 0) + 1)
      }
    }
    if (!query.filters.trash && hit.deleted) {
      const withTrash = { ...query, filters: { ...query.filters, trash: true } }
      if (passesAll(hit, withTrash, now)) result.trashCount++
    }
    if (passesAll(hit, query, now)) result.hits.push(hit)
  }
  // Browsing cards: soonest due first; browsing a tag: recently changed.
  result.hits.sort(sorter(query.filters.sort, byDue))
  return result
}

/** The pages, among those of deleted entries, that are in the Trash. */
async function trashedPageIds(
  db: LearningNotesDB,
  entries: { entry: SearchEntry }[],
): Promise<Set<string>> {
  const ids = new Set(
    entries.flatMap(({ entry }) => (entry.deleted ? [entry.pageId] : [])),
  )
  if (ids.size === 0) return ids
  const pages = await db.pages.bulkGet([...ids])
  return new Set(
    pages.flatMap((p) => (p && p.deletedAt !== null ? [p.id] : [])),
  )
}

function placeFor(notebook: Notebook): SearchHit['place'] {
  if (notebook.kind === 'journal') return 'journal'
  if (notebook.kind === 'templates') return 'templates'
  return null
}

function sorter(
  sort: SortOrder,
  browsing: boolean,
): (a: SearchHit, b: SearchHit) => number {
  const recent = (a: SearchHit, b: SearchHit) => b.updatedAt - a.updatedAt
  if (sort === 'recent') return recent
  if (sort === 'failed') {
    // Cards by Again count; results that are not cards come last.
    const then = sorter('best', browsing)
    return (a: SearchHit, b: SearchHit) =>
      (b.fails ?? -1) - (a.fails ?? -1) || then(a, b)
  }
  if (browsing) {
    return (a: SearchHit, b: SearchHit) =>
      (a.due ?? Infinity) - (b.due ?? Infinity) || recent(a, b)
  }
  return (a: SearchHit, b: SearchHit) => b.score - a.score || recent(a, b)
}

/** Browsing all cards: the entries of every block that makes cards. */
async function allCardEntries(db: LearningNotesDB) {
  const blockIds = (await db.cards.orderBy('blockId').uniqueKeys()) as string[]
  return (await entriesByIds(db, blockIds)).filter(
    ({ entry }) => entry.kind === 'card',
  )
}

/** Some entries (missing ones left out), unscored. */
async function entriesByIds(db: LearningNotesDB, ids: string[]) {
  const entries = await db.searchEntries.bulkGet(ids)
  return entries
    .filter((e): e is SearchEntry => !!e)
    .map((entry) => ({ entry, score: 0 }))
}

/**
 * Adds status and due date to card results (one read of their cards), and
 * with `withFails` their Again counts. Empty Cards get only 'empty'.
 */
async function addCardStatus(
  db: LearningNotesDB,
  hits: SearchHit[],
  now: number,
  withFails: boolean,
): Promise<void> {
  for (const hit of hits) {
    if (hit.empty) hit.statuses = new Set(['empty'])
  }
  const cardHits = hits.filter((h) => h.type === 'card' && h.blockId)
  if (cardHits.length === 0) return
  // Many results: one plain read of all cards beats thousands of key
  // lookups (`anyOf`), which IndexedDB does one by one.
  const wanted = new Set(cardHits.map((h) => h.blockId!))
  const [cards, wrong] = await Promise.all([
    wanted.size > MANY_KEYS
      ? db.cards.filter((c) => wanted.has(c.blockId)).toArray()
      : db.cards
          .where('blockId')
          .anyOf([...wanted])
          .toArray(),
    wrongCardIds(db, now),
  ])
  const byBlock = new Map<string, Card[]>()
  for (const card of cards) {
    if (card.deletedAt !== null) continue
    const list = byBlock.get(card.blockId) ?? []
    list.push(card)
    byBlock.set(card.blockId, list)
  }
  const fails = withFails ? await failCounts(db, cards, MANY_KEYS) : null
  for (const hit of cardHits) {
    const list = byBlock.get(hit.blockId!) ?? []
    if (fails) hit.fails = list.reduce((n, c) => n + (fails.get(c.id) ?? 0), 0)
    if (hit.empty) continue // listed, but never reviewed: no status
    const statuses = new Set<StatusFilter>()
    for (const card of list) {
      statuses.add(cardStatus(card, now))
      if (wrong.has(card.id)) statuses.add('wrong')
    }
    hit.statuses = statuses
    hit.status = STATUS_RANK.find((s) => statuses.has(s))
    hit.due = list.length ? Math.min(...list.map((c) => c.due)) : undefined
  }
}

/** What a result row shows. */
export interface HitDetails {
  pageTitle: string
  notebookTitle: string
  /** The block's text (notes and cards); '' for pages. */
  text: string
  /** Its most specific tags' names (see `ownTagNames`). */
  tagNames: string[]
}

/** Titles and text for the results being shown (read only for those). */
export async function describeHits(
  db: LearningNotesDB,
  hits: SearchHit[],
): Promise<Map<string, HitDetails>> {
  const unique = <T>(list: T[]) => [...new Set(list)]
  const blockIds = hits.flatMap((h) => (h.blockId ? [h.blockId] : []))
  const [pages, notebooks, blocks, tags] = await Promise.all([
    db.pages.bulkGet(unique(hits.map((h) => h.pageId))),
    db.notebooks.bulkGet(unique(hits.map((h) => h.notebookId))),
    db.blocks.bulkGet(blockIds),
    hits.some((h) => h.tags) ? tagMap(db) : new Map(),
  ])
  const title = new Map(
    pages.flatMap((p) => (p ? [[p.id, sampleName(p)]] : [])),
  )
  const nbTitle = new Map(
    notebooks.flatMap((n) => (n ? [[n.id, displayName(sampleName(n))]] : [])),
  )
  const text = new Map(
    blocks.flatMap((b) => (b ? [[b.id, blockText(b.content)]] : [])),
  )
  return new Map(
    hits.map((h) => [
      h.id,
      {
        pageTitle: title.get(h.pageId) ?? '',
        notebookTitle: nbTitle.get(h.notebookId) ?? '',
        text: h.blockId ? (text.get(h.blockId) ?? '') : '',
        tagNames: ownTagNames(tags, h.tags),
      },
    ]),
  )
}
