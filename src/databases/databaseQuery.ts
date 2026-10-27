import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import type { Database, DbColumn, JsonValue, Page } from '../core/types'
import {
  choiceOptions,
  getColumnType,
  TITLE_COLUMN_ID,
  type ColumnLookups,
} from './columnTypes'
import { listColumns, listRows, titleColumnName } from './databaseService'
import { loadTrackerStats } from './trackerLoad'
import {
  correctShare,
  lastRevisedDay,
  levelsText,
  noStats,
  statusName,
  trackerRow,
  type LessonStats,
  type TrackerRow,
} from './trackerStats'
import { evaluate } from './formula/formulaEval'
import {
  isParseError,
  parseFormula,
  type FormulaNode,
} from './formula/formulaParser'
import {
  compareValues,
  dateToMs,
  dayOf,
  fail,
  flatten,
  isBlank,
  isDate,
  isError,
  normalizeDate,
  toBoolean,
  toNumber,
  toText,
  valuesEqual,
  type FValue,
  type FormulaError,
} from './formula/formulaValue'

/**
 * Reading databases: loads a database (and the databases its relations
 * reach), works out every cell — formulas, relations both ways, rollups —
 * and sorts/filters rows. Pure apart from `loadDatabaseData`, so views,
 * dashboards and tests share one engine.
 */

/** One database with its live columns and rows. */
export interface LoadedDatabase {
  database: Database
  columns: DbColumn[]
  rows: Page[]
}

/** A database plus everything needed to work out its cells. */
export interface DatabaseData {
  databaseId: string
  databases: Map<string, LoadedDatabase>
  tagNames: Map<string, string>
  /** Titles of live pages linked from Note link cells. */
  noteTitles: Map<string, string>
  /** Study tracker: card numbers of each lesson (top-level page id). */
  trackerStats?: Map<string, LessonStats>
}

/**
 * Loads a database and every database reachable through its relations
 * (for related titles and rollups), with tag names and linked page titles.
 */
export async function loadDatabaseData(
  db: LearningNotesDB,
  databaseId: string,
  now: number = Date.now(),
): Promise<DatabaseData> {
  const databases = new Map<string, LoadedDatabase>()
  const queue = [databaseId]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (databases.has(id)) continue
    const database = await db.databases.get(id)
    if (!database || !isLive(database)) continue
    const [columns, rows] = await Promise.all([
      listColumns(db, id),
      listRows(db, id),
    ])
    databases.set(id, { database, columns, rows })
    for (const column of columns) {
      if (column.type === 'relation')
        queue.push(String(column.config.databaseId))
    }
  }

  const tagIds = new Set<string>()
  const pageIds = new Set<string>()
  for (const { columns, rows } of databases.values()) {
    const tagCols = columns.filter((c) => c.type === 'tag')
    const linkCols = columns.filter((c) => c.type === 'noteLink')
    if (tagCols.length === 0 && linkCols.length === 0) continue
    for (const row of rows) {
      for (const c of tagCols)
        idsIn(row.values?.[c.id]).forEach((id) => tagIds.add(id))
      for (const c of linkCols)
        idsIn(row.values?.[c.id]).forEach((id) => pageIds.add(id))
    }
  }
  const main = databases.get(databaseId)?.database
  const trackerStats =
    main?.kind === 'studyTracker' && main.notebookId
      ? await loadTrackerStats(db, main.notebookId, now)
      : undefined
  const tags = await db.tags.bulkGet([...tagIds])
  const pages = await db.pages.bulkGet([...pageIds])
  return {
    databaseId,
    databases,
    trackerStats,
    tagNames: new Map(
      tags.flatMap((tag) => (tag && isLive(tag) ? [[tag.id, tag.name]] : [])),
    ),
    noteTitles: new Map(
      pages.flatMap((p) => (p && isLive(p) ? [[p.id, p.title]] : [])),
    ),
  }
}

function idsIn(raw: JsonValue | undefined): string[] {
  return Array.isArray(raw)
    ? raw.filter((v): v is string => typeof v === 'string')
    : []
}

/** A row with every cell worked out. */
export interface ResolvedRow {
  page: Page
  /** Cell values by column id (TITLE_COLUMN_ID = the title). */
  values: Record<string, FValue>
  /** Relation cells: the ids of the related rows (both sides). */
  links: Record<string, string[]>
  /** Study tracker lessons: card numbers and status (auto / set by user). */
  tracker?: TrackerRow
}

/**
 * Works out every cell of the main database's rows. `now` drives TODAY()
 * and NOW() (pass a fixed time in tests).
 */
