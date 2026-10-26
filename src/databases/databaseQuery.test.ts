import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { DbColumn } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { TITLE_COLUMN_ID } from './columnTypes'
import {
  loadDatabaseData,
  queryRows,
  resolveRows,
  type ResolvedRow,
  type RowQuery,
} from './databaseQuery'
import {
  addChoiceOption,
  addColumn,
  addRelationColumn,
  addRows,
  createDatabase,
  listColumns,
  updateColumnConfig,
} from './databaseService'

let db: LearningNotesDB
let ws: string
let nb: string
const NOW = Date.UTC(2026, 9, 27, 12)

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
  nb = (await createNotebook(db, ws, 'Study')).id
})

afterEach(async () => {
  await db.delete()
})

async function resolved(databaseId: string) {
  const data = await loadDatabaseData(db, databaseId)
  return {
    rows: resolveRows(data, NOW),
    columns: data.databases.get(databaseId)!.columns,
  }
}

const by = (rows: ResolvedRow[], column: DbColumn) =>
  Object.fromEntries(rows.map((r) => [r.page.title, r.values[column.id]]))

describe('formulas on rows', () => {
  it('uses other columns, the title and other formulas', async () => {
    const d = await createDatabase(db, ws, nb, 'Shop')
    const price = await addColumn(db, d.id, { name: 'Price', type: 'number' })
    const amount = await addColumn(db, d.id, { name: 'Amount', type: 'number' })
    const total = await addColumn(db, d.id, {
      name: 'Total',
      type: 'formula',
      config: { formula: '[Price] * [Amount]' },
    })
    const label = await addColumn(db, d.id, {
      name: 'Label',
      type: 'formula',
      config: { formula: '[Name] & ": " & [total]' },
    })
    await addRows(db, d.id, [
      { title: 'Pen', values: { [price.id]: 2.5, [amount.id]: 4 } },
      { title: 'Book', values: { [price.id]: 10 } },
    ])
    const { rows } = await resolved(d.id)
    expect(by(rows, total)).toEqual({ Pen: 10, Book: 0 })
    expect(by(rows, label)).toEqual({ Pen: 'Pen: 10', Book: 'Book: 0' })
  })

  it('shows errors in the cell: unknown column, loops', async () => {
    const d = await createDatabase(db, ws, nb, 'Loops')
    const a = await addColumn(db, d.id, {
      name: 'A',
      type: 'formula',
      config: { formula: '[B] + 1' },
    })
    const b = await addColumn(db, d.id, {
      name: 'B',
      type: 'formula',
      config: { formula: '[A] + 1' },
    })
    const c = await addColumn(db, d.id, {
      name: 'C',
      type: 'formula',
      config: { formula: '[Nope]' },
    })
    await addRows(db, d.id, [{ title: 'Row' }])
    const { rows } = await resolved(d.id)
    expect(rows[0].values[a.id]).toMatchObject({ error: 'cycle' })
    expect(rows[0].values[b.id]).toMatchObject({ error: 'cycle' })
    expect(rows[0].values[c.id]).toEqual({
      error: 'unknownColumn',
      detail: 'Nope',
    })
  })

  it('TODAY() and dates: days until an exam', async () => {
    const d = await createDatabase(db, ws, nb, 'Exams')
    const date = await addColumn(db, d.id, { name: 'Date', type: 'date' })
    const left = await addColumn(db, d.id, {
      name: 'Days left',
      type: 'formula',
      config: { formula: 'DAYS([Date], TODAY())' },
    })
    await addRows(db, d.id, [
      { title: 'Anatomy', values: { [date.id]: '2026-11-03' } },
    ])
    const { rows } = await resolved(d.id)
    expect(rows[0].values[left.id]).toBe(7)
  })
})

