import type { LearningNotesDB } from '../core/db'
import type { DbColumn, JsonValue } from '../core/types'
import { findOrCreateTagPath } from '../tags/tagService'
import { unprotectCell, protectCell, writeCsv } from './csv'
import { t } from '../i18n/t'
import { loadDatabaseData, resolveRows } from './databaseQuery'
import {
  addChoiceOption,
  addColumn,
  addRows,
  createDatabase,
  getDatabase,
  listRows,
  setCells,
  titleColumnName,
  trashRows,
  type RowInput,
  type TrashedRows,
} from './databaseService'
import {
  isDate,
  isError,
  normalizeDate,
  type FValue,
} from './formula/formulaValue'

/**
 * CSV export and import of one database. Export writes the title column
 * and every column as plain text a spreadsheet understands; import maps
 * CSV columns to existing columns, new columns or nothing, and always
 * adds new rows (nothing that exists is changed).
 */

// ------------------------------------------------------------------ export

/** A worked-out cell value as CSV text (dates as days, ticks as true/false). */
export function exportText(value: FValue): string {
  if (value === null || value === undefined) return ''
  if (isError(value)) return ''
  if (Array.isArray(value))
    return value.map(exportText).filter(Boolean).join('; ')
  if (isDate(value)) return value.date
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

/** The database as CSV text and a file name. */
export async function exportDatabaseCsv(
  db: LearningNotesDB,
  databaseId: string,
): Promise<{ fileName: string; text: string }> {
  const database = await getDatabase(db, databaseId)
  if (!database) throw new Error('Database not found')
  const data = await loadDatabaseData(db, databaseId)
  const columns = data.databases.get(databaseId)?.columns ?? []
  const rows = resolveRows(data)
  const table: string[][] = [
    [titleColumnName(database), ...columns.map((c) => c.name)].map(protectCell),
    ...rows.map((row) =>
      [
        row.page.title,
        ...columns.map((c) => exportText(row.values[c.id] ?? null)),
      ].map(protectCell),
    ),
  ]
  const safe =
    database.title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'database'
  return { fileName: `${safe}.csv`, text: writeCsv(table) }
}

// ------------------------------------------------------------------ import

/** What to do with one CSV column. */
export type ColumnMapping =
  | { kind: 'title' }
  | { kind: 'column'; columnId: string }
  | { kind: 'new'; type: string }
  | { kind: 'skip' }

/** Column types a CSV column can fill (their text can be read back). */
export const IMPORTABLE_TYPES = [
  'text',
  'number',
  'date',
  'choice',
  'choices',
  'checkbox',
  'url',
  'tag',
] as const

const TRUE_WORDS = /^(true|yes|y|1|x|✓|checked)$/i
const FALSE_WORDS = /^(false|no|n|0|)$/i

const parseNumber = (text: string): number | null => {
  const t = text.trim().replace(/,/g, '').replace(/%$/, '')
  if (t === '' || !Number.isFinite(Number(t))) return null
  return Number(t)
}

/** A date written as a day ("2026-10-27"), a moment, or "27/10/2026"-like. */
export function parseDate(text: string): string | null {
  const t = text.trim()
  const exact = normalizeDate(t)
  if (exact) return exact
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t)
  if (dmy) {
    const [, a, b, y] = dmy
    // Day first (the common spreadsheet style outside the US) unless it cannot be.
    const [d, m] = Number(a) > 12 ? [a, b] : Number(b) > 12 ? [b, a] : [a, b]
    return normalizeDate(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
  }
  return null
}

/**
 * Guesses a type for a new column from its values: numbers, dates and
 * ticks if every filled cell fits, a Choice if there are few distinct
 * values, else Text.
 */
export function guessType(values: readonly string[]): string {
  const filled = values.map((v) => v.trim()).filter((v) => v !== '')
  if (filled.length === 0) return 'text'
  if (filled.every((v) => parseNumber(v) !== null)) return 'number'
  if (filled.every((v) => parseDate(v) !== null)) return 'date'
  if (
    filled.every((v) => TRUE_WORDS.test(v) || FALSE_WORDS.test(v)) &&
    filled.some((v) => /^(true|false|yes|no)$/i.test(v))
  )
    return 'checkbox'
  if (filled.every((v) => /^https?:\/\//i.test(v))) return 'url'
  const distinct = new Set(filled.map((v) => v.toLocaleLowerCase()))
  if (
    filled.length >= 6 &&
    distinct.size <= 8 &&
    distinct.size < filled.length / 2
  )
    return 'choice'
  return 'text'
}

/** First guess of the mapping: same-named columns, the first CSV column is the title. */
export function guessMapping(
  headers: readonly string[],
  columns: readonly DbColumn[],
  titleName: string,
  body: readonly (readonly string[])[],
): ColumnMapping[] {
  const used = new Set<string>()
  let titleTaken = false
  return headers.map((header, i) => {
    const name = unprotectCell(header).trim().toLocaleLowerCase()
    if (
      !titleTaken &&
      (name === titleName.toLocaleLowerCase() ||
        (i === 0 && !columns.some((c) => c.name.toLocaleLowerCase() === name)))
    ) {
      titleTaken = true
      return { kind: 'title' }
    }
    const match = columns.find(
      (c) =>
        !used.has(c.id) &&
        c.name.toLocaleLowerCase() === name &&
        (IMPORTABLE_TYPES as readonly string[]).includes(c.type),
    )
    if (match) {
      used.add(match.id)
      return { kind: 'column', columnId: match.id }
    }
    if (name === '') return { kind: 'skip' }
    return { kind: 'new', type: guessType(body.map((r) => r[i] ?? '')) }
  })
}

/** What an import does with the rows that are already there. */
export type ImportMode = 'add' | 'replace' | 'update'

export interface ImportResult {
  added: number
  newColumns: number
  /** `update` mode: rows with the same title that were changed. */
  updated?: number
  /** `replace` mode: the old rows, now in Trash (for Undo). */
  trashed?: TrashedRows
  /** `replace` mode: the rows the import made (Undo moves them to Trash). */
  addedIds?: string[]
}

/** Titles match without caring about case or spaces around them. */
const titleKey = (title: string) => title.trim().toLocaleLowerCase()

/** Text of a CSV cell as the value a column stores (undefined = leave empty). */
async function cellValue(
  db: LearningNotesDB,
  column: DbColumn,
  raw: string,
  caches: { choices: Map<string, string>; tags: Map<string, string> },
): Promise<JsonValue | undefined> {
  const text = unprotectCell(raw).trim()
  if (text === '') return undefined
  switch (column.type) {
    case 'text':
    case 'url':
      return text
    case 'number': {
      const n = parseNumber(text)
      if (n === null) return undefined
      return column.config.format === 'percent' && /%$/.test(text) ? n / 100 : n
    }
    case 'date':
      return parseDate(text) ?? undefined
    case 'checkbox':
      return TRUE_WORDS.test(text)
    case 'choice':
    case 'choices': {
      const names =
        column.type === 'choice'
          ? [text]
          : text
              .split(/[;,]/)
              .map((s) => s.trim())
              .filter(Boolean)
      const ids: string[] = []
      for (const name of names) {
        const key = `${column.id}|${name.toLocaleLowerCase()}`
        let id = caches.choices.get(key)
        if (!id) {
          id = (await addChoiceOption(db, column.id, name)).id
          caches.choices.set(key, id)
        }
        ids.push(id)
      }
      return column.type === 'choice' ? ids[0] : ids
    }
    case 'tag': {
      const ids: string[] = []
      for (const name of text
        .split(/[;,]/)
        .map((s) => s.trim().replace(/^#/, ''))
        .filter(Boolean)) {
        let id = caches.tags.get(name.toLocaleLowerCase())
        if (!id) {
          id = (await findOrCreateTagPath(db, name)).id
          caches.tags.set(name.toLocaleLowerCase(), id)
        }
        ids.push(id)
      }
      return ids
    }
  }
  return undefined
}

/**
 * Adds the CSV's body rows as new rows. `mapping` has one entry per CSV
 * column. New columns are created first. Rows with no title and no value
 * are skipped. Returns how much was added.
 *
 * `mode`: 'add' (default) only adds; 'replace' first moves all current rows
 * to Trash; 'update' changes the row with the same title (empty CSV cells
 * leave its value alone) and adds the rest.
 */
export async function importCsvRows(
  db: LearningNotesDB,
  databaseId: string,
  headers: readonly string[],
  body: readonly (readonly string[])[],
  mapping: readonly ColumnMapping[],
  mode: ImportMode = 'add',
): Promise<ImportResult> {
  const database = await getDatabase(db, databaseId)
  if (!database) throw new Error('Database not found')
  if (database.kind === 'studyTracker') {
    throw new Error('Study tracker rows are the notebook’s pages')
  }
  // Which database column each CSV column fills (new ones are made now).
  const targets: (DbColumn | 'title' | null)[] = []
  let newColumns = 0
  const existing = new Map(
    (await loadDatabaseData(db, databaseId)).databases
      .get(databaseId)!
      .columns.map((c) => [c.id, c]),
  )
  for (const [i, map] of mapping.entries()) {
    if (map.kind === 'title') targets.push('title')
    else if (map.kind === 'skip') targets.push(null)
    else if (map.kind === 'column')
      targets.push(existing.get(map.columnId) ?? null)
    else {
      const name = unprotectCell(headers[i] ?? '').trim() || `Column ${i + 1}`
      targets.push(await addColumn(db, databaseId, { name, type: map.type }))
      newColumns++
    }
  }
  const caches = {
    choices: new Map<string, string>(),
    tags: new Map<string, string>(),
  }
  // Replace: the old rows go to Trash first; update: they wait to be matched.
  const trashed =
    mode === 'replace' ? await trashRows(db, databaseId) : undefined
  const waiting = new Map<string, string[]>()
  if (mode === 'update') {
    for (const row of await listRows(db, databaseId)) {
      const key = titleKey(row.title)
      if (key) waiting.set(key, [...(waiting.get(key) ?? []), row.id])
    }
  }
  let added = 0
  let updated = 0
  const addedIds: string[] = []
  const CHUNK = 500
  for (let start = 0; start < body.length; start += CHUNK) {
    const inputs: RowInput[] = []
    for (const line of body.slice(start, start + CHUNK)) {
      let title = ''
      const values: Record<string, JsonValue> = {}
      for (const [i, target] of targets.entries()) {
        const raw = line[i] ?? ''
        if (target === 'title') title = unprotectCell(raw).trim()
        else if (target) {
          const value = await cellValue(db, target, raw, caches)
          if (value !== undefined) values[target.id] = value
        }
      }
      if (title === '' && Object.keys(values).length === 0) continue
      const match = title ? waiting.get(titleKey(title))?.shift() : undefined
      if (match) {
        if (Object.keys(values).length > 0) await setCells(db, match, values)
        updated++
        continue
      }
      inputs.push({ title, values })
    }
    if (inputs.length > 0) {
      const rows = await addRows(db, databaseId, inputs)
      added += rows.length
      if (trashed) addedIds.push(...rows.map((r) => r.id))
    }
  }
  return {
    added,
    newColumns,
    ...(mode === 'update' && { updated }),
    ...(trashed && { trashed, addedIds }),
  }
}

/**
 * Makes a new database next to `sourceId` (same notebook, same title column
 * name) from the CSV: every CSV column that was mapped to a column of the
 * source becomes a new column of the same type, named after the CSV header.
 * The source is not touched.
 */
export async function importCsvAsNewDatabase(
  db: LearningNotesDB,
  sourceId: string,
  headers: readonly string[],
  body: readonly (readonly string[])[],
  mapping: readonly ColumnMapping[],
  name?: string,
): Promise<ImportResult & { databaseId: string }> {
  const source = await getDatabase(db, sourceId)
  if (!source) throw new Error('Database not found')
  const sourceColumns = new Map(
    (await loadDatabaseData(db, sourceId)).databases
      .get(sourceId)!
      .columns.map((c) => [c.id, c]),
  )
  const created = await createDatabase(
    db,
    source.workspaceId,
    source.notebookId,
    name ?? t('import.copyName', { name: source.title }),
  )
  await db.databases.update(created.id, { titleName: source.titleName })
  const own = mapping.map((m): ColumnMapping => {
    if (m.kind !== 'column') return m
    const type = sourceColumns.get(m.columnId)?.type
    return type ? { kind: 'new', type } : { kind: 'skip' }
  })
  const result = await importCsvRows(db, created.id, headers, body, own)
  return { ...result, databaseId: created.id }
}
