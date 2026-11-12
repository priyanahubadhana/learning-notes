import { safetyDbName } from '../../core/upgradeBackup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../../core/db'
import { createTestDb } from '../../core/testing'
import { getOrCreateDefaultWorkspace } from '../../core/workspaceService'
import { createNotebook } from '../../notebooks/notebookService'
import { createPage } from '../../pages/pageService'
import { createAnnotation } from '../annotations/annotationService'
import { readFullFile } from '../../share/readFull'
import { writeFullFile } from '../../share/fullFile'
import { replaceWithFile } from '../../share/restore'
import { memoryConnectors as mem } from '../../sync/connectors'
import { createMasterKey, type MasterKey } from '../../sync/crypto'
import { setDeviceIdForTests, setTracking } from '../../sync/device'
import { syncOnce } from '../../sync/engine'

const pdf = (...b: number[]) =>
  new Uint8Array([37, 80, 68, 70, 45, ...b]).buffer

const big = new Uint8Array(300_000).fill(9).buffer
let master: MasterKey
let a: LearningNotesDB
let b: LearningNotesDB

beforeEach(async () => {
  setTracking(true)
  master = await createMasterKey()
  a = createTestDb()
  b = createTestDb()
})
afterEach(async () => {
  setTracking(false)
  indexedDB.deleteDatabase(safetyDbName(b.name))
  await a.delete()
  await b.delete()
})

/** A book page with a stored file that also holds the first copy. */
async function book(db: LearningNotesDB) {
  const ws = await getOrCreateDefaultWorkspace(db)
  const nb = await createNotebook(db, ws.id, 'Books')
  const page = await createPage(db, nb.id, null, 'Book')
  const now = Date.now()
  const fileId = crypto.randomUUID()
  await db.bookFiles.add({
    id: fileId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    pageId: page.id,
    name: 'b.pdf',
    mime: 'application/pdf',
    size: 6,
    data: pdf(1),
    original: big,
  })
  await db.pages.update(page.id, { readLockMode: 'view' })
  await createAnnotation(db, {
    pageId: page.id,
    kind: 'sticky',
    note: 'remember',
    anchor: { type: 'pdf', page: 1, rects: [0.1, 0.2, 0.3, 0.02] },
  } as never)
  return { page, fileId }
}

describe('Reader v2 fields: original stays on the device', () => {
  it('sync never sends the first copy, and a pull keeps it; lock mode and sticky notes travel', async () => {
    setDeviceIdForTests('dev-a')
    const conn = mem()
    const { page, fileId } = await book(a)
    await syncOnce(a, conn, master)
    // The store holds the record but not a 300 KB first copy (it would be >400 KB).
    expect(JSON.stringify(conn.state).length).toBeLessThan(100_000)
    // The other device gets the other two fields.
    setDeviceIdForTests('dev-b')
    await syncOnce(b, conn, master)
    expect((await b.pages.get(page.id))?.readLockMode).toBe('view')
    const stickies = await b.annotations
      .where('pageId')
      .equals(page.id)
      .toArray()
    expect(stickies.map((s) => s.kind)).toEqual(['sticky'])
    const got = await b.bookFiles.get(fileId)
    expect(got?.original).toBeUndefined()
    // Device b keeps its own copy through a later pull of the same record.
    await b.bookFiles.update(fileId, { original: pdf(7) })
    setDeviceIdForTests('dev-a')
    await a.bookFiles.update(fileId, { name: 'renamed.pdf' })
    await syncOnce(a, conn, master)
    setDeviceIdForTests('dev-b')
    await syncOnce(b, conn, master)
    const after = await b.bookFiles.get(fileId)
    expect(after?.name).toBe('renamed.pdf')
    expect(new Uint8Array(after!.original!)[5]).toBe(7)
    // A copy on a never leaves a.
    expect(new Uint8Array((await a.bookFiles.get(fileId))!.original!)[5]).toBe(
      9,
    )
  })

  it('a backup file never holds the first copy; lock mode and sticky notes round-trip', async () => {
    await b.open()
    const { page, fileId } = await book(a)
    const blob = await writeFullFile(a, 'full')
    const parsed = await readFullFile(blob, b)
    await replaceWithFile(b, parsed)
    const file = await b.bookFiles.get(fileId)
    expect(file?.original).toBeUndefined()
    expect(file?.data.byteLength).toBe(6)
    expect((await b.pages.get(page.id))?.readLockMode).toBe('view')
    const notes = await b.annotations.where('pageId').equals(page.id).toArray()
    expect(notes).toHaveLength(1)
    expect(notes[0].kind).toBe('sticky')
    expect(notes[0].note).toBe('remember')
    // The source device still has it.
    expect((await a.bookFiles.get(fileId))?.original).toBeDefined()
  })
})
