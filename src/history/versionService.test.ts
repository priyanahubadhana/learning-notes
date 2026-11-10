import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createBlock,
  deleteBlock,
  listBlocks,
  saveBlockChanges,
} from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import {
  createPage,
  deletePage,
  getPage,
  renamePage,
} from '../pages/pageService'
import { CARD_BLOCK_TYPE, syncCardRecords } from '../recall/cardService'
import { purgePage } from '../trash/trashService'
import {
  KEEP_VERSIONS,
  VERSION_GAP_MS,
  listVersions,
  recordVersion,
  restoreVersion,
} from './versionService'

let db: LearningNotesDB
let pageId: string
const T = 1_700_000_000_000

beforeEach(async () => {
  db = createTestDb()
  const ws = await getOrCreateDefaultWorkspace(db)
  const nb = await createNotebook(db, ws.id, 'NB')
  pageId = (await createPage(db, nb.id, null)).id
  await renamePage(db, pageId, 'First title')
})
afterEach(async () => {
  db.close()
  await db.delete()
})

const text = (s: string) => ({ text: [{ type: 'text', text: s, styles: {} }] })

describe('recordVersion', () => {
  it('keeps a copy, skips unchanged pages and young copies', async () => {
    await createBlock(db, { pageId, type: 'paragraph', content: text('a') })
    expect(await recordVersion(db, pageId, { now: T })).not.toBeNull()
    // Nothing changed: no copy, even when forced.
    expect(
      await recordVersion(db, pageId, {
        now: T + 10 * VERSION_GAP_MS,
        force: true,
      }),
    ).toBeNull()

    await createBlock(db, { pageId, type: 'paragraph', content: text('b') })
    // Changed, but the newest copy is young.
    expect(await recordVersion(db, pageId, { now: T + 1000 })).toBeNull()
    expect(
      await recordVersion(db, pageId, { now: T + 1000, force: true }),
    ).not.toBeNull()
    expect(await listVersions(db, pageId)).toHaveLength(2)
    await createBlock(db, { pageId, type: 'paragraph', content: text('c') })
    expect(
      await recordVersion(db, pageId, { now: T + 1000 + VERSION_GAP_MS }),
    ).not.toBeNull()
  })

  it('keeps every copy of the last 2 hours, then thins by the hour', async () => {
    expect(KEEP_VERSIONS).toBe(300)
    for (let i = 0; i < 90; i++) {
      await createBlock(db, {
        pageId,
        type: 'paragraph',
        content: text(`n${i}`),
      })
      await recordVersion(db, pageId, { now: T + i * VERSION_GAP_MS })
    }
    const versions = await listVersions(db, pageId)
    const newestAt = T + 89 * VERSION_GAP_MS
    const recent = versions.filter((v) => newestAt - v.createdAt <= 2 * 3600e3)
    expect(recent).toHaveLength(61) // 2 h at one per 2 minutes
    expect(versions[0].createdAt).toBe(newestAt)
    // Older than 2 h: at most one per hour.
    const hours = versions
      .filter((v) => newestAt - v.createdAt > 2 * 3600e3)
      .map((v) => Math.floor(v.createdAt / 3600e3))
    expect(new Set(hours).size).toBe(hours.length)
  })

  it('takes a copy soon after a big change', async () => {
    await createBlock(db, { pageId, type: 'paragraph', content: text('a') })
    await recordVersion(db, pageId, { now: T })
    for (let i = 0; i < 8; i++)
      await createBlock(db, {
        pageId,
        type: 'paragraph',
        content: text(`x${i}`),
      })
    // 30 s later: past the big-change gap, well inside the normal one.
    const v = await recordVersion(db, pageId, { now: T + 30_000 })
    expect(v?.reason).toBe('big')
  })
})

