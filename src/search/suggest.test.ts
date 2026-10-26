import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { plainText } from '../editor/mapping'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { editDistance, suggestSearch } from './suggest'

let db: LearningNotesDB

beforeEach(async () => {
  db = createTestDb()
  const ws = (await getOrCreateDefaultWorkspace(db)).id
  const nb = (await createNotebook(db, ws, 'Medicine')).id
  const page = await createPage(db, nb, null, 'Mitral valve')
  await createBlock(db, {
    pageId: page.id,
    type: 'paragraph',
    content: { text: plainText('Mitochondria and the heart; 東京都 notes') },
  })
})

afterEach(async () => {
  await db.delete()
})

describe('suggestSearch', () => {
  it('suggests the closest indexed words, only when they find something', async () => {
    expect(await suggestSearch(db, 'mitrel')).toBe('mitral')
    expect(await suggestSearch(db, 'mitral vlave')).toBe('mitral valve')
    expect(await suggestSearch(db, 'mitocondria')).toBe('mitochondria')
    // The start of a long word, with a typo.
    expect(await suggestSearch(db, 'mitpch')).toBe('mitochondria')
  })

  it('no suggestion when nothing is close, the words exist, or the script has no spelling', async () => {
    expect(await suggestSearch(db, 'zebra')).toBeNull()
    expect(await suggestSearch(db, 'mitral')).toBeNull()
    expect(await suggestSearch(db, '京都府')).toBeNull()
    expect(await suggestSearch(db, '!!')).toBeNull()
  })
})

describe('editDistance', () => {
  it('counts inserts, deletes, changes and swaps; stops past the limit', () => {
    expect(editDistance('valve', 'valve', 2)).toBe(0)
    expect(editDistance('vlave', 'valve', 2)).toBe(1)
    expect(editDistance('mitrel', 'mitral', 2)).toBe(1)
    expect(editDistance('heat', 'heart', 1)).toBe(1)
    expect(editDistance('abc', 'xyzabc', 2)).toBe(3)
  })
})