export function resolveRows(
  data: DatabaseData,
  now: number = Date.now(),
): ResolvedRow[] {
  const resolver = createResolver(data, now)
  const main = data.databases.get(data.databaseId)
  if (!main) return []
  return main.rows.map((page) => {
    const values: Record<string, FValue> = {
      [TITLE_COLUMN_ID]: page.title,
    }
    const links: Record<string, string[]> = {}
    const tracker = trackerOf(data, main, page)
    for (const column of main.columns) {
      values[column.id] = trackerValue(column, tracker, () =>
        resolver.value(main, page, column),
      )
      if (column.type === 'relation') {
        links[column.id] = resolver.related(page, column)
      }
    }
    return { page, values, links, ...(tracker && { tracker }) }
  })
}

/** Card numbers and status of a Study tracker lesson (undefined elsewhere). */
function trackerOf(
  data: DatabaseData,
  main: LoadedDatabase,
  page: Page,
): TrackerRow | undefined {
  if (!data.trackerStats) return undefined
  const status = main.columns.find((c) => c.type === 'trackerStatus')
  return trackerRow(
    data.trackerStats.get(page.id) ?? noStats(),
    status ? page.values?.[status.id] : undefined,
  )
}

/** A Study tracker column's value for one lesson (others: the usual way). */
function trackerValue(
  column: DbColumn,
  row: TrackerRow | undefined,
  other: () => FValue,
): FValue {
  if (!row) return other()
  const s = row.stats
  switch (column.type) {
    case 'trackerStatus':
      return statusName(row.status)
    case 'trackerLastRevised': {
      const day = lastRevisedDay(s)
      return day ? { date: day } : null
    }
    case 'trackerCardsDue':
      return s.cards === 0 ? null : s.due
    case 'trackerCorrect':
      return correctShare(s)
    case 'trackerLevels':
      return levelsText(s) || null
  }
  return other()
}

interface Resolver {
  value: (owner: LoadedDatabase, row: Page, column: DbColumn) => FValue
  related: (row: Page, column: DbColumn) => string[]
}

/** Memoised cell reader across all loaded databases (cycles → error). */
function createResolver(data: DatabaseData, now: number): Resolver {
  const rowById = new Map<string, Page>()
  for (const { rows } of data.databases.values()) {
    for (const row of rows) rowById.set(row.id, row)
  }
  const lookups: ColumnLookups = {
    tagName: (id) => data.tagNames.get(id),
    pageTitle: (id) => rowById.get(id)?.title ?? data.noteTitles.get(id),
  }

  // Back side of two-way relations: main column id → (row → rows pointing).
  const backIndex = new Map<string, Map<string, string[]>>()
  const backRows = (mainColumnId: string, sourceId: string) => {
    let index = backIndex.get(mainColumnId)
    if (!index) {
      index = new Map()
      const source = data.databases.get(sourceId)
      for (const row of source?.rows ?? []) {
        for (const to of idsIn(row.values?.[mainColumnId])) {
          const list = index.get(to) ?? []
          list.push(row.id)
          index.set(to, list)
        }
      }
      backIndex.set(mainColumnId, index)
    }
    return index
  }

  const parsed = new Map<string, FormulaNode | FormulaError>()
  const memo = new Map<string, FValue>()
  const inProgress = new Set<string>()

  const related = (row: Page, column: DbColumn) => {
    const targetId = String(column.config.databaseId)
    const target = data.databases.get(targetId)
    if (!target) return []
    if (column.config.back === true) {
      const mainId = String(column.config.pairedColumnId)
      const mainLive = target.columns.some((c) => c.id === mainId)
      return mainLive ? (backRows(mainId, targetId).get(row.id) ?? []) : []
    }
    const inTarget = new Set(target.rows.map((r) => r.id))
    return idsIn(row.values?.[column.id]).filter((id) => inTarget.has(id))
  }

  const byName = (owner: LoadedDatabase, name: string) => {
    const lower = name.toLocaleLowerCase()
    if (titleColumnName(owner.database).toLocaleLowerCase() === lower) {
      return TITLE_COLUMN_ID
    }
    return (
      owner.columns.find((c) => c.name === name) ??
      owner.columns.find((c) => c.name.toLocaleLowerCase() === lower)
    )
  }

  const value = (
    owner: LoadedDatabase,
    row: Page,
    column: DbColumn,
  ): FValue => {
    const key = `${row.id}|${column.id}`
    const known = memo.get(key)
    if (known !== undefined) return known
    if (inProgress.has(key)) return fail('cycle', column.name)
    inProgress.add(key)
    const result = compute(owner, row, column)
    inProgress.delete(key)
    memo.set(key, result)
    return result
  }

  const compute = (
    owner: LoadedDatabase,
    row: Page,
    column: DbColumn,
  ): FValue => {
    if (column.type === 'formula') {
      let tree = parsed.get(column.id)
      if (!tree) {
        tree = parseFormula(String(column.config.formula ?? ''))
        parsed.set(column.id, tree)
      }
      if (isParseError(tree)) return tree
      return evaluate(tree, {
        now,
        ref: (name) => {
          const ref = byName(owner, name)
          if (ref === TITLE_COLUMN_ID) return row.title
          if (!ref) return fail('unknownColumn', name)
          return value(owner, row, ref)
        },
      })
    }
    if (column.type === 'relation') {
      return related(row, column).map((id) => rowById.get(id)?.title ?? '')
    }
    if (column.type === 'rollup') return rollup(owner, row, column)
    const definition = getColumnType(column.type)
    if (!definition) return null
    const cell = definition.read(row.values?.[column.id], column)
    return definition.toValue(cell, column, lookups)
  }

  const rollup = (
    owner: LoadedDatabase,
    row: Page,
    column: DbColumn,
  ): FValue => {
    const relation = owner.columns.find(
      (c) => c.id === column.config.relationColumnId && c.type === 'relation',
    )
    if (!relation) return null
    const target = data.databases.get(String(relation.config.databaseId))
    if (!target) return null
    const ids = related(row, relation)
    const targetColumnId = column.config.targetColumnId
    const targetColumn = target.columns.find((c) => c.id === targetColumnId)
    const values = ids.flatMap((id): FValue[] => {
      const other = rowById.get(id)
      if (!other) return []
      if (targetColumnId === TITLE_COLUMN_ID) return [other.title]
      return targetColumn ? [value(target, other, targetColumn)] : []
    })
    return summarize(String(column.config.fn), values, ids.length)
  }

  return { value, related }
}

