import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { choiceOptions } from './columnTypes'
import { addRow, listColumns, listViews } from './databaseService'
import {
  createStarterDatabase,
  STARTER_IDS,
  starterName,
} from './starterDatabases'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})

afterEach(async () => {
  await db.delete()
})

describe('starter databases', () => {
  it('every starter makes a usable database with its three views', async () => {
    for (const id of STARTER_IDS) {
      const database = await createStarterDatabase(db, ws, null, id)
      expect(starterName(id).length).toBeGreaterThan(3)
      expect(await listViews(db, database.id)).toHaveLength(3)
      const row = await addRow(db, database.id, { title: 'First' })
      expect(row.databaseId).toBe(database.id)
    }
  })

  it('the PAO table starts with the rows 00 to 99', async () => {
    const pao = await createStarterDatabase(db, ws, null, 'pao')
    expect((await listColumns(db, pao.id)).map((c) => c.name)).toEqual([
      'Person',
      'Action',
      'Object',
    ])
    const rows = await db.pages.where('databaseId').equals(pao.id).toArray()
    expect(rows).toHaveLength(100)
    expect(rows.map((r) => r.title).sort()[99]).toBe('99')
  })

  it('the Drug list has its columns and the Books status has options', async () => {
    const drugs = await createStarterDatabase(db, ws, null, 'drugs')
    expect(drugs.title).toBe('Drug list')
    expect(drugs.titleName).toBe('Drug')
    expect((await listColumns(db, drugs.id)).map((c) => c.name)).toEqual([
      'Class',
      'Dose',
      'Side effects',
      'Confidence',
    ])
    const books = await createStarterDatabase(db, ws, null, 'books')
    const status = (await listColumns(db, books.id)).find(
      (c) => c.name === 'Status',
    )!
    expect(choiceOptions(status).map((o) => o.name)).toEqual([
      'To read',
      'Reading',
      'Done',
    ])
  })
})
