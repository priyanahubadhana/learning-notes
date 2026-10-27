import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import {
  byOrder,
  orderAtIndex,
  orderBetween,
  ordersBetween,
} from '../core/order'
import {
  getLive,
  isLive,
  newRecordFields,
  restoreMany,
  softDeleteMany,
} from '../core/records'
import type {
  Database,
  DbColumn,
  DbView,
  JsonObject,
  JsonValue,
  Page,
  RowRef,
} from '../core/types'
import { t } from '../i18n/t'
import {
  createNotebook,
  findNotebookOfKind,
} from '../notebooks/notebookService'
import {
  choiceOptions,
  getColumnType,
  isComputedColumn,
  TITLE_COLUMN_ID,
  type ChoiceOption,
} from './columnTypes'
import { MAX_FORMULA_LENGTH, renameReference } from './formula/formulaParser'
import { softDeleteDatabaseParts } from './databaseParts'
import { studyTrackerId } from './notebookTabs'

/**
 * Database operations: databases, columns, views, rows and cells.
 *
 * Rows are pages (`Page.databaseId`, cell values in `Page.values`), so a row
 * opens as a full page with notes, cards, links and tags. The Study
 * tracker is special: its rows are its notebook's top-level pages.
 * UI code calls these instead of the database directly.
 */

// ---------------------------------------------------------------- databases

/** Returns a live database, or undefined if it is missing or deleted. */
export async function getDatabase(
  db: LearningNotesDB,
  id: string,
): Promise<Database | undefined> {
  const database = await db.databases.get(id)
  return database && isLive(database) ? database : undefined
}

