import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { parseCsv } from './csv'
import {
  exportDatabaseCsv,
  guessMapping,
  guessType,
  importCsvAsNewDatabase,
  importCsvRows,
  parseDate,
} from './csvTransfer'
import { loadDatabaseData, resolveRows } from './databaseQuery'
import {
  addColumn,
  addRow,
  createDatabase,
  listColumns,
  listRows,
  restoreTrashedRows,
} from './databaseService'
import { createStarterDatabase } from './starterDatabases'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})

afterEach(async () => {
  await db.delete()
})

describe('CSV transfer', () => {
  it('guesses types and reads dates', () => {
    expect(guessType(['1', '2.5', ''])).toBe('number')
    expect(guessType(['2026-10-27', '27/10/2026'])).toBe('date')
    expect(guessType(['true', 'no', 'yes'])).toBe('checkbox')
    expect(guessType(['https://a.org', 'http://b.org'])).toBe('url')
    expect(guessType(['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b'])).toBe('choice')
    expect(guessType(['hello', 'world'])).toBe('text')
    expect(parseDate('05/11/2026')).toBe('2026-11-05')
    expect(parseDate('13/11/2026')).toBe('2026-11-13')
    expect(parseDate('nonsense')).toBeNull()
  })

  it('exports a database and imports it into another as new rows', async () => {
    const books = await createStarterDatabase(db, ws, null, 'books')
    const columns = await listColumns(db, books.id)
    const col = (name: string) => columns.find((c) => c.name === name)!
    const options = col('Status').config.options as { id: string }[]
    await addRow(db, books.id, {
      title: 'Dune',
      values: {
        [col('Author').id]: 'Herbert, Frank',
        [col('Status').id]: options[1].id,
        [col('Rating').id]: 4,
        [col('Finished').id]: '2026-10-01',
      },
    })
    await addRow(db, books.id, { title: '=EVIL()' })

    const { fileName, text } = await exportDatabaseCsv(db, books.id)
    expect(fileName).toBe('Books.csv')
    const parsed = parseCsv(text)
    expect(parsed.rows[0]).toEqual([
      'Title',
      'Author',
      'Status',
      'Rating',
      'Finished',
    ])
    expect(parsed.rows[1]).toEqual([
      'Dune',
      'Herbert, Frank',
      'Reading',
      '4',
      '2026-10-01',
    ])
    expect(parsed.rows[2][0]).toBe("'=EVIL()") // protected for spreadsheets

    const other = await createStarterDatabase(db, ws, null, 'books')
    const [headers, ...body] = parsed.rows
    const otherColumns = await listColumns(db, other.id)
    const mapping = guessMapping(headers, otherColumns, 'Title', body)
    expect(mapping.map((m) => m.kind)).toEqual([
      'title',
      'column',
      'column',
      'column',
      'column',
    ])
    const result = await importCsvRows(db, other.id, headers, body, mapping)
    expect(result).toEqual({ added: 2, newColumns: 0 })
    const rows = resolveRows(await loadDatabaseData(db, other.id))
    expect(rows.map((r) => r.page.title)).toEqual(['Dune', '=EVIL()'])
    const id = (name: string) => otherColumns.find((c) => c.name === name)!.id
    expect(rows[0].values[id('Author')]).toBe('Herbert, Frank')
    expect(rows[0].values[id('Status')]).toBe('Reading')
    expect(rows[0].values[id('Rating')]).toBe(4)
    expect(rows[0].values[id('Finished')]).toEqual({ date: '2026-10-01' })
    // Importing again only adds more rows; nothing is changed or merged.
    await importCsvRows(db, other.id, headers, body, mapping)
    expect(resolveRows(await loadDatabaseData(db, other.id))).toHaveLength(4)
  })

  it('makes new columns from unmatched CSV columns and creates choices', async () => {
    const list = await createDatabase(db, ws, null, 'List')
    const csv =
      'Name,Score,Kind,Done\nA,1,x,true\nB,2,y,false\nC,3,x,yes\nD,4,x,no\nE,5,y,true\nF,6,x,true\n'
    const [headers, ...body] = parseCsv(csv).rows
    const mapping = guessMapping(headers, [], 'Name', body)
    expect(mapping).toEqual([
      { kind: 'title' },
      { kind: 'new', type: 'number' },
      { kind: 'new', type: 'choice' },
      { kind: 'new', type: 'checkbox' },
    ])
    expect(await importCsvRows(db, list.id, headers, body, mapping)).toEqual({
      added: 6,
      newColumns: 3,
    })
    const columns = await listColumns(db, list.id)
    expect(columns.map((c) => [c.name, c.type])).toEqual([
      ['Score', 'number'],
      ['Kind', 'choice'],
      ['Done', 'checkbox'],
    ])
    const out = resolveRows(await loadDatabaseData(db, list.id))
    expect(out[0].values[columns[2].id]).toBe(true)
    expect(out[1].values[columns[2].id]).toBe(false)
    expect(out[2].values[columns[1].id]).toBe('x')
  })

  it('imports 10,000 rows quickly', async () => {
    const list = await createDatabase(db, ws, null, 'Big')
    await addColumn(db, list.id, { name: 'N', type: 'number' })
    const columns = await listColumns(db, list.id)
    const body = Array.from({ length: 10_000 }, (_, i) => [
      `Row ${i}`,
      String(i),
    ])
    const start = performance.now()
    const result = await importCsvRows(db, list.id, ['Name', 'N'], body, [
      { kind: 'title' },
      { kind: 'column', columnId: columns[0].id },
    ])
    const ms = performance.now() - start
    expect(result.added).toBe(10_000)
    expect(ms).toBeLessThan(15_000) // fake-indexeddb is far slower than a browser
  }, 60_000)

  describe('what to do with the rows that are there', () => {
    const csv = ['Name,Score', 'A,10', 'B,20', 'C,30', ''].join('\n')
    const setup = async () => {
      const list = await createDatabase(db, ws, null, 'List')
      const score = await addColumn(db, list.id, {
        name: 'Score',
        type: 'number',
      })
      await addRow(db, list.id, { title: 'A', values: { [score.id]: 1 } })
      await addRow(db, list.id, { title: 'B', values: { [score.id]: 2 } })
      await addRow(db, list.id, { title: 'Old', values: { [score.id]: 3 } })
      const [headers, ...body] = parseCsv(csv).rows
      const mapping = guessMapping(headers, [score], 'Name', body)
      return { list, score, headers, body, mapping }
    }
    const titles = async (id: string) =>
      (await listRows(db, id)).map((p) => p.title)

    it('add: keeps the old rows and adds the new ones', async () => {
      const { list, headers, body, mapping } = await setup()
      await importCsvRows(db, list.id, headers, body, mapping, 'add')
      expect(await titles(list.id)).toEqual(['A', 'B', 'Old', 'A', 'B', 'C'])
    })

    it('replace: the old rows go to Trash and can be brought back', async () => {
      const { list, headers, body, mapping } = await setup()
      const result = await importCsvRows(
        db,
        list.id,
        headers,
        body,
        mapping,
        'replace',
      )
      expect(result.added).toBe(3)
      expect(result.trashed?.ids).toHaveLength(3)
      expect(await titles(list.id)).toEqual(['A', 'B', 'C'])
      const trashedRow = await db.pages.get(result.trashed!.ids[2])
      expect(trashedRow?.deletedAt).not.toBeNull()
      await restoreTrashedRows(db, result.trashed!)
      expect((await titles(list.id)).sort()).toEqual(
        ['A', 'A', 'B', 'B', 'C', 'Old'].sort(),
      )
    })

    it('update: same title changes the row, the rest is added', async () => {
      const { list, score, headers, body, mapping } = await setup()
      const result = await importCsvRows(
        db,
        list.id,
        headers,
        body,
        mapping,
        'update',
      )
      expect(result).toMatchObject({ added: 1, updated: 2, newColumns: 0 })
      const rows = resolveRows(await loadDatabaseData(db, list.id))
      const byTitle = Object.fromEntries(
        rows.map((r) => [r.page.title, r.values[score.id]]),
      )
      expect(byTitle).toEqual({ A: 10, B: 20, Old: 3, C: 30 })
    })

    it('new database: a copy next to the old one; the old one is not touched', async () => {
      const { list, headers, body, mapping } = await setup()
      const result = await importCsvAsNewDatabase(
        db,
        list.id,
        headers,
        body,
        mapping,
      )
      expect(result).toMatchObject({ added: 3, newColumns: 1 })
      expect(result.databaseId).not.toBe(list.id)
      expect(await titles(result.databaseId)).toEqual(['A', 'B', 'C'])
      expect(await titles(list.id)).toEqual(['A', 'B', 'Old'])
      const copy = await db.databases.get(result.databaseId)
      expect(copy?.title).toBe('List (imported)')
      expect((await listColumns(db, result.databaseId))[0]).toMatchObject({
        name: 'Score',
        type: 'number',
      })
    })
  })
})