describe('rollups', () => {
  it('summarise related rows, also through the back side and formulas', async () => {
    const topics = await createDatabase(db, ws, nb, 'Topics')
    const quizzes = await createDatabase(db, ws, nb, 'Quizzes')
    const score = await addColumn(db, quizzes.id, {
      name: 'Score',
      type: 'number',
    })
    const passed = await addColumn(db, quizzes.id, {
      name: 'Passed',
      type: 'formula',
      config: { formula: '[Score] >= 50' },
    })
    const taken = await addColumn(db, quizzes.id, {
      name: 'Taken',
      type: 'date',
    })
    const topic = await addRelationColumn(db, quizzes.id, {
      name: 'Topic',
      targetDatabaseId: topics.id,
    })
    const [heart, lungs] = await addRows(db, topics.id, [
      { title: 'Heart' },
      { title: 'Lungs' },
    ])
    await addRows(db, quizzes.id, [
      {
        title: 'Q1',
        values: {
          [score.id]: 40,
          [taken.id]: '2026-10-01',
          [topic.id]: [heart.id],
        },
      },
      {
        title: 'Q2',
        values: {
          [score.id]: 80,
          [taken.id]: '2026-10-20',
          [topic.id]: [heart.id],
        },
      },
      { title: 'Q3', values: { [score.id]: 90, [topic.id]: [lungs.id] } },
    ])
    const back = (await listColumns(db, topics.id))[0] // "Quizzes"
    const rollup = async (name: string, targetColumnId: string, fn: string) =>
      addColumn(db, topics.id, {
        name,
        type: 'rollup',
        config: { relationColumnId: back.id, targetColumnId, fn },
      })
    const avg = await rollup('Average', score.id, 'average')
    const count = await rollup('Count', TITLE_COLUMN_ID, 'count')
    const pct = await rollup('Passed %', passed.id, 'percentChecked')
    const last = await rollup('Last quiz', taken.id, 'latest')
    const list = await rollup('Quizzes list', TITLE_COLUMN_ID, 'showOriginal')
    const max = await rollup('Best', score.id, 'max')

    const { rows } = await resolved(topics.id)
    expect(by(rows, avg)).toEqual({ Heart: 60, Lungs: 90 })
    expect(by(rows, count)).toEqual({ Heart: 2, Lungs: 1 })
    expect(by(rows, pct)).toEqual({ Heart: 0.5, Lungs: 1 })
    expect(by(rows, last)).toEqual({
      Heart: { date: '2026-10-20' },
      Lungs: null,
    })
    expect(by(rows, list)).toEqual({ Heart: ['Q1', 'Q2'], Lungs: ['Q3'] })
    expect(by(rows, max)).toEqual({ Heart: 80, Lungs: 90 })

    // A formula can use a rollup.
    const grade = await addColumn(db, topics.id, {
      name: 'Grade',
      type: 'formula',
      config: { formula: 'IF([Average] >= 75, "Good", "Revise")' },
    })
    const again = await resolved(topics.id)
    expect(by(again.rows, grade)).toEqual({ Heart: 'Revise', Lungs: 'Good' })
  })

  it('a rollup not set up yet is blank; bad settings are refused', async () => {
    const d = await createDatabase(db, ws, nb, 'D')
    const r = await addColumn(db, d.id, { name: 'R', type: 'rollup' })
    await addRows(db, d.id, [{ title: 'Row' }])
    expect((await resolved(d.id)).rows[0].values[r.id]).toBeNull()
    await expect(
      updateColumnConfig(db, r.id, { relationColumnId: 'nope' }),
    ).rejects.toThrow('Relation')
  })
})

