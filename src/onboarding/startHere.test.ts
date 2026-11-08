import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { en } from '../i18n/en'
import { enO } from '../i18n/enO'
import { listBlocks } from '../core/blockService'
import { loadStartHere, START_PAGES } from './startHere'

let db: LearningNotesDB
let ws: string
beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})
afterEach(() => db.delete())

describe('the Start here notebook', () => {
  it('has five pages, each with a Try it line, and one real card', async () => {
    const { notebook, pages } = await loadStartHere(db, ws)
    expect(notebook.title).toBe('Start here')
    expect(pages).toHaveLength(5)
    expect(pages.map((p) => p.title)).toEqual([
      '1. Write on paper',
      '2. Make a box',
      '3. Lasso and convert',
      '4. Write pad',
      '5. Make a card and review it',
    ])
    for (const page of pages) {
      const blocks = await listBlocks(db, page.id)
      const tryLine = blocks.find((b) => b.type === 'callout')
      expect(JSON.stringify(tryLine?.content)).toContain('Try it')
    }
    // The card is a real recall card, due now.
    const cards = await db.cards
      .where('notebookId')
      .equals(notebook.id)
      .toArray()
    expect(cards).toHaveLength(1)
    expect(cards[0].due).toBeLessThanOrEqual(Date.now())
  })

  it('is an ordinary notebook (not marked as a sample)', async () => {
    const { notebook } = await loadStartHere(db, ws)
    expect((await db.notebooks.get(notebook.id))?.sample).toBeUndefined()
  })

  it('has every text in English', () => {
    const all: Record<string, string> = { ...en, ...enO }
    for (const stem of START_PAGES) {
      for (const part of ['title', 'body', 'try']) {
        expect(all[`${stem}.${part}`], `${stem}.${part}`).toBeTruthy()
      }
    }
  })
})
