import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, deleteBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { plainText } from '../editor/mapping'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { ensureTemplates, listTemplates } from '../templates/templateService'
import {
  CARD_BLOCK_TYPE,
  MAIN_PART,
  newCard,
  syncCardRecords,
} from './cardService'
import { queryCards } from './cardQuery'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})

afterEach(async () => {
  await db.delete()
})

/** A page with one Card per question; returns the page id. */
async function pageWithCards(notebook: string, ...questions: string[]) {
  const nb = await createNotebook(db, ws, notebook)
  const page = await createPage(db, nb.id, null, `${notebook} page`)
  const ids: string[] = []
  for (const q of questions) {
    const block = await createBlock(db, {
      pageId: page.id,
      type: CARD_BLOCK_TYPE,
      content: { text: plainText(q) },
    })
    ids.push(block.id)
  }
  await syncCardRecords(db, page.id)
  return ids
}

const questions = async (search?: string) =>
  (await queryCards(db, { search })).hits.map((h) => h.question)

describe('queryCards', () => {
  it('lists every card with its page, notebook and status', async () => {
    await pageWithCards('Biology', 'What is a cell?')
    const [hit] = (await queryCards(db)).hits
    expect(hit).toMatchObject({
      question: 'What is a cell?',
      pageTitle: 'Biology page',
      notebookTitle: 'Biology',
      status: 'new',
    })
  })

  it('search matches all words, ignoring case and accents', async () => {
    await pageWithCards('A', 'Café au lait origin', 'Tea ceremony', '')
    await pageWithCards('B', 'Origin of CAFE culture')
    expect(await questions('cafe origin')).toHaveLength(2)
    expect(await questions('tea')).toEqual(['Tea ceremony'])
    expect(await questions('nothing')).toEqual([])
  })

  it('leaves out deleted, empty and template cards', async () => {
    const [gone] = await pageWithCards('A', 'Gone', 'Kept', '')
    await deleteBlock(db, gone)
    await ensureTemplates(db, ws)
    const tpl = (await listTemplates(db, ws))[0]
    await createBlock(db, {
      pageId: tpl.id,
      type: CARD_BLOCK_TYPE,
      content: { text: plainText('Template card') },
    })
    await syncCardRecords(db, tpl.id)
    expect(await questions()).toEqual(['Kept'])
  })

  it('pages through results with `next`', async () => {
    const many = Array.from({ length: 7 }, (_, i) => `Q${i}`)
    await pageWithCards('A', ...many)
    const seen: string[] = []
    let after: number | null = 0
    while (after !== null) {
      const page = await queryCards(db, {}, { after, limit: 3 })
      seen.push(...page.hits.map((h) => h.question))
      after = page.next
    }
    expect(seen.sort()).toEqual(many)
  })
})

describe('speed', () => {
  it('10,000 cards: first page and a no-match search stay quick', async () => {
    const nb = await createNotebook(db, ws, 'Big')
    const page = await createPage(db, nb.id, null, 'Big page')
    const now = Date.now()
    const blocks = Array.from({ length: 10_000 }, (_, i) => ({
      id: `b${i}`,
      pageId: page.id,
      parentId: null,
      type: CARD_BLOCK_TYPE,
      content: { text: plainText(`Question number ${i}`) },
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

    let started = performance.now()
    expect((await queryCards(db)).hits).toHaveLength(100)
    const firstPage = performance.now() - started

    started = performance.now()
    expect((await queryCards(db, { search: 'zebra' })).hits).toEqual([])
    const fullScan = performance.now() - started

    expect(firstPage).toBeLessThan(1000)
    expect(fullScan).toBeLessThan(5000)
  }, 30_000)
})
