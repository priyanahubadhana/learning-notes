import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, deleteBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { plainText } from '../editor/mapping'
import { createNotebook } from '../notebooks/notebookService'
import { createPage, deletePage } from '../pages/pageService'
import { CARD_BLOCK_TYPE, syncCardRecords } from '../recall/cardService'
import { rateCard, suspendCard } from '../recall/reviewService'
import { highlightParts, snippet } from './highlight'
import {
  DEFAULT_FILTERS,
  describeHits,
  runSearch,
  type SearchQuery,
} from './searchQuery'
import { titleEntryId } from './searchText'

let db: LearningNotesDB
let ws: string
let bio: string
let chem: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
  bio = (await createNotebook(db, ws, 'Biology')).id
  chem = (await createNotebook(db, ws, 'Chemistry')).id
})

afterEach(async () => {
  await db.delete()
})

const paragraph = (pageId: string, text: string) =>
  createBlock(db, {
    pageId,
    type: 'paragraph',
    content: { text: plainText(text) },
  })

const card = async (pageId: string, question: string) => {
  const block = await createBlock(db, {
    pageId,
    type: CARD_BLOCK_TYPE,
    content: { text: plainText(question) },
  })
  await syncCardRecords(db, pageId)
  return block
}

const query = (
  text: string,
  more: Partial<Omit<SearchQuery, 'filters'>> & {
    filters?: Partial<SearchQuery['filters']>
  } = {},
): SearchQuery => ({
  text,
  type: more.type ?? 'all',
  filters: { ...DEFAULT_FILTERS, ...more.filters },
})

const ids = async (q: SearchQuery) =>
  (await runSearch(db, q)).hits.map((h) => h.id)

