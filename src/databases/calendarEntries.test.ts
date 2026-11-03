import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { openJournalDay } from '../journal/journalService'
import { createNotebook } from '../notebooks/notebookService'
import { calendarEntries, entriesByDay } from './calendarEntries'
import { addColumn, addRows, createDatabase } from './databaseService'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})
afterEach(async () => {
  await db.delete()
})

async function dated(name: string, days: (string | null)[]) {
  const nb = (await createNotebook(db, ws, name)).id
  const database = await createDatabase(db, ws, nb, name)
  const date = await addColumn(db, database.id, { name: 'Due', type: 'date' })
  await addRows(
    db,
    database.id,
    days.map((d, i) => ({
      title: `${name} ${i}`,
      values: d ? { [date.id]: d } : {},
    })),
  )
  return database
}

describe('calendar entries', () => {
  it('lists dated rows of every database inside the period only', async () => {
    await dated('Tasks', ['2026-11-03', '2026-11-20', '2026-12-05', null])
    await dated('Exams', ['2026-11-03'])
    const entries = await calendarEntries(db, ws, '2026-11-01', '2026-11-30')
    expect(entries.map((e) => `${e.day} ${e.title}`).sort()).toEqual([
      '2026-11-03 Exams 0',
      '2026-11-03 Tasks 0',
      '2026-11-20 Tasks 1',
    ])
    expect(entries.every((e) => e.source === 'row')).toBe(true)
    expect(entries.find((e) => e.title === 'Exams 0')?.databaseName).toBe(
      'Exams',
    )
  })

  it('includes journal days and puts them first in a day', async () => {
    await dated('Tasks', ['2026-11-04'])
    await openJournalDay(db, ws, new Date(2026, 10, 4))
    const entries = await calendarEntries(db, ws, '2026-11-01', '2026-11-30')
    expect(entries.filter((e) => e.source === 'journal')).toHaveLength(1)
    const day = entriesByDay(entries).get('2026-11-04')!
    expect(day.map((e) => e.source)).toEqual(['journal', 'row'])
  })

  it('leaves out deleted rows and databases without a date column', async () => {
    const database = await dated('Tasks', ['2026-11-04', '2026-11-05'])
    const rows = await db.pages
      .where('databaseId')
      .equals(database.id)
      .toArray()
    await db.pages.update(rows[0].id, { deletedAt: Date.now() })
    const nb = (await createNotebook(db, ws, 'Plain')).id
    const plain = await createDatabase(db, ws, nb, 'Plain')
    await addRows(db, plain.id, [{ title: 'No date' }])
    const entries = await calendarEntries(db, ws, '2026-11-01', '2026-11-30')
    expect(entries).toHaveLength(1)
  })

  it('places a moment on its local day', async () => {
    const nb = (await createNotebook(db, ws, 'Moments')).id
    const database = await createDatabase(db, ws, nb, 'Moments')
    const col = await addColumn(db, database.id, { name: 'At', type: 'date' })
    const noon = new Date(2026, 10, 9, 12, 0).toISOString()
    await addRows(db, database.id, [
      { title: 'Noon', values: { [col.id]: noon } },
    ])
    const entries = await calendarEntries(db, ws, '2026-11-09', '2026-11-09')
    expect(entries.map((e) => e.day)).toEqual(['2026-11-09'])
  })
})

describe('calendar speed', () => {
  it('reads a month out of 10,000 dated rows quickly', async () => {
    const nb = (await createNotebook(db, ws, 'Big')).id
    const database = await createDatabase(db, ws, nb, 'Big')
    const col = await addColumn(db, database.id, { name: 'Due', type: 'date' })
    const rows = Array.from({ length: 10_000 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 0, 1 + (i % 700)))
      return {
        title: `Row ${i}`,
        values: { [col.id]: d.toISOString().slice(0, 10) },
      }
    })
    await addRows(db, database.id, rows)
    const start = performance.now()
    const entries = await calendarEntries(db, ws, '2026-11-01', '2026-11-30')
    const ms = performance.now() - start
    expect(entries.length).toBeGreaterThan(300)
    expect(ms).toBeLessThan(2500)
  }, 60_000)
})
