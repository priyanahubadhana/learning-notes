import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import {
  addChoiceOption,
  addColumn,
  addRow,
  addRows,
  createDatabase,
  setCell,
} from '../databases/databaseService'
import { createNotebook } from '../notebooks/notebookService'
import { findOrCreateTagPath } from '../tags/tagService'
import { ensureSearchIndex, searchIndex } from './searchService'
import { titleEntryId } from './searchText'

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

const find = async (text: string) =>
  (await searchIndex(db, text)).matches.map((m) => m.entry.id)

async function build() {
  const lib = await createDatabase(db, ws, nb, 'Prompts')
  const text = await addColumn(db, lib.id, { name: 'Text', type: 'text' })
  const status = await addColumn(db, lib.id, { name: 'Status', type: 'choice' })
  const done = await addChoiceOption(db, status.id, 'Finished')
  const subject = await addColumn(db, lib.id, { name: 'Subject', type: 'tag' })
  const tag = await findOrCreateTagPath(db, 'anatomy')
  const stars = await addColumn(db, lib.id, { name: 'Rating', type: 'number' })
  const row = await addRow(db, lib.id, {
    title: 'Summarise',
    values: {
      [text.id]: 'Explain the mitral valve simply',
      [status.id]: done.id,
      [subject.id]: [tag.id],
      [stars.id]: 4242,
    },
  })
  return { lib, text, status, subject, stars, row }
}

describe('search finds database rows by their property values', () => {
  it('finds text, option names, tag names and numbers', async () => {
    const { row } = await build()
    const id = titleEntryId(row.id)
    expect(await find('mitral')).toContain(id)
    expect(await find('finished')).toContain(id)
    expect(await find('anatomy')).toContain(id)
    expect(await find('4242')).toContain(id)
    expect(await find('summarise')).toContain(id)
  })

  it('follows a changed cell, and a rebuilt index gives the same answer', async () => {
    const { row, text } = await build()
    await setCell(db, row.id, text.id, 'Describe the aortic arch')
    const id = titleEntryId(row.id)
    expect(await find('mitral')).not.toContain(id)
    expect(await find('aortic')).toContain(id)
    await db.meta.clear()
    await db.searchEntries.clear()
    await ensureSearchIndex(db)
    expect(await find('aortic')).toContain(id)
    expect(await find('finished')).toContain(id)
    expect(await find('anatomy')).toContain(id)
  })

  it('indexes a bulk import with one entry per row', async () => {
    const lib = await createDatabase(db, ws, nb, 'Words')
    const meaning = await addColumn(db, lib.id, {
      name: 'Meaning',
      type: 'text',
    })
    const rows = await addRows(
      db,
      lib.id,
      Array.from({ length: 300 }, (_, i) => ({
        title: `word${i}`,
        values: { [meaning.id]: `meaning${i}` },
      })),
    )
    expect(await find('meaning299')).toEqual([titleEntryId(rows[299].id)])
  })
  it('finds ticked checkboxes by column name, and formula results', async () => {
    const lib = await createDatabase(db, ws, nb, 'Tasks')
    const done = await addColumn(db, lib.id, {
      name: 'Finished',
      type: 'checkbox',
    })
    const price = await addColumn(db, lib.id, { name: 'Price', type: 'number' })
    await addColumn(db, lib.id, {
      name: 'Label',
      type: 'formula',
      config: { formula: '"Total " & ([Price] * 2) & " for " & [Name]' },
    })
    const a = await addRow(db, lib.id, {
      title: 'Apples',
      values: { [done.id]: true, [price.id]: 21 },
    })
    const b = await addRow(db, lib.id, {
      title: 'Pears',
      values: { [price.id]: 7 },
    })
    expect(await find('finished')).toEqual([titleEntryId(a.id)])
    expect(await find('42')).toContain(titleEntryId(a.id))
    expect(await find('total')).toEqual(
      expect.arrayContaining([titleEntryId(a.id), titleEntryId(b.id)]),
    )
    expect(await find('14')).toEqual([titleEntryId(b.id)])
    // Untick: no longer found. A changed price changes the formula text.
    await setCell(db, a.id, done.id, null)
    await setCell(db, a.id, price.id, 50)
    expect(await find('finished')).toEqual([])
    expect(await find('42')).toEqual([])
    expect(await find('100')).toEqual([titleEntryId(a.id)])
    // A rebuilt index gives the same answer.
    await db.meta.clear()
    await db.searchEntries.clear()
    await ensureSearchIndex(db)
    expect(await find('100')).toEqual([titleEntryId(a.id)])
  })
})
