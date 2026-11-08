import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { writePref } from '../app/uiPrefs'
import { createNotebook } from './notebookService'
import {
  DEFAULT_TABS_PREF,
  cleanTabs,
  defaultPageTabs,
  notebookPageTabs,
  setNotebookPageTab,
} from './pageTabs'

let db: LearningNotesDB
let ws: string
beforeEach(async () => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  })
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})
afterEach(async () => {
  await db.delete()
  vi.unstubAllGlobals()
})

describe('optional page tabs', () => {
  it('are off by default and cleaned', async () => {
    const nb = await createNotebook(db, ws, 'A')
    expect(notebookPageTabs(nb)).toEqual([])
    expect(cleanTabs(['database', 'x', 'slides', 'slides'])).toEqual([
      'slides',
      'database',
    ])
  })
  it('switch on and off per notebook', async () => {
    const nb = await createNotebook(db, ws, 'A')
    await setNotebookPageTab(db, nb.id, 'audio', true)
    await setNotebookPageTab(db, nb.id, 'mindMap', true)
    expect(notebookPageTabs(await db.notebooks.get(nb.id))).toEqual([
      'mindMap',
      'audio',
    ])
    await setNotebookPageTab(db, nb.id, 'mindMap', false)
    await setNotebookPageTab(db, nb.id, 'audio', false)
    expect((await db.notebooks.get(nb.id))?.pageTabs).toBeUndefined()
  })
  it('new notebooks start with the device default', async () => {
    writePref(DEFAULT_TABS_PREF, ['slides'])
    expect(defaultPageTabs()).toEqual(['slides'])
    const nb = await createNotebook(db, ws, 'B')
    expect(notebookPageTabs(nb)).toEqual(['slides'])
  })
})
