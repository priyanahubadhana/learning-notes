import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock, listBlocks, updateBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { listVersions } from '../history/versionService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { memoryConnectors as mem } from './connectors'
import { createMasterKey, type MasterKey } from './crypto'
import { setTracking } from './device'
import { clearClash, excerptOf } from './clash'
import { enqueueChanged, syncOnce } from './engine'
import { mergeRecord } from './merge'
import { SYNC_TABLES } from './tables'

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

async function samplePage(db: LearningNotesDB, line: string) {
  const ws = await getOrCreateDefaultWorkspace(db)
  const nb = await createNotebook(db, ws.id, 'Biology')
  const page = await createPage(db, nb.id, null, 'Cells')
  const block = await createBlock(db, {
    pageId: page.id,
    type: 'paragraph',
    content: text(line),
  })
  return { ws, nb, page, block }
}

describe('sync engine (L7)', () => {
  it('lists every database table with a sync rule', () => {
    const names = a.tables.map((t) => t.name).sort()
    expect(names.filter((n) => !(n in SYNC_TABLES))).toEqual([])
  })

  it('moves notes from one device to another, encrypted on the way', async () => {
    const conn = mem()
    const { block } = await samplePage(a, 'Mitochondria')
    await syncOnce(a, conn, master)
    expect(JSON.stringify(conn.state)).not.toContain('Mitochondria')
    expect(JSON.stringify(conn.state)).not.toContain('Biology')

    const report = await syncOnce(b, conn, master)
    expect(report.unreadable).toBe(0)
    const got = await b.blocks.get(block.id)
    expect(got?.content).toEqual(text('Mitochondria'))
    // Pulled records are not sent back as new changes.
    expect(await b.syncState.where('dirty').equals(1).count()).toBe(0)
  })

  it('never removes notes a device already had (first sign-in)', async () => {
    const conn = mem()
    await samplePage(a, 'From A')
    await syncOnce(a, conn, master)
    const own = await samplePage(b, 'From B')
    await enqueueChanged(b)
    await syncOnce(b, conn, master)
    expect((await b.blocks.get(own.block.id))?.content).toEqual(text('From B'))
    expect(await b.blocks.count()).toBe(2)
    await syncOnce(a, conn, master)
    expect(await a.blocks.count()).toBe(2)
    // The same fixed workspace id on both devices: one workspace.
    expect(await a.workspaces.count()).toBe(1)
  })

  it('same block edited on two devices: newest wins, the other text is in History', async () => {
    const conn = mem()
    const { block, page } = await samplePage(a, 'v0')
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)

    await updateBlock(a, block.id, { content: text('from A') })
    await new Promise((r) => setTimeout(r, 5))
    await updateBlock(b, block.id, { content: text('from B (later)') })

    await syncOnce(a, conn, master)
    const rb = await syncOnce(b, conn, master)
    expect(rb.conflicts + rb.mergedPages.length).toBeGreaterThan(0)
    await syncOnce(a, conn, master)

    expect((await a.blocks.get(block.id))?.content).toEqual(
      text('from B (later)'),
    )
    expect((await b.blocks.get(block.id))?.content).toEqual(
      text('from B (later)'),
    )
    // A's losing text was kept in a History copy on one of the devices.
    const versions = [
      ...(await listVersions(a, page.id)),
      ...(await listVersions(b, page.id)),
    ]
    expect(JSON.stringify(versions)).toContain('from A')
  })

  it.each([
    ['the second device wins', 'from A', 'from B (later)'],
    ['the first device wins', 'from A (later)', 'from B'],
  ])(
    'a clash (%s): both devices keep the other version in History, show the same mark, and the choice clears it everywhere',
    async (_name, textA, textB) => {
      const conn = mem()
      const { block, page } = await samplePage(a, 'v0')
      await syncOnce(a, conn, master)
      await syncOnce(b, conn, master)

      const aFirst = textA === 'from A'
      const [first, firstText, second, secondText] = aFirst
        ? [a, textA, b, textB]
        : [b, textB, a, textA]
      await updateBlock(first, block.id, { content: text(firstText) })
      await new Promise((r) => setTimeout(r, 5))
      await updateBlock(second, block.id, { content: text(secondText) })
      // The device that wrote last in time has the newer clock.
      const winner = aFirst ? textB : textA
      const loser = aFirst ? textA : textB

      await syncOnce(a, conn, master)
      await syncOnce(b, conn, master)
      await syncOnce(a, conn, master)
      await syncOnce(b, conn, master)

      for (const db of [a, b]) {
        const row = await db.blocks.get(block.id)
        expect(row?.content).toEqual(text(winner))
        expect(row?.clash?.content).toEqual(text(loser))
        // The other version is in this device's History.
        expect(JSON.stringify(await listVersions(db, page.id))).toContain(loser)
      }

      // The choice (here: Keep mine on A) reaches B.
      await clearClash(a, block.id)
      await syncOnce(a, conn, master)
      await syncOnce(b, conn, master)
      expect((await a.blocks.get(block.id))?.clash).toBeUndefined()
      expect((await b.blocks.get(block.id))?.clash).toBeUndefined()
      expect((await b.blocks.get(block.id))?.content).toEqual(text(winner))
    },
  )

  it('a keystroke saved while a pulled batch is being merged is not lost', async () => {
    const conn = mem()
    const { block } = await samplePage(a, 'v0')
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    await updateBlock(a, block.id, { content: text('from A') })
    await syncOnce(a, conn, master)
    // B types right while its sync runs; the edit must still be sent.
    const racing = syncOnce(b, conn, master)
    await updateBlock(b, block.id, { content: text('B typed') })
    await racing
    await syncOnce(b, conn, master)
    await syncOnce(a, conn, master)
    const mine = (await b.blocks.get(block.id))?.content
    expect((await a.blocks.get(block.id))?.content).toEqual(mine)
  })

  it('excerptOf shows plain text from block content', () => {
    expect(
      excerptOf({ text: [{ type: 'text', text: 'Hello ' }, 'world'] }),
    ).toBe('Hello world')
    expect(excerptOf({ text: 'x'.repeat(100) }, 10)).toHaveLength(10)
  })

  it('edits made while signed out are sent later', async () => {
    const conn = mem()
    const { block } = await samplePage(a, 'one')
    await syncOnce(a, conn, master)
    setTracking(false)
    await updateBlock(a, block.id, { content: text('offline edit') })
    setTracking(true)
    await new Promise((r) => setTimeout(r, 2))
    expect(await enqueueChanged(a)).toBeGreaterThan(0)
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    expect((await b.blocks.get(block.id))?.content).toEqual(
      text('offline edit'),
    )
  })

  it('skips records locked with another key and keeps going', async () => {
    const conn = mem()
    await samplePage(a, 'secret')
    await syncOnce(a, conn, master)
    const other = await createMasterKey()
    const r = await syncOnce(b, conn, other)
    expect(r.unreadable).toBeGreaterThan(0)
    expect(await b.blocks.count()).toBe(0)
  })

  it('moves picture bytes through the file store', async () => {
    const conn = mem()
    const id = crypto.randomUUID()
    const now = Date.now()
    await a.images.add({
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      name: 'cell.png',
      type: 'image/png',
      width: 1,
      height: 1,
      data: new Uint8Array([9, 8, 7]).buffer,
    })
    const ra = await syncOnce(a, conn, master)
    expect(ra.filesUp).toBe(1)
    expect(Object.keys(conn.state.files)).toHaveLength(1)
    const rb = await syncOnce(b, conn, master)
    expect(rb.filesDown).toBe(1)
    const img = await b.images.get(id)
    expect([...new Uint8Array(img!.data)]).toEqual([9, 8, 7])
  })

  it('a refused save (someone saved first) is merged, not lost', async () => {
    const conn = mem()
    const { block } = await samplePage(a, 'base')
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    await updateBlock(b, block.id, { content: text('B wins first') })
    await syncOnce(b, conn, master)
    await updateBlock(a, block.id, { content: text('A later') })
    await syncOnce(a, conn, master)
    await syncOnce(b, conn, master)
    const blocksA = await listBlocks(a, block.pageId)
    const blocksB = await listBlocks(b, block.pageId)
    expect(blocksA.map((x) => x.content)).toEqual(blocksB.map((x) => x.content))
  })
})