describe('runSearch', () => {
  it('finds pages, notes and cards, with counts per type', async () => {
    const page = await createPage(db, bio, null, 'Cell energy')
    const note = await paragraph(page.id, 'Mitochondria make energy')
    const q = await card(page.id, 'What makes energy?')

    const result = await runSearch(db, query('energy'))
    expect(result.active).toBe(true)
    expect(result.hits.map((h) => h.id)).toEqual([
      titleEntryId(page.id),
      q.id,
      note.id,
    ])
    expect(result.typeCounts).toEqual({ all: 3, page: 1, note: 1, card: 1 })
    expect(await ids(query('energy', { type: 'card' }))).toEqual([q.id])
    // Type counts ignore the type picked, so every chip shows its number.
    const cardsOnly = await runSearch(db, query('energy', { type: 'card' }))
    expect(cardsOnly.typeCounts.all).toBe(3)
  })

  it('text with no letters or digits is an empty search', async () => {
    const result = await runSearch(db, query(' [] '))
    expect(result.active).toBe(false)
    expect(result.hits).toEqual([])
  })

  it('filters by notebook; notebook counts ignore the notebook filter', async () => {
    const a = await createPage(db, bio, null, 'Osmosis')
    const b = await createPage(db, chem, null, 'Osmosis in solutions')
    const result = await runSearch(
      db,
      query('osmosis', { filters: { notebookId: chem } }),
    )
    expect(result.hits.map((h) => h.id)).toEqual([titleEntryId(b.id)])
    expect(result.notebookCounts.get(bio)).toBe(1)
    expect(result.notebookCounts.get(chem)).toBe(1)
    expect(a).toBeTruthy()
  })

  it('card status: new, due, suspended, got wrong', async () => {
    const page = await createPage(db, bio, null, 'Cards')
    const fresh = await card(page.id, 'Krebs cycle one')
    const wrong = await card(page.id, 'Krebs cycle two')
    const paused = await card(page.id, 'Krebs cycle three')
    const now = Date.now()
    const wrongCard = (await db.cards
      .where('blockId')
      .equals(wrong.id)
      .first())!
    await rateCard(db, wrongCard.id, 'again', { durationMs: 1000, now })
    const pausedCard = (await db.cards
      .where('blockId')
      .equals(paused.id)
      .first())!
    await suspendCard(db, pausedCard.id, now)

    const later = now + 60 * 60 * 1000 // the Again card is due again by then
    const all = await runSearch(db, query('krebs'), later)
    const byId = new Map(all.hits.map((h) => [h.id, h]))
    expect(byId.get(fresh.id)?.status).toBe('new')
    expect(byId.get(wrong.id)?.status).toBe('due')
    expect(byId.get(paused.id)?.status).toBe('suspended')
    expect(all.statusCounts.get('wrong')).toBe(1)
    expect(all.statusCounts.get('new')).toBe(1)

    const wrongOnly = await runSearch(
      db,
      query('krebs', { filters: { status: 'wrong' } }),
      later,
    )
    expect(wrongOnly.hits.map((h) => h.id)).toEqual([wrong.id])
  })

  it('leaves out Trash, journal and templates when asked; counts Trash matches', async () => {
    const page = await createPage(db, bio, null, 'Enzymes')
    const trashed = await createPage(db, bio, null, 'Old notes')
    const inTrash = await paragraph(trashed.id, 'Enzymes speed reactions')
    await deletePage(db, trashed.id)
    // A block deleted on a live page can't be restored: never a result.
    const gone = await paragraph(page.id, 'Enzymes are proteins')
    await deleteBlock(db, gone.id)

    const result = await runSearch(db, query('enzymes'))
    expect(result.hits.map((h) => h.id)).toEqual([titleEntryId(page.id)])
    expect(result.trashCount).toBe(1)
    const withTrash = await ids(query('enzymes', { filters: { trash: true } }))
    expect(withTrash).toContain(inTrash.id)
    expect(withTrash).not.toContain(gone.id)

    const journal = await createNotebook(db, ws, 'Journal', 'journal')
    const day = await createPage(db, journal.id, null, 'Enzymes day')
    expect(await ids(query('enzymes'))).toContain(titleEntryId(day.id))
    expect(
      await ids(query('enzymes', { filters: { journal: false } })),
    ).not.toContain(titleEntryId(day.id))
  })

  it('changed filter and Recently changed sort', async () => {
    const page = await createPage(db, bio, null, 'Photosynthesis')
    const note = await paragraph(page.id, 'Photosynthesis needs light')
    await db.searchEntries.update(titleEntryId(page.id), {
      updatedAt: Date.now() - 40 * 24 * 60 * 60 * 1000,
    })
    expect(
      await ids(query('photosynthesis', { filters: { changed: 'month' } })),
    ).toEqual([note.id])
    expect(
      await ids(query('photosynthesis', { filters: { sort: 'recent' } })),
    ).toEqual([note.id, titleEntryId(page.id)])
  })

  it('with no words, the Cards type lists every card, soonest due first', async () => {
    const page = await createPage(db, bio, null, 'Deck')
    const first = await card(page.id, 'First question')
    const second = await card(page.id, 'Second question')
    await paragraph(page.id, 'Just a note')
    await db.cards
      .where('blockId')
      .equals(first.id)
      .modify({ due: Date.now() + 1000 })
    const result = await runSearch(db, query('', { type: 'card' }))
    expect(result.active).toBe(true)
    expect(result.hits.map((h) => h.id)).toEqual([second.id, first.id])
    // Other types need words.
    expect((await runSearch(db, query(''))).active).toBe(false)
  })

  it('describeHits reads titles and block text for shown results', async () => {
    const page = await createPage(db, bio, null, 'Cell')
    const note = await paragraph(page.id, 'The nucleus holds DNA')
    const { hits } = await runSearch(db, query('nucleus'))
    const details = await describeHits(db, hits)
    expect(details.get(note.id)).toEqual({
      pageTitle: 'Cell',
      notebookTitle: 'Biology',
      text: 'The nucleus holds DNA',
    })
  })
})

describe('highlight', () => {
  it('marks word starts, ignoring case and accents', () => {
    expect(highlightParts('Café au lait, cafeteria', 'cafe')).toEqual([
      { text: 'Café', match: true },
      { text: ' au lait, ', match: false },
      { text: 'cafe', match: true },
      { text: 'teria', match: false },
    ])
    expect(highlightParts('decaf', 'caf')).toEqual([
      { text: 'decaf', match: false },
    ])
  })

  it('snippet: short text whole; long text around the first match', () => {
    expect(snippet('Short  text', 'x')).toBe('Short text')
    const long = `${'word '.repeat(60)}target ${'tail '.repeat(60)}`
    const s = snippet(long, 'target', 80)
    expect(s.startsWith('…')).toBe(true)
    expect(s.endsWith('…')).toBe(true)
    expect(s).toContain('target')
    expect(s.length).toBeLessThanOrEqual(82)
  })
})
