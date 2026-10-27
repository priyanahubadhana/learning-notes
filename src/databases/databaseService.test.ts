import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { DbColumn, JsonValue } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import {
  createNotebook,
  deleteNotebook,
  listNotebooks,
} from '../notebooks/notebookService'
import { createPage, deletePage, listNotePages } from '../pages/pageService'
import { findOrCreateTagPath } from '../tags/tagService'
import {
  listTrash,
  purgeDatabase,
  restoreDatabase,
  restoreNotebook,
  restorePage,
} from '../trash/trashService'
import { TITLE_COLUMN_ID } from './columnTypes'
import {
  addChoiceOption,
  addColumn,
  addRelationColumn,
  addRow,
  addRows,
  addView,
  changeColumnType,
  createDatabase,
  deleteColumn,
  deleteDatabase,
  deleteView,
  ensureStudyTracker,
  getDatabase,
  hasRows,
  listColumns,
  listDatabases,
  listRows,
  listViews,
  moveColumn,
  moveRow,
  placeRow,
  renameColumn,
  restoreColumn,
  rowsPointingTo,
  setCell,
  setCells,
  setOpenView,
  setRelationTwoWay,
} from './databaseService'
import { loadDatabaseData, resolveRows } from './databaseQuery'
import { studyTrackerId } from './notebookTabs'
import { openingView } from './views/openingView'

let db: LearningNotesDB
let ws: string
let nb: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
  nb = (await createNotebook(db, ws, 'Medicine')).id
})

afterEach(async () => {
  await db.delete()
})

/** Resolved cell values of a database, as { title: { column name: value } }. */
async function table(databaseId: string) {
  const data = await loadDatabaseData(db, databaseId)
  const columns = data.databases.get(databaseId)!.columns
  return Object.fromEntries(
    resolveRows(data).map((row) => [
      row.page.title,
      Object.fromEntries(columns.map((c) => [c.name, row.values[c.id]])),
    ]),
  )
}

const names = (columns: DbColumn[]) => columns.map((c) => c.name)

describe('databases', () => {
  it('creates a database with Table and Dashboard views, listed in All databases', async () => {
    const drugs = await createDatabase(db, ws, nb, 'Drugs')
    const loose = await createDatabase(db, ws, null, 'Books')
    expect((await listDatabases(db, ws)).map((d) => d.title)).toEqual([
      'Drugs',
      'Books',
    ])
    expect((await listViews(db, drugs.id)).map((v) => v.type)).toEqual([
      'table',
      'dashboard',
      'board',
    ])
    expect(drugs.titleName).toBe('Name')
    expect(loose.notebookId).toBeNull()
  })

  it('rows of a loose database live in the hidden Databases notebook', async () => {
    const books = await createDatabase(db, ws, null, 'Books')
    const row = await addRow(db, books.id, { title: 'Dune' })
    const home = await db.notebooks.get(row.notebookId)
    expect(home?.kind).toBe('databases')
    expect(home?.tabs).toBeUndefined()
    // Not listed as a notebook in the sidebar.
    expect((await listNotebooks(db, ws)).map((n) => n.title)).toEqual([
      'Medicine',
    ])
    // A second loose database reuses it.
    const other = await createDatabase(db, ws, null, 'Films')
    expect((await addRow(db, other.id)).notebookId).toBe(row.notebookId)
  })

  it('row pages are not in the Notes tree, with their sub-pages', async () => {
    const drugs = await createDatabase(db, ws, nb, 'Drugs')
    const note = await createPage(db, nb, null, 'Heart')
    const row = await addRow(db, drugs.id, { title: 'Aspirin' })
    await createPage(db, nb, row.id, 'Aspirin notes')
    expect((await listNotePages(db, nb)).map((p) => p.id)).toEqual([note.id])
    expect((await listRows(db, drugs.id)).map((p) => p.title)).toEqual([
      'Aspirin',
    ])
  })

  it('cannot be made in a special notebook', async () => {
    const journal = await createNotebook(db, ws, 'Journal', 'journal')
    await expect(createDatabase(db, ws, journal.id)).rejects.toThrow('normal')
  })
})

