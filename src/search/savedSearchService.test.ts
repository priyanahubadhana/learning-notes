import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { DEFAULT_FILTERS, type SearchQuery } from './searchQuery'
import {
  createSavedSearch,
  deleteSavedSearch,
  listSavedSearches,
  readSavedQuery,
  renameSavedSearch,
  updateSavedSearchQuery,
} from './savedSearchService'

let db: LearningNotesDB

beforeEach(() => {
  db = createTestDb()
})

afterEach(async () => {
  await db.delete()
})

const query: SearchQuery = {
  text: 'heart',
  type: 'card',
  filters: { ...DEFAULT_FILTERS, status: 'due', trash: true },
}

describe('saved searches', () => {
  it('create, list in order, rename, update, delete', async () => {
    const a = await createSavedSearch(db, '  Heart cards ', query)
    const b = await createSavedSearch(db, 'Lungs', { ...query, text: 'lung' })
    expect((await listSavedSearches(db)).map((s) => s.name)).toEqual([
      'Heart cards',
      'Lungs',
    ])
    expect(readSavedQuery(a.query)).toEqual(query)

    await renameSavedSearch(db, a.id, 'Cardiology')
    await updateSavedSearchQuery(db, b.id, { ...query, text: 'alveoli' })
    const [first, second] = await listSavedSearches(db)
    expect(first.name).toBe('Cardiology')
    expect(readSavedQuery(second.query).text).toBe('alveoli')

    await deleteSavedSearch(db, a.id)
    expect((await listSavedSearches(db)).map((s) => s.name)).toEqual(['Lungs'])
    // Soft delete: the record stays, marked.
    expect((await db.savedSearches.get(a.id))?.deletedAt).not.toBeNull()
  })

  it('reads odd or older stored queries with defaults', () => {
    expect(readSavedQuery({})).toEqual({
      text: '',
      type: 'all',
      filters: DEFAULT_FILTERS,
    })
    expect(
      readSavedQuery({
        text: 'x',
        type: 'video',
        filters: { status: 'gone', sort: 'recent', journal: 'no', tag: 't1' },
      }),
    ).toEqual({
      text: 'x',
      type: 'all',
      filters: { ...DEFAULT_FILTERS, sort: 'recent' },
    })
  })
})
