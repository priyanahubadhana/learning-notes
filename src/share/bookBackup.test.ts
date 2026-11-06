import { strToU8, unzipSync, zipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { safetyDbName } from '../core/upgradeBackup'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { importBook } from '../library/libraryService'
import { createAnnotation } from '../reader/annotations/annotationService'
import { checkedRow } from './checkRows'
import { writeFullFile } from './fullFile'
import { readFullFile } from './readFull'
import { canReplaceFrom, replaceWithFile } from './restore'

let db: LearningNotesDB
let target: LearningNotesDB
const opened: LearningNotesDB[] = []
async function fresh() {
  const d = createTestDb()
  await d.open()
  opened.push(d)
  return d
}
beforeEach(async () => {
  db = await fresh()
  target = await fresh()
})
afterEach(async () => {
  for (const d of opened.splice(0)) await d.delete()
  indexedDB.deleteDatabase(safetyDbName(target.name))
})

const pdf = () =>
  Object.assign(
    new Blob([
      strToU8('%PDF-1.4\n' + 'x'.repeat(5000) + '\n%%EOF') as BlobPart,
    ]),
    { name: 'Book.pdf' },
  )

async function fillBook() {
  const ws = (await getOrCreateDefaultWorkspace(db)).id
  const page = await importBook(db, ws, pdf(), async () => ({ title: 'Book' }))
  await createAnnotation(db, {
    pageId: page.id,
    kind: 'highlight',
    colour: 'green',
    anchor: { type: 'pdf', page: 2, rects: [0.1, 0.1, 0.5, 0.02] },
    quote: { exact: 'words', prefix: '', suffix: '' },
  })
  return page
}

describe('backups carry books and annotations', () => {
  it('a full file round-trips the book bytes, source and highlights', async () => {
    const page = await fillBook()
    const parsed = await readFullFile(await writeFullFile(db, 'full'), target)
    await replaceWithFile(target, parsed)
    const file = (await target.bookFiles.toArray())[0]
    expect(file.data.byteLength).toBeGreaterThan(5000)
    expect((await target.pages.get(page.id))?.source?.format).toBe('pdf')
    expect(await target.annotations.count()).toBe(1)
    expect(
      (await target.notebooks.toArray()).some((n) => n.kind === 'books'),
    ).toBe(true)
  })

  it('"notes only" keeps the book row with empty bytes (like pictures)', async () => {
    await fillBook()
    const parsed = await readFullFile(await writeFullFile(db, 'notes'), target)
    expect(parsed.tables.bookFiles).toHaveLength(1)
    expect((parsed.tables.bookFiles[0].data as ArrayBuffer).byteLength).toBe(0)
    await replaceWithFile(target, parsed)
    expect((await target.bookFiles.toArray())[0].data.byteLength).toBe(0)
    expect(await target.annotations.count()).toBe(1) // highlights always travel
  })

  it('refuses a book row whose bytes do not fit its type', async () => {
    await fillBook()
    const blob = await writeFullFile(db, 'full')
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    const media = Object.keys(files).find((n) =>
      n.startsWith('media/bookFiles/'),
    )!
    files[media] = strToU8('this is not a pdf at all')
    const bad = new Blob([zipSync(files) as BlobPart])
    await expect(readFullFile(bad, target)).rejects.toThrow()
  })
})

describe('Delete forever', () => {
  it('erases the book bytes, the highlight text and the notes, keeping markers', async () => {
    const page = await fillBook()
    const { deletePage } = await import('../pages/pageService')
    const { purgePage } = await import('../trash/trashService')
    await deletePage(db, page.id)
    expect((await db.bookFiles.toArray())[0].data.byteLength).toBeGreaterThan(0) // Trash keeps it
    await purgePage(db, page.id)
    const file = (await db.bookFiles.toArray())[0]
    expect(file.data.byteLength).toBe(0)
    expect(file.purgedAt).toBeTypeOf('number')
    const note = (await db.annotations.toArray())[0]
    expect(note.quote).toBeUndefined()
    expect(note.purgedAt).toBeTypeOf('number')
  })
})

describe('Replace accepts older files whose upgrades only added tables', () => {
  it('knows which versions are table-only', () => {
    expect(canReplaceFrom(12, 17)).toBe(true)
    expect(canReplaceFrom(13, 17)).toBe(true)
    expect(canReplaceFrom(16, 17)).toBe(true)
    expect(canReplaceFrom(17, 17)).toBe(true)
    expect(canReplaceFrom(11, 17)).toBe(false)
    expect(canReplaceFrom(10, 13)).toBe(false)
  })

  it('a version 13 file replaces the notes; the newer tables start empty', async () => {
    const page = await fillBook()
    const blob = await writeFullFile(db, 'full')
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    // Make it look like a version 13 save: no tables from later versions.
    const manifest = JSON.parse(
      new TextDecoder().decode(files['manifest.json']),
    )
    manifest.dbVersion = 13
    for (const table of [
      'recordings',
      'fonts',
      'decks',
      'bookFiles',
      'annotations',
    ]) {
      delete files[`tables/${table}.jsonl`]
      delete manifest.tables[table]
    }
    for (const name of Object.keys(files)) {
      if (name.startsWith('media/bookFiles/')) delete files[name]
    }
    files['manifest.json'] = strToU8(JSON.stringify(manifest))
    const parsed = await readFullFile(
      new Blob([zipSync(files) as BlobPart]),
      target,
    )
    await replaceWithFile(target, parsed)
    expect(await target.pages.get(page.id)).toBeTruthy()
    expect(await target.bookFiles.count()).toBe(0)
    expect(await target.annotations.count()).toBe(0)
  })
})

describe('row checks', () => {
  it('checks annotation fields one by one', () => {
    const ok = {
      id: 'a',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      pageId: 'p',
      kind: 'highlight',
      colour: 'blue',
      anchor: { type: 'epub', cfi: 'epubcfi(/6/2)' },
      origin: 'user',
      surprise: 'dropped',
    }
    const clean = checkedRow('annotations', ok)
    expect(clean).not.toBeNull()
    expect(clean).not.toHaveProperty('surprise')
    expect(checkedRow('annotations', { ...ok, colour: 'red' })).toBeNull()
    expect(
      checkedRow('annotations', { ...ok, anchor: { type: 'nope' } }),
    ).toBeNull()
    expect(
      checkedRow('annotations', { ...ok, note: 'x'.repeat(20_001) }),
    ).toBeNull()
  })
  it('checks a page source and refuses a non-https address', () => {
    const page = {
      id: 'p',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      notebookId: 'n',
      order: 'a0',
      parentId: null,
      title: 't',
    }
    expect(
      checkedRow('pages', {
        ...page,
        source: { kind: 'article', url: 'https://x.com/a' },
      }),
    ).not.toBeNull()
    expect(
      checkedRow('pages', {
        ...page,
        source: { kind: 'article', url: 'http://x.com' },
      }),
    ).toBeNull()
  })
})