describe('Study tracker', () => {
  it('is created once, at the id the Database tab points to', async () => {
    const tracker = await ensureStudyTracker(db, nb)
    expect(tracker.id).toBe(studyTrackerId(nb))
    const notebook = await db.notebooks.get(nb)
    expect(notebook?.tabs?.find((t) => t.kind === 'database')?.databaseId).toBe(
      tracker.id,
    )
    expect(tracker.titleName).toBe('Lesson')
    expect(names(await listColumns(db, tracker.id))).toEqual([
      'Status',
      'Last revised',
      'Cards due',
      '% correct',
      'Confidence',
      'Card levels',
    ])
    expect((await ensureStudyTracker(db, nb)).createdAt).toBe(tracker.createdAt)
    expect(
      await db.dbColumns.where('databaseId').equals(tracker.id).count(),
    ).toBe(6)
  })

  it('rows are the notebook’s top-level pages; cells work on them', async () => {
    const tracker = await ensureStudyTracker(db, nb)
    const lesson = await createPage(db, nb, null, 'Heart')
    await createPage(db, nb, lesson.id, 'Valves') // sub-page: not a row
    const drugs = await createDatabase(db, ws, nb, 'Drugs')
    await addRow(db, drugs.id, { title: 'Aspirin' }) // row of another db
    expect((await listRows(db, tracker.id)).map((p) => p.title)).toEqual([
      'Heart',
    ])

    const confidence = (await listColumns(db, tracker.id)).find(
      (c) => c.name === 'Confidence',
    )!
    await setCell(db, lesson.id, confidence.id, 4.6)
    expect((await table(tracker.id)).Heart.Confidence).toBe(5) // whole stars
    await expect(addRow(db, tracker.id)).rejects.toThrow('notebook')
    await expect(deleteDatabase(db, tracker.id)).rejects.toThrow('notebook')
  })

  it('goes away and comes back with its notebook', async () => {
    const tracker = await ensureStudyTracker(db, nb)
    await deleteNotebook(db, nb)
    expect(await getDatabase(db, tracker.id)).toBeUndefined()
    expect((await listTrash(db, ws)).map((i) => i.kind)).toEqual(['notebook'])
    await restoreNotebook(db, nb)
    expect(await getDatabase(db, tracker.id)).toBeDefined()
    expect(await listColumns(db, tracker.id)).toHaveLength(6)
  })
})