/** All live databases of a workspace ("All databases"), in order. */
export async function listDatabases(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<Database[]> {
  const all = await db.databases
    .where('workspaceId')
    .equals(workspaceId)
    .toArray()
  return all.filter(isLive).sort(byOrder)
}

/** Name of a database's title column ("Name" unless renamed). */
export function titleColumnName(database: Database): string {
  return database.titleName ?? t('database.titleColumn')
}

async function nextDatabaseOrder(db: LearningNotesDB, workspaceId: string) {
  const last = (await listDatabases(db, workspaceId)).at(-1)
  return orderBetween(last?.order ?? null, null)
}

/** A new database's views: Table, Dashboard (starter charts), Board. */
function newViews(databaseId: string): DbView[] {
  const [first, second, third] = ordersBetween(null, null, 3)
  const view = (type: string, name: string, order: string): DbView => ({
    ...newRecordFields(),
    databaseId,
    name,
    type,
    config: {},
    order,
  })
  return [
    view('table', t('database.view.table'), first),
    view('dashboard', t('database.view.dashboard'), second),
    view('board', t('database.view.board'), third),
  ]
}

/**
 * Creates a database with its views (see newViews). `notebookId` null = outside any
 * notebook (its rows then live in the hidden "Databases" notebook).
 */
export async function createDatabase(
  db: LearningNotesDB,
  workspaceId: string,
  notebookId: string | null,
  title = t('database.untitled'),
): Promise<Database> {
  const tables = [db.workspaces, db.notebooks, db.databases, db.dbViews]
  return db.transaction('rw', tables, async () => {
    await getLive(db.workspaces, workspaceId)
    if (notebookId !== null) {
      const notebook = await getLive(db.notebooks, notebookId)
      if (notebook.kind) throw new Error('Not a normal notebook')
    }
    const database: Database = {
      ...newRecordFields(),
      workspaceId,
      notebookId,
      title,
      titleName: t('database.titleColumn'),
      order: await nextDatabaseOrder(db, workspaceId),
    }
    await db.databases.add(database)
    await db.dbViews.bulkAdd(newViews(database.id))
    return database
  })
}

/**
 * Returns a notebook's Study tracker, creating it (with its columns and
 * views) the first time. Its id comes from the notebook id, so the
 * notebook's Database tab already points to it.
 */
export async function ensureStudyTracker(
  db: LearningNotesDB,
  notebookId: string,
): Promise<Database> {
  const id = studyTrackerId(notebookId)
  const tables = [db.notebooks, db.databases, db.dbColumns, db.dbViews]
  return db.transaction('rw', tables, async () => {
    const existing = await db.databases.get(id)
    if (existing) return existing
    const notebook = await getLive(db.notebooks, notebookId)
    if (notebook.kind) throw new Error('Not a normal notebook')
    const database: Database = {
      ...newRecordFields(),
      id,
      workspaceId: notebook.workspaceId,
      notebookId,
      title: t('tracker.title'),
      kind: 'studyTracker',
      titleName: t('tracker.column.lesson'),
      order: await nextDatabaseOrder(db, notebook.workspaceId),
    }
    // Auto columns are filled from cards and reviews (Step 6).
    const columns: [string, string, JsonObject][] = [
      ['trackerStatus', t('tracker.column.status'), {}],
      ['trackerLastRevised', t('tracker.column.lastRevised'), {}],
      ['trackerCardsDue', t('tracker.column.cardsDue'), {}],
      ['trackerCorrect', t('tracker.column.correct'), {}],
      ['number', t('tracker.column.confidence'), { format: 'stars', max: 5 }],
    ]
    const orders = ordersBetween(null, null, columns.length)
    await db.databases.add(database)
    await db.dbColumns.bulkAdd(
      columns.map(([type, name, config], i) => ({
        ...newRecordFields(),
        databaseId: id,
        name,
        type,
        config,
        order: orders[i],
      })),
    )
    await db.dbViews.bulkAdd(newViews(id))
    return database
  })
}

/** Renames a database. */
export async function renameDatabase(
  db: LearningNotesDB,
  id: string,
  title: string,
): Promise<void> {
  await db.transaction('rw', db.databases, async () => {
    await getLive(db.databases, id)
    await db.databases.update(id, { title, updatedAt: Date.now() })
  })
}

/**
 * Sets the view a database opens on (null = automatic: Dashboard once it
 * has rows, Table while empty).
 */
export async function setOpenView(
  db: LearningNotesDB,
  id: string,
  viewId: string | null,
): Promise<void> {
  await db.transaction('rw', db.databases, async () => {
    await getLive(db.databases, id)
    await db.databases.update(id, {
      openViewId: viewId ?? undefined,
      updatedAt: Date.now(),
    })
  })
}

/**
 * Soft-deletes a database with its columns, views and row pages (with
 * their sub-pages and blocks), all at one moment so Trash restores them
 * together. A Study tracker cannot be deleted (it belongs to its notebook).
 */
export async function deleteDatabase(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  const tables = [db.databases, db.dbColumns, db.dbViews, db.pages, db.blocks]
  await db.transaction('rw', tables, async () => {
    const database = await getLive(db.databases, id)
    if (database.kind === 'studyTracker') {
      throw new Error('The Study tracker belongs to its notebook')
    }
    await softDeleteDatabaseParts(db, database, Date.now())
  })
}

// ------------------------------------------------------------------ columns

/** The live columns of a database, in order (the title column not included). */
export async function listColumns(
  db: LearningNotesDB,
  databaseId: string,
): Promise<DbColumn[]> {
  const all = await db.dbColumns
    .where('databaseId')
    .equals(databaseId)
    .toArray()
  return all.filter(isLive).sort(byOrder)
}

/**
 * Cleans a column name: no `[` `]` (formulas use them around names),
 * spaces trimmed, never empty.
 */
function cleanName(name: string): string {
  const cleaned = name.replace(/[[\]]/g, '').replace(/\s+/g, ' ').trim()
  return cleaned.slice(0, 200) || t('database.titleColumn')
}

/**
 * Makes `name` unique among the database's column names (ignoring case),
 * adding " 2", " 3" … So `[Name]` in a formula always means one column.
 */
function uniqueName(name: string, taken: readonly string[]): string {
  const used = new Set(taken.map((n) => n.toLocaleLowerCase()))
  if (!used.has(name.toLocaleLowerCase())) return name
  for (let i = 2; ; i++) {
    const candidate = `${name} ${i}`
    if (!used.has(candidate.toLocaleLowerCase())) return candidate
  }
}

async function takenNames(
  db: LearningNotesDB,
  database: Database,
  exceptColumnId?: string,
): Promise<string[]> {
  const columns = await listColumns(db, database.id)
  const names = columns
    .filter((c) => c.id !== exceptColumnId)
    .map((c) => c.name)
  return exceptColumnId === TITLE_COLUMN_ID
    ? names
    : [...names, titleColumnName(database)]
}

/** Checks a column's settings for its type; throws if not allowed. */
async function checkConfig(
  db: LearningNotesDB,
  databaseId: string,
  type: string,
  config: JsonObject,
): Promise<void> {
  if (type === 'formula') {
    const formula = config.formula
    if (typeof formula !== 'string' || formula.length > MAX_FORMULA_LENGTH) {
      throw new Error('Formula text expected (at most 2000 characters)')
    }
  }
  if (type === 'choice' || type === 'choices') {
    const options = config.options
    const ok =
      Array.isArray(options) &&
      options.every(
        (o) =>
          typeof o === 'object' &&
          o !== null &&
          !Array.isArray(o) &&
          typeof o.id === 'string' &&
          typeof o.name === 'string',
      )
    if (!ok) throw new Error('Choice options expected')
  }
  if (type === 'rollup') {
    const { relationColumnId, targetColumnId, fn } = config
    if (relationColumnId === '' && targetColumnId === '') return // not set up yet
    const relation = await db.dbColumns.get(String(relationColumnId))
    if (
      !relation ||
      !isLive(relation) ||
      relation.databaseId !== databaseId ||
      relation.type !== 'relation'
    ) {
      throw new Error('Rollup needs a Relation column of this database')
    }
    if (typeof fn !== 'string' || !ROLLUP_FUNCTIONS.includes(fn)) {
      throw new Error('Unknown rollup function')
    }
    if (targetColumnId !== TITLE_COLUMN_ID) {
      const target = await db.dbColumns.get(String(targetColumnId))
      if (
        !target ||
        !isLive(target) ||
        target.databaseId !== relation.config.databaseId
      ) {
        throw new Error('Rollup column must be in the related database')
      }
    }
  }
}

/** Rollup summaries (`config.fn` of a Rollup column). */
export const ROLLUP_FUNCTIONS: readonly string[] = [
  'showOriginal',
  'count',
  'countValues',
  'countUnique',
  'sum',
  'average',
  'min',
  'max',
  'percentChecked',
  'earliest',
  'latest',
]

/**
 * Adds a column at `index` (default: at the end). Relations are added with
 * `addRelationColumn`.
 */
export async function addColumn(
  db: LearningNotesDB,
  databaseId: string,
  input: { name: string; type: string; config?: JsonObject },
  index = Number.MAX_SAFE_INTEGER,
): Promise<DbColumn> {
  const definition = getColumnType(input.type)
  if (!definition) throw new Error(`Unknown column type: ${input.type}`)
  if (input.type === 'relation') throw new Error('Use addRelationColumn')
  return db.transaction('rw', db.databases, db.dbColumns, async () => {
    const database = await getLive(db.databases, databaseId)
    const config = { ...definition.defaultConfig?.(), ...input.config }
    await checkConfig(db, databaseId, input.type, config)
    const columns = await listColumns(db, databaseId)
    const column: DbColumn = {
      ...newRecordFields(),
      databaseId,
      name: uniqueName(cleanName(input.name), await takenNames(db, database)),
      type: input.type,
      config,
      order: orderAtIndex(
        columns.map((c) => c.order),
        index,
      ),
    }
    await db.dbColumns.add(column)
    return column
  })
}

/**
 * Adds a Relation column linking rows to rows of `targetDatabaseId` (may
 * be the same database). Two-way (default) also adds the partner column in
 * the target database, named after this database.
 */
export async function addRelationColumn(
  db: LearningNotesDB,
  databaseId: string,
  input: { name: string; targetDatabaseId: string; twoWay?: boolean },
  index = Number.MAX_SAFE_INTEGER,
): Promise<DbColumn> {
  return db.transaction('rw', db.databases, db.dbColumns, async () => {
    const database = await getLive(db.databases, databaseId)
    await getLive(db.databases, input.targetDatabaseId)
    const columns = await listColumns(db, databaseId)
    const column: DbColumn = {
      ...newRecordFields(),
      databaseId,
      name: uniqueName(cleanName(input.name), await takenNames(db, database)),
      type: 'relation',
      config: { databaseId: input.targetDatabaseId },
      order: orderAtIndex(
        columns.map((c) => c.order),
        index,
      ),
    }
    await db.dbColumns.add(column)
    if (input.twoWay !== false) await addPartner(db, column, database)
    return (await db.dbColumns.get(column.id))!
  })
}

/** Adds the back side of a two-way relation (in the target database). */
async function addPartner(
  db: LearningNotesDB,
  column: DbColumn,
  database: Database,
): Promise<void> {
  const targetId = String(column.config.databaseId)
  const target = await getLive(db.databases, targetId)
  const targetColumns = await listColumns(db, targetId)
  const partner: DbColumn = {
    ...newRecordFields(),
    databaseId: targetId,
    name: uniqueName(cleanName(database.title), await takenNames(db, target)),
    type: 'relation',
    config: { databaseId: database.id, pairedColumnId: column.id, back: true },
    order: orderAtIndex(
      targetColumns.map((c) => c.order),
      targetColumns.length,
    ),
  }
  await db.dbColumns.add(partner)
  await db.dbColumns.update(column.id, {
    config: { ...column.config, pairedColumnId: partner.id },
    updatedAt: Date.now(),
  })
}

/**
 * Turns the back side of a relation on or off. Off soft-deletes the
 * partner column (no values are lost: they live on this side).
 */
export async function setRelationTwoWay(
  db: LearningNotesDB,
  columnId: string,
  twoWay: boolean,
): Promise<void> {
  await db.transaction('rw', db.databases, db.dbColumns, async () => {
    let column = await getLive(db.dbColumns, columnId)
    if (column.type !== 'relation') throw new Error('Not a relation')
    if (column.config.back === true) {
      // Asked on the back side: act on the main side.
      column = await getLive(db.dbColumns, String(column.config.pairedColumnId))
    }
    const partnerId = column.config.pairedColumnId
    const partner =
      typeof partnerId === 'string'
        ? await db.dbColumns.get(partnerId)
        : undefined
    const now = Date.now()
    if (!twoWay) {
      if (partner && isLive(partner)) {
        await softDeleteMany(db.dbColumns, [partner.id], now)
      }
      return
    }
    if (partner && isLive(partner)) return
    if (partner && partner.purgedAt === undefined) {
      await restoreMany(db.dbColumns, [partner.id], now)
      return
    }
    await addPartner(db, column, await getLive(db.databases, column.databaseId))
  })
}

/**
 * Renames a column (or the title column, id TITLE_COLUMN_ID, with
 * `databaseId`). Formulas of the database that use the old name are
 * updated, so they keep working. Returns the name given (made unique).
 */
export async function renameColumn(
  db: LearningNotesDB,
  databaseId: string,
  columnId: string,
  name: string,
): Promise<string> {
  return db.transaction('rw', db.databases, db.dbColumns, async () => {
    const database = await getLive(db.databases, databaseId)
    const column =
      columnId === TITLE_COLUMN_ID
        ? undefined
        : await getLive(db.dbColumns, columnId)
    if (column && column.databaseId !== databaseId) {
      throw new Error('Column is not in this database')
    }
    const oldName = column ? column.name : titleColumnName(database)
    const newName = uniqueName(
      cleanName(name),
      await takenNames(db, database, columnId),
    )
    const now = Date.now()
    if (column) {
      await db.dbColumns.update(columnId, { name: newName, updatedAt: now })
    } else {
      await db.databases.update(databaseId, {
        titleName: newName,
        updatedAt: now,
      })
    }
    for (const other of await listColumns(db, databaseId)) {
      if (other.type !== 'formula') continue
      const formula = String(other.config.formula ?? '')
      const rewritten = renameReference(formula, oldName, newName)
      if (rewritten === formula) continue
      await db.dbColumns.update(other.id, {
        config: { ...other.config, formula: rewritten },
        updatedAt: now,
      })
    }
    return newName
  })
}

/** Changes a column's settings (merged into the current ones). */
export async function updateColumnConfig(
  db: LearningNotesDB,
  columnId: string,
  patch: JsonObject,
): Promise<void> {
  await db.transaction('rw', db.dbColumns, async () => {
    const column = await getLive(db.dbColumns, columnId)
    if (column.type === 'relation') {
      if (
        'databaseId' in patch ||
        'pairedColumnId' in patch ||
        'back' in patch
      ) {
        throw new Error('Use setRelationTwoWay')
      }
    }
    const config = { ...column.config, ...patch }
    await checkConfig(db, column.databaseId, column.type, config)
    await db.dbColumns.update(columnId, { config, updatedAt: Date.now() })
  })
}

/**
 * Adds an option to a Choice/Choices column and returns it; an option of
 * the same name (ignoring case) is returned instead of a duplicate.
 */
export async function addChoiceOption(
  db: LearningNotesDB,
  columnId: string,
  name: string,
  color?: string,
): Promise<ChoiceOption> {
  return db.transaction('rw', db.dbColumns, async () => {
    const column = await getLive(db.dbColumns, columnId)
    const options = choiceOptions(column)
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, 200)
    if (clean === '') throw new Error('Option name expected')
    const existing = options.find(
      (o) => o.name.toLocaleLowerCase() === clean.toLocaleLowerCase(),
    )
    if (existing) return existing
    const option: ChoiceOption = { id: createId(), name: clean }
    if (color) option.color = color
    await db.dbColumns.update(columnId, {
      config: {
        ...column.config,
        options: [...options, option] as unknown as JsonValue,
      },
      updatedAt: Date.now(),
    })
    return option
  })
}

