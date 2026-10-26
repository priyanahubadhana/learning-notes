import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { Block, SearchEntry } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { plainText } from '../editor/mapping'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { CARD_BLOCK_TYPE, MAIN_PART, newCard } from '../recall/cardService'
import { DEFAULT_FILTERS, runSearch } from './searchQuery'
import { ensureSearchIndex, searchIndex } from './searchService'
import { searchWords } from './searchText'

/**
 * Speed tests for large collections. Times are for the in-memory test
 * database (slower than a browser's IndexedDB), so limits are generous;
 * they catch a query that turns into a full scan.
 */

let db: LearningNotesDB
const DAY = 24 * 60 * 60 * 1000

beforeEach(() => {
  db = createTestDb()
})

afterEach(async () => {
  await db.delete()
})

/** Common words plus one rare word every 1,000 notes. */
const VOCABULARY = [
  'cell',
  'membrane',
  'protein',
  'energy',
  'heart',
  'valve',
  'blood',
  'neuron',
  'signal',
  'enzyme',
  'muscle',
  'kidney',
  'lung',
  'liver',
]
const noteText = (i: number) =>
  `${VOCABULARY[i % 14]} ${VOCABULARY[(i * 7) % 13]} note ${i}` +
  (i % 1000 === 0 ? ' zygomatic' : '')

async function time<T>(run: () => Promise<T>): Promise<[T, number]> {
  const started = performance.now()
  const result = await run()
  return [result, performance.now() - started]
}

describe('search speed', () => {
  it('10,000 notes: backfill and searches stay quick', async () => {
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const nb = await createNotebook(db, ws, 'Big')
    const page = await createPage(db, nb.id, null, 'Big page')
    const now = Date.now()
    const blocks: Block[] = Array.from({ length: 10_000 }, (_, i) => ({
      id: `b${String(i).padStart(6, '0')}`,
      pageId: page.id,
      parentId: null,
      type: 'paragraph',
      content: { text: plainText(noteText(i)) },
      order: `a${i}`,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }))
    await db.blocks.bulkAdd(blocks) // indexed on save
    expect(await db.searchEntries.count()).toBe(10_001)

    // Backfill from scratch (as after an upgrade).
    await db.searchEntries.clear()
    await db.meta.delete('searchIndex')
    const [, backfill] = await time(() => ensureSearchIndex(db))
    expect(await db.searchEntries.count()).toBe(10_001)

    const [rare, rareTime] = await time(() => searchIndex(db, 'zygo'))
    expect(rare.total).toBe(10)
    const [common, commonTime] = await time(() => searchIndex(db, 'cell'))
    expect(common.total).toBeGreaterThan(500)
    const [two, twoTime] = await time(() => searchIndex(db, 'zygo cell'))
    expect(two.total).toBeGreaterThan(0)
    const [, noneTime] = await time(() => searchIndex(db, 'xylophone'))

    expect(backfill).toBeLessThan(15_000)
    expect(rareTime).toBeLessThan(200)
    expect(commonTime).toBeLessThan(1500)
    expect(twoTime).toBeLessThan(200) // reads only the rare word's entries
    expect(noneTime).toBeLessThan(200)
  }, 60_000)

  it('100,000 entries: rare and multi-word searches stay quick', async () => {
    const entries: SearchEntry[] = Array.from({ length: 100_000 }, (_, i) => ({
      id: `b${i}`,
      kind: 'text',
      pageId: `p${i % 500}`,
      notebookId: 'nb',
      blockId: `b${i}`,
      words: searchWords(noteText(i)),
      updatedAt: i,
    }))
    for (let i = 0; i < entries.length; i += 10_000) {
      await db.searchEntries.bulkAdd(entries.slice(i, i + 10_000))
    }

    const [rare, rareTime] = await time(() => searchIndex(db, 'zygomatic'))
    expect(rare.total).toBe(100)
    const [two, twoTime] = await time(() => searchIndex(db, 'heart zygo'))
    expect(two.matches.every((m) => m.entry.words.includes('heart'))).toBe(true)
    const [, noneTime] = await time(() => searchIndex(db, 'xylophone'))
    const [common, commonTime] = await time(() => searchIndex(db, 'note'))
    expect(common.total).toBe(100_000)
    expect(common.matches).toHaveLength(50)

    expect(rareTime).toBeLessThan(300)
    expect(twoTime).toBeLessThan(300)
    expect(noneTime).toBeLessThan(300)
    // Every entry matches: the worst case. Kept as a guard, not a goal.
    expect(commonTime).toBeLessThan(5000) // ~0.5 s measured
  }, 120_000)

  it('10,000 cards: browsing, card search and filters stay quick', async () => {
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const nb = await createNotebook(db, ws, 'Big')
    const page = await createPage(db, nb.id, null, 'Big page')
    const now = Date.now()
    const blocks: Block[] = Array.from({ length: 10_000 }, (_, i) => ({
      id: `b${String(i).padStart(6, '0')}`,
      pageId: page.id,
      parentId: null,
      type: CARD_BLOCK_TYPE,
      content: { text: plainText(`Question ${noteText(i)}`) },
      order: `a${i}`,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }))
    await db.blocks.bulkAdd(blocks)
    await db.cards.bulkAdd(
      blocks.map((b, i) => ({
        ...newCard(b, nb.id, MAIN_PART, now + i),
        id: `c${i}`,
      })),
    )
    const query = (text: string, more = {}) => ({
      text,
      type: 'card' as const,
      filters: { ...DEFAULT_FILTERS, ...more },
    })

    const [all, browseTime] = await time(() => runSearch(db, query('')))
    expect(all.hits).toHaveLength(10_000)
    const [every, everyTime] = await time(() =>
      runSearch(db, query('question', { status: 'new' })),
    )
    expect(every.hits).toHaveLength(10_000)
    const [rare, rareTime] = await time(() => runSearch(db, query('zygo')))
    expect(rare.hits).toHaveLength(10)

    // Most failed: 50,000 older reviews, every 7th an Again.
    await db.reviewLogs.bulkAdd(
      Array.from({ length: 50_000 }, (_, i) => ({
        id: `r${i}`,
        cardId: `c${(i * 7919) % 10_000}`,
        rating: i % 7 === 0 ? ('again' as const) : ('good' as const),
        createdAt: now - 30 * DAY - i,
        durationMs: 1000,
        kind: 'review' as const,
        scheduler: 'fsrs',
        dueBefore: now,
        dueAfter: now,
        intervalBefore: 1,
        intervalAfter: 1,
        stepAfter: 0,
        isNew: false,
      })),
    )
    const [failed, failedTime] = await time(() =>
      runSearch(db, query('', { sort: 'failed' })),
    )
    expect(failed.hits).toHaveLength(10_000)
    const fails = failed.hits.map((h) => h.fails!)
    expect(fails.reduce((a, b) => a + b, 0)).toBe(Math.ceil(50_000 / 7))
    expect(fails).toEqual([...fails].sort((a, b) => b - a))

    expect(browseTime).toBeLessThan(3000)
    expect(everyTime).toBeLessThan(3000)
    expect(rareTime).toBeLessThan(200)
    expect(failedTime).toBeLessThan(4000)
  }, 60_000)
})