describe('columns', () => {
  it('adds, orders, renames and keeps names unique (ignoring case)', async () => {
    const d = await createDatabase(db, ws, nb, 'Drugs')
    const dose = await addColumn(db, d.id, { name: 'Dose', type: 'number' })
    const second = await addColumn(db, d.id, { name: 'dose', type: 'text' })
    const named = await addColumn(db, d.id, { name: ' [Class] ', type: 'text' })
    const title = await addColumn(db, d.id, { name: 'Name', type: 'text' })
    expect([second.name, named.name, title.name]).toEqual([
      'dose 2',
      'Class',
      'Name 2',
    ])
    await moveColumn(db, named.id, 0)
    expect(names(await listColumns(db, d.id))).toEqual([
      'Class',
      'Dose',
      'dose 2',
      'Name 2',
    ])
    expect(await renameColumn(db, d.id, dose.id, 'Class')).toBe('Class 2')
    expect(await renameColumn(db, d.id, TITLE_COLUMN_ID, 'Drug')).toBe('Drug')
    expect((await getDatabase(db, d.id))?.titleName).toBe('Drug')
  })

  it('renaming a column updates formulas that use it', async () => {
    const d = await createDatabase(db, ws, nb, 'Shop')
    const price = await addColumn(db, d.id, { name: 'Price', type: 'number' })
    const total = await addColumn(db, d.id, {
      name: 'Total',
      type: 'formula',
      config: { formula: '[Price] * 2 & " for [Price]"' },
    })
    await renameColumn(db, d.id, price.id, 'Cost')
    await renameColumn(db, d.id, TITLE_COLUMN_ID, 'Item')
    const formula = (await db.dbColumns.get(total.id))?.config.formula
    expect(formula).toBe('[Cost] * 2 & " for [Price]"')
    await addRow(db, d.id, { title: 'Pen', values: { [price.id]: 3 } })
    expect((await table(d.id)).Pen.Total).toBe('6 for [Price]')
  })

  it('deleting keeps values; restore brings them back', async () => {
    const d = await createDatabase(db, ws, nb, 'Drugs')
    const dose = await addColumn(db, d.id, { name: 'Dose', type: 'number' })
    await addRow(db, d.id, { title: 'Aspirin', values: { [dose.id]: 75 } })
    await deleteColumn(db, dose.id)
    expect(await listColumns(db, d.id)).toEqual([])
    await addColumn(db, d.id, { name: 'Dose', type: 'text' })
    await restoreColumn(db, dose.id)
    expect((await table(d.id)).Aspirin['Dose 2']).toBe(75)
  })

  it('checks settings: formula length, rollup links', async () => {
    const d = await createDatabase(db, ws, nb, 'Drugs')
    await expect(
      addColumn(db, d.id, {
        name: 'F',
        type: 'formula',
        config: { formula: 'x'.repeat(2001) },
      }),
    ).rejects.toThrow('2000')
    await expect(
      addColumn(db, d.id, {
        name: 'R',
        type: 'rollup',
        config: {
          relationColumnId: 'nope',
          targetColumnId: 'title',
          fn: 'count',
        },
      }),
    ).rejects.toThrow('Relation')
    await expect(
      addColumn(db, d.id, { name: 'X', type: 'magic' }),
    ).rejects.toThrow('Unknown column type')
  })

  it('choice options: added once per name; Text → Choice makes options', async () => {
    const d = await createDatabase(db, ws, nb, 'Drugs')
    const cls = await addColumn(db, d.id, { name: 'Class', type: 'text' })
    await addRows(db, d.id, [
      { title: 'Aspirin', values: { [cls.id]: 'NSAID' } },
      { title: 'Ibuprofen', values: { [cls.id]: 'nsaid' } },
      { title: 'Metoprolol', values: { [cls.id]: 'Beta blocker' } },
    ])
    await changeColumnType(db, cls.id, 'choice')
    const column = (await db.dbColumns.get(cls.id))!
    const options = column.config.options as { id: string; name: string }[]
    expect(options.map((o) => o.name)).toEqual(['NSAID', 'Beta blocker'])
    expect(await table(d.id)).toMatchObject({
      Aspirin: { Class: 'NSAID' },
      Ibuprofen: { Class: 'NSAID' },
      Metoprolol: { Class: 'Beta blocker' },
    })
    const again = await addChoiceOption(db, cls.id, ' nsaid ')
    expect(again.id).toBe(options[0].id)
    const statin = await addChoiceOption(db, cls.id, 'Statin', 'blue')
    const row = (await listRows(db, d.id))[0]
    await setCell(db, row.id, cls.id, statin.id)
    expect((await table(d.id)).Aspirin.Class).toBe('Statin')
    await expect(setCell(db, row.id, cls.id, 'not-an-option')).rejects.toThrow(
      'option',
    )

    // Back to Text: the stored values show again (no data lost).
    await changeColumnType(db, cls.id, 'text')
    expect((await table(d.id)).Ibuprofen.Class).toBe('nsaid')
    expect((await table(d.id)).Aspirin.Class).toBe('Statin')
  })

  it('Number → Text → Number keeps the numbers', async () => {
    const d = await createDatabase(db, ws, nb, 'Shop')
    const price = await addColumn(db, d.id, { name: 'Price', type: 'number' })
    await addRow(db, d.id, { title: 'Pen', values: { [price.id]: 12.5 } })
    await changeColumnType(db, price.id, 'text')
    expect((await table(d.id)).Pen.Price).toBe('12.5')
    await changeColumnType(db, price.id, 'number')
    expect((await table(d.id)).Pen.Price).toBe(12.5)
  })
})