describe('sorting and filtering', () => {
  async function drugs() {
    const d = await createDatabase(db, ws, nb, 'Drugs')
    const dose = await addColumn(db, d.id, { name: 'Dose', type: 'number' })
    const cls = await addColumn(db, d.id, { name: 'Class', type: 'choice' })
    const tags = await addColumn(db, d.id, { name: 'Uses', type: 'choices' })
    const done = await addColumn(db, d.id, {
      name: 'Learned',
      type: 'checkbox',
    })
    const added = await addColumn(db, d.id, { name: 'Added', type: 'date' })
    // Options in menu order: Statin first, then NSAID.
    const statin = await addChoiceOption(db, cls.id, 'Statin')
    const nsaid = await addChoiceOption(db, cls.id, 'NSAID')
    const pain = await addChoiceOption(db, tags.id, 'Pain')
    const fever = await addChoiceOption(db, tags.id, 'Fever')
    await addRows(db, d.id, [
      {
        title: 'aspirin',
        values: {
          [dose.id]: 75,
          [cls.id]: nsaid.id,
          [tags.id]: [pain.id, fever.id],
          [done.id]: true,
          [added.id]: '2026-10-01',
        },
      },
      { title: 'Atorvastatin', values: { [dose.id]: 20, [cls.id]: statin.id } },
      {
        title: 'Ibuprofen',
        values: {
          [dose.id]: 400,
          [cls.id]: nsaid.id,
          [tags.id]: [pain.id],
          [added.id]: '2026-10-20',
        },
      },
      { title: 'Unknown' },
    ])
    const { rows, columns } = await resolved(d.id)
    const run = (query: RowQuery) =>
      queryRows(rows, columns, query).map((r) => r.page.title)
    return { run, dose, cls, tags, done, added, nsaid, statin, pain, fever }
  }

  it('sorts numbers, text (ignoring case) and choices by option order; blanks last', async () => {
    const { run, dose, cls } = await drugs()
    expect(run({ sorts: [{ columnId: dose.id, direction: 'asc' }] })).toEqual([
      'Atorvastatin',
      'aspirin',
      'Ibuprofen',
      'Unknown',
    ])
    expect(run({ sorts: [{ columnId: dose.id, direction: 'desc' }] })).toEqual([
      'Ibuprofen',
      'aspirin',
      'Atorvastatin',
      'Unknown',
    ])
    expect(
      run({ sorts: [{ columnId: TITLE_COLUMN_ID, direction: 'asc' }] }),
    ).toEqual(['aspirin', 'Atorvastatin', 'Ibuprofen', 'Unknown'])
    expect(
      run({
        sorts: [
          { columnId: cls.id, direction: 'asc' },
          { columnId: dose.id, direction: 'desc' },
        ],
      }),
    ).toEqual(['Atorvastatin', 'Ibuprofen', 'aspirin', 'Unknown'])
  })

  it('filters by text, number, choice, list, checkbox and date', async () => {
    const { run, dose, cls, tags, done, added, nsaid, statin, fever } =
      await drugs()
    const f = (columnId: string, op: never, value?: unknown) =>
      run({ filters: [{ columnId, op, value: value as never }] })
    expect(f(TITLE_COLUMN_ID, 'contains' as never, 'STATIN')).toEqual([
      'Atorvastatin',
    ])
    expect(f(TITLE_COLUMN_ID, 'startsWith' as never, 'a')).toEqual([
      'aspirin',
      'Atorvastatin',
    ])
    expect(f(dose.id, 'gt' as never, 50)).toEqual(['aspirin', 'Ibuprofen'])
    expect(f(dose.id, 'lte' as never, 75)).toEqual(['aspirin', 'Atorvastatin'])
    expect(f(dose.id, 'isEmpty' as never)).toEqual(['Unknown'])
    expect(f(cls.id, 'is' as never, nsaid.id)).toEqual(['aspirin', 'Ibuprofen'])
    expect(f(cls.id, 'isAnyOf' as never, [statin.id])).toEqual(['Atorvastatin'])
    expect(f(cls.id, 'isNot' as never, nsaid.id)).toEqual([
      'Atorvastatin',
      'Unknown',
    ])
    expect(f(tags.id, 'isAnyOf' as never, [fever.id])).toEqual(['aspirin'])
    expect(f(tags.id, 'isNoneOf' as never, [fever.id])).toEqual([
      'Atorvastatin',
      'Ibuprofen',
      'Unknown',
    ])
    expect(f(done.id, 'isChecked' as never)).toEqual(['aspirin'])
    expect(f(done.id, 'isNotChecked' as never)).toHaveLength(3)
    expect(f(added.id, 'after' as never, '2026-10-01')).toEqual(['Ibuprofen'])
    expect(f(added.id, 'onOrBefore' as never, '2026-10-01')).toEqual([
      'aspirin',
    ])
    expect(f(added.id, 'is' as never, '2026-10-20')).toEqual(['Ibuprofen'])
  })

  it('combines filters with all (default) or any', async () => {
    const { run, dose, done } = await drugs()
    const filters = [
      { columnId: dose.id, op: 'gt' as const, value: 100 },
      { columnId: done.id, op: 'isChecked' as const },
    ]
    expect(run({ filters })).toEqual([])
    expect(run({ filters, match: 'any' })).toEqual(['aspirin', 'Ibuprofen'])
  })
})
