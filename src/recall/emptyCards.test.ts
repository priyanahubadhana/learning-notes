import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, inReadingOrder, listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { plainText, toPlainText } from '../editor/mapping'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import {
  DEFAULT_FILTERS,
  runSearch,
  type SearchQuery,
} from '../search/searchQuery'
import { CARD_BLOCK_TYPE, syncCardRecords } from './cardService'
import { removeEmptyCards, restoreEmptyCards } from './emptyCards'
import { rateCard } from './reviewService'

let db: LearningNotesDB
let pageId: string

beforeEach(async () => {
  db = createTestDb()
  const ws = (await getOrCreateDefaultWorkspace(db)).id
  const nb = (await createNotebook(db, ws, 'Biology')).id
  pageId = (await createPage(db, nb, null, 'Cells')).id
})

afterEach(async () => {
  await db.delete()
})

const add = async (
  type: string,
  text: string,
  parentId: string | null = null,
) => {
  const block = await createBlock(db, {
    pageId,
    type,
    parentId,
    content: { text: plainText(text) },
  })
  await syncCardRecords(db, pageId)
  return block
}

/** The page as "text" lines, indented by depth. */
const outline = async () => {
  const blocks = inReadingOrder(await listBlocks(db, pageId))
  const depth = (id: string | null): number => {
    const parent = blocks.find((b) => b.id === id)
    return parent ? 1 + depth(parent.parentId) : 0
  }
  return blocks.map(
    (b) =>
      '  '.repeat(depth(b.parentId)) +
      (b.type === CARD_BLOCK_TYPE ? 'Card: ' : '') +
      toPlainText(b.content),
  )
}

const cards: SearchQuery = { text: '', type: 'card', filters: DEFAULT_FILTERS }

describe('empty cards', () => {
  it('are listed in Search as Empty, never as due or new', async () => {
    const empty = await add(CARD_BLOCK_TYPE, '')
    const full = await add(CARD_BLOCK_TYPE, 'What is ATP?')

    const all = await runSearch(db, cards)
    const hit = all.hits.find((h) => h.id === empty.id)!
    expect(hit.empty).toBe(true)
    expect(hit.status).toBeUndefined()
    expect([...hit.statuses!]).toEqual(['empty'])
    expect(all.statusCounts.get('empty')).toBe(1)
    expect(all.statusCounts.get('new')).toBe(1)

    const only = await runSearch(db, {
      ...cards,
      filters: { ...DEFAULT_FILTERS, status: 'empty' },
    })
    expect(only.hits.map((h) => h.id)).toEqual([empty.id])
    expect(all.hits.some((h) => h.id === full.id)).toBe(true)
  })

  it('removing keeps the answer lines in place, and Undo puts it back', async () => {
    await add('paragraph', 'Intro')
    const empty = await add(CARD_BLOCK_TYPE, '')
    await add('paragraph', 'Answer one', empty.id)
    const inner = await add(CARD_BLOCK_TYPE, '', empty.id)
    await add('paragraph', 'Inner answer', inner.id)
    await add('paragraph', 'Outro')
    const before = await outline()

    const removed = await removeEmptyCards(db, [empty.id, inner.id])
    expect(removed.count).toBe(2)
    expect(removed.pageIds).toEqual([pageId])
    expect(await outline()).toEqual([
      'Intro',
      'Answer one',
      'Inner answer',
      'Outro',
    ])
    const left = await runSearch(db, cards)
    expect(left.hits.some((h) => h.empty)).toBe(false)

    await restoreEmptyCards(db, removed)
    expect(await outline()).toEqual(before)
  })

  it('skips cards that got a question meanwhile', async () => {
    const full = await add(CARD_BLOCK_TYPE, 'Now has a question')
    const removed = await removeEmptyCards(db, [full.id])
    expect(removed.count).toBe(0)
    expect(await outline()).toEqual(['Card: Now has a question'])
  })
})

describe('Most failed sort', () => {
  it('orders cards by Again count, all time; other results last', async () => {
    const once = await add(CARD_BLOCK_TYPE, 'Heart valve one')
    const twice = await add(CARD_BLOCK_TYPE, 'Heart valve two')
    const never = await add(CARD_BLOCK_TYPE, 'Heart valve three')
    const note = await add('paragraph', 'Heart valve note')
    const cardOf = async (blockId: string) =>
      (await db.cards.where('blockId').equals(blockId).first())!.id
    const now = Date.now()
    await rateCard(db, await cardOf(once.id), 'again', { durationMs: 1, now })
    for (const n of [0, 1]) {
      await rateCard(db, await cardOf(twice.id), 'again', {
        durationMs: 1,
        now: now + n * 1000,
      })
    }

    const result = await runSearch(db, {
      text: 'valve',
      type: 'all',
      filters: { ...DEFAULT_FILTERS, sort: 'failed' },
    })
    expect(result.hits.map((h) => h.id)).toEqual([
      twice.id,
      once.id,
      never.id,
      note.id,
    ])
    expect(result.hits.map((h) => h.fails)).toEqual([2, 1, 0, undefined])
  })
})