describe('merge rules (L7)', () => {
  const v = (x: Record<string, unknown>) => ({ deletedAt: null, ...x })
  it('takes a record that is new here', () => {
    expect(
      mergeRecord('record', undefined, { value: v({}), hlc: '1' }),
    ).toEqual({
      action: 'take',
    })
  })
  it('Delete forever always wins', () => {
    const local = { value: v({ text: 'x' }), hlc: '9', dirty: true }
    expect(
      mergeRecord('record', local, { value: v({ purgedAt: 1 }), hlc: '1' })
        .action,
    ).toBe('take')
    expect(
      mergeRecord(
        'record',
        { value: v({ purgedAt: 1 }), hlc: '1', dirty: false },
        { value: v({ text: 'y' }), hlc: '9' },
      ).action,
    ).toBe('keep')
  })
  it('review logs are only added', () => {
    expect(
      mergeRecord(
        'append',
        { value: v({}), hlc: '1', dirty: false },
        { value: v({ x: 1 }), hlc: '2' },
      ).action,
    ).toBe('keep')
  })
  it('no change here: the pulled copy wins', () => {
    expect(
      mergeRecord(
        'record',
        { value: v({ t: 1 }), hlc: '9', dirty: false },
        { value: v({ t: 2 }), hlc: '1' },
      ).action,
    ).toBe('take')
  })
  it('true conflict: newer clock wins; blocks keep the loser', () => {
    const r = mergeRecord(
      'blocks',
      { value: v({ content: 'a' }), hlc: '2', dirty: true },
      { value: v({ content: 'b' }), hlc: '1' },
    )
    expect(r).toEqual({ action: 'keep', loser: v({ content: 'b' }) })
    const moved = mergeRecord(
      'blocks',
      { value: v({ content: 'a', order: 'a1' }), hlc: '1', dirty: true },
      { value: v({ content: 'a', order: 'a2' }), hlc: '2' },
    )
    expect(moved).toEqual({ action: 'take' })
  })
})
