import { strToU8, unzipSync, zipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createBlock } from '../core/blockService'
import { createTestDb } from '../core/testing'
import { readBrowserBackup, safetyDbName } from '../core/upgradeBackup'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import {
  createNotebook,
  setNotebookPathStyle,
} from '../notebooks/notebookService'
import { createPage, setPagePathStyle } from '../pages/pageService'
import { ensureTemplates } from '../templates/templateService'
import { BundleError, bundleFile, exportWorkspaceBundle } from './bundle'
import {
  fileToSave,
  lockedFileName,
  openSavedFile,
  PasswordNeeded,
  WrongPassword,
} from './fileIO'
import {
  FULL_FORMAT_VERSION,
  fullFileName,
  LIMITS,
  MAX_FULL_BYTES,
  MAX_UNZIPPED_BYTES,
  MAX_ZIP_ENTRIES,
  MAX_ROWS,
  writeFullFile,
} from './fullFile'
import { importBundle } from './importBundle'
import { readFullFile } from './readFull'
import {
  fullToBundle,
  readRestoreMark,
  replaceWithFile,
  RestoreError,
  undoRestore,
} from './restore'
import { loadSampleNotebook } from './sampleNotebook'

let db: LearningNotesDB
let target: LearningNotesDB
let ws: string

const opened: LearningNotesDB[] = []
async function fresh(): Promise<LearningNotesDB> {
  const d = createTestDb()
  await d.open()
  opened.push(d)
  return d
}

/** A source database with a bit of everything, including a picture and Trash. */
async function fill(d: LearningNotesDB): Promise<string> {
  const id = (await getOrCreateDefaultWorkspace(d)).id
  await ensureTemplates(d, id)
  await loadSampleNotebook(d, id)
  const nb = await createNotebook(d, id, 'Mine')
  const page = await createPage(d, nb.id, null)
  await createBlock(d, {
    pageId: page.id,
    type: 'paragraph',
    content: { text: [{ type: 'text', text: 'hello', styles: {} }] },
  })
  const gone = await createPage(d, nb.id, null)
  await d.pages.update(gone.id, { deletedAt: 123 }) // in the Trash
  await d.images.put({
    id: 'img1',
    createdAt: 1,
    updatedAt: 2,
    deletedAt: null,
    name: 'a.png',
    type: 'image/png',
    width: 2,
    height: 2,
    data: new Uint8Array([1, 2, 3, 4, 5]).buffer,
  })
  await d.pageVersions.put({
    id: 'v1',
    pageId: page.id,
    createdAt: 5,
    title: 'old',
    blocks: [],
  } as never)
  await d.settings.put({ id: 'theme', value: 'night' } as never)
  await d.savedSearches.put({ id: 's1', name: 'x', query: {} } as never)
  await d.meta.put({ id: 'something', value: { a: 1 } })
  return id
}

async function allRows(d: LearningNotesDB) {
  const out: Record<string, unknown[]> = {}
  for (const table of d.tables) {
    const rows = await table.toArray()
    out[table.name] =
      table.name === 'meta' ? rows.filter((r) => r.id !== 'restoreUndo') : rows
  }
  return out
}

beforeEach(async () => {
  db = await fresh()
  target = await fresh()
  ws = await fill(db)
})
afterEach(async () => {
  for (const d of opened.splice(0)) await d.delete()
  indexedDB.deleteDatabase(safetyDbName(target.name))
})

const entryNames = async (blob: Blob) =>
  Object.keys(unzipSync(new Uint8Array(await blob.arrayBuffer())))

/** A small zip with the given manifest and tables, for the guard tests. */
function craft(
  manifest: Record<string, unknown>,
  tables: Record<string, unknown[]> = {},
  extra: Record<string, Uint8Array> = {},
): Blob {
  const files: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(manifest)),
    ...extra,
  }
  for (const [name, rows] of Object.entries(tables)) {
    files[`tables/${name}.jsonl`] = strToU8(
      rows.map((r) => JSON.stringify(r)).join('\n'),
    )
  }
  return new Blob([zipSync(files) as BlobPart])
}
const goodManifest = (over: Record<string, unknown> = {}) => ({
  app: 'learning-notes',
  kind: 'full',
  formatVersion: FULL_FORMAT_VERSION,
  dbVersion: 17,
  createdAt: 1,
  tables: {},
  counts: { notebooks: 0, pages: 0, cards: 0, pictures: 0 },
  media: true,
  ...over,
})

