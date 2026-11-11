import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, listBlocks } from '../../core/blockService'
import type { LearningNotesDB } from '../../core/db'
import { newRecordFields } from '../../core/records'
import { createTestDb } from '../../core/testing'
import type { ClaudeInboxItem, InboxOp } from '../../core/types'
import { getOrCreateDefaultWorkspace } from '../../core/workspaceService'
import { listVersions, restoreVersion } from '../../history/versionService'
import { createNotebook } from '../../notebooks/notebookService'
import { createPage, renamePage } from '../../pages/pageService'
import { acceptItem, plainText, previewOps, rejectItem } from './inboxService'

let db: LearningNotesDB
let pageId: string
let notebookId: string
let ids: string[]
const text = (s: string) => ({ text: [{ type: 'text', text: s, styles: {} }] })

beforeEach(async () => {
  db = createTestDb()
  const ws = await getOrCreateDefaultWorkspace(db)
  notebookId = (await createNotebook(db, ws.id, 'NB')).id
  pageId = (await createPage(db, notebookId, null)).id
  await renamePage(db, pageId, 'Cells')
  ids = []
  for (const s of ['one', 'two', 'three'])
    ids.push(
      (await createBlock(db, { pageId, type: 'paragraph', content: text(s) }))
        .id,
    )
})
afterEach(async () => {
  db.close()
  await db.delete()
})

async function put(ops: InboxOp[]): Promise<ClaudeInboxItem> {
  const item: ClaudeInboxItem = {
    ...newRecordFields(),
    pageId,
    notebookId,
    pageTitle: 'Cells',
    baseRevision: 'v1',
    reasons: ['big'],
    status: 'pending',
    batchId: 'batch-1',
    ops,
    stats: { replaced: 1, added: 1, existing: 3 },
  }
  await db.claudeInbox.add(item)
  return item
}
const para = (id: string, s: string, parentId: string | null = null) => ({
  id,
  parentId,
  type: 'paragraph',
  content: text(s),
  order: 'a0',
})

describe('Inbox: preview', () => {
  it('shows the old and new text, the place, and a replaced block that is gone', async () => {
    const item = await put([
      { op: 'replace', targetId: ids[1], blocks: [para(ids[1], 'TWO!')] },
      {
        op: 'insert',
        parentId: null,
        place: { after: ids[0] },
        blocks: [para('n1', 'between')],
      },
      {
        op: 'add',
        parentId: null,
        place: 'end',
        blocks: [para('n2', 'tail'), para('n3', 'child', 'n2')],
      },
      { op: 'replace', targetId: 'missing', blocks: [para('missing', 'x')] },
    ])
    const rows = await previewOps(db, item)
    expect(rows[0]).toMatchObject({
      op: 'replace',
      before: 'two',
      after: 'TWO!',
    })
    expect(rows[1]).toMatchObject({
      after: 'between',
      place: { kind: 'after', text: 'one' },
    })
    expect(rows[2]).toMatchObject({
      after: 'tail',
      more: ['child'],
      place: { kind: 'end' },
    })
    expect(rows[3].gone).toBe(true)
  })

  it('reads text from runs, tables, formulas and mind maps', () => {
    expect(
      plainText({
        text: [
          {
            type: 'link',
            href: 'https://x',
            content: [{ type: 'text', text: 'hi', styles: {} }],
          },
        ],
      }),
    ).toBe('hi')
    expect(plainText({ latex: 'E=mc^2' })).toBe('E=mc^2')
    expect(
      plainText({
        data: JSON.stringify({
          root: 'a',
          nodes: [
            { id: 'a', text: 'Root', parent: null },
            { id: 'b', text: 'Leaf', parent: 'a' },
          ],
        }),
      }),
    ).toBe('Root, Leaf')
    expect(
      plainText({
        text: {
          type: 'tableContent',
          rows: [
            {
              cells: [
                [{ type: 'text', text: 'a' }],
                [{ type: 'text', text: 'b' }],
              ],
            },
          ],
        },
      }),
    ).toBe('a | b')
    expect(plainText(undefined)).toBe('')
  })
})

