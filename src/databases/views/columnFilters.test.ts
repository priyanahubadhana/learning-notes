import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../../core/db'
import { createTestDb } from '../../core/testing'
import type { DbColumn } from '../../core/types'
import { getOrCreateDefaultWorkspace } from '../../core/workspaceService'
import { createNotebook } from '../../notebooks/notebookService'
import { loadDatabaseData } from '../databaseQuery'
import { addColumn, addRows, createDatabase } from '../databaseService'
import {
  filterChoices,
  filterLabel,
  numberForInput,
  sortLabels,
  typedNumber,
} from './columnFilters'
import { previewFormula } from './formulaPreview'

const column = (type: string, config = {}): DbColumn => ({
  id: 'c',
  databaseId: 'd',
  name: 'C',
  type,
  config,
  order: 'a',
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
})

describe('column menus', () => {
  it('offers filters and sort words that fit the column', () => {
    const ops = (c: DbColumn | null) => filterChoices(c).map((f) => f.op)
    expect(ops(null)).toContain('contains')
    expect(ops(column('date'))).toContain('before')
    expect(ops(column('checkbox'))).toEqual(['isChecked', 'isNotChecked'])
    expect(ops(column('choice'))).toEqual([
      'isAnyOf',
      'isNoneOf',
      'isEmpty',
      'isNotEmpty',
    ])
    expect(ops(column('trackerStatus'))).toContain('gt')
    expect(sortLabels(column('number'))).toEqual(['Low → high', 'High → low'])
    expect(sortLabels(null)).toEqual(['A → Z', 'Z → A'])
  })

  it('reads filters as chips', () => {
    const stars = column('number', { format: 'stars', max: 5 })
    expect(
      filterLabel({ columnId: 'c', op: 'gte', value: 3 }, stars, 'Confidence'),
    ).toBe('Confidence at least ★★★☆☆')
    expect(
      filterLabel({ columnId: 'c', op: 'isEmpty' }, stars, 'Confidence'),
    ).toBe('Confidence has no rating')
    const pick = column('choice', {
      options: [
        { id: 'a', name: 'High' },
        { id: 'b', name: 'Low' },
      ],
    })
    expect(
      filterLabel(
        { columnId: 'c', op: 'isAnyOf', value: ['a', 'b'] },
        pick,
        'P',
      ),
    ).toBe('P is any of High or Low')
    expect(filterLabel({ columnId: 'c', op: 'isEmpty' }, null, 'Name')).toBe(
      'Name is empty',
    )
    expect(
      filterLabel(
        { columnId: 'c', op: 'contains', value: 'ecg' },
        null,
        'Name',
      ),
    ).toBe('Name contains “ecg”')
  })

  it('types percents as whole numbers, stores fractions', () => {
    const pct = column('number', { format: 'percent' })
    expect(typedNumber('75', pct)).toBe(0.75)
    expect(typedNumber('1,200', null)).toBe(1200)
    expect(typedNumber('x', null)).toBeNull()
    expect(typedNumber(' ', null)).toBeNull()
    expect(numberForInput(0.755, pct)).toBe('75.5')
    expect(numberForInput(3, null)).toBe('3')
  })
})

describe('formula preview', () => {
  let db: LearningNotesDB
  beforeEach(() => {
    db = createTestDb()
  })
  afterEach(async () => {
    await db.delete()
  })

  it('works a formula out for the first row before it is saved', async () => {
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const nb = (await createNotebook(db, ws, 'Study')).id
    const drugs = await createDatabase(db, ws, nb, 'Drugs')
    const dose = await addColumn(db, drugs.id, { name: 'Dose', type: 'number' })
    const data = async () => loadDatabaseData(db, drugs.id)
    expect(previewFormula(await data(), '1 + 1', 0)).toBeNull()

    await addRows(db, drugs.id, [
      { title: 'Aspirin', values: { [dose.id]: 75 } },
      { title: 'Heparin', values: { [dose.id]: 5000 } },
    ])
    expect(previewFormula(await data(), '[Dose] * 2', 0)).toEqual({
      title: 'Aspirin',
      value: 150,
    })
    expect(previewFormula(await data(), '[Nope]', 0)?.value).toEqual({
      error: 'unknownColumn',
      detail: 'Nope',
    })
    // Editing a formula column: its new formula replaces the old one.
    const twice = await addColumn(db, drugs.id, {
      name: 'Twice',
      type: 'formula',
      config: { formula: '[Dose] * 2' },
    })
    expect(previewFormula(await data(), '[Dose] + 1', 0, twice.id)?.value).toBe(
      76,
    )
  })
})