describe('full file', () => {
  it('names the files', () => {
    const now = Date.UTC(2026, 10, 3)
    expect(fullFileName(now)).toBe(
      'Learning Notes 2026-11-03.learningnotes.zip',
    )
    expect(fullFileName(now, 'notes')).toBe(
      'Learning Notes (notes only) 2026-11-03.learningnotes.zip',
    )
    expect(lockedFileName(fullFileName(now))).toBe(
      'Learning Notes 2026-11-03.learningnotes.locked',
    )
  })

  it('lists a manifest, one file per table and the pictures', async () => {
    const blob = await writeFullFile(db, 'full', 1000)
    const names = await entryNames(blob)
    expect(names).toContain('manifest.json')
    for (const table of db.tables) {
      expect(names).toContain(`tables/${table.name}.jsonl`)
    }
    expect(names.some((n) => n.startsWith('media/images/'))).toBe(true)
    const manifest = JSON.parse(
      new TextDecoder().decode(
        unzipSync(new Uint8Array(await blob.arrayBuffer()))['manifest.json'],
      ),
    )
    expect(manifest).toMatchObject({
      app: 'learning-notes',
      kind: 'full',
      formatVersion: 2,
      dbVersion: 17,
      createdAt: 1000,
    })
    expect(manifest.counts.notebooks).toBeGreaterThan(0)
    expect(manifest.counts.pictures).toBe(1)
  })

  it('round trip: every table comes back equal (ids, order, times, Trash, history)', async () => {
    const before = await allRows(db)
    expect(before.pageVersions).toHaveLength(1)
    expect(before.images).toHaveLength(1)
    expect(
      before.pages.some(
        (p) => (p as { deletedAt: number | null }).deletedAt === 123,
      ),
    ).toBe(true)
    const blob = await writeFullFile(db, 'full')
    const parsed = await readFullFile(blob, target)
    const mark = await replaceWithFile(target, parsed)
    expect(await allRows(target)).toEqual(before)
    expect(mark.fileSavedAt).toBe(parsed.manifest.createdAt)
    expect(await readRestoreMark(target)).toEqual(mark)
  })

  it('page path styles (notebook and page) survive a backup and a restore', async () => {
    const nb = (await db.notebooks.toArray()).find((n) => n.title === 'Mine')!
    const page = (
      await db.pages.where('notebookId').equals(nb.id).toArray()
    ).find((p) => p.deletedAt === null)!
    await setNotebookPathStyle(db, nb.id, 'full')
    await setPagePathStyle(db, page.id, 'page')
    const parsed = await readFullFile(await writeFullFile(db, 'full'), target)
    await replaceWithFile(target, parsed)
    expect((await target.notebooks.get(nb.id))?.pathStyle).toBe('full')
    expect((await target.pages.get(page.id))?.pathStyle).toBe('page')
    // Clearing is saved too (the field is removed, not left behind).
    await setPagePathStyle(db, page.id, undefined)
    expect('pathStyle' in ((await db.pages.get(page.id)) ?? {})).toBe(false)
  })

  it('an older backup without path styles still restores', async () => {
    const parsed = await readFullFile(await writeFullFile(db, 'full'), target)
    await replaceWithFile(target, parsed)
    const nb = (await target.notebooks.toArray()).find(
      (n) => n.title === 'Mine',
    )
    expect(nb?.pathStyle).toBeUndefined()
  })

  it('a bad path style in a file is refused', async () => {
    const nb = (await db.notebooks.toArray()).find((n) => n.title === 'Mine')!
    await db.notebooks.update(nb.id, { pathStyle: 'sideways' as never })
    const blob = await writeFullFile(db, 'full')
    await expect(readFullFile(blob, target)).rejects.toBeInstanceOf(BundleError)
  })

  it('notes only: same rows, pictures kept in full', async () => {
    const blob = await writeFullFile(db, 'notes')
    expect(
      (await entryNames(blob)).some((n) => n.startsWith('media/images/')),
    ).toBe(true)
    const parsed = await readFullFile(blob, target)
    expect(parsed.manifest.kind).toBe('notes')
    await replaceWithFile(target, parsed)
    const before = await allRows(db)
    const after = await allRows(target)
    for (const name of Object.keys(before)) {
      expect(after[name], name).toEqual(before[name])
    }
    expect(parsed.tables.images).toHaveLength(1)
  })

  it('keeps a safety copy first, and Undo puts it back', async () => {
    const mine = await fill(target)
    expect(mine).toBeTruthy()
    const targetBefore = await allRows(target)
    const parsed = await readFullFile(await writeFullFile(db, 'full'), target)
    await replaceWithFile(target, parsed, { now: 5000 })
    const safety = await readBrowserBackup(
      target.name,
      indexedDB,
      undefined,
      safetyDbName,
    )
    expect(safety?.createdAt).toBe(5000)
    expect(safety?.tables.pages).toHaveLength(targetBefore.pages.length)
    expect((await readRestoreMark(target))?.safetyAt).toBe(5000)

    await undoRestore(target)
    expect(await allRows(target)).toEqual(targetBefore)
    expect(await readRestoreMark(target)).toBeUndefined()
    expect(
      await readBrowserBackup(target.name, indexedDB, [], safetyDbName),
    ).toBeUndefined()
    await expect(undoRestore(target)).rejects.toBeInstanceOf(RestoreError)
  })

  it('does not touch the upgrade backup database', async () => {
    const parsed = await readFullFile(await writeFullFile(db, 'full'), target)
    await replaceWithFile(target, parsed)
    expect(await readBrowserBackup(target.name)).toBeUndefined()
  })

  it('a failing safety copy (device full) changes nothing', async () => {
    await fill(target)
    const before = await allRows(target)
    const parsed = await readFullFile(await writeFullFile(db, 'full'), target)
    await expect(
      replaceWithFile(target, parsed, {
        saveSafety: async () => {
          throw new DOMException('full', 'QuotaExceededError')
        },
      }),
    ).rejects.toBeInstanceOf(RestoreError)
    expect(await allRows(target)).toEqual(before)
    expect(await readRestoreMark(target)).toBeUndefined()
  })

  it('refuses to replace with a file from an older database version', async () => {
    const parsed = await readFullFile(
      craft(goodManifest({ dbVersion: 11 })),
      target,
    )
    expect(parsed.manifest.dbVersion).toBe(11)
    const before = await allRows(target)
    await expect(replaceWithFile(target, parsed)).rejects.toBeInstanceOf(
      RestoreError,
    )
    expect(await allRows(target)).toEqual(before)
    expect(fullToBundle(parsed).notebooks).toEqual([])
  })

  it('"Add as copies" works from a full file', async () => {
    const parsed = await readFullFile(await writeFullFile(db, 'full'), target)
    const summary = await importBundle(
      target,
      (await getOrCreateDefaultWorkspace(target)).id,
      fullToBundle(parsed),
    )
    expect(summary.notebooks).toBeGreaterThan(0)
  })
})

