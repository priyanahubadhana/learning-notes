import { isOrderKey } from '../core/order'
import type {
  Annotation,
  Block,
  BookFile,
  Card,
  Database,
  Deck,
  DbColumn,
  DbView,
  LayerInstall,
  Notebook,
  Page,
  Recording,
  ReviewLog,
} from '../core/types'
import type {
  DayPlan,
  Habit,
  HabitCheck,
  HomeFile,
  Project,
  Task,
  TimeEntry,
} from '../core/homeTypes'
import type { InkChunk, InkLayer } from '../core/inkTypes'
import { MAX_LABEL, STRIDE } from '../core/inkTypes'
import { isShowableText } from '../search/searchText'
import {
  isAnchor,
  isColour,
  isPageSource,
  isQuote,
  MAX_NOTE_LENGTH,
} from '../core/sourceCheck'

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
  kind: oneOf('journal', 'templates', 'databases', 'books', 'sources'),
  starterVersion: number,
  sample: yes,
  pathStyle: oneOf('simple', 'full', 'page'),
  locked: yes,
  readFirst: yes,
  paused: yes,
  allowAi: yes,
  tabs: objectList,
  view: oneOf('shelf', 'tabs'),
  tabViews: (v) =>
    object(v) &&
    Object.values(v as Record<string, unknown>).every((x) =>
      ['list', 'gallery', 'table', 'board'].includes(x as string),
    ),
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
  locked: yes,
  readFirst: yes,
  paused: yes,
  tabColour: (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v),
  inkBg: oneOf('lined', 'grid', 'dots'),
  summary: text,
  templateRole: oneOf('daily'),
  tagIds: textList,
  databaseId: text,
  values: object,
  source: isPageSource,
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
  batchId: text,
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
  sourceAnnotationId: text,
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
  locked: yes,
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

const deckScope: Check = (v) => {
  if (!object(v)) return false
  const d = v as Record<string, unknown>
  return (
    textList(d.notebookIds) &&
    textList(d.pageIds) &&
    typeof d.withSubpages === 'boolean' &&
    (d.notebookKinds === undefined || textList(d.notebookKinds))
  )
}

const layerInstall: Fields<LayerInstall> = {
  ...times,
  packId: text,
  version: number,
  name: text,
  installedAt: number,
  createdIds: (v) =>
    Array.isArray(v) &&
    v.length <= 100_000 &&
    v.every(
      (x) =>
        object(x) &&
        ['notebooks', 'pages', 'databases'].includes(x.table as string) &&
        text(x.id) &&
        text(x.hash),
    ),
}

