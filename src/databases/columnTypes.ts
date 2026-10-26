import type { DbColumn, JsonObject, JsonValue } from '../core/types'
import { normalizeDate, type FValue } from './formula/formulaValue'

/**
 * Column type registry: the plug-in point for database column types.
 *
 * A type says how its cell values are checked when written, read back, and
 * turned into a value for formulas, sorting and filtering. Adding a type
 * means registering a definition; columns of an unknown type keep their
 * values untouched (they read as blank), so data is never lost.
 *
 * Values are read leniently: after a column changes type, old values are
 * not rewritten, they are read as the new type where possible (text "12"
 * reads as the number 12). Changing back shows the old values again.
 */

/** Column id used for the row title (the row page's title). */
export const TITLE_COLUMN_ID = 'title'

/** One option of a Choice / Choices column (`config.options`). */
export interface ChoiceOption {
  id: string
  name: string
  /** Colour name from the app palette; unset = grey. */
  color?: string
}

/** Names the reader needs for id-based values. */
export interface ColumnLookups {
  tagName: (id: string) => string | undefined
  /** Title of a live page (note link or row); undefined = gone. */
  pageTitle: (id: string) => string | undefined
}

/** Ids a column stores, checked against the database on write. */
export type ColumnRefs = 'tags' | 'pages' | 'rows'

export interface ColumnTypeDefinition {
  type: string
  /** Worked out by the database (formula, rollup), never typed in. */
  computed?: boolean
  /** The value is a list of ids of this kind. */
  refs?: ColumnRefs
  /** Settings for a new column of this type. */
  defaultConfig?: () => JsonObject
  /**
   * Checks a value being written and returns what to store (null = empty).
   * Throws a short English message if the value is not allowed.
   */
  normalize: (input: JsonValue, column: DbColumn) => JsonValue | null
  /** Reads a stored value as this type (null = blank). */
  read: (raw: JsonValue | undefined, column: DbColumn) => JsonValue | null
  /** The value used by formulas, sorting and filtering. */
  toValue: (
    cell: JsonValue | null,
    column: DbColumn,
    lookups: ColumnLookups,
  ) => FValue
}

/** Longest text a Text cell keeps. */
export const MAX_TEXT_LENGTH = 100_000
/** Most ids one list cell (Choices, Tags, Relation …) keeps. */
export const MAX_LIST_LENGTH = 1_000

export function choiceOptions(column: DbColumn): ChoiceOption[] {
  const options = column.config.options
  return Array.isArray(options) ? (options as unknown as ChoiceOption[]) : []
}

/** An option by id, or by name ignoring case (for text read as a choice). */
function findOption(column: DbColumn, key: string): ChoiceOption | undefined {
  const options = choiceOptions(column)
  const lower = key.trim().toLocaleLowerCase()
  return (
    options.find((o) => o.id === key) ??
    options.find((o) => o.name.toLocaleLowerCase() === lower)
  )
}

const isEmptyInput = (input: JsonValue) =>
  input === null || input === '' || (Array.isArray(input) && input.length === 0)

/** A list of ids, each once (blank and non-text items dropped). */
function idList(raw: JsonValue | undefined): string[] {
  const items = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []
  const ids = items.filter(
    (v): v is string => typeof v === 'string' && v !== '',
  )
  return [...new Set(ids)]
}

/** Number read from a stored value; numeric text counts. */
function readNumber(raw: JsonValue | undefined): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (typeof raw === 'boolean') return raw ? 1 : 0
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw.trim().replace(/,/g, ''))
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** Text read from a stored value of any type. */
function readText(raw: JsonValue | undefined, column: DbColumn): string | null {
  if (typeof raw === 'string') {
    // A Choice id read as text shows the option name.
    if (raw === '') return null
    return choiceOptions(column).find((o) => o.id === raw)?.name ?? raw
  }
  if (typeof raw === 'number') return String(raw)
  if (typeof raw === 'boolean') return raw ? 'true' : 'false'
  if (Array.isArray(raw)) {
    const options = choiceOptions(column)
    const parts = idList(raw).map(
      (v) => options.find((o) => o.id === v)?.name ?? v,
    )
    return parts.length > 0 ? parts.join(', ') : null
  }
  return null
}