describe('refusing bad files', () => {
  it('a damaged zip', async () => {
    const good = new Uint8Array(
      await (await writeFullFile(db, 'full')).arrayBuffer(),
    )
    await expect(
      readFullFile(new Blob([good.slice(0, good.length >> 1)]), target),
    ).rejects.toBeInstanceOf(BundleError)
    await expect(
      readFullFile(
        new Blob([new Uint8Array([0x50, 0x4b, 3, 4, 9, 9, 9, 9, 9, 9])]),
        target,
      ),
    ).rejects.toBeInstanceOf(BundleError)
    const before = await allRows(target)
    expect(before.pages).toEqual([])
  })

  it('a file that is too big', async () => {
    const file = new File([], 'big.zip')
    Object.defineProperty(file, 'size', { value: MAX_FULL_BYTES + 1 })
    await expect(openSavedFile(file, db)).rejects.toBeInstanceOf(BundleError)
  })

  it('too many entries, too much unzipped data, too many rows', async () => {
    const blob = await writeFullFile(db, 'full')
    const old = { ...LIMITS }
    try {
      LIMITS.maxEntries = 3
      await expect(readFullFile(blob, target)).rejects.toBeInstanceOf(
        BundleError,
      )
      LIMITS.maxEntries = old.maxEntries
      LIMITS.maxUnzipped = 500
      await expect(readFullFile(blob, target)).rejects.toBeInstanceOf(
        BundleError,
      )
      LIMITS.maxUnzipped = old.maxUnzipped
      LIMITS.maxRows = 2
      await expect(readFullFile(blob, target)).rejects.toBeInstanceOf(
        BundleError,
      )
    } finally {
      Object.assign(LIMITS, old)
    }
    expect(MAX_ZIP_ENTRIES).toBeGreaterThan(1000)
    expect(MAX_UNZIPPED_BYTES).toBeGreaterThan(MAX_FULL_BYTES)
    expect(MAX_ROWS).toBeGreaterThan(1000)
  })

  it('unknown app, kind, newer format or newer database', async () => {
    for (const over of [
      { app: 'other' },
      { kind: 'weird' },
      { formatVersion: 3 },
      { dbVersion: 18 },
      { formatVersion: 'x' },
    ]) {
      await expect(
        readFullFile(craft(goodManifest(over)), target),
      ).rejects.toBeInstanceOf(BundleError)
    }
    await expect(
      openSavedFile(
        new File([craft(goodManifest({ dbVersion: 99 }))], 'n.zip'),
        target,
      ),
    ).rejects.toThrow(/newer version/)
  })

  it('a table or file name we do not write', async () => {
    await expect(
      readFullFile(craft(goodManifest(), { nonsense: [{ id: 'a' }] }), target),
    ).rejects.toBeInstanceOf(BundleError)
    await expect(
      readFullFile(
        craft(goodManifest(), {}, { '../evil.txt': strToU8('x') }),
        target,
      ),
    ).rejects.toBeInstanceOf(BundleError)
  })

  it('bad rows: no id, duplicate id, __proto__, wrong field kinds', async () => {
    const note = (extra: object) => ({
      id: 'n1',
      workspaceId: 'w',
      title: 'T',
      order: 'a0',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      ...extra,
    })
    const bad: Record<string, unknown>[][] = [
      [{ title: 'no id' }],
      [note({}), note({})],
      [JSON.parse('{"id":"x","__proto__":{"a":1}}')],
      [note({ title: 5 })],
    ]
    for (const rows of bad) {
      const table = rows === bad[2] ? 'settings' : 'notebooks'
      await expect(
        readFullFile(craft(goodManifest(), { [table]: rows }), target),
      ).rejects.toBeInstanceOf(BundleError)
    }
    // A good one passes.
    const ok = await readFullFile(
      craft(goodManifest(), { notebooks: [note({})] }),
      target,
    )
    expect(ok.tables.notebooks).toHaveLength(1)
    // Nothing was written by any of this.
    expect(await target.notebooks.count()).toBe(0)
  })
})

