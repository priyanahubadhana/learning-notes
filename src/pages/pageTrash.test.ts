import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ToastAction } from '../app/appUi'
import type { LearningNotesDB } from '../core/db'
import { setEditLocked } from '../core/editLock'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from './pageService'
import { trashPageWithUndo } from './pageTrash'

let db: LearningNotesDB
let nbId: string

beforeEach(async () => {
  db = createTestDb()
  const ws = await getOrCreateDefaultWorkspace(db)
  nbId = (await createNotebook(db, ws.id)).id
})
afterEach(async () => {
  await db.delete()
})

describe('trashPageWithUndo', () => {
  it('moves a page and its sub-pages to Trash, says how many, and Undo restores', async () => {
    const parent = await createPage(db, nbId)
    const child = await createPage(db, nbId, parent.id)
    const toast = vi.fn<(m: string, a?: ToastAction) => void>()
    const onBack = vi.fn()
    await trashPageWithUndo(db, parent, toast, { onBack })
    expect((await db.pages.get(parent.id))?.deletedAt).not.toBeNull()
    expect((await db.pages.get(child.id))?.deletedAt).not.toBeNull()
    expect(toast.mock.calls[0][0]).toContain('1 sub-page')
    const undo = toast.mock.calls[0][1]
    expect(undo).toBeDefined()
    undo?.onSelect()
    await vi.waitFor(async () => {
      expect((await db.pages.get(parent.id))?.deletedAt).toBeNull()
    })
    expect((await db.pages.get(child.id))?.deletedAt).toBeNull()
    await vi.waitFor(() => expect(onBack).toHaveBeenCalled())
  })

  it('is refused with a message when the page is edit-locked', async () => {
    const p = await createPage(db, nbId)
    await setEditLocked(db, 'page', p.id, true)
    const toast = vi.fn<(m: string, a?: ToastAction) => void>()
    await trashPageWithUndo(db, p, toast)
    expect((await db.pages.get(p.id))?.deletedAt).toBeNull()
    expect(toast).toHaveBeenCalledTimes(1)
    expect(toast.mock.calls[0][1]).toBeUndefined()
  })
})
