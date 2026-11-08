import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createNotebook, deleteNotebook } from '../notebooks/notebookService'
import { createPage, deletePage } from '../pages/pageService'
import { addBlocks } from './blockBulk'
import type { LearningNotesDB } from './db'
import {
  assertPageEditable,
  EditLockedError,
  editLockSource,
  pageEditLock,
  setEditLocked,
} from './editLock'
import { lockIsActive } from './lock/lockService'
import { createTestDb } from './testing'
import { getOrCreateDefaultWorkspace } from './workspaceService'

let db: LearningNotesDB
let nbId: string
let pageId: string

beforeEach(async () => {
  db = createTestDb()
  const ws = await getOrCreateDefaultWorkspace(db)
  nbId = (await createNotebook(db, ws.id)).id
  pageId = (await createPage(db, nbId)).id
})
afterEach(async () => {
  await db.delete()
})

const para = [{ type: 'paragraph', content: { text: 'x' } }]

describe('edit lock', () => {
  it('is a separate flag from the privacy lock and needs no passcode', async () => {
    await setEditLocked(db, 'page', pageId, true)
    const page = await db.pages.get(pageId)
    expect(page?.editLocked).toBe(true)
    expect(page?.locked).toBeUndefined()
    expect(await lockIsActive(db)).toBe(false)
    expect(await pageEditLock(db, pageId)).toBe('page')
    await setEditLocked(db, 'page', pageId, false)
    expect((await db.pages.get(pageId))?.editLocked).toBeUndefined()
    expect(await pageEditLock(db, pageId)).toBeNull()
  })

  it('a locked notebook locks all its pages', async () => {
    await setEditLocked(db, 'notebook', nbId, true)
    expect(await pageEditLock(db, pageId)).toBe('notebook')
    const other = await createPage(db, nbId)
    await expect(assertPageEditable(db, other.id)).rejects.toBeInstanceOf(
      EditLockedError,
    )
    expect(editLockSource({ editLocked: true }, { editLocked: true })).toBe(
      'page',
    )
  })

  it('refuses new blocks and deletes while locked, allows them after unlock', async () => {
    await setEditLocked(db, 'page', pageId, true)
    await expect(addBlocks(db, pageId, para)).rejects.toBeInstanceOf(
      EditLockedError,
    )
    await expect(deletePage(db, pageId)).rejects.toBeInstanceOf(EditLockedError)
    await expect(deleteNotebook(db, nbId)).rejects.toBeInstanceOf(
      EditLockedError,
    )
    expect((await db.pages.get(pageId))?.deletedAt).toBeNull()
    await setEditLocked(db, 'page', pageId, false)
    await addBlocks(db, pageId, para)
    await deletePage(db, pageId)
    expect((await db.pages.get(pageId))?.deletedAt).not.toBeNull()
  })

  it('a locked notebook cannot be deleted, nor its pages', async () => {
    await setEditLocked(db, 'notebook', nbId, true)
    await expect(deleteNotebook(db, nbId)).rejects.toBeInstanceOf(
      EditLockedError,
    )
    await expect(deletePage(db, pageId)).rejects.toBeInstanceOf(EditLockedError)
  })
})
