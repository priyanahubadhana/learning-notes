import { createBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { JsonObject, Notebook } from '../core/types'
import {
  addColumn,
  addRows,
  createDatabase,
  listColumns,
} from '../databases/databaseService'
import { createNotebook, deleteNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { syncCardRecords } from '../recall/cardService'
import { MARK_STYLE, type MarkLabel } from '../revise/reviseMarks'
import { t } from '../i18n/t'

/**
 * "Load sample notebook" (for testing): adds ONE new notebook with two
 * lessons, notes with marked words, a few cards and a database with a Date
 * and a Web link (picture) column. Only adds; nothing that exists is
 * changed or deleted.
 */

type Run = { type: 'text'; text: string; styles: JsonObject }

const plain = (text: string): Run => ({ type: 'text', text, styles: {} })
const marked = (text: string, label: MarkLabel): Run => ({
  type: 'text',
  text,
  styles: { [MARK_STYLE]: label },
})

/** A day ("YYYY-MM-DD") `by` days from `now`, in the user's own calendar. */
function dayFrom(now: number, by: number): string {
  const d = new Date(now)
  d.setDate(d.getDate() + by)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const PICTURES = [
  'https://picsum.photos/seed/learning-notes-1/320/200',
  'https://picsum.photos/seed/learning-notes-2/320/200',
  'https://picsum.photos/seed/learning-notes-3/320/200',
  'https://picsum.photos/seed/learning-notes-4/320/200',
  'https://picsum.photos/seed/learning-notes-5/320/200',
]

/** The live notebooks made by "Load sample notebook". */
export async function listSampleNotebooks(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<Notebook[]> {
  return (
    await db.notebooks.where('workspaceId').equals(workspaceId).toArray()
  ).filter((n) => n.deletedAt === null && n.sample === true)
}

/**
 * Removes only what "Load sample notebook" added: the notebooks it made
 * (marked as samples) with their pages, notes and databases, into the
 * Trash (where they can be restored). Returns how many notebooks.
 */
export async function removeSampleNotebooks(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<number> {
  const samples = await listSampleNotebooks(db, workspaceId)
  for (const notebook of samples) await deleteNotebook(db, notebook.id)
  return samples.length
}

export async function loadSampleNotebook(
  db: LearningNotesDB,
  workspaceId: string,
  now: number = Date.now(),
): Promise<Notebook> {
  const made = await createNotebook(db, workspaceId, t('sample.notebook'))
  await db.notebooks.update(made.id, { sample: true })
  const notebook: Notebook = { ...made, sample: true }

  const paragraph = (pageId: string, ...text: Run[]) =>
    createBlock(db, { pageId, type: 'paragraph', content: { text } })
  /** A card: the question, with its answer inside it. */
  const card = async (pageId: string, question: string, answer: string) => {
    const block = await createBlock(db, {
      pageId,
      type: 'card',
      content: { text: [plain(question)] },
    })
    await createBlock(db, {
      pageId,
      type: 'paragraph',
      parentId: block.id,
      content: { text: [plain(answer)] },
    })
  }

  // Lesson 1: heart sounds.
  const heart = await createPage(db, notebook.id, null, t('sample.heart'))
  await paragraph(
    heart.id,
    plain('The '),
    marked('first heart sound (S1)', 'key'),
    plain(' is made by the closing of the mitral and tricuspid valves. '),
    plain('Doctors listen for it with a '),
    marked('stethoscope', 'keyword'),
    plain('.'),
  )
  await paragraph(
    heart.id,
    plain('A murmur in a child is '),
    marked('usually harmless', 'must'),
    plain(', but any murmur with symptoms needs a check.'),
  )
  await paragraph(
    heart.id,
    plain('Cardiac output: '),
    marked('CO = HR × SV', 'formula'),
    plain('.'),
  )
  await card(heart.id, t('sample.q1'), t('sample.a1'))
  await card(heart.id, t('sample.q2'), t('sample.a2'))
  await syncCardRecords(db, heart.id, now)

  // Lesson 2: lung volumes, with a sub-page.
  const lungs = await createPage(db, notebook.id, null, t('sample.lungs'))
  await paragraph(
    lungs.id,
    marked('Tidal volume', 'keyword'),
    plain(' is the air moved in one normal breath, about 500 mL.'),
  )
  await paragraph(
    lungs.id,
    plain('The '),
    marked('FEV1/FVC ratio below 0.7', 'must'),
    plain(' suggests an obstructive problem such as asthma or COPD.'),
  )
  await card(lungs.id, t('sample.q3'), t('sample.a3'))
  const detail = await createPage(db, notebook.id, lungs.id, t('sample.detail'))
  await paragraph(
    detail.id,
    marked('Minute ventilation = tidal volume × breaths per minute', 'formula'),
    plain('.'),
  )
  await paragraph(
    detail.id,
    plain('Residual volume is the air '),
    marked('left in the lungs after breathing out fully', 'key'),
    plain('.'),
  )
  await card(detail.id, t('sample.q4'), t('sample.a4'))
  await syncCardRecords(db, lungs.id, now)
  await syncCardRecords(db, detail.id, now)

  // A database with a Date and a Web link (picture) column.
  const books = await createDatabase(
    db,
    workspaceId,
    notebook.id,
    t('sample.books'),
  )
  await db.databases.update(books.id, { titleName: t('sample.books.title') })
  await addColumn(db, books.id, {
    name: t('sample.books.author'),
    type: 'text',
  })
  await addColumn(db, books.id, { name: t('sample.books.when'), type: 'date' })
  await addColumn(db, books.id, { name: t('sample.books.cover'), type: 'url' })
  const [author, when, cover] = await listColumns(db, books.id)
  const titles = [
    t('sample.books.1'),
    t('sample.books.2'),
    t('sample.books.3'),
    t('sample.books.4'),
    t('sample.books.5'),
  ]
  const authors = ['H. Gray', 'F. Netter', 'J. West', 'D. Dubin', 'L. Opie']
  await addRows(
    db,
    books.id,
    titles.map((title, i) => ({
      title,
      values: {
        [author.id]: authors[i],
        // Spread over this month and next, so a calendar has something to show.
        [when.id]: dayFrom(now, i * 3 - 3),
        [cover.id]: PICTURES[i],
      },
    })),
  )
  return notebook
}