/** Moves a column to `toIndex` among the database's columns. */
export async function moveColumn(
  db: LearningNotesDB,
  columnId: string,
  toIndex: number,
): Promise<void> {
  await db.transaction('rw', db.dbColumns, async () => {
    const column = await getLive(db.dbColumns, columnId)
    const siblings = (await listColumns(db, column.databaseId)).filter(
      (c) => c.id !== columnId,
    )
    const order = orderAtIndex(
      siblings.map((c) => c.order),
      toIndex,
    )
    await db.dbColumns.update(columnId, { order, updatedAt: Date.now() })
  })
}

/**
 * Changes a column's type. Values are not rewritten: they are read as the
 * new type (see columnTypes.ts), so changing back shows them again. Text
 * becoming a Choice gets one option per different text. Relations and
 * their partners keep their type (add a new column instead).
 */
export async function changeColumnType(
  db: LearningNotesDB,
  columnId: string,
  type: string,
): Promise<void> {
  const definition = getColumnType(type)
  if (!definition) throw new Error(`Unknown column type: ${type}`)
  await db.transaction('rw', db.databases, db.dbColumns, db.pages, async () => {
    const column = await getLive(db.dbColumns, columnId)
    if (column.type === type) return
    if (column.type === 'relation' || type === 'relation') {
      throw new Error('Relations cannot change type')
    }
    let config: JsonObject = {
      ...definition.defaultConfig?.(),
      ...column.config,
    }
    if (type === 'choice' || type === 'choices') {
      config = {
        ...config,
        options: optionsFromValues(
          column,
          await rowsOf(db, column.databaseId),
        ) as unknown as JsonValue,
      }
    }
    if (type === 'formula' && typeof config.formula !== 'string') {
      config.formula = ''
    }
    await db.dbColumns.update(columnId, {
      type,
      config,
      updatedAt: Date.now(),
    })
  })
}

