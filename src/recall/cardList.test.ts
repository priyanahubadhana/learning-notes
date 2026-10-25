import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBlock, deleteBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { JsonValue } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { plainText } from '../editor/mapping'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { dueLabel, listCardRows } from './cardList'
import { CARD_BLOCK_TYPE, maskedText, syncCardRecords } from './cardService'

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

describe('empty cards', () => {
  it('a Card with no question is not listed', async () => {
    const page = await createPage(db, notebookId, null, 'P')
    await addCard(page.id, '')
    await addCard(page.id, 'Real question')
    await syncCardRecords(db, page.id)
    expect(
      (await listCardRows(db, page.id, false)).map((r) => r.question),
    ).toEqual(['Real question'])
  })
})

describe('dueLabel', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })
  const now = Date.UTC(2026, 9, 26, 12)
  const min = 60_000
  const day = 24 * 60 * min

  it('says how long until a card is due within a week', () => {
    expect(dueLabel(now + 10 * min, now)).toBe('in 10 minutes')
    expect(dueLabel(now + 3 * 60 * min, now)).toBe('in 3 hours')
    expect(dueLabel(now + day, now)).toBe('tomorrow')
    expect(dueLabel(now + 3 * day, now)).toBe('in 3 days')
  })

  it('shows a short date from a week on, with the year only if different', () => {
    vi.stubGlobal('navigator', { languages: ['en-US'] })
    expect(dueLabel(now + 10 * day, now)).toBe('Nov 5')
    expect(dueLabel(Date.UTC(2027, 0, 15, 12), now)).toBe('Jan 15, 2027')
  })

  it('dates follow the region of the user', () => {
    vi.stubGlobal('navigator', { languages: ['en-IN'] })
    expect(dueLabel(now + 10 * day, now)).toBe('5 Nov')
    vi.stubGlobal('navigator', { languages: ['en-GB'] })
    expect(dueLabel(Date.UTC(2027, 0, 15, 12), now)).toBe('15 Jan 2027')
  })
})