const STAR_MAX = 5

const text: ColumnTypeDefinition = {
  type: 'text',
  normalize: (input) => {
    if (isEmptyInput(input)) return null
    if (typeof input !== 'string') throw new Error('Text expected')
    return input.slice(0, MAX_TEXT_LENGTH)
  },
  read: readText,
  toValue: (cell) => (typeof cell === 'string' ? cell : null),
}

/**
 * `config.format`: 'number' (default) · 'percent' (stored as a fraction,
 * 0.5 = 50 %) · 'currency' (`config.currency`, e.g. "INR") · 'stars'
 * (whole stars 0–`config.max`, default 5).
 */
const number: ColumnTypeDefinition = {
  type: 'number',
  defaultConfig: () => ({ format: 'number' }),
  normalize: (input, column) => {
    if (isEmptyInput(input)) return null
    const n = readNumber(input)
    if (n === null || typeof input === 'boolean') {
      throw new Error('Number expected')
    }
    if (column.config.format === 'stars') {
      const max =
        typeof column.config.max === 'number' ? column.config.max : STAR_MAX
      return Math.max(0, Math.min(max, Math.round(n)))
    }
    return n
  },
  read: (raw) => readNumber(raw),
  toValue: (cell) => (typeof cell === 'number' ? cell : null),
}

/** A day ("YYYY-MM-DD") or, with `config.includeTime`, a UTC moment. */
const date: ColumnTypeDefinition = {
  type: 'date',
  normalize: (input) => {
    if (isEmptyInput(input)) return null
    const d = typeof input === 'string' ? normalizeDate(input) : null
    if (!d) throw new Error('Date expected (YYYY-MM-DD)')
    return d
  },
  read: (raw) => (typeof raw === 'string' ? normalizeDate(raw) : null),
  toValue: (cell) => (typeof cell === 'string' ? { date: cell } : null),
}

const checkbox: ColumnTypeDefinition = {
  type: 'checkbox',
  normalize: (input) => {
    if (input === null) return null
    if (typeof input !== 'boolean') throw new Error('Yes/no expected')
    return input || null // unticked is stored as nothing
  },
  read: (raw) => {
    if (typeof raw === 'boolean') return raw || null
    if (typeof raw === 'number') return raw !== 0 || null
    if (typeof raw === 'string') {
      return ['true', 'yes', '1', 'x', '✓'].includes(raw.trim().toLowerCase())
        ? true
        : null
    }
    return null
  },
  toValue: (cell) => cell === true,
}

/** `config.options`: ChoiceOption[]; the cell stores an option id. */
const choice: ColumnTypeDefinition = {
  type: 'choice',
  defaultConfig: () => ({ options: [] }),
  normalize: (input, column) => {
    if (isEmptyInput(input)) return null
    const option =
      typeof input === 'string'
        ? choiceOptions(column).find((o) => o.id === input)
        : undefined
    if (!option) throw new Error('Unknown option')
    return option.id
  },
  read: (raw, column) => {
    const first = idList(raw)[0]
    return first === undefined ? null : (findOption(column, first)?.id ?? null)
  },
  toValue: (cell, column) =>
    typeof cell === 'string' ? (findOption(column, cell)?.name ?? null) : null,
}

/** Like Choice, but several option ids. */
const choices: ColumnTypeDefinition = {
  type: 'choices',
  defaultConfig: () => ({ options: [] }),
  normalize: (input, column) => {
    if (isEmptyInput(input)) return null
    if (!Array.isArray(input)) throw new Error('List of options expected')
    const known = new Set(choiceOptions(column).map((o) => o.id))
    const ids = idList(input)
    if (ids.some((id) => !known.has(id))) throw new Error('Unknown option')
    return ids.slice(0, MAX_LIST_LENGTH)
  },
  read: (raw, column) => {
    const keys = typeof raw === 'string' ? raw.split(',') : idList(raw)
    const ids = keys.flatMap((k) => findOption(column, k)?.id ?? [])
    const unique = [...new Set(ids)]
    return unique.length > 0 ? unique : null
  },
  toValue: (cell, column) =>
    idList(cell ?? undefined).flatMap(
      (id) => findOption(column, id)?.name ?? [],
    ),
}

const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:']