/** Keeps a column's options and adds one per different text value. */
function optionsFromValues(column: DbColumn, rows: Page[]): ChoiceOption[] {
  const options = [...choiceOptions(column)]
  const known = new Set(options.map((o) => o.name.toLocaleLowerCase()))
  for (const row of rows) {
    const raw = row.values?.[column.id]
    const texts =
      typeof raw === 'string'
        ? raw.split(',')
        : Array.isArray(raw)
          ? raw.filter((v): v is string => typeof v === 'string')
          : []
    for (const text of texts) {
      const name = text.trim()
      if (name === '' || options.some((o) => o.id === name)) continue
      if (known.has(name.toLocaleLowerCase())) continue
      known.add(name.toLocaleLowerCase())
      options.push({ id: createId(), name })
      if (options.length >= 500) return options
    }
  }
  return options
}

/**
 * Soft-deletes a column (and a two-way partner). Values stay on the rows,
 * so `restoreColumn` brings everything back.
 */
export async function deleteColumn(
  db: LearningNotesDB,
  columnId: string,
): Promise<void> {
  await db.transaction('rw', db.dbColumns, async () => {
    const column = await getLive(db.dbColumns, columnId)
    const ids = [columnId]
    const partnerId = column.config.pairedColumnId
    if (typeof partnerId === 'string' && column.config.back !== true) {
      const partner = await db.dbColumns.get(partnerId)
      if (partner && isLive(partner)) ids.push(partner.id)
    }
    await softDeleteMany(db.dbColumns, ids, Date.now())
  })
}

