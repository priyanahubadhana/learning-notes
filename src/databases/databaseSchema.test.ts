import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { bundleFile, exportNotebookBundle, readBundle } from '../share/bundle'
import { importBundle } from '../share/importBundle'
import { findOrCreateTagPath } from '../tags/tagService'
import { SYNC_TABLES } from '../sync/tables'
import {
  addChoiceOption,
  addColumn,
  addRelationColumn,
  addRow,
  createDatabase,
  listColumns,
} from './databaseService'
import { loadDatabaseData, queryRows, resolveRows } from './databaseQuery'

let db: LearningNotesDB
let ws: string
let nb: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
  nb = (await createNotebook(db, ws, 'Library')).id
})

afterEach(async () => {
  await db.delete()
})

/** A database shaped like the planned prompt library (docs/plans/database-pages-plan.md). */
async function promptLibrary() {
  const lib = await createDatabase(db, ws, nb, 'Prompts')
  const col = (name: string, type: string, config = {}) =>
    addColumn(db, lib.id, { name, type, config })
  const text = await col('Text', 'text')
  const subject = await col('Subject', 'tag')
  const purpose = await col('Purpose', 'tag')
  const input = await col('Input', 'tag')
  const output = await col('Output', 'tag')
  const stars = await col('Rating', 'number', { format: 'stars', max: 10 })
  const provider = await col('Provider', 'choice')
  const model = await addChoiceOption(db, provider.id, 'Claude')
  const uses = await col('Uses', 'number')
  return {
    lib,
    text,
    subject,
    purpose,
    input,
    output,
    stars,
    provider,
    model,
    uses,
  }
}

describe('database schema (prompt library shape)', () => {
  it('holds tags, stars 1-10, long text, choice, and computed columns', async () => {
    const s = await promptLibrary()
    const tag = await findOrCreateTagPath(db, 'anatomy')
    const long = 'x'.repeat(50_000)
    const row = await addRow(db, s.lib.id, {
      title: 'Summarise',
      values: {
        [s.text.id]: long,
        [s.subject.id]: [tag.id],
        [s.purpose.id]: [tag.id],
        [s.stars.id]: 10,
        [s.provider.id]: s.model.id,
        [s.uses.id]: 3,
      },
    })
    await addColumn(db, s.lib.id, {
      name: 'Double',
      type: 'formula',
      config: { formula: '[Uses] * 2' },
    })
    const data = await loadDatabaseData(db, s.lib.id)
    const resolved = resolveRows(data)
    expect(resolved).toHaveLength(1)
    expect(resolved[0].page.id).toBe(row.id)
    expect(resolved[0].values[s.stars.id]).toBe(10)
    expect(resolved[0].values[s.text.id]).toHaveLength(50_000)
    // Stars above the column maximum are cut back to it.
    const high = await addRow(db, s.lib.id, { values: { [s.stars.id]: 11 } })
    expect(high.values?.[s.stars.id]).toBe(10)
    await db.pages.update(high.id, { deletedAt: 1 })
    const best = queryRows(resolved, data.databases.get(s.lib.id)!.columns, {
      filters: [{ columnId: s.stars.id, op: 'gte', value: 8 }],
    })
    expect(best).toHaveLength(1)
  })

  it('relation and rollup connect two databases', async () => {
    const s = await promptLibrary()
    const skills = await createDatabase(db, ws, nb, 'Skills')
    const rel = await addRelationColumn(db, skills.id, {
      name: 'Prompts',
      targetDatabaseId: s.lib.id,
    })
    const p1 = await addRow(db, s.lib.id, {
      title: 'A',
      values: { [s.uses.id]: 2 },
    })
    const p2 = await addRow(db, s.lib.id, {
      title: 'B',
      values: { [s.uses.id]: 5 },
    })
    await addRow(db, skills.id, {
      title: 'Lecture to notes',
      values: { [rel.id]: [p1.id, p2.id] },
    })
    await addColumn(db, skills.id, {
      name: 'Total uses',
      type: 'rollup',
      config: {
        relationColumnId: rel.id,
        targetColumnId: s.uses.id,
        fn: 'sum',
      },
    })
    const data = await loadDatabaseData(db, skills.id)
    const rows = resolveRows(data)
    const total = data.databases
      .get(skills.id)!
      .columns.find((c) => c.name === 'Total uses')!
    expect(rows[0].values[total.id]).toBe(7)
  })

  it('is covered by sync and survives a notebook file round trip', async () => {
    expect(Object.keys(SYNC_TABLES)).toEqual(
      expect.arrayContaining(['databases', 'dbColumns', 'dbViews', 'pages']),
    )
    const s = await promptLibrary()
    await addRow(db, s.lib.id, {
      title: 'Keep me',
      values: { [s.stars.id]: 7, [s.text.id]: 'hello' },
    })
    const bundle = readBundle(
      await bundleFile(await exportNotebookBundle(db, nb)).text(),
    )
    await importBundle(db, ws, bundle)
    const copies = (await db.databases.toArray()).filter(
      (d) => d.title === 'Prompts' && d.id !== s.lib.id,
    )
    expect(copies).toHaveLength(1)
    const cols = await listColumns(db, copies[0].id)
    expect(cols.map((c) => c.name)).toEqual(
      expect.arrayContaining(['Text', 'Subject', 'Rating', 'Provider']),
    )
    const rating = cols.find((c) => c.name === 'Rating')!
    const rows = await db.pages
      .where('databaseId')
      .equals(copies[0].id)
      .toArray()
    expect(rows[0].values?.[rating.id]).toBe(7)
  })
})
