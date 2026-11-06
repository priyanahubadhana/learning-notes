import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createPage } from '../pages/pageService'
import { checkedRow } from '../share/checkRows'
import { createNotebook } from './notebookService'
import {
  groupByColour,
  setNotebookView,
  setPageTabColour,
  setTabView,
  tabViewOf,
} from './notebookViews'

let db: LearningNotesDB
let notebookId: string

beforeEach(async () => {
  db = createTestDb()
  const ws = await getOrCreateDefaultWorkspace(db)
  notebookId = (await createNotebook(db, ws.id, 'Biology')).id
})

afterEach(async () => {
  await db.delete()
})

describe('notebook views (I1)', () => {
  it('remembers the notebook view and clears it back to default', async () => {
    await setNotebookView(db, notebookId, 'shelf')
    expect((await db.notebooks.get(notebookId))!.view).toBe('shelf')
    await setNotebookView(db, notebookId, undefined)
    expect((await db.notebooks.get(notebookId))!.view).toBeUndefined()
  })

  it('remembers a view per tab; list is the default and is not stored', async () => {
    await setTabView(db, notebookId, 'notes', 'gallery')
    await setTabView(db, notebookId, 'cards', 'table')
    let notebook = (await db.notebooks.get(notebookId))!
    expect(tabViewOf(notebook, 'notes')).toBe('gallery')
    expect(tabViewOf(notebook, 'cards')).toBe('table')
    expect(tabViewOf(notebook, 'revise')).toBe('list')
    await setTabView(db, notebookId, 'notes', 'list')
    await setTabView(db, notebookId, 'cards', 'list')
    notebook = (await db.notebooks.get(notebookId))!
    expect(notebook.tabViews).toBeUndefined()
  })

  it('colours a section tab and groups pages by colour', async () => {
    const a = await createPage(db, notebookId, null, 'A')
    const b = await createPage(db, notebookId, null, 'B')
    await setPageTabColour(db, a.id, '#2f6feb')
    const pages = [(await db.pages.get(a.id))!, (await db.pages.get(b.id))!]
    const groups = groupByColour(pages)
    expect(groups.get('#2f6feb')!.map((p) => p.title)).toEqual(['A'])
    expect(groups.get('')!.map((p) => p.title)).toEqual(['B'])
    await setPageTabColour(db, a.id, undefined)
    expect((await db.pages.get(a.id))!.tabColour).toBeUndefined()
  })
})

describe('new fields in files', () => {
  it('keeps good view fields and drops bad ones', () => {
    const base = { id: 'n', createdAt: 1, updatedAt: 1, deletedAt: null }
    const ok = checkedRow('notebooks', {
      ...base,
      workspaceId: 'w',
      title: 'T',
      order: 'a0',
      view: 'tabs',
      tabViews: { notes: 'gallery' },
    })
    expect(ok).toMatchObject({ view: 'tabs', tabViews: { notes: 'gallery' } })
    expect(
      checkedRow('notebooks', {
        ...base,
        workspaceId: 'w',
        title: 'T',
        order: 'a0',
        view: 'weird',
      }),
    ).toBeNull()
    expect(
      checkedRow('notebooks', {
        ...base,
        workspaceId: 'w',
        title: 'T',
        order: 'a0',
        tabViews: { notes: 'cube' },
      }),
    ).toBeNull()
    expect(
      checkedRow('pages', {
        ...base,
        notebookId: 'n',
        order: 'a0',
        parentId: null,
        title: 'P',
        tabColour: 'red; background:url(x)',
      }),
    ).toBeNull()
  })
})