/**
 * A web link. Only http(s) and mailto links are kept (never
 * `javascript:` or other schemes that could run code when clicked);
 * "example.com" becomes "https://example.com".
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) return null
    if (url.protocol !== 'mailto:' && !url.hostname.includes('.')) {
      return url.hostname === 'localhost' ? url.href : null
    }
    return withScheme
  } catch {
    return null
  }
}

const url: ColumnTypeDefinition = {
  type: 'url',
  normalize: (input) => {
    if (isEmptyInput(input)) return null
    const link = typeof input === 'string' ? normalizeUrl(input) : null
    if (!link) throw new Error('Web link expected')
    return link
  },
  read: (raw) => (typeof raw === 'string' ? normalizeUrl(raw) : null),
  toValue: (cell) => (typeof cell === 'string' ? cell : null),
}

/** A list of ids (tags, note links, related rows). */
function idListType(
  type: string,
  refs: ColumnRefs,
  name: (id: string, lookups: ColumnLookups) => string | undefined,
  defaultConfig?: () => JsonObject,
): ColumnTypeDefinition {
  return {
    type,
    refs,
    defaultConfig,
    normalize: (input) => {
      if (isEmptyInput(input)) return null
      if (!Array.isArray(input)) throw new Error('List expected')
      if (input.some((v) => typeof v !== 'string')) {
        throw new Error('List of ids expected')
      }
      return idList(input).slice(0, MAX_LIST_LENGTH)
    },
    read: (raw) => {
      const ids = idList(raw)
      return ids.length > 0 ? ids : null
    },
    // Ids that no longer exist (deleted page or tag) are left out.
    toValue: (cell, _column, lookups) =>
      idList(cell ?? undefined).flatMap((id) => name(id, lookups) ?? []),
  }
}

const tag = idListType('tag', 'tags', (id, l) => l.tagName(id))
const noteLink = idListType('noteLink', 'pages', (id, l) => l.pageTitle(id))

/**
 * Rows of another database (`config.databaseId`). Two-way relations have a
 * partner column in that database (`config.pairedColumnId`); the partner
 * marked `config.back` stores nothing: its values are worked out from the
 * rows that point to it, so both sides always match.
 */
const relation = idListType(
  'relation',
  'rows',
  (id, l) => l.pageTitle(id),
  () => ({ databaseId: '' }),
)

/** Worked out from `config.formula` (see formula/). Stores nothing. */
const formula: ColumnTypeDefinition = {
  type: 'formula',
  computed: true,
  defaultConfig: () => ({ formula: '' }),
  normalize: () => {
    throw new Error('Formula cells cannot be edited')
  },
  read: () => null,
  toValue: () => null,
}

/**
 * Summary of related rows: `config.relationColumnId` (a Relation column of
 * this database), `config.targetColumnId` (a column of the related
 * database, or the title) and `config.fn` (see ROLLUP_FUNCTIONS).
 */
const rollup: ColumnTypeDefinition = {
  ...formula,
  type: 'rollup',
  defaultConfig: () => ({
    relationColumnId: '',
    targetColumnId: '',
    fn: 'count',
  }),
  normalize: () => {
    throw new Error('Rollup cells cannot be edited')
  },
}

const definitions = new Map<string, ColumnTypeDefinition>()

/** Adds a column type. Throws if the name is taken. */
export function registerColumnType(definition: ColumnTypeDefinition): void {
  if (definitions.has(definition.type)) {
    throw new Error(`Column type already registered: ${definition.type}`)
  }
  definitions.set(definition.type, definition)
}

/** The definition of a type, or undefined if it is not registered. */
export function getColumnType(type: string): ColumnTypeDefinition | undefined {
  return definitions.get(type)
}

/** All registered column types, in registration order. */
export function listColumnTypes(): ColumnTypeDefinition[] {
  return [...definitions.values()]
}

for (const definition of [
  text,
  number,
  date,
  choice,
  choices,
  checkbox,
  url,
  tag,
  noteLink,
  formula,
  relation,
  rollup,
]) {
  registerColumnType(definition)
}

/** True if the column's values are worked out, not typed in. */
export function isComputedColumn(column: DbColumn): boolean {
  if (column.type === 'relation' && column.config.back === true) return true
  return getColumnType(column.type)?.computed === true
}
