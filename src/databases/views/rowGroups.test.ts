import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../../core/db'
import { createTestDb } from '../../core/testing'
import { getOrCreateDefaultWorkspace } from '../../core/workspaceService'
import { createNotebook } from '../../notebooks/notebookService'
import { loadDatabaseData, resolveRows } from '../databaseQuery'
import {
  addChoiceOption,
  addColumn,
  addRow,
  createDatabase,
} from '../databaseService'
import {
  flattenGroups,
  groupByColumns,
  groupRowsByColumn,
  viewGroupColumn,
  withGroup,
} from './rowGroups'

let db: LearningNotesDB

beforeEach(async () => {
  db = createTestDb()
})

afterEach(async () => {
  await db.delete()
})

async function build() {
  const ws = (await getOrCreateDefaultWorkspace(db)).id
  const nb = (await createNotebook(db, ws, 'N')).id
  const lib = await createDatabase(db, ws, nb, 'Books')
  const status = await addColumn(db, lib.id, { name: 'Status', type: 'choice' })
  const todo = await addChoiceOption(db, status.id, 'To read')
  const done = await addChoiceOption(db, status.id, 'Done')
  await addRow(db, lib.id, { title: 'a', values: { [status.id]: done.id } })
  await addRow(db, lib.id, { title: 'b', values: { [status.id]: todo.id } })
  await addRow(db, lib.id, { title: 'c' })
  await addRow(db, lib.id, { title: 'd', values: { [status.id]: done.id } })
  const data = await loadDatabaseData(db, lib.id)
  const columns = data.databases.get(lib.id)!.columns
  return { rows: resolveRows(data), columns, status }
}

describe('row groups', () => {
  it('groups in option order, no value last, keeping row order', async () => {
    const { rows, status, columns } = await build()
    const column = columns.find((c) => c.id === status.id)!
    const groups = groupRowsByColumn(rows, column)
    expect(groups.map((g) => g.key)).toEqual(['To read', 'Done', ''])
    expect(groups[1].rows.map((r) => r.page.title)).toEqual(['a', 'd'])
  })

  it('flattens groups, and a collapsed group shows only its heading', async () => {
    const { rows, status, columns } = await build()
    const groups = groupRowsByColumn(
      rows,
      columns.find((c) => c.id === status.id)!,
    )
    const open = flattenGroups(groups, new Set())
    expect(open.map((i) => i.kind)).toEqual([
      'group',
      'row',
      'group',
      'row',
      'row',
      'group',
      'row',
    ])
    const closed = flattenGroups(groups, new Set(['Done']))
    expect(closed).toHaveLength(5)
  })

  it('saves and reads the grouping column; a missing column is ignored', async () => {
    const { status, columns } = await build()
    const config = withGroup({}, status.id)
    expect(viewGroupColumn(config, columns)?.id).toBe(status.id)
    expect(viewGroupColumn(withGroup(config, null), columns)).toBeUndefined()
    expect(viewGroupColumn({ groupBy: 'gone' }, columns)).toBeUndefined()
    expect(groupByColumns(columns).length).toBeGreaterThan(0)
  })
})
