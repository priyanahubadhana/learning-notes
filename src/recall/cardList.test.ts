import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, deleteBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { JsonValue } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { plainText } from '../editor/mapping'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { listCardRows, maskedText } from './cardList'
import { CARD_BLOCK_TYPE, syncCardRecords } from './cardService'

let db: LearningNotesDB
let notebookId: string

beforeEach(async () => {
  db = createTestDb()
  const ws = await getOrCreateDefaultWorkspace(db)
  notebookId = (await createNotebook(db, ws.id, 'Biology')).id
})

afterEach(async () => {
  await db.delete()
})

/** "The [cell] has a [nucleus]" with two blanks. */
const withBlanks: JsonValue = [
  { type: 'text', text: 'The ', styles: {} },
  { type: 'text', text: 'cell', styles: { blank: 'b1' } },
  { type: 'text', text: ' has a ', styles: {} },
  { type: 'text', text: 'nucleus', styles: { blank: 'b2', bold: true } },
]

const addCard = (pageId: string, question: string, parentId?: string) =>
  createBlock(db, {
    pageId,
    type: CARD_BLOCK_TYPE,
    parentId: parentId ?? null,
    content: { text: plainText(question) },
  })

describe('maskedText', () => {
  it('hides only the chosen blank', () => {
    expect(maskedText(withBlanks, 'b1')).toBe('The … has a nucleus')
    expect(maskedText(withBlanks, 'b2')).toBe('The cell has a …')
    expect(maskedText(withBlanks)).toBe('The cell has a nucleus')
  })

  it('reads text inside links, one "…" for a split blank', () => {
    const runs: JsonValue = [
      { type: 'text', text: 'a', styles: { blank: 'x' } },
      { type: 'text', text: 'b', styles: { blank: 'x', italic: true } },
      {
        type: 'link',
        href: 'h',
        content: [{ type: 'text', text: ' link', styles: {} }],
      },
    ]
    expect(maskedText(runs, 'x')).toBe('… link')
  })
})

describe('listCardRows', () => {
  it('lists cards and blanks in reading order with status', async () => {
    const page = await createPage(db, notebookId, null, 'Cells')
    const first = await addCard(page.id, 'What is a cell?')
    await createBlock(db, {
      pageId: page.id,
      type: 'paragraph',
      content: { text: withBlanks },
    })
    await syncCardRecords(db, page.id)

    // Mark the Card as reviewed and due tomorrow.
    const now = Date.now()
    await db.cards
      .where('blockId')
      .equals(first.id)
      .modify({ reps: 1, due: now + 86_400_000 })

    const rows = await listCardRows(db, page.id, false, now)
    expect(rows.map((r) => [r.question, r.status, r.pageTitle])).toEqual([
      ['What is a cell?', 'later', null],
      ['The … has a nucleus', 'new', null],
      ['The cell has a …', 'new', null],
    ])
  })

  it('includes sub-pages only when asked, labelled with their title', async () => {
    const page = await createPage(db, notebookId, null, 'Topic')
    const sub = await createPage(db, notebookId, page.id, 'Part 1')
    const deeper = await createPage(db, notebookId, sub.id, 'Part 1a')
    await addCard(page.id, 'top')
    await addCard(sub.id, 'sub')
    await addCard(deeper.id, 'deeper')
    for (const p of [page, sub, deeper]) await syncCardRecords(db, p.id)

    expect(
      (await listCardRows(db, page.id, false)).map((r) => r.question),
    ).toEqual(['top'])
    const all = await listCardRows(db, page.id, true)
    expect(all.map((r) => [r.question, r.pageTitle])).toEqual([
      ['top', null],
      ['sub', 'Part 1'],
      ['deeper', 'Part 1a'],
    ])
  })

  it('leaves out cards whose block was deleted; shows suspended', async () => {
    const page = await createPage(db, notebookId, null, 'P')
    const gone = await addCard(page.id, 'gone')
    const kept = await addCard(page.id, 'kept')
    await syncCardRecords(db, page.id)
    await deleteBlock(db, gone.id)
    await db.cards.where('blockId').equals(kept.id).modify({ suspendedAt: 1 })

    const rows = await listCardRows(db, page.id, false)
    expect(rows.map((r) => [r.question, r.status])).toEqual([
      ['kept', 'suspended'],
    ])
  })

  it('a card nested in a list comes right after its parent', async () => {
    const page = await createPage(db, notebookId, null, 'P')
    const item = await createBlock(db, {
      pageId: page.id,
      type: 'bulletListItem',
      content: { text: plainText('item') },
    })
    await addCard(page.id, 'nested', item.id)
    await addCard(page.id, 'after')
    await syncCardRecords(db, page.id)
    expect(
      (await listCardRows(db, page.id, false)).map((r) => r.question),
    ).toEqual(['nested', 'after'])
  })
})
