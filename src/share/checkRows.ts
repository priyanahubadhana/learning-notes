import { isOrderKey } from '../core/order'
import type {
  Block,
  Card,
  Database,
  DbColumn,
  DbView,
  Notebook,
  Page,
  ReviewLog,
} from '../core/types'
import { isShowableText } from '../search/searchText'

/**
 * Field by field checks of rows from a file. Only the fields listed here are
 * copied, so nothing unknown from a file reaches the database. The lists are
 * typed: a field added to a record must be added here too, or it stops
 * compiling, so no field is lost by accident.
 *
 * Fields are optional unless `REQUIRED` names them, because rows from older
 * backups do not have the newer fields.
 */
type Check = (value: unknown) => boolean
type Fields<T> = { [K in keyof Required<T>]: Check | typeof DROP }

/** A field never taken from a file. */
const DROP = 'drop'

const text: Check = (v) => typeof v === 'string'
const number: Check = (v) => typeof v === 'number' && Number.isFinite(v)
const yes: Check = (v) => v === true
const bool: Check = (v) => typeof v === 'boolean'
const object: Check = (v) =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const textList: Check = (v) => Array.isArray(v) && v.every(text)
const objectList: Check = (v) => Array.isArray(v) && v.every(object)
const orNull =
  (check: Check): Check =>
  (v) =>
    v === null || check(v)
const oneOf =
  (...values: unknown[]): Check =>
  (v) =>
    values.includes(v)
const order: Check = (v) => typeof v === 'string' && isOrderKey(v)
const blockContent: Check = (v) =>
  object(v) && isShowableText((v as Block['content']).text)

const times = {
  id: text,
  createdAt: number,
  updatedAt: number,
  deletedAt: orNull(number),
  purgedAt: DROP,
} as const

const notebook: Fields<Notebook> = {
  ...times,
  workspaceId: text,
  title: text,
  order,
  kind: oneOf('journal', 'templates', 'databases'),
  starterVersion: number,
  sample: yes,
  pathStyle: oneOf('simple', 'full', 'page'),
  tabs: objectList,
}

const page: Fields<Page> = {
  ...times,
  notebookId: text,
  parentId: orNull(text),
  title: text,
  sample: yes,
  order,
  journalDate: text,
  journalMonth: text,
  customTitle: yes,
  pathStyle: oneOf('simple', 'full', 'page'),
  summary: text,
  templateRole: oneOf('daily'),
  tagIds: textList,
  databaseId: text,
  values: object,
}

const block: Fields<Block> = {
  ...times,
  pageId: text,
  parentId: orNull(text),
  type: text,
  content: blockContent,
  order,
  source: text,
  derivedFrom: text,
}

const rating = oneOf('again', 'hard', 'good', 'easy')

const card: Fields<Card> = {
  ...times,
  blockId: text,
  part: text,
  pageId: text,
  notebookId: text,
  due: number,
  intervalDays: number,
  step: number,
  reps: number,
  lapses: number,
  suspendedAt: orNull(number),
  schedulerData: object,
  lastReviewAt: number,
  lastRating: rating,
}

const reviewLog: Fields<ReviewLog> = {
  id: text,
  cardId: text,
  rating,
  createdAt: number,
  durationMs: number,
  kind: oneOf('review', 'cram'),
  scheduler: text,
  dueBefore: number,
  dueAfter: number,
  intervalBefore: number,
  intervalAfter: number,
  stepAfter: number,
  isNew: bool,
  schedulerDataAfter: object,
  purgedAt: DROP,
}

const database: Fields<Database> = {
  ...times,
  workspaceId: text,
  notebookId: orNull(text),
  title: text,
  order,
  kind: oneOf('studyTracker'),
  titleName: text,
  openViewId: text,
}

const dbColumn: Fields<DbColumn> = {
  ...times,
  databaseId: text,
  name: text,
  type: text,
  config: object,
  order,
}

const dbView: Fields<DbView> = {
  ...times,
  databaseId: text,
  name: text,
  type: text,
  config: object,
  order,
  blockId: text,
}

const tag = { id: text, path: text, color: text }

const image = {
  id: text,
  name: () => true,
  type: text,
  width: () => true,
  height: () => true,
  data: text,
}

const FIELDS = {
  notebooks: notebook,
  pages: page,
  blocks: block,
  cards: card,
  reviewLogs: reviewLog,
  databases: database,
  dbColumns: dbColumn,
  dbViews: dbView,
  tags: tag,
  images: image,
} as const

/** Fields a row must have, on top of its id. */
const REQUIRED: Partial<Record<keyof typeof FIELDS, readonly string[]>> = {
  pages: ['notebookId', 'order'],
  blocks: ['pageId', 'type', 'content', 'order'],
  tags: ['path'],
}

export type RowTable = keyof typeof FIELDS

/**
 * A copy of `row` with only its known fields, or null if a field is missing
 * or of the wrong kind.
 */
export function checkedRow(
  table: RowTable,
  row: Record<string, unknown>,
): Record<string, unknown> | null {
  const fields: Record<string, Check | typeof DROP> = FIELDS[table]
  for (const name of REQUIRED[table] ?? []) {
    if (row[name] === undefined) return null
  }
  const clean: Record<string, unknown> = {}
  for (const [name, check] of Object.entries(fields)) {
    const value = row[name]
    if (value === undefined || check === DROP) continue
    if (!check(value)) return null
    clean[name] = value
  }
  return clean
}