/** Applies a rollup function to the related rows' values. */
function summarize(fn: string, values: FValue[], rowCount: number): FValue {
  const error = values.find(isError)
  if (error) return error
  const items = flatten(values).filter((v) => !isBlank(v))
  const numbers = () => {
    const ns = items.map(toNumber).filter((n): n is number => !isError(n))
    return ns
  }
  switch (fn) {
    case 'showOriginal':
      return items
    case 'count':
      return rowCount
    case 'countValues':
      return items.length
    case 'countUnique':
      return new Set(items.map((v) => toText(v).toLocaleLowerCase())).size
    case 'sum':
      return numbers().reduce((s, n) => s + n, 0)
    case 'average': {
      const ns = numbers()
      return ns.length === 0 ? null : ns.reduce((s, n) => s + n, 0) / ns.length
    }
    case 'min': {
      const ns = numbers()
      return ns.length === 0 ? null : Math.min(...ns)
    }
    case 'max': {
      const ns = numbers()
      return ns.length === 0 ? null : Math.max(...ns)
    }
    case 'percentChecked':
      return values.length === 0
        ? null
        : values.filter(toBoolean).length / values.length
    case 'earliest':
    case 'latest': {
      const dates = items.filter(isDate).sort(compareValues)
      return (fn === 'earliest' ? dates[0] : dates.at(-1)) ?? null
    }
  }
  return null
}

// ------------------------------------------------------- sorting & filters

/** Columns whose cells are option names (a Study tracker's Status too). */
const isChoiceColumn = (column: DbColumn) =>
  column.type === 'choice' ||
  column.type === 'choices' ||
  column.type === 'trackerStatus'

/** Filter operators. Which ones a column offers is up to the view UI. */
export type FilterOp =
  | 'contains'
  | 'notContains'
  | 'is'
  | 'isNot'
  | 'startsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'before'
  | 'after'
  | 'onOrBefore'
  | 'onOrAfter'
  | 'isChecked'
  | 'isNotChecked'
  | 'isAnyOf'
  | 'isNoneOf'

export interface RowFilter {
  columnId: string
  op: FilterOp
  /** Text, number, "YYYY-MM-DD", option id or list of option ids. */
  value?: JsonValue
}

export interface RowSort {
  columnId: string
  direction: 'asc' | 'desc'
}

export interface RowQuery {
  filters?: RowFilter[]
  /** Rows must match all filters (default) or any of them. */
  match?: 'all' | 'any'
  sorts?: RowSort[]
}

/** Filter value as a cell value (Choice option ids → option names). */
function filterValue(column: DbColumn | undefined, raw: JsonValue | undefined) {
  const one = (v: JsonValue): FValue => {
    if (column && isChoiceColumn(column)) {
      const option = choiceOptions(column).find((o) => o.id === v)
      return option ? option.name : typeof v === 'string' ? v : null
    }
    if (typeof v === 'string' && column?.type === 'date') {
      const d = normalizeDate(v)
      return d ? { date: d } : v
    }
    return typeof v === 'object' ? null : v
  }
  if (raw === undefined || raw === null) return []
  return (Array.isArray(raw) ? raw : [raw]).map(one)
}