describe('cells', () => {
  it('checks every type and stores the clean value', async () => {
    const d = await createDatabase(db, ws, nb, 'All types')
    const col = async (type: string, config?: Record<string, JsonValue>) =>
      (await addColumn(db, d.id, { name: type, type, config })).id
    const ids = {
      text: await col('text'),
      number: await col('number'),
      date: await col('date'),
      checkbox: await col('checkbox'),
      url: await col('url'),
      tag: await col('tag'),
      noteLink: await col('noteLink'),
    }
    const row = await addRow(db, d.id, { title: 'Row' })
    const tag = await findOrCreateTagPath(db, 'Cardio')
    const note = await createPage(db, nb, null, 'Heart')
    await setCells(db, row.id, {
      [ids.text]: 'hello',
      [ids.number]: '1,200',
      [ids.date]: '2026-10-27',
      [ids.checkbox]: true,
      [ids.url]: 'example.com/a',
      [ids.tag]: [tag.id, tag.id],
      [ids.noteLink]: [note.id],
      [TITLE_COLUMN_ID]: 'Renamed',
    })
    const stored = (await db.pages.get(row.id))!
    expect(stored.title).toBe('Renamed')
    expect(stored.values).toEqual({
      [ids.text]: 'hello',
      [ids.number]: 1200,
      [ids.date]: '2026-10-27',
      [ids.checkbox]: true,
      [ids.url]: 'https://example.com/a',
      [ids.tag]: [tag.id],
      [ids.noteLink]: [note.id],
    })
    expect((await table(d.id)).Renamed).toMatchObject({
      tag: ['Cardio'],
      noteLink: ['Heart'],
      date: { date: '2026-10-27' },
    })

    // Clearing removes the value; an unticked box stores nothing.
    await setCells(db, row.id, { [ids.text]: '', [ids.checkbox]: false })
    expect((await db.pages.get(row.id))!.values).not.toHaveProperty(ids.text)
    expect((await db.pages.get(row.id))!.values).not.toHaveProperty(
      ids.checkbox,
    )

    // A deleted note link drops out of the value shown.
    await deletePage(db, note.id)
    expect((await table(d.id)).Renamed.noteLink).toEqual([])
  })

  it('rejects bad values (incl. links that could run code)', async () => {
    const d = await createDatabase(db, ws, nb, 'Checks')
    const num = (await addColumn(db, d.id, { name: 'N', type: 'number' })).id
    const date = (await addColumn(db, d.id, { name: 'D', type: 'date' })).id
    const url = (await addColumn(db, d.id, { name: 'U', type: 'url' })).id
    const tag = (await addColumn(db, d.id, { name: 'T', type: 'tag' })).id
    const f = (
      await addColumn(db, d.id, {
        name: 'F',
        type: 'formula',
        config: { formula: '1' },
      })
    ).id
    const row = await addRow(db, d.id)
    await expect(setCell(db, row.id, num, 'abc')).rejects.toThrow('Number')
    await expect(setCell(db, row.id, date, '2026-02-30')).rejects.toThrow(
      'Date',
    )
    await expect(
      setCell(db, row.id, url, 'javascript:alert(1)'),
    ).rejects.toThrow('link')
    await expect(setCell(db, row.id, url, 'data:text/html,hi')).rejects.toThrow(
      'link',
    )
    await expect(setCell(db, row.id, tag, ['missing'])).rejects.toThrow('tag')
    await expect(setCell(db, row.id, f, 2)).rejects.toThrow('automatically')
    await expect(setCell(db, row.id, 'no-column', 1)).rejects.toThrow(
      'Unknown column',
    )
    const note = await createPage(db, nb, null, 'Note')
    await expect(setCell(db, note.id, num, 1)).rejects.toThrow(
      'Not a database row',
    )
  })

  it('moves rows', async () => {
    const d = await createDatabase(db, ws, nb, 'Order')
    const [a, , c] = await addRows(db, d.id, [
      { title: 'A' },
      { title: 'B' },
      { title: 'C' },
    ])
    await moveRow(db, c.id, 0)
    await moveRow(db, a.id, 5)
    expect((await listRows(db, d.id)).map((r) => r.title)).toEqual([
      'C',
      'B',
      'A',
    ])
  })
})