/**
 * Restores a deleted column (Undo), with the partner deleted together with
 * it; a name now taken gets a number.
 */
export async function restoreColumn(
  db: LearningNotesDB,
  columnId: string,
): Promise<void> {
  await db.transaction('rw', db.databases, db.dbColumns, async () => {
    const column = await db.dbColumns.get(columnId)
    if (!column || column.deletedAt === null || column.purgedAt !== undefined) {
      throw new Error('Column is not deleted')
    }
    const database = await getLive(db.databases, column.databaseId)
    if (column.config.back === true) {
      const main = await db.dbColumns.get(String(column.config.pairedColumnId))
      if (!main || !isLive(main)) throw new Error('Its relation is deleted')
    }
    const toRestore = [column]
    const partnerId = column.config.pairedColumnId
    if (typeof partnerId === 'string' && column.config.back !== true) {
      const partner = await db.dbColumns.get(partnerId)
      if (partner?.deletedAt === column.deletedAt) toRestore.push(partner)
    }
    const now = Date.now()
    for (const item of toRestore) {
      const owner =
        item.databaseId === database.id
          ? database
          : await db.databases.get(item.databaseId)
      if (!owner || !isLive(owner)) continue
      const name = uniqueName(item.name, await takenNames(db, owner))
      await db.dbColumns.update(item.id, {
        name,
        deletedAt: null,
        updatedAt: now,
      })
    }
  })
}

// -------------------------------------------------------------------- views

/** The database's own views (not "/database" block views), in order. */
export async function listViews(
  db: LearningNotesDB,
  databaseId: string,
): Promise<DbView[]> {
  const all = await db.dbViews.where('databaseId').equals(databaseId).toArray()
  return all.filter((v) => isLive(v) && v.blockId === undefined).sort(byOrder)
}