describe('opening saved files', () => {
  it('an old .learningnotes.json file still opens, to be added as copies', async () => {
    const bundle = await exportWorkspaceBundle(db)
    const file = new File([bundleFile(bundle)], 'old.learningnotes.json')
    const saved = await openSavedFile(file, target)
    expect(saved.type).toBe('json')
    if (saved.type !== 'json') return
    const summary = await importBundle(
      target,
      (await getOrCreateDefaultWorkspace(target)).id,
      saved.bundle,
    )
    expect(summary.notebooks).toBeGreaterThan(0)
  })

  it('an old locked JSON file still opens', async () => {
    const bundle = await exportWorkspaceBundle(db)
    const locked = await fileToSave(bundleFile(bundle), 'old password')
    const file = new File([locked], 'old.learningnotes.locked')
    await expect(openSavedFile(file, target)).rejects.toBeInstanceOf(
      PasswordNeeded,
    )
    await expect(openSavedFile(file, target, 'nope')).rejects.toBeInstanceOf(
      WrongPassword,
    )
    expect((await openSavedFile(file, target, 'old password')).type).toBe(
      'json',
    )
  })

  it('a locked zip (chunked) opens with the password and not without', async () => {
    const blob = await writeFullFile(db, 'full')
    const locked = await fileToSave(blob, 'good password', true)
    const file = new File([locked], 'x.learningnotes.locked')
    await expect(openSavedFile(file, target)).rejects.toBeInstanceOf(
      PasswordNeeded,
    )
    await expect(
      openSavedFile(file, target, 'wrong password'),
    ).rejects.toBeInstanceOf(WrongPassword)
    const saved = await openSavedFile(file, target, 'good password')
    expect(saved.type).toBe('zip')
    if (saved.type !== 'zip') return
    expect(saved.manifest.kind).toBe('full')
    const parsed = await readFullFile(saved.blob, target)
    await replaceWithFile(target, parsed)
    expect(await allRows(target)).toEqual(await allRows(db))
  })

  it('an unlocked zip opens and shows its counts', async () => {
    const file = new File([await writeFullFile(db, 'notes')], 'n.zip')
    const saved = await openSavedFile(file, target)
    expect(saved.type).toBe('zip')
    if (saved.type === 'zip') {
      expect(saved.manifest.counts.notebooks).toBeGreaterThan(0)
      expect(saved.manifest.media).toBe(false)
    }
    expect(ws).toBeTruthy()
  })

  it('a file that is neither is refused', async () => {
    await expect(
      openSavedFile(new File(['{"hello":1}'], 'a.json'), target),
    ).rejects.toBeInstanceOf(BundleError)
  })
})
