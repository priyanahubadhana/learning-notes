import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { recordVersion, restoreVersion } from '../history/versionService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { checkedRow } from '../share/checkRows'
import { writeFullFile } from '../share/fullFile'
import { readFullFile } from '../share/readFull'
import { canReplaceFrom, replaceWithFile } from '../share/restore'
import { deletePage } from '../pages/pageService'
import { purgePage } from '../trash/trashService'
import { createBlock } from './blockService'
import { LearningNotesDB } from './db'
import {
  inkSnapshot,
  loadInk,
  pageHasInk,
  purgeInkOf,
  saveInk,
} from './inkService'
import type { InkChunk, InkLayer, Stroke } from './inkTypes'
import { createId } from './ids'
import { createTestDb } from './testing'
import { getOrCreateDefaultWorkspace } from './workspaceService'

const T = 1_700_000_000_000
const base = { createdAt: T, updatedAt: T, deletedAt: null }
const layer = (pageId: string, id = createId()): InkLayer => ({
  ...base,
  id,
  pageId,
  name: 'Layer 1',
  order: 'a0',
})
const stroke = (id = createId()): Stroke => ({
  id,
  at: T,
  kind: 'ink',
  bw: 800,
  style: {
    pen: 'fountain',
    width: 3,
    colour: '#1d1d1f',
    opacity: 1,
    sharpness: 50,
    pressure: 60,
    flatness: 20,
    stabilisation: 30,
    tilt: true,
    speedWidth: false,
    line: 'solid',
    behind: false,
  },
  pts: [0.1, 0.2, 0.5, 0, 0, 0, 0.2, 0.25, 0.6, 1, 2, 8],
})
const chunk = (
  pageId: string,
  layerId: string,
  strokes: Stroke[],
): InkChunk => ({
  ...base,
  id: createId(),
  pageId,
  layerId,
  blockId: 'b1',
  strokes,
})

const opened: LearningNotesDB[] = []
const names: string[] = []
afterEach(async () => {
  for (const d of opened.splice(0)) d.close()
  for (const n of names.splice(0)) await Dexie.delete(n)
})
async function fresh() {
  const d = createTestDb()
  await d.open()
  opened.push(d)
  return d
}
async function withPage(d: LearningNotesDB) {
  const ws = (await getOrCreateDefaultWorkspace(d)).id
  const nb = await createNotebook(d, ws, 'Bio')
  const page = await createPage(d, nb.id, null, 'P')
  await createBlock(d, { pageId: page.id, type: 'paragraph', content: {} })
  return { nb, page }
}

describe('ink storage', () => {
  it('saves and loads the layers and chunks by page', async () => {
    const d = await fresh()
    const { page } = await withPage(d)
    const l = layer(page.id)
    const c = chunk(page.id, l.id, [stroke(), stroke()])
    await saveInk(d, [l], [c, chunk('other', 'x', [stroke()])])
    expect(await pageHasInk(d, page.id)).toBe(true)
    expect(await pageHasInk(d, 'nothing')).toBe(false)
    const got = await loadInk(d, page.id)
    expect(got.layers).toEqual([l])
    expect(got.chunks).toEqual([c])
    // Rows are only written for pages that have ink.
    expect(await d.inkChunks.count()).toBe(2)
  })

  it('opening a version 12 database adds the ink tables and keeps every row', async () => {
    const name = `v12-${createId()}`
    names.push(name)
    const old = new Dexie(name)
    old.version(12).stores({ notebooks: 'id, workspaceId', images: 'id' })
    await old
      .table('notebooks')
      .add({ id: 'n1', title: 'Old', workspaceId: 'w' })
    old.close()
    const d = new LearningNotesDB(name)
    await d.open()
    opened.push(d)
    expect(d.verno).toBe(14)
    expect((await d.notebooks.get('n1'))?.title).toBe('Old')
    expect(await d.inkChunks.count()).toBe(0)
    expect(await d.inkLayers.count()).toBe(0)
  })

  it('history copies include the ink, and restoring brings it back', async () => {
    const d = await fresh()
    const { page } = await withPage(d)
    const l = layer(page.id)
    await saveInk(d, [l], [chunk(page.id, l.id, [stroke('s1')])])
    const v = await recordVersion(d, page.id, { force: true })
    expect(v?.ink?.chunks[0].strokes[0].id).toBe('s1')
    // Ink changes alone make a new copy.
    await saveInk(
      d,
      [],
      [
        {
          ...(await d.inkChunks.toArray())[0],
          strokes: [stroke('s1'), stroke('s2')],
        },
      ],
    )
    const v2 = await recordVersion(d, page.id, { force: true })
    expect(v2?.ink?.chunks[0].strokes).toHaveLength(2)
    await restoreVersion(d, v!.id)
    const live = (await inkSnapshot(d, page.id))!
    expect(live.chunks[0].strokes.map((s) => s.id)).toEqual(['s1'])
  })

  it('Delete forever erases the strokes and keeps an empty marker', async () => {
    const d = await fresh()
    const { page } = await withPage(d)
    const l = layer(page.id)
    const c = chunk(page.id, l.id, [stroke()])
    await saveInk(d, [l], [c])
    await deletePage(d, page.id)
    expect((await d.inkChunks.get(c.id))?.strokes).toHaveLength(1) // Trash keeps it
    await purgePage(d, page.id)
    const row = await d.inkChunks.get(c.id)
    expect(row?.strokes).toEqual([])
    expect(row?.purgedAt).toBeTypeOf('number')
    expect((await d.inkLayers.get(l.id))?.name).toBe('')
    await purgeInkOf(d, [page.id], T) // again: nothing more to do
  })
})