/** Adds a view at the end of the database's views. */
export async function addView(
  db: LearningNotesDB,
  databaseId: string,
  input: { name: string; type: string; config?: JsonObject },
): Promise<DbView> {
  return db.transaction('rw', db.databases, db.dbViews, async () => {
    await getLive(db.databases, databaseId)
    const last = (await listViews(db, databaseId)).at(-1)
    const view: DbView = {
      ...newRecordFields(),
      databaseId,
      name: input.name.trim().slice(0, 200) || t('database.view.table'),
      type: input.type,
      config: input.config ?? {},
      order: orderBetween(last?.order ?? null, null),
    }
    await db.dbViews.add(view)
    return view
  })
}

/** Renames a view and/or replaces its settings (sorts, filters, …). */
export async function updateView(
  db: LearningNotesDB,
  viewId: string,
  changes: { name?: string; config?: JsonObject },
): Promise<void> {
  await db.transaction('rw', db.dbViews, async () => {
    await getLive(db.dbViews, viewId)
    await db.dbViews.update(viewId, {
      ...(changes.name !== undefined && {
        name: changes.name.trim().slice(0, 200),
      }),
      ...(changes.config !== undefined && { config: changes.config }),
      updatedAt: Date.now(),
    })
  })
}

/** Soft-deletes a view; the last view of a database cannot be deleted. */
export async function deleteView(
  db: LearningNotesDB,
  viewId: string,
): Promise<void> {
  await db.transaction('rw', db.dbViews, async () => {
    const view = await getLive(db.dbViews, viewId)
    if (view.blockId === undefined) {
      const views = await listViews(db, view.databaseId)
      if (views.length <= 1) throw new Error('A database keeps one view')
    }
    await softDeleteMany(db.dbViews, [viewId], Date.now())
  })
}

// --------------------------------------------------------------------- rows

/** Live rows of a database, in order (works for the Study tracker too). */
export async function listRows(
  db: LearningNotesDB,
  databaseId: string,
): Promise<Page[]> {
  return rowsOf(db, databaseId)
}

async function rowsOf(
  db: LearningNotesDB,
  databaseId: string,
): Promise<Page[]> {
  const database = await db.databases.get(databaseId)
  if (!database) return []
  if (database.kind === 'studyTracker') {
    // Lessons: top-level pages of the notebook that are not rows of
    // another database.
    const pages = await db.pages
      .where('notebookId')
      .equals(database.notebookId ?? '')
      .toArray()
    return pages
      .filter((p) => isLive(p) && p.parentId === null && !p.databaseId)
      .sort(byOrder)
  }
  const rows = await db.pages.where('databaseId').equals(databaseId).toArray()
  return rows.filter(isLive).sort(byOrder)
}

/** True if the database has at least one live row (stops at the first). */
export async function hasRows(
  db: LearningNotesDB,
  databaseId: string,
): Promise<boolean> {
  const database = await db.databases.get(databaseId)
  if (!database) return false
  const row =
    database.kind === 'studyTracker'
      ? await db.pages
          .where('notebookId')
          .equals(database.notebookId ?? '')
          .filter((p) => isLive(p) && p.parentId === null && !p.databaseId)
          .first()
      : await db.pages
          .where('databaseId')
          .equals(databaseId)
          .filter(isLive)
          .first()
  return row !== undefined
}

/** The database a page is a row of (undefined if none). */
export async function databaseOfRow(
  db: LearningNotesDB,
  page: Page,
): Promise<Database | undefined> {
  if (page.databaseId) return getDatabase(db, page.databaseId)
  if (page.parentId !== null) return undefined
  return getDatabase(db, studyTrackerId(page.notebookId))
}

/** The notebook that holds a database's row pages. */
async function rowNotebookId(
  db: LearningNotesDB,
  database: Database,
): Promise<string> {
  if (database.notebookId !== null) return database.notebookId
  const home = await findNotebookOfKind(db, database.workspaceId, 'databases')
  if (home) return home.id
  const created = await createNotebook(
    db,
    database.workspaceId,
    t('database.looseNotebook'),
    'databases',
  )
  return created.id
}

/** A new row: a title and cell values by column id. */
export interface RowInput {
  title?: string
  values?: Record<string, JsonValue>
}

/**
 * Adds rows (in one go, e.g. for an import) after the last row. Values are
 * checked like `setCells`. Returns the new row pages. Study tracker rows
 * are notes: create them as pages instead.
 */
