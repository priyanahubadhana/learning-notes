import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { Block } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage, deletePage } from '../pages/pageService'
import { listLessonMarks, setLessonSummary } from './reviseService'

let db: LearningNotesDB
let nb: string

beforeEach(async () => {
  db = createTestDb()
  const ws = (await getOrCreateDefaultWorkspace(db)).id
  nb = (await createNotebook(db, ws, 'Medicine')).id
})

afterEach(async () => {
  await db.delete()
})

const marked = (
  id: string,
  pageId: string,
  text: string,
  mark: string,
): Block => ({
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
  id,
  pageId,
  parentId: null,
  type: 'paragraph',
  content: { text: [{ type: 'text', text, styles: { mark } }] },
  order: 'a0',
})

describe('Revise data', () => {
  it('collects marks per lesson, sub-pages included, skipping deleted pages', async () => {
    const heart = await createPage(db, nb, null, 'Heart')
    const valves = await createPage(db, nb, heart.id, 'Valves')
    const lungs = await createPage(db, nb, null, 'Lungs')
    const gone = await createPage(db, nb, null, 'Gone')
    await db.blocks.bulkAdd([
      marked('b1', heart.id, 'S1', 'keyword'),
      marked('b2', valves.id, 'Mitral', 'key'),
      marked('b3', lungs.id, 'FEV1', 'must'),
      marked('b4', gone.id, 'Hidden', 'key'),
    ])
    await deletePage(db, gone.id)
    const lessons = await listLessonMarks(db, nb)
    expect(lessons.map((l) => [l.lesson.title, l.marks.length])).toEqual([
      ['Heart', 2],
      ['Lungs', 1],
    ])
  })

  it('keeps a lesson summary, and clears it when emptied', async () => {
    const heart = await createPage(db, nb, null, 'Heart')
    await setLessonSummary(db, heart.id, 'S1 closes the AV valves')
    expect((await db.pages.get(heart.id))?.summary).toBe(
      'S1 closes the AV valves',
    )
    await setLessonSummary(db, heart.id, '   ')
    expect((await db.pages.get(heart.id))?.summary).toBeUndefined()
  })
})
