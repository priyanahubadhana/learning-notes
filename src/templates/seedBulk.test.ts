import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { STARTER_VERSION, starterTemplates } from './starterTemplates'
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

/** Makes the Templates notebook look like one seeded by an older version. */
async function rewindTo(version: number): Promise<string> {
  const nb = await ensureTemplates(db, ws)
  const roots = (
    await db.pages.where('notebookId').equals(nb.id).toArray()
  ).filter((p) => p.parentId === null)
  const newer = new Set(
    starterTemplates()
      .filter((s) => (s.since ?? 1) > version)
      .map((s) => s.title),
  )
  let drop = roots.filter((p) => newer.has(p.title)).map((p) => p.id)
  const all = await db.pages.where('notebookId').equals(nb.id).toArray()
  for (let grew = true; grew;) {
    grew = false
    for (const p of all) {
      if (p.parentId && drop.includes(p.parentId) && !drop.includes(p.id)) {
        drop = [...drop, p.id]
        grew = true
      }
    }
  }
  await db.blocks.where('pageId').anyOf(drop).delete()
  await db.pages.bulkDelete(drop)
  await db.notebooks.update(nb.id, { starterVersion: version })
  return nb.id
}

async function rootTitles(nbId: string): Promise<string[]> {
  return (await db.pages.where('notebookId').equals(nbId).toArray())
    .filter((p) => p.parentId === null)
    .map((p) => p.title)
    .sort()
}

describe('starter upgrade (perf-start gate 2)', () => {
  const allTitles = starterTemplates()
    .map((s) => s.title)
    .sort()

  it.each([1, 2])(
    'a notebook seeded by starter version %i gets only the newer starters, no doubles',
    async (version) => {
      const nbId = await rewindTo(version)
      const before = await rootTitles(nbId)
      const newer = starterTemplates().filter((s) => (s.since ?? 1) > version)
      expect(newer.length).toBeGreaterThan(0)
      expect(before.length).toBe(allTitles.length - newer.length)
      const pageBulk = vi.spyOn(db.pages, 'bulkAdd')
      const nb = await ensureTemplates(db, ws)
      expect(pageBulk).toHaveBeenCalledTimes(newer.length)
      expect(nb.starterVersion).toBe(STARTER_VERSION)
      expect(await rootTitles(nbId)).toEqual(allTitles)
      await ensureTemplates(db, ws)
      expect(await rootTitles(nbId)).toEqual(allTitles)
    },
  )

  it.each([0, 2])(
    'a starter the user trashed is never added again (notebook at version %i)',
    async (version) => {
      const nb = await ensureTemplates(db, ws)
      const roots = (
        await db.pages.where('notebookId').equals(nb.id).toArray()
      ).filter((p) => p.parentId === null)
      const trashed = [
        starterTemplates()[0].title,
        starterTemplates().find((s) => (s.since ?? 1) > 2)!.title,
      ]
      for (const p of roots.filter((r) => trashed.includes(r.title))) {
        await db.pages.update(p.id, { deletedAt: Date.now() })
      }
      await db.notebooks.update(nb.id, { starterVersion: version })
      const count = await db.pages.count()
      await ensureTemplates(db, ws)
      await ensureTemplates(db, ws)
      expect(await db.pages.count()).toBe(count)
      const live = (await db.pages.where('notebookId').equals(nb.id).toArray())
        .filter((p) => p.parentId === null && p.deletedAt === null)
        .map((p) => p.title)
      for (const t of trashed) expect(live).not.toContain(t)
    },
  )
})