describe('Inbox: accept and reject', () => {
  it('accept saves the page to History first, then applies, marks AI blocks, and closes the item', async () => {
    const item = await put([
      { op: 'replace', targetId: ids[1], blocks: [para(ids[1], 'TWO!')] },
      {
        op: 'insert',
        parentId: null,
        place: { after: ids[0] },
        blocks: [para('n1', 'between')],
      },
      {
        op: 'add',
        parentId: null,
        place: 'end',
        blocks: [para('n2', 'tail'), para('n3', 'kid', 'n2')],
      },
      {
        op: 'insert',
        parentId: null,
        place: 'start',
        blocks: [para('n4', 'first')],
      },
    ])
    expect(await acceptItem(db, item.id, 5000)).toBe('ok')
    const blocks = await listBlocks(db, pageId)
    const top = blocks.filter((b) => b.parentId === null)
    expect(top.map((b) => plainText(b.content))).toEqual([
      'first',
      'one',
      'between',
      'TWO!',
      'three',
      'tail',
    ])
    expect(blocks.find((b) => b.id === 'n3')!.parentId).toBe('n2')
    // New blocks are AI results; the replaced block the person wrote is not.
    expect(blocks.find((b) => b.id === 'n1')).toMatchObject({
      source: 'ai',
      batchId: 'batch-1',
    })
    expect(blocks.find((b) => b.id === ids[1])!.source).toBeUndefined()
    // The old page is in History, marked as Claude's.
    const versions = await listVersions(db, pageId)
    expect(versions).toHaveLength(1)
    expect(versions[0].reason).toBe('claude')
    expect(versions[0].blocks.map((b) => plainText(b.content))).toEqual([
      'one',
      'two',
      'three',
    ])
    expect((await db.claudeInbox.get(item.id))!).toMatchObject({
      status: 'accepted',
      decidedAt: 5000,
    })
    // And restoring that copy brings the old page back.
    await restoreVersion(db, versions[0].id)
    expect(
      (await listBlocks(db, pageId)).map((b) => plainText(b.content)),
    ).toEqual(['one', 'two', 'three'])
  })

  it('accepting twice changes nothing more', async () => {
    const item = await put([
      { op: 'add', parentId: null, place: 'end', blocks: [para('n1', 'x')] },
    ])
    expect(await acceptItem(db, item.id)).toBe('ok')
    expect(await acceptItem(db, item.id)).toBe('done')
    expect(
      (await listBlocks(db, pageId)).filter((b) => b.id === 'n1'),
    ).toHaveLength(1)
  })

  it('makes recall card records for a new card block', async () => {
    const item = await put([
      {
        op: 'add',
        parentId: null,
        place: 'end',
        blocks: [
          { ...para('q1', 'Why?'), type: 'card' },
          para('a1', 'Because', 'q1'),
        ],
      },
    ])
    await acceptItem(db, item.id)
    const cards = await db.cards.toArray()
    expect(cards.map((c) => [c.blockId, c.part, c.pageId])).toEqual([
      ['q1', 'main', pageId],
    ])
  })

  it('a replaced block that is gone cannot be applied: the page is untouched and the item says why', async () => {
    const item = await put([
      { op: 'replace', targetId: 'missing', blocks: [para('missing', 'x')] },
      { op: 'add', parentId: null, place: 'end', blocks: [para('n1', 'x')] },
    ])
    expect(await acceptItem(db, item.id)).toBe('gone')
    expect(
      (await listBlocks(db, pageId)).map((b) => plainText(b.content)),
    ).toEqual(['one', 'two', 'three'])
    expect(await listVersions(db, pageId)).toHaveLength(0)
    expect((await db.claudeInbox.get(item.id))!).toMatchObject({
      status: 'pending',
      failed: 'gone',
    })
  })

  it('a deleted page cannot be changed', async () => {
    const item = await put([
      { op: 'add', parentId: null, place: 'end', blocks: [para('n1', 'x')] },
    ])
    await db.pages.update(pageId, { deletedAt: 1 })
    expect(await acceptItem(db, item.id)).toBe('pageGone')
    expect(await db.blocks.get('n1')).toBeUndefined()
  })

  it('a parent that is gone puts the new block at the top level', async () => {
    const item = await put([
      {
        op: 'add',
        parentId: 'nope',
        place: 'end',
        blocks: [para('n1', 'x', 'nope')],
      },
    ])
    await acceptItem(db, item.id)
    expect((await db.blocks.get('n1'))!.parentId).toBeNull()
  })

  it('reject closes the item and changes nothing else', async () => {
    const item = await put([
      { op: 'add', parentId: null, place: 'end', blocks: [para('n1', 'x')] },
    ])
    await rejectItem(db, item.id, 9000)
    expect(await db.claudeInbox.get(item.id)).toMatchObject({
      status: 'rejected',
      decidedAt: 9000,
    })
    expect(await db.blocks.get('n1')).toBeUndefined()
    expect(await listVersions(db, pageId)).toHaveLength(0)
    // A decided item cannot be accepted afterwards.
    expect(await acceptItem(db, item.id)).toBe('done')
    expect(await db.blocks.get('n1')).toBeUndefined()
  })
})

describe('History copy made by the server', () => {
  it('restoring a copy marked inkKept leaves the page ink alone', async () => {
    const layer = {
      ...newRecordFields(),
      pageId,
      order: 'a0',
      name: 'Ink',
    }
    await db.inkLayers.add(layer as never)
    await db.pageVersions.add({
      ...newRecordFields(),
      pageId,
      title: 'Cells',
      blocks: [],
      reason: 'claude',
      inkKept: true,
      bytes: 10,
    })
    const v = (await db.pageVersions.toArray())[0]
    await restoreVersion(db, v.id)
    expect((await db.inkLayers.get(layer.id))!.deletedAt).toBeNull()
  })
})
