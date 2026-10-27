import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { loadDatabaseData, resolveRows } from '../databases/databaseQuery'
import { listColumns } from '../databases/databaseService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { listLessonMarks } from '../revise/reviseService'
import { loadSampleNotebook } from './sampleNotebook'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})

afterEach(async () => {
  await db.delete()
})

describe('sample notebook', () => {
  it('adds one notebook with two lessons, all four marks, cards and a database', async () => {
    const NOW = new Date(2026, 9, 28, 12).getTime()
    const notebook = await loadSampleNotebook(db, ws, NOW)
    const lessons = await listLessonMarks(db, notebook.id)
    expect(lessons.map((l) => l.lesson.title)).toEqual([
      'Heart sounds',
      'Lung volumes',
    ])
    const labels = new Set(lessons.flatMap((l) => l.marks.map((m) => m.label)))
    expect([...labels].sort()).toEqual(['formula', 'key', 'keyword', 'must'])
    expect(await db.cards.where('notebookId').equals(notebook.id).count()).toBe(
      4,
    )

    const database = (
      await db.databases.where('notebookId').equals(notebook.id).toArray()
    )[0]
    const columns = await listColumns(db, database.id)
    expect(columns.map((c) => c.type)).toEqual(['text', 'date', 'url'])
    const rows = resolveRows(await loadDatabaseData(db, database.id))
    expect(rows).toHaveLength(5)
    expect(rows[0].values[columns[1].id]).toEqual({ date: '2026-10-25' })
    for (const row of rows) {
      expect(String(row.values[columns[2].id])).toMatch(/^https:\/\//)
    }
  })

  it('only adds: existing data is untouched, and loading twice gives two notebooks', async () => {
    const mine = (await createNotebook(db, ws, 'Mine')).id
    const page = await createPage(db, mine, null, 'My page')
    const before = {
      notebooks: await db.notebooks.toArray(),
      page: await db.pages.get(page.id),
    }
    await loadSampleNotebook(db, ws)
    await loadSampleNotebook(db, ws)
    expect(
      (await db.notebooks.toArray()).filter(
        (n) => n.title === 'Sample notebook',
      ),
    ).toHaveLength(2)
    for (const old of before.notebooks) {
      expect(await db.notebooks.get(old.id)).toEqual(old)
    }
    expect(await db.pages.get(page.id)).toEqual(before.page)
    expect(
      await db.pages.where('notebookId').equals(mine).toArray(),
    ).toHaveLength(1)
  })
})
