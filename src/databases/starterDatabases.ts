import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import type { Database, JsonObject, JsonValue } from '../core/types'
import { t, type MessageKey } from '../i18n/t'
import { addColumn, createDatabase } from './databaseService'

/**
 * Starter databases offered by "+ New database": a name for the title
 * column and ready-made columns, so a list is useful from the first row.
 */

export const STARTER_IDS = [
  'blank',
  'drugs',
  'vocabulary',
  'books',
  'habits',
] as const
export type StarterId = (typeof STARTER_IDS)[number]

interface ColumnSpec {
  name: MessageKey
  type: string
  config?: JsonObject
  /** Choice options (names; the order is kept). */
  options?: readonly MessageKey[]
}

interface Starter {
  title: MessageKey
  titleName: MessageKey
  columns: readonly ColumnSpec[]
}

const COLORS = ['#2f6feb', '#2e9e6b', '#d9822b', '#8a5cf6'] as const

const STARTERS: Record<StarterId, Starter> = {
  blank: {
    title: 'database.untitled',
    titleName: 'database.titleColumn',
    columns: [],
  },
  drugs: {
    title: 'starter.drugs.title',
    titleName: 'starter.drugs.name',
    columns: [
      { name: 'starter.drugs.class', type: 'text' },
      { name: 'starter.drugs.dose', type: 'text' },
      { name: 'starter.drugs.sideEffects', type: 'text' },
      {
        name: 'starter.confidence',
        type: 'number',
        config: { format: 'stars', max: 5 },
      },
    ],
  },
  vocabulary: {
    title: 'starter.vocabulary.title',
    titleName: 'starter.vocabulary.word',
    columns: [
      { name: 'starter.vocabulary.meaning', type: 'text' },
      { name: 'starter.vocabulary.example', type: 'text' },
      { name: 'starter.vocabulary.known', type: 'checkbox' },
    ],
  },
  books: {
    title: 'starter.books.title',
    titleName: 'starter.books.name',
    columns: [
      { name: 'starter.books.author', type: 'text' },
      {
        name: 'starter.books.status',
        type: 'choice',
        options: [
          'starter.books.toRead',
          'starter.books.reading',
          'starter.books.done',
        ],
      },
      {
        name: 'starter.books.rating',
        type: 'number',
        config: { format: 'stars', max: 5 },
      },
      { name: 'starter.books.finished', type: 'date' },
    ],
  },
  habits: {
    title: 'starter.habits.title',
    titleName: 'starter.habits.name',
    columns: [
      {
        name: 'starter.habits.how',
        type: 'choice',
        options: ['starter.habits.daily', 'starter.habits.weekly'],
      },
      { name: 'starter.habits.today', type: 'checkbox' },
      { name: 'starter.habits.streak', type: 'number' },
    ],
  },
}

/** Name and one-line description of a starter, for the picker. */
export const starterName = (id: StarterId): string =>
  t(`starter.${id}.pick` as MessageKey)

/**
 * Creates a database from a starter (columns and views). `notebookId` null
 * = outside any notebook.
 */
export async function createStarterDatabase(
  db: LearningNotesDB,
  workspaceId: string,
  notebookId: string | null,
  starter: StarterId,
): Promise<Database> {
  const spec = STARTERS[starter]
  const database = await createDatabase(
    db,
    workspaceId,
    notebookId,
    t(spec.title),
  )
  await db.databases.update(database.id, { titleName: t(spec.titleName) })
  for (const column of spec.columns) {
    const options = column.options?.map((name, i) => ({
      id: createId(),
      name: t(name),
      color: COLORS[i % COLORS.length],
    }))
    await addColumn(db, database.id, {
      name: t(column.name),
      type: column.type,
      config: {
        ...column.config,
        ...(options && { options: options as unknown as JsonValue }),
      },
    })
  }
  return { ...database, titleName: t(spec.titleName) }
}