export async function addRows(
  db: LearningNotesDB,
  databaseId: string,
  inputs: readonly RowInput[],
): Promise<Page[]> {
  const tables = [
    db.workspaces,
    db.notebooks,
    db.databases,
    db.dbColumns,
    db.pages,
    db.tags,
    db.rowRefs,
  ]
  return db.transaction('rw', tables, async () => {
    const database = await getLive(db.databases, databaseId)
    if (database.kind === 'studyTracker') {
      throw new Error('Study tracker rows are the notebook’s pages')
    }
    const notebookId = await rowNotebookId(db, database)
    const columns = new Map(
      (await listColumns(db, databaseId)).map((c) => [c.id, c]),
    )
    const last = (await rowsOf(db, databaseId)).at(-1)
    const orders = ordersBetween(last?.order ?? null, null, inputs.length)
    const pages: Page[] = []
    for (const [i, input] of inputs.entries()) {
      const values: JsonObject = {}
      for (const [columnId, value] of Object.entries(input.values ?? {})) {
        const column = columns.get(columnId)
        if (!column) throw new Error(`Unknown column: ${columnId}`)
        const stored = normalizeCell(column, value)
        if (stored !== null) values[columnId] = stored
      }
      pages.push({
        ...newRecordFields(),
        notebookId,
        parentId: null,
        title: (input.title ?? '').slice(0, 2000),
        order: orders[i],
        databaseId,
        ...(Object.keys(values).length > 0 && { values }),
      })
    }
    await checkRefs(db, columns, pages)
    await db.pages.bulkAdd(pages)
    await db.rowRefs.bulkAdd(pages.flatMap((p) => refsOf(p, columns)))
    return pages
  })
}

/** Adds one row at the end (see addRows). */
export async function addRow(
  db: LearningNotesDB,
  databaseId: string,
  input: RowInput = {},
): Promise<Page> {
  return (await addRows(db, databaseId, [input]))[0]
}

/** Checks a value for a column and returns what to store (null = empty). */
function normalizeCell(column: DbColumn, value: JsonValue): JsonValue | null {
  if (isComputedColumn(column)) {
    throw new Error(`${column.name}: worked out automatically`)
  }
  const definition = getColumnType(column.type)
  if (!definition) throw new Error(`Unknown column type: ${column.type}`)
  return definition.normalize(value, column)
}

/** Throws if a row stores ids of tags, pages or rows that do not exist. */
async function checkRefs(
  db: LearningNotesDB,
  columns: Map<string, DbColumn>,
  pages: readonly Pick<Page, 'id' | 'values'>[],
): Promise<void> {
  const want = { tags: new Set<string>(), pages: new Set<string>() }
  const rowsWanted = new Map<string, Set<string>>() // target db → ids
  for (const page of pages) {
    for (const [columnId, value] of Object.entries(page.values ?? {})) {
      const column = columns.get(columnId)
      const refs = column && getColumnType(column.type)?.refs
      if (!refs || !Array.isArray(value)) continue
      const ids = value as string[]
      if (refs === 'tags') ids.forEach((id) => want.tags.add(id))
      else if (refs === 'pages') ids.forEach((id) => want.pages.add(id))
      else {
        const target = String(column.config.databaseId)
        const set = rowsWanted.get(target) ?? new Set<string>()
        ids.forEach((id) => set.add(id))
        rowsWanted.set(target, set)
      }
    }
  }
  const tags = await db.tags.bulkGet([...want.tags])
  if (tags.some((tag) => !tag || !isLive(tag))) throw new Error('Unknown tag')
  const linked = await db.pages.bulkGet([...want.pages])
  if (linked.some((p) => !p || !isLive(p))) throw new Error('Unknown page')
  for (const [target, ids] of rowsWanted) {
    const rowIds = new Set((await rowsOf(db, target)).map((r) => r.id))
    // Rows added in the same go (a database relating to itself) count.
    for (const page of pages) rowIds.add(page.id)
    if ([...ids].some((id) => !rowIds.has(id))) {
      throw new Error('Not a row of the related database')
    }
  }
}

/** The relation index entries of a row. */
function refsOf(page: Page, columns: Map<string, DbColumn>): RowRef[] {
  const refs: RowRef[] = []
  for (const [columnId, value] of Object.entries(page.values ?? {})) {
    if (columns.get(columnId)?.type !== 'relation' || !Array.isArray(value)) {
      continue
    }
    for (const toPageId of value as string[]) {
      refs.push({
        id: `${page.id}|${columnId}|${toPageId}`,
        fromPageId: page.id,
        columnId,
        toPageId,
      })
    }
  }
  return refs
}

/**
 * Sets cells of one row (by column id; TITLE_COLUMN_ID = the title). A
 * null/empty value clears a cell. Writing to the back side of a two-way
 * relation updates the rows on the main side.
 */
