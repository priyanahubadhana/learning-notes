import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock } from '../../../core/blockService'
import type { LearningNotesDB } from '../../../core/db'
import { createTestDb } from '../../../core/testing'
import { getOrCreateDefaultWorkspace } from '../../../core/workspaceService'
import { createNotebook } from '../../../notebooks/notebookService'
import {
  createPage,
  listChildPages,
  listPages,
} from '../../../pages/pageService'
import { syncCardRecords } from '../../../recall/cardService'
import {
  applyMoves,
  duplicatePages,
  extractPages,
  restorePages,
  trashPages,
  undoExtract,
} from './pageOrganiseService'
import { flattenPages, planDuplicate, planShift } from './pageOrganise'

let db: LearningNotesDB
let nb: string

beforeEach(async () => {
  db = createTestDb()
  const ws = await getOrCreateDefaultWorkspace(db)
  nb = (await createNotebook(db, ws.id)).id
})
afterEach(async () => {
  await db.delete()
})

const titles = async (parentId: string | null = null) =>
  (await listChildPages(db, nb, parentId)).map((p) => p.title)

describe('moves', () => {
  it('Move later steps a page past its neighbour; Undo puts it back', async () => {
    const a = await createPage(db, nb, null, 'A')
    await createPage(db, nb, null, 'B')
    await createPage(db, nb, null, 'C')
    const rows = flattenPages(await listPages(db, nb))
    const plan = planShift(rows, new Set([a.id]), 1)
    await applyMoves(db, plan.ops)
    expect(await titles()).toEqual(['B', 'A', 'C'])
    await applyMoves(db, plan.undo)
    expect(await titles()).toEqual(['A', 'B', 'C'])
  })
})

describe('Trash', () => {
  it('moves pages (with sub-pages) to Trash and Undo brings them back', async () => {
    const a = await createPage(db, nb, null, 'A')
    await createPage(db, nb, a.id, 'A1')
    const b = await createPage(db, nb, null, 'B')
    await createPage(db, nb, null, 'C')
    await trashPages(db, [a.id, b.id])
    expect((await listPages(db, nb)).map((p) => p.title)).toEqual(['C'])
    await restorePages(db, [a.id, b.id])
    expect((await listPages(db, nb)).map((p) => p.title).sort()).toEqual([
      'A',
      'A1',
      'B',
      'C',
    ])
  })
})

describe('Duplicate', () => {
  it('copies text, sub-pages and cards right after the original', async () => {
    const a = await createPage(db, nb, null, 'A')
    await createPage(db, nb, a.id, 'A1')
    await createPage(db, nb, null, 'B')
    await createBlock(db, {
      pageId: a.id,
      type: 'paragraph',
      content: { text: [{ type: 'text', text: 'hello', styles: {} }] },
    })
    await createBlock(db, {
      pageId: a.id,
      type: 'card',
      content: { text: [{ type: 'text', text: 'Q?', styles: {} }] },
    })
    await syncCardRecords(db, a.id)
    const rows = flattenPages(await listPages(db, nb))
    const made = await duplicatePages(
      db,
      planDuplicate(rows, new Set([a.id])),
      (p) => `${p.title} copy`,
    )
    expect(made).toHaveLength(1)
    expect(await titles()).toEqual(['A', 'A copy', 'B'])
    expect(await titles(made[0])).toEqual(['A1'])
    const blocks = await db.blocks.where('pageId').equals(made[0]).toArray()
    expect(blocks.map((b) => b.type).sort()).toEqual(['card', 'paragraph'])
    // The copy's card is its own, the original keeps its card.
    const cards = await db.cards.toArray()
    expect(cards).toHaveLength(2)
    expect(new Set(cards.map((c) => c.blockId)).size).toBe(2)
    expect(cards.map((c) => c.pageId).sort()).toEqual([a.id, made[0]].sort())
  })
})

describe('Extract', () => {
  it('moves pages to a new notebook with their cards; Undo moves them back', async () => {
    const a = await createPage(db, nb, null, 'A')
    await createPage(db, nb, null, 'B')
    await createBlock(db, { pageId: a.id, type: 'card', content: { text: [] } })
    await syncCardRecords(db, a.id)
    const { notebookId, undo } = await extractPages(db, [a.id], {
      kind: 'new',
      title: 'Split',
    })
    expect(notebookId).not.toBe(nb)
    expect(await titles()).toEqual(['B'])
    expect((await db.pages.get(a.id))?.notebookId).toBe(notebookId)
    expect((await db.cards.toArray())[0].notebookId).toBe(notebookId)
    await undoExtract(db, undo)
    expect(await titles()).toEqual(['A', 'B'])
    expect((await db.cards.toArray())[0].notebookId).toBe(nb)
    expect((await db.notebooks.get(notebookId))?.deletedAt).not.toBeNull()
  })

  it('refuses a locked notebook', async () => {
    const a = await createPage(db, nb, null, 'A')
    const ws = await getOrCreateDefaultWorkspace(db)
    const other = await createNotebook(db, ws.id, 'Other')
    await db.notebooks.update(other.id, { locked: true })
    await expect(
      extractPages(db, [a.id], { kind: 'existing', notebookId: other.id }),
    ).rejects.toThrow('locked')
  })
})