describe('relations', () => {
  async function drugsAndDiseases() {
    const drugs = await createDatabase(db, ws, nb, 'Drugs')
    const diseases = await createDatabase(db, ws, nb, 'Diseases')
    const treats = await addRelationColumn(db, drugs.id, {
      name: 'Treats',
      targetDatabaseId: diseases.id,
    })
    const [pain, fever, angina] = await addRows(db, diseases.id, [
      { title: 'Pain' },
      { title: 'Fever' },
      { title: 'Angina' },
    ])
    return { drugs, diseases, treats, pain, fever, angina }
  }

  it('two-way: the other database shows the link back', async () => {
    const { drugs, diseases, treats, pain, fever, angina } =
      await drugsAndDiseases()
    expect(names(await listColumns(db, diseases.id))).toEqual(['Drugs'])
    const back = (await listColumns(db, diseases.id))[0]
    expect(back.config).toMatchObject({ back: true, pairedColumnId: treats.id })

    await addRows(db, drugs.id, [
      {
        title: 'Aspirin',
        values: { [treats.id]: [pain.id, fever.id, angina.id] },
      },
      { title: 'Paracetamol', values: { [treats.id]: [pain.id, fever.id] } },
    ])
    expect((await table(drugs.id)).Paracetamol.Treats).toEqual([
      'Pain',
      'Fever',
    ])
    expect(await table(diseases.id)).toEqual({
      Pain: { Drugs: ['Aspirin', 'Paracetamol'] },
      Fever: { Drugs: ['Aspirin', 'Paracetamol'] },
      Angina: { Drugs: ['Aspirin'] },
    })
    expect(
      (await rowsPointingTo(db, angina.id)).map((r) => r.columnId),
    ).toEqual([treats.id])
  })

  it('editing the back side changes the main side', async () => {
    const { drugs, diseases, treats, pain, angina } = await drugsAndDiseases()
    const [aspirin, nitro] = await addRows(db, drugs.id, [
      { title: 'Aspirin', values: { [treats.id]: [pain.id] } },
      { title: 'Nitroglycerin' },
    ])
    const back = (await listColumns(db, diseases.id))[0]
    await setCell(db, angina.id, back.id, [aspirin.id, nitro.id])
    await setCell(db, pain.id, back.id, [])
    expect(await table(drugs.id)).toEqual({
      Aspirin: { Treats: ['Angina'] },
      Nitroglycerin: { Treats: ['Angina'] },
    })
    expect((await rowsPointingTo(db, pain.id)).length).toBe(0)
    expect((await rowsPointingTo(db, angina.id)).length).toBe(2)
  })

  it('only accepts rows of the related database', async () => {
    const { drugs, treats } = await drugsAndDiseases()
    const other = await createDatabase(db, ws, nb, 'Other')
    const stranger = await addRow(db, other.id, { title: 'X' })
    const row = await addRow(db, drugs.id)
    await expect(setCell(db, row.id, treats.id, [stranger.id])).rejects.toThrow(
      'related database',
    )
  })

  it('a deleted related row drops out; one-way has no partner', async () => {
    const { drugs, diseases, treats, pain, fever } = await drugsAndDiseases()
    await addRow(db, drugs.id, {
      title: 'Aspirin',
      values: { [treats.id]: [pain.id, fever.id] },
    })
    await deletePage(db, fever.id)
    expect((await table(drugs.id)).Aspirin.Treats).toEqual(['Pain'])

    await setRelationTwoWay(db, treats.id, false)
    expect(await listColumns(db, diseases.id)).toEqual([])
    await setRelationTwoWay(db, treats.id, true)
    expect(names(await listColumns(db, diseases.id))).toEqual(['Drugs'])

    const oneWay = await addRelationColumn(db, drugs.id, {
      name: 'Also',
      targetDatabaseId: diseases.id,
      twoWay: false,
    })
    expect(oneWay.config.pairedColumnId).toBeUndefined()
    expect(await listColumns(db, diseases.id)).toHaveLength(1)
  })

  it('deleting the main column removes its partner too; restore brings both', async () => {
    const { diseases, treats } = await drugsAndDiseases()
    await deleteColumn(db, treats.id)
    expect(await listColumns(db, diseases.id)).toEqual([])
    await restoreColumn(db, treats.id)
    expect(names(await listColumns(db, diseases.id))).toEqual(['Drugs'])
  })

  it('a database can relate to itself', async () => {
    const topics = await createDatabase(db, ws, nb, 'Topics')
    const parts = await addRelationColumn(db, topics.id, {
      name: 'Parts',
      targetDatabaseId: topics.id,
    })
    const [valves] = await addRows(db, topics.id, [{ title: 'Valves' }])
    await addRow(db, topics.id, {
      title: 'Heart',
      values: { [parts.id]: [valves.id] },
    })
    expect(await table(topics.id)).toEqual({
      Valves: { Parts: [], Topics: ['Heart'] },
      Heart: { Parts: ['Valves'], Topics: [] },
    })
  })
})