export async function setCells(
  db: LearningNotesDB,
  rowId: string,
  changes: Record<string, JsonValue>,
): Promise<void> {
  const tables = [db.databases, db.dbColumns, db.pages, db.tags, db.rowRefs]
  await db.transaction('rw', tables, async () => {
    const page = await getLive(db.pages, rowId)
    const database = await databaseOfRow(db, page)
    if (!database) throw new Error('Not a database row')
    const columns = new Map(
      (await listColumns(db, database.id)).map((c) => [c.id, c]),
    )
    const values: JsonObject = { ...page.values }
    let title = page.title
    for (const [columnId, value] of Object.entries(changes)) {
      if (columnId === TITLE_COLUMN_ID) {
        if (typeof value !== 'string') throw new Error('Title text expected')
        title = value.slice(0, 2000)
        continue
      }
      const column = columns.get(columnId)
      if (!column) throw new Error(`Unknown column: ${columnId}`)
      if (column.type === 'relation' && column.config.back === true) {
        await setBackRelation(db, column, rowId, value)
        continue
      }
      const stored = normalizeCell(column, value)
      if (stored === null) delete values[columnId]
      else values[columnId] = stored
    }
    const next = { ...page, title, values }
    await checkRefs(db, columns, [next])
    await db.pages.update(rowId, {
      title,
      values: Object.keys(values).length > 0 ? values : undefined,
      updatedAt: Date.now(),
    })
    // Relation index: replace this row's entries for the changed columns.
    const changed = Object.keys(changes).filter(
      (id) => columns.get(id)?.type === 'relation',
    )
    if (changed.length > 0) {
      const old = await db.rowRefs.where('fromPageId').equals(rowId).toArray()
      await db.rowRefs.bulkDelete(
        old.filter((r) => changed.includes(r.columnId)).map((r) => r.id),
      )
      const fresh = refsOf(next, columns).filter((r) =>
        changed.includes(r.columnId),
      )
      await db.rowRefs.bulkPut(fresh)
    }
  })
}

/** Sets one cell (see setCells). */
export async function setCell(
  db: LearningNotesDB,
  rowId: string,
  columnId: string,
  value: JsonValue,
): Promise<void> {
  await setCells(db, rowId, { [columnId]: value })
}

/**
 * Back side of a two-way relation: the rows listed become exactly the rows
 * whose main-side cell points to `rowId`.
 */
async function setBackRelation(
  db: LearningNotesDB,
  back: DbColumn,
  rowId: string,
  value: JsonValue,
): Promise<void> {
  const main = await getLive(db.dbColumns, String(back.config.pairedColumnId))
  const wanted = new Set(
    Array.isArray(value)
      ? value.filter((v): v is string => typeof v === 'string')
      : [],
  )
  const mainRows = await rowsOf(db, main.databaseId)
  if ([...wanted].some((id) => !mainRows.some((r) => r.id === id))) {
    throw new Error('Not a row of the related database')
  }
  const columns = new Map([[main.id, main]])
  const now = Date.now()
  for (const row of mainRows) {
    const current = Array.isArray(row.values?.[main.id])
      ? (row.values![main.id] as string[])
      : []
    const has = current.includes(rowId)
    if (has === wanted.has(row.id)) continue
    const nextIds = has
      ? current.filter((id) => id !== rowId)
      : [...current, rowId]
    const values: JsonObject = { ...row.values }
    if (nextIds.length > 0) values[main.id] = nextIds
    else delete values[main.id]
    await db.pages.update(row.id, {
      values: Object.keys(values).length > 0 ? values : undefined,
      updatedAt: now,
    })
    const old = await db.rowRefs.where('fromPageId').equals(row.id).toArray()
    await db.rowRefs.bulkDelete(
      old.filter((r) => r.columnId === main.id).map((r) => r.id),
    )
    await db.rowRefs.bulkPut(refsOf({ ...row, values }, columns))
  }
}

/**
 * Moves a row to `toIndex` among the database's rows. (Study tracker rows
 * are notes: move them in the Notes tree.)
 */
export async function moveRow(
  db: LearningNotesDB,
  rowId: string,
  toIndex: number,
): Promise<void> {
  await db.transaction('rw', db.databases, db.pages, async () => {
    const page = await getLive(db.pages, rowId)
    if (!page.databaseId) throw new Error('Not a database row')
    const siblings = (await rowsOf(db, page.databaseId)).filter(
      (r) => r.id !== rowId,
    )
    const order = orderAtIndex(
      siblings.map((r) => r.order),
      toIndex,
    )
    await db.pages.update(rowId, { order, updatedAt: Date.now() })
  })
}

/** Rows that point to `rowId` through a Relation (from any database). */
export async function rowsPointingTo(
  db: LearningNotesDB,
  rowId: string,
): Promise<RowRef[]> {
  const refs = await db.rowRefs.where('toPageId').equals(rowId).toArray()
  const from = await db.pages.bulkGet(refs.map((r) => r.fromPageId))
  return refs.filter((_, i) => {
    const page = from[i]
    return page !== undefined && isLive(page)
  })
}