describe('restoreVersion', () => {
  it('brings back blocks and title, and can itself be undone', async () => {
    const a = await createBlock(db, {
      pageId,
      type: 'paragraph',
      content: text('a'),
    })
    const old = (await recordVersion(db, pageId, { now: T }))!
    await deleteBlock(db, a.id)
    await createBlock(db, { pageId, type: 'paragraph', content: text('new') })
    await renamePage(db, pageId, 'Second title')

    await restoreVersion(db, old.id)
    const blocks = await listBlocks(db, pageId)
    expect(blocks.map((b) => b.id)).toEqual([a.id]) // 'new' is gone, 'a' is back
    expect((await getPage(db, pageId))?.title).toBe('First title')

    // What the page was before the restore is kept: restoring it undoes this.
    const [newest] = await listVersions(db, pageId)
    expect(newest.title).toBe('Second title')
    await restoreVersion(db, newest.id)
    expect((await listBlocks(db, pageId)).map((b) => b.content)).toEqual([
      text('new'),
    ])
  })

  it('gives a restored Card block its review record again', async () => {
    const card = await createBlock(db, {
      pageId,
      type: CARD_BLOCK_TYPE,
      content: text('Q?'),
    })
    await syncCardRecords(db, pageId)
    const old = (await recordVersion(db, pageId, { now: T }))!
    await deleteBlock(db, card.id)
    await syncCardRecords(db, pageId)
    await restoreVersion(db, old.id)
    const cards = await db.cards.where('blockId').equals(card.id).toArray()
    expect(cards.filter((c) => c.deletedAt === null)).toHaveLength(1)
  })
})

describe('restoreVersion keeps the whole page', () => {
  it('brings back the boxes, the box of a block and the paper style', async () => {
    await db.pages.update(pageId, {
      boxes: [{ id: 'bx1', x: 20, y: 30, w: 80 }],
      inkBg: 'grid',
    })
    const a = await createBlock(db, {
      pageId,
      type: 'paragraph',
      content: text('in box'),
    })
    await db.blocks.update(a.id, { boxId: 'bx1' })
    const old = (await recordVersion(db, pageId, { now: T }))!
    // The stray change: box removed, block back in the main box, paper changed.
    await db.pages.update(pageId, { boxes: undefined, inkBg: undefined })
    await db.blocks.update(a.id, { boxId: undefined })
    await restoreVersion(db, old.id)
    const page = await getPage(db, pageId)
    expect(page?.boxes).toEqual([{ id: 'bx1', x: 20, y: 30, w: 80 }])
    expect(page?.inkBg).toBe('grid')
    expect((await listBlocks(db, pageId))[0].boxId).toBe('bx1')
  })
})

describe('Delete forever', () => {
  it('erases the page’s copies', async () => {
    await createBlock(db, { pageId, type: 'paragraph', content: text('a') })
    await recordVersion(db, pageId, { now: T })
    await deletePage(db, pageId)
    await purgePage(db, pageId)
    expect(await db.pageVersions.count()).toBe(0)
  })
})

describe('speed', () => {
  it('copies a page with 10,000 notes; restores one with 2,000', async () => {
    const rows = Array.from({ length: 10_000 }, (_, i) => ({
      id: `b${i}`,
      parentId: null,
      type: 'paragraph',
      content: text(`note ${i}`),
      order: `a${String(i).padStart(6, '0')}`,
    }))
    await saveBlockChanges(db, pageId, { upserts: rows, deletes: [] })
    const start = performance.now()
    await recordVersion(db, pageId, { now: T })
    const recorded = performance.now() - start
    expect(recorded).toBeLessThan(3000)
  }, 30_000)

  it('restores a page with 2,000 notes', async () => {
    const rows = Array.from({ length: 2000 }, (_, i) => ({
      id: `c${i}`,
      parentId: null,
      type: 'paragraph',
      content: text(`note ${i}`),
      order: `a${String(i).padStart(6, '0')}`,
    }))
    await saveBlockChanges(db, pageId, { upserts: rows, deletes: [] })
    const v = (await recordVersion(db, pageId, { now: T }))!
    await saveBlockChanges(db, pageId, {
      upserts: [],
      deletes: rows.slice(0, 100).map((r) => r.id),
    })
    const start = performance.now()
    await restoreVersion(db, v.id)
    const restored = performance.now() - start
    expect(await listBlocks(db, pageId)).toHaveLength(2000)
    expect(restored).toBeLessThan(10_000)
  }, 30_000)
})