describe('ink in backups', () => {
  it('full and notes-only files carry the ink, and Replace puts it back', async () => {
    const src = await fresh()
    const { page } = await withPage(src)
    const l = layer(page.id)
    const c = chunk(page.id, l.id, [stroke('s1')])
    await saveInk(src, [l], [c])
    for (const kind of ['full', 'notes'] as const) {
      const file = await writeFullFile(src, kind)
      const target = await fresh()
      const parsed = await readFullFile(file, target)
      expect(parsed.manifest.tables.inkChunks).toBe(1)
      await replaceWithFile(target, parsed, { saveSafety: async () => {} })
      expect(await target.inkChunks.get(c.id)).toEqual(c)
      expect(await target.inkLayers.get(l.id)).toEqual(l)
    }
  })

  it('a file from before ink (version 12) can still replace the notes', async () => {
    expect(canReplaceFrom(12, 13)).toBe(true)
    expect(canReplaceFrom(13, 13)).toBe(true)
    expect(canReplaceFrom(11, 13)).toBe(false)
    const src = await fresh()
    await withPage(src)
    const file = await writeFullFile(src, 'full')
    const target = await fresh()
    const parsed = await readFullFile(file, target)
    // Make it look like a version 12 file (no ink tables in it).
    delete parsed.tables.inkChunks
    delete parsed.tables.inkLayers
    parsed.manifest.dbVersion = 12
    await replaceWithFile(target, parsed, { saveSafety: async () => {} })
    expect(await target.inkChunks.count()).toBe(0)
    expect(await target.notebooks.count()).toBeGreaterThan(0)
  })

  it('damaged ink rows in a file are refused', () => {
    const good = {
      ...base,
      id: 'c',
      pageId: 'p',
      layerId: 'l',
      blockId: null,
      strokes: [stroke()],
    }
    expect(checkedRow('inkChunks', good)).not.toBeNull()
    const odd = { ...good, strokes: [{ ...stroke(), pts: [1, 2, 3] }] }
    expect(checkedRow('inkChunks', odd)).toBeNull()
    expect(
      checkedRow('inkChunks', {
        ...good,
        strokes: [{ ...stroke(), pts: ['x', 1, 1, 1, 1, 1] }],
      }),
    ).toBeNull()
    expect(
      checkedRow('inkLayers', {
        ...base,
        id: 'l',
        pageId: 'p',
        name: 'x',
        order: 'a0',
        hidden: true,
      }),
    ).not.toBeNull()
    expect(
      checkedRow('inkLayers', {
        ...base,
        id: 'l',
        pageId: 'p',
        name: 'x',
        order: 'a0',
        hidden: false,
      }),
    ).toBeNull()
  })
})
