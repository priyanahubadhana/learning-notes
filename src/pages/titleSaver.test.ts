import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage, getPage } from './pageService'
import { createTitleSaver } from './titleSaver'

let db: LearningNotesDB
let pageId: string

beforeEach(async () => {
  db = createTestDb()
  const ws = await getOrCreateDefaultWorkspace(db)
  const nb = await createNotebook(db, ws.id)
  pageId = (await createPage(db, nb.id)).id
})

afterEach(async () => {
  await db.delete()
})

describe('createTitleSaver', () => {
  it('saves only the latest title, once', async () => {
    const spy = vi.spyOn(db.pages, 'update')
    const saver = createTitleSaver(db, pageId)
    for (const t of ['M', 'My', 'My page']) saver.set(t)
    await saver.flush()

    expect((await getPage(db, pageId))?.title).toBe('My page')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('writes nothing if the title never changed', async () => {
    const spy = vi.spyOn(db.pages, 'update')
    await createTitleSaver(db, pageId).flush()
    expect(spy).not.toHaveBeenCalled()
  })
})
