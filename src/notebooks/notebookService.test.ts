import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createPage } from '../pages/pageService'
import {
  createNotebook,
  deleteNotebook,
  getNotebook,
  listNotebooks,
  moveNotebook,
  renameNotebook,
  updateNotebookTab,
} from './notebookService'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})

afterEach(async () => {
  await db.delete()
})

const titles = async () => (await listNotebooks(db, ws)).map((n) => n.title)

describe('workspace', () => {
  it('creates the default workspace once and reuses it', async () => {
    expect((await getOrCreateDefaultWorkspace(db)).id).toBe(ws)
    expect(await db.workspaces.count()).toBe(1)
  })
})

describe('notebookService', () => {
  it('creates notebooks at the end, in order', async () => {
    await createNotebook(db, ws, 'A')
    await createNotebook(db, ws, 'B')
    await createNotebook(db, ws, 'C')
    expect(await titles()).toEqual(['A', 'B', 'C'])
  })

  it('gives new normal notebooks the default tabs; special ones none', async () => {
    const notebook = await createNotebook(db, ws, 'Biology')
    expect(notebook.tabs?.map((t) => t.kind)).toEqual([
      'notes',
      'database',
      'cards',
    ])
    expect(notebook.tabs?.[1].databaseId).toBe(`tracker:${notebook.id}`)
    expect((await db.notebooks.get(notebook.id))?.tabs).toEqual(notebook.tabs)
    const journal = await createNotebook(db, ws, 'Journal', 'journal')
    expect(journal.tabs).toBeUndefined()
  })

  it('getNotebook returns live notebooks only', async () => {
    const nb = await createNotebook(db, ws, 'A')
    expect((await getNotebook(db, nb.id))?.title).toBe('A')
    await deleteNotebook(db, nb.id)
    expect(await getNotebook(db, nb.id)).toBeUndefined()
  })

  it('rejects an unknown workspace', async () => {
    await expect(createNotebook(db, 'nope')).rejects.toThrow('not found')
  })

  it('renames a notebook and bumps updatedAt', async () => {
    const nb = await createNotebook(db, ws, 'Old')
    await renameNotebook(db, nb.id, 'New')
    const saved = await db.notebooks.get(nb.id)
    expect(saved?.title).toBe('New')
    expect(saved!.updatedAt).toBeGreaterThanOrEqual(nb.updatedAt)
  })

  it('moves a notebook to any position, changing only that record', async () => {
    const a = await createNotebook(db, ws, 'A')
    const b = await createNotebook(db, ws, 'B')
    const c = await createNotebook(db, ws, 'C')

    await moveNotebook(db, c.id, 0)
    expect(await titles()).toEqual(['C', 'A', 'B'])
    await moveNotebook(db, c.id, 1)
    expect(await titles()).toEqual(['A', 'C', 'B'])
    await moveNotebook(db, a.id, 99)
    expect(await titles()).toEqual(['C', 'B', 'A'])

    // Fractional indexing: untouched siblings keep their original keys.
    expect((await db.notebooks.get(b.id))?.order).toBe(b.order)
  })

  it('soft-deletes a notebook with its pages and blocks (kept in DB)', async () => {
    const nb = await createNotebook(db, ws, 'Doomed')
    const keep = await createNotebook(db, ws, 'Keep')
    const page = await createPage(db, nb.id)
    const sub = await createPage(db, nb.id, page.id)
    const block = await createBlock(db, { pageId: sub.id, type: 'paragraph' })
    const keptPage = await createPage(db, keep.id)

    await deleteNotebook(db, nb.id)

    expect(await titles()).toEqual(['Keep'])
    const deletedAt = (await db.notebooks.get(nb.id))?.deletedAt
    expect(deletedAt).toEqual(expect.any(Number))
    // Same timestamp across the whole deleted group.
    expect((await db.pages.get(page.id))?.deletedAt).toBe(deletedAt)
    expect((await db.pages.get(sub.id))?.deletedAt).toBe(deletedAt)
    expect((await db.blocks.get(block.id))?.deletedAt).toBe(deletedAt)
    expect((await db.pages.get(keptPage.id))?.deletedAt).toBeNull()
    await expect(renameNotebook(db, nb.id, 'x')).rejects.toThrow('not found')
  })

  it('rolls back the whole cascade delete if any part fails', async () => {
    const nb = await createNotebook(db, ws, 'Safe')
    const page = await createPage(db, nb.id)
    await createBlock(db, { pageId: page.id, type: 'paragraph' })

    // Simulate a failure on the last write (blocks) of the transaction.
    vi.spyOn(db.blocks, 'bulkUpdate').mockRejectedValue(new Error('disk error'))
    await expect(deleteNotebook(db, nb.id)).rejects.toThrow('disk error')

    // Notebook and page writes happened earlier but were rolled back.
    expect((await db.notebooks.get(nb.id))?.deletedAt).toBeNull()
    expect((await db.pages.get(page.id))?.deletedAt).toBeNull()
  })
})

describe('notebook tabs', () => {
  it('renames, resets, hides and shows a tab', async () => {
    const nb = await createNotebook(db, ws, 'A')
    const tab = async (id: string) =>
      (await getNotebook(db, nb.id))?.tabs?.find((x) => x.id === id)
    await updateNotebookTab(db, nb.id, 'cards', { title: '  Flashcards ' })
    expect((await tab('cards'))?.title).toBe('Flashcards')
    await updateNotebookTab(db, nb.id, 'cards', { hidden: true })
    expect(await tab('cards')).toMatchObject({
      title: 'Flashcards',
      hidden: true,
    })
    await updateNotebookTab(db, nb.id, 'cards', { title: '', hidden: false })
    expect(await tab('cards')).toEqual({ id: 'cards', kind: 'cards' })
  })

  it('keeps one visible tab and rejects unknown tabs', async () => {
    const nb = await createNotebook(db, ws, 'A')
    await updateNotebookTab(db, nb.id, 'notes', { hidden: true })
    await updateNotebookTab(db, nb.id, 'cards', { hidden: true })
    await expect(
      updateNotebookTab(db, nb.id, 'database', { hidden: true }),
    ).rejects.toThrow()
    await expect(
      updateNotebookTab(db, nb.id, 'nope', { title: 'X' }),
    ).rejects.toThrow()
  })
})