const lower = (v: FValue) => toText(v).toLocaleLowerCase()

/** True if `cell` (a value or a list) passes one filter. */
function passes(cell: FValue, op: FilterOp, wanted: FValue[]): boolean {
  const target = wanted[0] ?? null
  const items = Array.isArray(cell) ? flatten(cell) : [cell]
  const dayMs = (v: FValue) =>
    isDate(v) ? dateToMs({ date: dayOf(v) }) : Number.NaN
  const num = (v: FValue) => {
    const n = toNumber(v)
    return isError(n) ? Number.NaN : n
  }
  switch (op) {
    case 'isEmpty':
      return isBlank(cell)
    case 'isNotEmpty':
      return !isBlank(cell)
    case 'isChecked':
      return toBoolean(cell)
    case 'isNotChecked':
      return !toBoolean(cell)
    case 'contains':
      return items.some((v) => lower(v).includes(lower(target)))
    case 'notContains':
      return !items.some((v) => lower(v).includes(lower(target)))
    case 'startsWith':
      return items.some((v) => lower(v).startsWith(lower(target)))
    case 'is':
      return isDate(target)
        ? items.some((v) => dayMs(v) === dayMs(target))
        : items.some((v) => valuesEqual(v, target))
    case 'isNot':
      return isDate(target)
        ? !items.some((v) => dayMs(v) === dayMs(target))
        : !items.some((v) => valuesEqual(v, target))
    case 'isAnyOf':
      return items.some((v) => wanted.some((w) => valuesEqual(v, w)))
    case 'isNoneOf':
      return !items.some((v) => wanted.some((w) => valuesEqual(v, w)))
    case 'gt':
    case 'lt':
    case 'gte':
    case 'lte': {
      if (isBlank(cell)) return false
      const a = num(cell)
      const b = num(target)
      if (op === 'gt') return a > b
      if (op === 'lt') return a < b
      if (op === 'gte') return a >= b
      return a <= b
    }
    case 'before':
    case 'after':
    case 'onOrBefore':
    case 'onOrAfter': {
      const a = dayMs(Array.isArray(cell) ? (items[0] ?? null) : cell)
      const b = dayMs(target)
      if (Number.isNaN(a) || Number.isNaN(b)) return false
      if (op === 'before') return a < b
      if (op === 'after') return a > b
      if (op === 'onOrBefore') return a <= b
      return a >= b
    }
  }
}

/**
 * Filters and sorts resolved rows. Rows without a value sort last in
 * either direction; ties keep the database's row order.
 */
export function queryRows(
  rows: readonly ResolvedRow[],
  columns: readonly DbColumn[],
  query: RowQuery,
): ResolvedRow[] {
  const columnById = new Map(columns.map((c) => [c.id, c]))
  const filters = (query.filters ?? []).map((f) => ({
    ...f,
    wanted: filterValue(columnById.get(f.columnId), f.value),
  }))
  const any = query.match === 'any'
  const kept =
    filters.length === 0
      ? [...rows]
      : rows.filter((row) => {
          const test = (f: (typeof filters)[number]) =>
            passes(row.values[f.columnId] ?? null, f.op, f.wanted)
          return any ? filters.some(test) : filters.every(test)
        })

  const sorts = query.sorts ?? []
  if (sorts.length === 0) return kept
  const keyOf = sorts.map((s) => {
    const column = columnById.get(s.columnId)
    // Choices sort by their option order, like the menu shows them.
    if (column && isChoiceColumn(column)) {
      const rank = new Map(choiceOptions(column).map((o, i) => [o.name, i]))
      return (v: FValue): FValue => {
        const first = Array.isArray(v) ? v[0] : v
        return typeof first === 'string' ? (rank.get(first) ?? null) : null
      }
    }
    return (v: FValue): FValue =>
      Array.isArray(v) ? (v.find((x) => !isBlank(x)) ?? null) : v
  })
  const indexed = kept.map((row, index) => ({
    row,
    index,
    keys: sorts.map((s, i) => keyOf[i](row.values[s.columnId] ?? null)),
  }))
  indexed.sort((a, b) => {
    for (let i = 0; i < sorts.length; i++) {
      const x = a.keys[i]
      const y = b.keys[i]
      const xBlank = isBlank(x)
      const yBlank = isBlank(y)
      if (xBlank || yBlank) {
        if (xBlank !== yBlank) return xBlank ? 1 : -1
        continue
      }
      const c = compareValues(x, y)
      if (c !== 0) return sorts[i].direction === 'desc' ? -c : c
    }
    return a.index - b.index
  })
  return indexed.map((item) => item.row)
}
