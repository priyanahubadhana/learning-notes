import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createNotebook,
  deleteNotebook,
  renameNotebook,
} from '../notebooks/notebookService'
import { createPage, deletePage, renamePage } from '../pages/pageService'
import { purgePage } from '../trash/trashService'
import { addBlocks } from './blockBulk'
import type { LearningNotesDB } from './db'
import {
  assertSignedIn,
  editLockSource,
  pageDeleteBlocked,
  pageEditLock,
  SignInRequiredError,
} from './editLock'
import { isReadOnlyGate, setReadOnlyGate } from './readOnlyGate'
import { createTestDb } from './testing'
import { getOrCreateDefaultWorkspace } from './workspaceService'

let db: LearningNotesDB
let wsId: string
let nbId: string
let pageId: string

beforeEach(async () => {
  db = createTestDb()
  wsId = (await getOrCreateDefaultWorkspace(db)).id
  nbId = (await createNotebook(db, wsId)).id
  pageId = (await createPage(db, nbId, null, 'Keep me')).id
})
afterEach(async () => {
  setReadOnlyGate(false)
  await db.delete()
})

describe('account gate (read-only until signed in)', () => {
  it('is off by default: nothing changes for signed-in people', async () => {
    expect(isReadOnlyGate()).toBe(false)
    expect(editLockSource(undefined, undefined)).toBeNull()
    expect(await pageEditLock(db, pageId)).toBeNull()
    expect(() => assertSignedIn()).not.toThrow()
  })

  it('refuses creating, renaming and deleting while on', async () => {
    setReadOnlyGate(true)
    expect(editLockSource(undefined, undefined)).toBe('account')
    expect(await pageEditLock(db, pageId)).toBe('account')
    expect(await pageDeleteBlocked(db, pageId)).toBe(true)
    await expect(createPage(db, nbId)).rejects.toBeInstanceOf(
      SignInRequiredError,
    )
    await expect(createNotebook(db, wsId)).rejects.toThrow(/Sign in/)
    await expect(renamePage(db, pageId, 'x')).rejects.toThrow(/Sign in/)
    await expect(renameNotebook(db, nbId, 'x')).rejects.toThrow(/Sign in/)
    await expect(deletePage(db, pageId)).rejects.toThrow(/Sign in/)
    await expect(deleteNotebook(db, nbId)).rejects.toThrow(/Sign in/)
    await expect(purgePage(db, pageId)).rejects.toThrow(/Sign in/)
    await expect(
      addBlocks(db, pageId, [{ type: 'paragraph', content: { text: 'x' } }]),
    ).rejects.toThrow()
  })

  it('never deletes or hides data, and reading still works', async () => {
    setReadOnlyGate(true)
    await expect(deletePage(db, pageId)).rejects.toThrow()
    const page = await db.pages.get(pageId)
    expect(page?.title).toBe('Keep me')
    expect(page?.deletedAt).toBeNull()
    expect(await db.notebooks.count()).toBe(1)
  })

  it('still lets the app make its own journal and special notebooks', async () => {
    setReadOnlyGate(true)
    await expect(
      createPage(db, nbId, null, '', { journalDate: '2026-11-11' }),
    ).resolves.toBeTruthy()
    await expect(
      createNotebook(db, wsId, 'Journal', 'journal'),
    ).resolves.toBeTruthy()
  })

  it('works again the moment the gate goes off', async () => {
    setReadOnlyGate(true)
    setReadOnlyGate(false)
    await expect(renamePage(db, pageId, 'New name')).resolves.toBeUndefined()
    expect((await db.pages.get(pageId))?.title).toBe('New name')
  })
})
