import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { JsonValue } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { loadDatabaseData, queryRows, resolveRows } from './databaseQuery'
import {
  addChoiceOption,
  addColumn,
  addRelationColumn,
  addRows,
  createDatabase,
  listColumns,
} from './databaseService'

/**
 * Speed tests with 10,000 rows. Times are for the in-memory test database
 * (slower than a browser's IndexedDB), so limits are generous; they catch
 * work that grows much faster than the number of rows.
 */

let db: LearningNotesDB

beforeEach(() => {
  db = createTestDb()
})

afterEach(async () => {
  await db.delete()
})

const ROWS = 10_000

describe('10,000-row database', () => {
  it('adds, loads, works out formulas + rollups, sorts and filters fast', async () => {
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    const nb = (await createNotebook(db, ws, 'Big')).id
    const topics = await createDatabase(db, ws, nb, 'Topics')
    const cards = await createDatabase(db, ws, nb, 'Questions')
    const score = await addColumn(db, cards.id, {
      name: 'Score',
      type: 'number',
    })
    const level = await addColumn(db, cards.id, {
      name: 'Level',
      type: 'choice',
    })
    const options = [
      await addChoiceOption(db, level.id, 'Easy'),
      await addChoiceOption(db, level.id, 'Hard'),
    ]
    const doubled = await addColumn(db, cards.id, {
      name: 'Grade',
      type: 'formula',
      config: {
        formula:
          'IF([Score] >= 50, "Pass", "Revise") & " " & ROUND([Score] / 10)',
      },
    })
    const topic = await addRelationColumn(db, cards.id, {
      name: 'Topic',
      targetDatabaseId: topics.id,
    })
    const topicRows = await addRows(
      db,
      topics.id,
      Array.from({ length: 100 }, (_, i) => ({ title: `Topic ${i}` })),
    )

    let start = performance.now()
    await addRows(
      db,
      cards.id,
      Array.from({ length: ROWS }, (_, i) => ({
        title: `Question ${i}`,
        values: {
          [score.id]: (i * 37) % 101,
          [level.id]: options[i % 2].id,
          [topic.id]: [topicRows[i % 100].id],
        } as Record<string, JsonValue>,
      })),
    )
    const addMs = performance.now() - start

    // The topics side: a rollup over 100 related questions each.
    const back = (await listColumns(db, topics.id))[0]
    const avg = await addColumn(db, topics.id, {
      name: 'Average',
      type: 'rollup',
      config: {
        relationColumnId: back.id,
        targetColumnId: score.id,
        fn: 'average',
      },
    })

    start = performance.now()
    const data = await loadDatabaseData(db, cards.id)
    const loadMs = performance.now() - start

    start = performance.now()
    const rows = resolveRows(data)
    const columns = data.databases.get(cards.id)!.columns
    const sorted = queryRows(rows, columns, {
      filters: [{ columnId: level.id, op: 'is', value: options[1].id }],
      sorts: [
        { columnId: score.id, direction: 'desc' },
        { columnId: 'title', direction: 'asc' },
      ],
    })
    const queryMs = performance.now() - start

    expect(rows).toHaveLength(ROWS)
    expect(sorted).toHaveLength(ROWS / 2)
    expect(sorted[0].values[score.id]).toBe(100)
    expect(rows[1].values[doubled.id]).toBe('Revise 4')

    start = performance.now()
    const topicData = await loadDatabaseData(db, topics.id)
    const topicRowsResolved = resolveRows(topicData)
    const rollupMs = performance.now() - start
    expect(topicRowsResolved).toHaveLength(100)
    expect(typeof topicRowsResolved[0].values[avg.id]).toBe('number')

    console.info(
      `10k rows: add ${addMs.toFixed(0)} ms, load ${loadMs.toFixed(0)} ms, ` +
        `formulas+sort+filter ${queryMs.toFixed(0)} ms, rollups ${rollupMs.toFixed(0)} ms`,
    )
    expect(addMs).toBeLessThan(10_000)
    expect(loadMs).toBeLessThan(3_000)
    expect(queryMs).toBeLessThan(1_000)
    expect(rollupMs).toBeLessThan(3_000)
  }, 60_000)
})