const deck: Fields<Deck> = {
  ...times,
  name: text,
  order,
  colour: text,
  scope: deckScope,
  tagIds: textList,
  tagMode: oneOf('any', 'all'),
  states: (v) =>
    Array.isArray(v) &&
    v.length <= 4 &&
    v.every((x) => ['new', 'learning', 'due', 'all'].includes(x as string)),
  routeOrder: bool,
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

/** Sound types the recorder can produce (and the app will play back). */
export const isAudioType = (v: unknown): v is string =>
  typeof v === 'string' && /^audio\/[\w.+-]{1,30}(;[ \w=.,+-]{0,60})?$/.test(v)

/** `data` is a bin marker in a file; its bytes are checked in readFull. */
const recording: Fields<Recording> = {
  ...times,
  pageId: text,
  name: (v) => typeof v === 'string' && v.length <= 300,
  type: isAudioType,
  startedAt: number,
  durationMs: number,
  data: object,
}

/** A day, "YYYY-MM-DD". */
const dayText: Check = (v) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const shortText: Check = (v) => typeof v === 'string' && v.length <= 2000

const task: Fields<Task> = {
  ...times,
  title: shortText,
  status: oneOf('open', 'done', 'dropped'),
  quadrant: oneOf(0, 1, 2, 3, 4),
  order,
  plannedDay: dayText,
  doneAt: number,
  doneDay: dayText,
  top3Day: dayText,
  projectId: text,
  listName: shortText,
  sourceBlockId: text,
  sourcePageId: text,
  carried: (v) =>
    Array.isArray(v) &&
    v.length <= 1000 &&
    v.every(
      (x) =>
        object(x) &&
        dayText((x as Record<string, unknown>).from) &&
        dayText((x as Record<string, unknown>).to) &&
        number((x as Record<string, unknown>).at),
    ),
  estimateMin: number,
  note: (v) => typeof v === 'string' && v.length <= 20000,
}

const project: Fields<Project> = {
  ...times,
  name: shortText,
  order,
  colour: text,
}

const timeEntry: Fields<TimeEntry> = {
  ...times,
  startedAt: number,
  endedAt: number,
  day: dayText,
  projectId: text,
  mode: oneOf('free', 'focus'),
  cycle: (v) => Array.isArray(v) && v.length === 4 && v.every((x) => number(x)),
  ackedAt: number,
}

const dayPlan: Fields<DayPlan> = {
  ...times,
  day: dayText,
  blocks: (v) =>
    Array.isArray(v) &&
    v.length <= 500 &&
    v.every(
      (x) =>
        object(x) &&
        text((x as Record<string, unknown>).id) &&
        number((x as Record<string, unknown>).startMin) &&
        number((x as Record<string, unknown>).durationMin),
    ),
}

const habit: Fields<Habit> = {
  ...times,
  name: shortText,
  routine: oneOf('morning', 'night', 'daily'),
  order,
  affirmationPageId: text,
  fileId: text,
}

const habitCheck: Fields<HabitCheck> = {
  ...times,
  habitId: text,
  day: dayText,
  done: bool,
}

const homeFile: Fields<HomeFile> = {
  ...times,
  kind: oneOf('audio'),
  type: isAudioType,
  name: (v) => typeof v === 'string' && v.length <= 300,
  durationMs: number,
  data: object,
}

/**
 * Book files hold the Library's books (PDF, EPUB, DOCX: checked again by
 * their first bytes) and files attached to a page (G2: any type, never
 * opened by the browser, only saved out as a download).
 */
const bookMime: Check = (v) =>
  typeof v === 'string' && /^[\w.+-]{1,60}\/[\w.+-]{1,100}$/.test(v)

/** `data` is a bin marker in a file; its bytes are checked in readFull. */
const bookFile: Fields<BookFile> = {
  ...times,
  pageId: text,
  name: (v) => typeof v === 'string' && v.length <= 300,
  mime: bookMime,
  size: number,
  data: object,
  /** An attached file that was opened in the reader: its Library page. */
  readerPageId: text,
}

const annotation: Fields<Annotation> = {
  ...times,
  pageId: text,
  kind: oneOf('highlight', 'note', 'bookmark'),
  colour: isColour,
  anchor: isAnchor,
  quote: isQuote,
  note: (v) => typeof v === 'string' && v.length <= MAX_NOTE_LENGTH,
  chapter: (v) => typeof v === 'string' && v.length <= 300,
  savedTo: (v) =>
    Array.isArray(v) &&
    v.length <= 50 &&
    v.every(
      (x) =>
        object(x) &&
        text((x as Record<string, unknown>).pageId) &&
        text((x as Record<string, unknown>).blockId),
    ),
  cardIds: (v) => textList(v) && (v as string[]).length <= 50,
  origin: oneOf('user', 'ai'),
}

/** A stroke of a chunk: id, points in whole groups of STRIDE numbers, a style. */
const stroke = (v: unknown): boolean => {
  if (!object(v)) return false
  const s = v as Record<string, unknown>
  return (
    text(s.id) &&
    number(s.at) &&
    (s.kind === 'ink' || s.kind === 'highlight' || s.kind === 'tape') &&
    object(s.style) &&
    number(s.bw) &&
    Array.isArray(s.pts) &&
    s.pts.length % STRIDE === 0 &&
    s.pts.length <= 400_000 &&
    s.pts.every(number) &&
    (s.label === undefined ||
      (typeof s.label === 'string' && s.label.length <= MAX_LABEL))
  )
}
const strokeList: Check = (v) =>
  Array.isArray(v) && v.length <= 1000 && v.every(stroke)

const inkLayer: Fields<InkLayer> = {
  ...times,
  pageId: text,
  name: text,
  order,
  hidden: yes,
  locked: yes,
}

const inkChunk: Fields<InkChunk> = {
  ...times,
  pageId: text,
  layerId: text,
  blockId: orNull(text),
  strokes: strokeList,
  fb: object,
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
  decks: deck,
  layerInstalls: layerInstall,
  inkLayers: inkLayer,
  inkChunks: inkChunk,
  recordings: recording,
  bookFiles: bookFile,
  annotations: annotation,
  tasks: task,
  projects: project,
  timeEntries: timeEntry,
  dayPlans: dayPlan,
  habits: habit,
  habitChecks: habitCheck,
  files: homeFile,
} as const

/** Fields a row must have, on top of its id. */
const REQUIRED: Partial<Record<keyof typeof FIELDS, readonly string[]>> = {
  pages: ['notebookId', 'order'],
  blocks: ['pageId', 'type', 'content', 'order'],
  decks: ['name', 'scope'],
  layerInstalls: ['packId', 'createdIds'],
  inkLayers: ['pageId', 'order'],
  inkChunks: ['pageId', 'layerId', 'strokes'],
  recordings: ['pageId', 'data'],
  bookFiles: ['pageId', 'data'],
  annotations: ['pageId', 'kind', 'anchor'],
  tags: ['path'],
  tasks: ['title', 'status', 'quadrant', 'order'],
  projects: ['name', 'order'],
  timeEntries: ['startedAt', 'day'],
  dayPlans: ['day', 'blocks'],
  habits: ['name', 'routine', 'order'],
  habitChecks: ['habitId', 'day', 'done'],
  files: ['kind', 'data'],
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
