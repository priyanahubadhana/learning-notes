import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createBlock } from '../core/blockService'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { isLive } from '../core/records'
import { plainText } from '../editor/mapping'
import { listNotebooks } from '../notebooks/notebookService'
import { BundleError } from '../share/bundle'
import {
  exportLayerFile,
  installLayer,
  installOf,
  listInstalls,
  planRemoval,
  removeLayer,
  shareManifest,
} from './layerService'
import { checkManifest, readLayerFile } from './manifest'
import { STARTER_IDS, buildStarter } from './packs'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})

afterEach(async () => {
  await db.delete()
})

const liveNotebooks = async () =>
  (await listNotebooks(db, ws)).filter((n) => !n.kind)

describe('layer manifest', () => {
  const good = {
    id: 'finance-tracker',
    version: 1,
    name: 'Finance',
    description: 'x',
    adds: ['a'],
  }
  it('accepts a good manifest', () => {
    expect(checkManifest(good).id).toBe('finance-tracker')
  })
  it('refuses bad ids, versions and oversized text', () => {
    for (const bad of [
      { ...good, id: 'Bad Id' },
      { ...good, id: '' },
      { ...good, version: 0 },
      { ...good, version: 1.5 },
      { ...good, name: '' },
      { ...good, name: 'x'.repeat(81) },
      { ...good, description: 'x'.repeat(401) },
      { ...good, adds: Array(13).fill('a') },
      { ...good, adds: [3] },
      null,
      'text',
    ]) {
      expect(() => checkManifest(bad)).toThrow(BundleError)
    }
  })
  it('refuses a file that is not a layer', () => {
    expect(() => readLayerFile('{"app":"learning-notes"}')).toThrow(BundleError)
    expect(() => readLayerFile('nope')).toThrow(BundleError)
  })
})

describe('starter layers', () => {
  it.each(STARTER_IDS)(
    '%s builds, adds with its own names, and has content',
    async (id) => {
      const file = await buildStarter(id)
      expect(file.manifest.id).toBe(id)
      expect(file.bundle.notebooks).toHaveLength(1)
      const install = await installLayer(db, ws, file)
      const notebooks = await liveNotebooks()
      expect(notebooks).toHaveLength(1)
      // Its own name, not "Copy of …".
      expect(notebooks[0].title).toBe(file.bundle.notebooks[0].title)
      expect(notebooks[0].title.startsWith('Copy')).toBe(false)
      expect(install.createdIds.some((i) => i.table === 'pages')).toBe(true)
      expect((await db.pages.toArray()).filter(isLive).length).toBeGreaterThan(
        1,
      )
    },
  )

  it('the finance tracker adds a database with rows', async () => {
    await installLayer(db, ws, await buildStarter('finance-tracker'))
    const databases = (await db.databases.toArray()).filter(isLive)
    expect(databases.map((d) => d.title)).toContain('Transactions')
    const rows = (await db.pages.toArray()).filter(
      (p) => isLive(p) && p.databaseId,
    )
    expect(rows).toHaveLength(3)
  })

  it('cannot be added twice, and can be added again after removing', async () => {
    const file = await buildStarter('study-kit')
    const install = await installLayer(db, ws, file)
    await expect(installLayer(db, ws, file)).rejects.toThrow(BundleError)
    await removeLayer(db, install.id)
    expect(await installOf(db, 'study-kit')).toBeUndefined()
    await installLayer(db, ws, file)
    expect(await installOf(db, 'study-kit')).toBeDefined()
  })

  it('leaves no scratch database behind', async () => {
    await buildStarter('memory-kit')
    const names = await (
      indexedDB as unknown as { databases: () => Promise<{ name?: string }[]> }
    ).databases()
    expect(names.filter((d) => d.name?.startsWith('layer-scratch'))).toEqual([])
  })
})

describe('removing a layer', () => {
  it('removes everything you never changed (into the Trash)', async () => {
    const install = await installLayer(
      db,
      ws,
      await buildStarter('finance-tracker'),
    )
    const plan = await planRemoval(db, install)
    expect(plan.changed).toEqual([])
    expect(plan.untouched).toBeGreaterThan(3)
    await removeLayer(db, install.id)
    expect(await liveNotebooks()).toHaveLength(0)
    expect((await db.pages.toArray()).filter(isLive)).toHaveLength(0)
    expect((await db.databases.toArray()).filter(isLive)).toHaveLength(0)
    // Soft deleted, so the Trash can restore it.
    expect((await db.notebooks.toArray()).some((n) => !isLive(n))).toBe(true)
    expect(await listInstalls(db)).toHaveLength(0)
  })

  it('keeps a page you changed, and the notebook that holds it', async () => {
    const install = await installLayer(db, ws, await buildStarter('study-kit'))
    const cornell = (await db.pages.toArray()).find(
      (p) => p.title === 'Cornell notes',
    )!
    await createBlock(db, {
      pageId: cornell.id,
      type: 'paragraph',
      content: { text: plainText('My own words about enzymes') },
    })
    const plan = await planRemoval(db, install)
    expect(plan.changed).toContain('Cornell notes')
    await removeLayer(db, install.id)
    const live = (await db.pages.toArray()).filter(isLive)
    expect(live.map((p) => p.title)).toEqual(['Cornell notes'])
    // The notebook stays because it still holds your page.
    expect(await liveNotebooks()).toHaveLength(1)
    // Your text is still there.
    const blocks = (
      await db.blocks.where('pageId').equals(cornell.id).toArray()
    ).filter(isLive)
    expect(JSON.stringify(blocks)).toContain('My own words about enzymes')
  })

  it('keeps a notebook you renamed, and a page you added of your own', async () => {
    const install = await installLayer(db, ws, await buildStarter('memory-kit'))
    const [notebook] = await liveNotebooks()
    await db.notebooks.update(notebook.id, { title: 'My memory notes' })
    const plan = await planRemoval(db, install)
    expect(plan.changed).toContain('My memory notes')
    await removeLayer(db, install.id)
    expect(await liveNotebooks()).toHaveLength(1)
  })

  it('opening a page (the editor adds an empty line) does not count as a change', async () => {
    const install = await installLayer(db, ws, await buildStarter('study-kit'))
    const page = (await db.pages.toArray()).find(
      (p) => p.title === 'Weekly plan',
    )!
    await createBlock(db, {
      pageId: page.id,
      type: 'paragraph',
      content: { text: plainText('') },
    })
    expect((await planRemoval(db, install)).changed).toEqual([])
  })
})

describe('sharing a notebook as a layer file', () => {
  it('round-trips through a file another person can add', async () => {
    const file = await buildStarter('memory-kit')
    await installLayer(db, ws, file)
    const [notebook] = await liveNotebooks()
    const manifest = shareManifest(notebook, 'abcd')
    expect(manifest.id).toBe('memory-techniques-abcd')
    const blob = await exportLayerFile(db, notebook.id, manifest)
    const read = readLayerFile(await blob.text())
    expect(read.manifest.name).toBe('Memory techniques')
    expect(read.bundle.pages.length).toBe(file.bundle.pages.length)

    // A second device (empty database) adds it.
    const other = createTestDb()
    const otherWs = (await getOrCreateDefaultWorkspace(other)).id
    await installLayer(other, otherWs, read)
    expect((await other.pages.toArray()).filter(isLive).length).toBe(
      file.bundle.pages.length,
    )
    await other.delete()
  })
})
