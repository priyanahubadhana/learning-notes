import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, updateBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { listVersions } from '../history/versionService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { memoryConnectors as mem } from './connectors'
import { createMasterKey, type MasterKey } from './crypto'
import { setTracking } from './device'
import { measureDivergence } from './divergence'
import { syncOnce } from './engine'
import { mergeRecord } from './merge'

describe('the three choices after signing back in', () => {
  let master: MasterKey
  let a: LearningNotesDB
  let b: LearningNotesDB
  const text = (s: string) => ({ text: s })
  beforeEach(async () => {
    setTracking(true)
    master = await createMasterKey()
    a = createTestDb()
    b = createTestDb()
  })
  afterEach(() => setTracking(false))

  /** A and B share a page; A edits offline (unsent), B edits and syncs. */
  async function twoSides() {
    const conn = mem()
    const ws = await getOrCreateDefaultWorkspace(a)
    const nb = await createNotebook(a, ws.id, 'Biology')
    const page = await createPage(a, nb.id, null, 'Cells')
    const block = await createBlock(a, {
      pageId: page.id,
      type: 'paragraph',
      content: text('v0'),
    })
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    // B changes the cloud; A edits and cannot send (signed out).
    await updateBlock(b, block.id, { content: text('from cloud') })
    await syncOnce(b, conn, master)
    await new Promise((r) => setTimeout(r, 5))
    await updateBlock(a, block.id, { content: text('from here') })
    return { conn, block, page }
  }

  it('counts pages changed here and there, and nothing when nothing is unsent', async () => {
    const { conn } = await twoSides()
    const d = await measureDivergence(a, conn, master)
    expect(d.pagesHere).toBe(1)
    expect(d.pagesThere).toBe(1)
    expect(d.itemsHere).toBeGreaterThan(0)
    // B has nothing unsent: no dialog is needed there.
    expect((await measureDivergence(b, conn, master)).itemsHere).toBe(0)
  })

  it('merge both (default): the normal clash, both texts kept', async () => {
    const { conn, block, page } = await twoSides()
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    await syncOnce(a, conn, master)
    const row = await a.blocks.get(block.id)
    const all = JSON.stringify([row, await listVersions(a, page.id)])
    expect(all).toContain('from cloud')
    expect(all).toContain('from here')
    expect(row?.clash).toBeTruthy() // "Keep mine / Use other / Keep both"
  })

  it("use this device's version: it wins, the cloud text is in History, no clash mark", async () => {
    const { conn, block, page } = await twoSides()
    const d = await measureDivergence(a, conn, master)
    await syncOnce(a, conn, master, undefined, {
      prefer: 'here',
      ids: new Set(d.dirtyIds),
    })
    await syncOnce(b, conn, master)
    for (const db of [a, b]) {
      const row = await db.blocks.get(block.id)
      expect(row?.content).toEqual(text('from here'))
      expect(row?.clash).toBeUndefined()
    }
    expect(JSON.stringify(await listVersions(a, page.id))).toContain(
      'from cloud',
    )
  })

  it('use the cloud version: it wins, this device text is in History, no clash mark', async () => {
    const { conn, block, page } = await twoSides()
    const d = await measureDivergence(a, conn, master)
    await syncOnce(a, conn, master, undefined, {
      prefer: 'there',
      ids: new Set(d.dirtyIds),
    })
    await syncOnce(b, conn, master)
    for (const db of [a, b]) {
      const row = await db.blocks.get(block.id)
      expect(row?.content).toEqual(text('from cloud'))
      expect(row?.clash).toBeUndefined()
    }
    expect(JSON.stringify(await listVersions(a, page.id))).toContain(
      'from here',
    )
  })

  it('a record only here is kept whatever the choice (nothing is deleted)', async () => {
    const { conn } = await twoSides()
    const ws = await getOrCreateDefaultWorkspace(a)
    const nb = await createNotebook(a, ws.id, 'Only here')
    const d = await measureDivergence(a, conn, master)
    await syncOnce(a, conn, master, undefined, {
      prefer: 'there',
      ids: new Set(d.dirtyIds),
    })
    expect((await a.notebooks.get(nb.id))?.deletedAt ?? null).toBeNull()
    await syncOnce(b, conn, master)
    expect(await b.notebooks.get(nb.id)).toBeTruthy()
  })

  it('merge rule: a chosen side beats the clock either way', () => {
    const local = {
      value: { id: 'x', deletedAt: null, content: 'L' },
      hlc: '9',
      dirty: true,
    }
    const remote = {
      value: { id: 'x', deletedAt: null, content: 'R' },
      hlc: '1',
    }
    expect(mergeRecord('blocks', local, remote).action).toBe('keep')
    expect(mergeRecord('blocks', local, remote, 'there').action).toBe('take')
    const newer = { ...remote, hlc: '99' }
    expect(mergeRecord('blocks', local, newer).action).toBe('take')
    expect(mergeRecord('blocks', local, newer, 'here').action).toBe('keep')
  })
})
