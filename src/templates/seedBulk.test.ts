import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { ensureTemplates } from './templateService'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})

afterEach(async () => {
  vi.restoreAllMocks()
  await db.delete()
})

describe('starter seeding is bulk (perf-start)', () => {
  it('writes each starter with one bulk write per table, never one write per record', async () => {
    const pageAdd = vi.spyOn(db.pages, 'add')
    const blockAdd = vi.spyOn(db.blocks, 'add')
    const pageBulk = vi.spyOn(db.pages, 'bulkAdd')
    const blockBulk = vi.spyOn(db.blocks, 'bulkAdd')
    const nb = await ensureTemplates(db, ws)
    expect(pageAdd).not.toHaveBeenCalled()
    expect(blockAdd).not.toHaveBeenCalled()
    const roots = await db.pages
      .where('notebookId')
      .equals(nb.id)
      .filter((p) => p.parentId === null)
      .count()
    expect(pageBulk).toHaveBeenCalledTimes(roots)
    expect(blockBulk).toHaveBeenCalledTimes(roots)
    const pages = await db.pages.where('notebookId').equals(nb.id).count()
    const blocks = await db.blocks.count()
    expect(pages).toBeGreaterThan(10)
    expect(blocks).toBeGreaterThan(100)
  })

  it('is idempotent: a second run writes nothing and changes nothing', async () => {
    await ensureTemplates(db, ws)
    const pages = await db.pages.count()
    const blocks = await db.blocks.count()
    const pageBulk = vi.spyOn(db.pages, 'bulkAdd')
    const blockBulk = vi.spyOn(db.blocks, 'bulkAdd')
    await ensureTemplates(db, ws)
    expect(pageBulk).not.toHaveBeenCalled()
    expect(blockBulk).not.toHaveBeenCalled()
    expect(await db.pages.count()).toBe(pages)
    expect(await db.blocks.count()).toBe(blocks)
  })

  it('a run cut short is finished by the next run, with no doubles', async () => {
    const full = createTestDb()
    const fullWs = (await getOrCreateDefaultWorkspace(full)).id
    await ensureTemplates(full, fullWs)
    const want = await full.pages.count()
    const wantBlocks = await full.blocks.count()
    await full.delete()

    const real = db.pages.bulkAdd.bind(db.pages)
    let calls = 0
    vi.spyOn(db.pages, 'bulkAdd').mockImplementation(((
      ...args: Parameters<typeof real>
    ) => {
      if (++calls === 5) return Promise.reject(new Error('cut short'))
      return real(...args)
    }) as never)
    await expect(ensureTemplates(db, ws)).rejects.toThrow('cut short')
    vi.restoreAllMocks()
    expect(await db.pages.count()).toBeLessThan(want)
    await ensureTemplates(db, ws)
    await ensureTemplates(db, ws)
    expect(await db.pages.count()).toBe(want)
    expect(await db.blocks.count()).toBe(wantBlocks)
  })

  it('keeps every block inside its page, parents on the same page, sibling orders unique', async () => {
    await ensureTemplates(db, ws)
    const pageIds = new Set((await db.pages.toArray()).map((p) => p.id))
    const blocks = await db.blocks.toArray()
    const byId = new Map(blocks.map((b) => [b.id, b]))
    for (const b of blocks) {
      expect(pageIds.has(b.pageId)).toBe(true)
      if (b.parentId) expect(byId.get(b.parentId)?.pageId).toBe(b.pageId)
    }
    const seen = new Set<string>()
    for (const b of blocks) {
      const key = `${b.pageId}|${b.parentId}|${b.order}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })
})
