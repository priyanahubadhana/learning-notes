import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage, deletePage } from '../pages/pageService'
import { checkedRow } from '../share/checkRows'
import { writeFullFile } from '../share/fullFile'
import { safetyDbName } from '../core/upgradeBackup'
import { readFullFile } from '../share/readFull'
import { replaceWithFile } from '../share/restore'
import { purgePage } from '../trash/trashService'
import {
  deleteRecording,
  eraseRecordings,
  formatDuration,
  listRecordings,
  MAX_RECORDING_BYTES,
  restoreRecording,
  saveRecording,
} from './recordingService'

const bytes = (n: number, fill = 7) => new Uint8Array(n).fill(fill).buffer

let db: LearningNotesDB
let target: LearningNotesDB
let pageId: string
const names: string[] = []

beforeEach(async () => {
  db = createTestDb()
  target = createTestDb()
  await target.open()
  names.push(db.name, target.name)
  const ws = await getOrCreateDefaultWorkspace(db)
  const nb = await createNotebook(db, ws.id, 'Mine')
  pageId = (await createPage(db, nb.id, null)).id
})

afterEach(async () => {
  db.close()
  target.close()
  indexedDB.deleteDatabase(safetyDbName(target.name))
  for (const name of names.splice(0)) await Dexie.delete(name)
})

const record = (data = bytes(2000), startedAt = 1000) =>
  saveRecording(db, {
    pageId,
    name: 'Recording',
    type: 'audio/mp4',
    startedAt,
    durationMs: 61_400,
    data,
  })

describe('recordings', () => {
  it('saves, lists oldest first, and refuses empty or huge sound', async () => {
    const second = await record(bytes(10), 2000)
    const first = await record(bytes(10), 1000)
    expect((await listRecordings(db, pageId)).map((r) => r.id)).toEqual([
      first.id,
      second.id,
    ])
    await expect(record(new ArrayBuffer(0))).rejects.toThrow()
    expect(MAX_RECORDING_BYTES).toBeGreaterThan(1_000_000)
  })

  it('delete is soft: it can be undone, and the sound is kept', async () => {
    const r = await record()
    await deleteRecording(db, r.id)
    expect(await listRecordings(db, pageId)).toHaveLength(0)
    const gone = await listRecordings(db, pageId, true)
    expect(gone).toHaveLength(1)
    expect(gone[0].data.byteLength).toBe(2000)
    await restoreRecording(db, r.id)
    expect(await listRecordings(db, pageId)).toHaveLength(1)
  })

  it('Delete forever erases the sound, only for deleted ones', async () => {
    const r = await record()
    await eraseRecordings(db, [r.id]) // still live: nothing happens
    expect((await db.recordings.get(r.id))?.data.byteLength).toBe(2000)
    await deleteRecording(db, r.id)
    await eraseRecordings(db, [r.id])
    const row = await db.recordings.get(r.id)
    expect(row?.data.byteLength).toBe(0)
    expect(row?.purgedAt).toBeTypeOf('number')
    expect(await listRecordings(db, pageId, true)).toHaveLength(0)
    await restoreRecording(db, r.id) // an erased one cannot come back
    expect(await listRecordings(db, pageId)).toHaveLength(0)
  })

  it('a page deleted forever takes its recordings with it', async () => {
    const r = await record()
    await deletePage(db, pageId)
    expect((await db.recordings.get(r.id))?.data.byteLength).toBe(2000) // Trash keeps it
    await purgePage(db, pageId)
    const row = await db.recordings.get(r.id)
    expect(row?.data.byteLength).toBe(0)
    expect(row?.purgedAt).toBeTypeOf('number')
  })

  it('Everything keeps the sound; Notes only keeps the rows but not the sound', async () => {
    const r = await record(bytes(3000, 9))
    const full = await readFullFile(await writeFullFile(db, 'full'), target)
    expect(
      new Uint8Array(full.tables.recordings[0].data as ArrayBuffer)[0],
    ).toBe(9)
    await replaceWithFile(target, full)
    expect((await target.recordings.get(r.id))?.data.byteLength).toBe(3000)

    const notes = await readFullFile(await writeFullFile(db, 'notes'), target)
    expect(notes.tables.recordings).toHaveLength(1)
    expect((notes.tables.recordings[0].data as ArrayBuffer).byteLength).toBe(0)
  })

  it('a recording row from a file is checked field by field', () => {
    const good = {
      id: 'r1',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      pageId: 'p',
      name: 'x',
      type: 'audio/webm;codecs=opus',
      startedAt: 1,
      durationMs: 5,
      data: { $bin: null, kind: 'buffer' },
    }
    expect(checkedRow('recordings', good)).not.toBeNull()
    expect(checkedRow('recordings', { ...good, type: 'text/html' })).toBeNull()
    expect(checkedRow('recordings', { ...good, pageId: undefined })).toBeNull()
    expect(checkedRow('recordings', { ...good, evil: 1 })).not.toHaveProperty(
      'evil',
    )
  })

  it('formats lengths', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65_000)).toBe('1:05')
    expect(formatDuration(3_723_000)).toBe('1:02:03')
  })

  it('opening a version 13 database adds the recordings table and keeps rows', async () => {
    const name = `v13-${createId()}`
    names.push(name)
    const old = new Dexie(name)
    old.version(13).stores({ notebooks: 'id, workspaceId', images: 'id' })
    await old
      .table('notebooks')
      .add({ id: 'n1', title: 'Old', workspaceId: 'w' })
    old.close()
    const d = new LearningNotesDB(name)
    await d.open()
    expect(d.verno).toBeGreaterThanOrEqual(14)
    expect((await d.notebooks.get('n1'))?.title).toBe('Old')
    expect(await d.recordings.count()).toBe(0)
    d.close()
  })
})