describe('placing rows (Board drop)', () => {
  it('sets the group and puts the row before or after another, in one go', async () => {
    const d = await createDatabase(db, ws, nb, 'Tasks')
    const status = await addColumn(db, d.id, { name: 'Status', type: 'choice' })
    const done = await addChoiceOption(db, status.id, 'Done')
    const [a, b, c] = await addRows(db, d.id, [
      { title: 'A' },
      { title: 'B' },
      { title: 'C' },
    ])
    const titles = async () => (await listRows(db, d.id)).map((r) => r.title)
    await placeRow(db, c.id, { [status.id]: done.id }, { before: a.id })
    expect(await titles()).toEqual(['C', 'A', 'B'])
    expect((await table(d.id)).C.Status).toBe('Done')
    // Next to a row whose neighbour is not the moving row: no clash.
    await placeRow(db, a.id, {}, { after: b.id })
    expect(await titles()).toEqual(['C', 'B', 'A'])
    await placeRow(db, c.id, {}, { after: a.id })
    expect(await titles()).toEqual(['B', 'A', 'C'])
    const orders = (await listRows(db, d.id)).map((r) => r.order)
    expect(new Set(orders).size).toBe(3)
    await placeRow(db, b.id, { [status.id]: null }, null)
    expect((await table(d.id)).B.Status).toBeNull()
    await expect(placeRow(db, b.id, {}, { before: 'nope' })).rejects.toThrow(
      'Not a row',
    )
  })

  it('reorders Study tracker lessons (their Notes order)', async () => {
    const tracker = await ensureStudyTracker(db, nb)
    const one = await createPage(db, nb, null, 'One')
    const two = await createPage(db, nb, null, 'Two')
    await placeRow(db, two.id, {}, { before: one.id })
    expect((await listRows(db, tracker.id)).map((r) => r.title)).toEqual([
      'Two',
      'One',
    ])
    expect((await listNotePages(db, nb)).map((p) => p.title)).toEqual([
      'Two',
      'One',
    ])
  })
})

describe('views', () => {
  it('adds, updates and deletes views; one always stays', async () => {
    const d = await createDatabase(db, ws, nb, 'Drugs')
    const mine = await addView(db, d.id, { name: 'By class', type: 'board' })
    const [table1, dashboard, board] = await listViews(db, d.id)
    await deleteView(db, table1.id)
    await deleteView(db, dashboard.id)
    await deleteView(db, board.id)
    await expect(deleteView(db, mine.id)).rejects.toThrow('one view')
    expect((await listViews(db, d.id)).map((v) => v.name)).toEqual(['By class'])
  })
})

describe('deleting databases', () => {
  it('Trash shows the database (not its rows); Restore brings all back', async () => {
    const { id } = await createDatabase(db, ws, nb, 'Drugs')
    const diseases = await createDatabase(db, ws, nb, 'Diseases')
    const treats = await addRelationColumn(db, id, {
      name: 'Treats',
      targetDatabaseId: diseases.id,
    })
    const row = await addRow(db, id, { title: 'Aspirin' })
    await createPage(db, nb, row.id, 'Aspirin notes')
    await deleteDatabase(db, id)

    expect(await listDatabases(db, ws)).toHaveLength(1)
    expect(await listColumns(db, diseases.id)).toEqual([]) // partner went too
    const trash = await listTrash(db, ws)
    expect(trash).toEqual([
      expect.objectContaining({
        kind: 'database',
        title: 'Drugs',
        rowCount: 1,
      }),
    ])

    await restoreDatabase(db, id)
    expect(await listRows(db, id)).toHaveLength(1)
    expect((await listColumns(db, id)).map((c) => c.id)).toEqual([treats.id])
    expect(names(await listColumns(db, diseases.id))).toEqual(['Drugs'])
    expect(
      (await db.pages.where('parentId').equals(row.id).first())?.deletedAt,
    ).toBeNull()
  })

  it('restoring a row of a deleted database brings the database back', async () => {
    const d = await createDatabase(db, ws, nb, 'Drugs')
    const row = await addRow(db, d.id, { title: 'Aspirin' })
    await deletePage(db, row.id)
    await new Promise((resolve) => setTimeout(resolve, 5)) // a later moment
    await deleteDatabase(db, d.id)
    expect((await listTrash(db, ws)).map((i) => i.kind).sort()).toEqual([
      'database',
      'page',
    ])
    await restorePage(db, row.id)
    expect(await getDatabase(db, d.id)).toBeDefined()
    expect(await listRows(db, d.id)).toHaveLength(1)
  })

  it('Delete forever erases names, settings and cell values', async () => {
    const d = await createDatabase(db, ws, nb, 'Secret')
    const col = await addColumn(db, d.id, { name: 'Code', type: 'text' })
    const other = await createDatabase(db, ws, nb, 'Other')
    const rel = await addRelationColumn(db, d.id, {
      name: 'R',
      targetDatabaseId: other.id,
    })
    const target = await addRow(db, other.id, { title: 'T' })
    const row = await addRow(db, d.id, {
      title: 'Row',
      values: { [col.id]: '1234', [rel.id]: [target.id] },
    })
    await deleteDatabase(db, d.id)
    await purgeDatabase(db, d.id)
    const page = (await db.pages.get(row.id))!
    expect(page.purgedAt).toBeDefined()
    expect(page.title).toBe('')
    expect(page.values).toBeUndefined()
    expect((await db.dbColumns.get(col.id))?.name).toBe('')
    expect((await db.databases.get(d.id))?.title).toBe('')
    expect(await db.rowRefs.count()).toBe(0)
    expect(await listTrash(db, ws)).toEqual([])
  })
})

describe('opening view', () => {
  it('opens on Dashboard once there are rows, or on the picked view', async () => {
    const d = await createDatabase(db, ws, nb, 'Drugs')
    const views = await listViews(db, d.id)
    const [tableView, dashboard] = views
    expect(await hasRows(db, d.id)).toBe(false)
    expect(openingView(views, d, false)?.id).toBe(tableView.id)
    await addRow(db, d.id, { title: 'Aspirin' })
    expect(await hasRows(db, d.id)).toBe(true)
    expect(openingView(views, d, true)?.id).toBe(dashboard.id)

    await setOpenView(db, d.id, tableView.id)
    const picked = (await getDatabase(db, d.id))!
    expect(openingView(views, picked, true)?.id).toBe(tableView.id)
    await setOpenView(db, d.id, null)
    expect((await getDatabase(db, d.id))!.openViewId).toBeUndefined()
  })

  it('counts lessons as Study tracker rows', async () => {
    const tracker = await ensureStudyTracker(db, nb)
    expect(await hasRows(db, tracker.id)).toBe(false)
    await createPage(db, nb, null, 'Heart')
    expect(await hasRows(db, tracker.id)).toBe(true)
  })
})
