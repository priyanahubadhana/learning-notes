// GENERATED from src/connector/spec.ts by scripts/sync-connector-spec.mjs. Do not edit here.
/**
 * The notebook spec: the one JSON shape Claude (connector A on the PC, B online)
 * uses to hand the app a whole notebook. This file is the validator; the same
 * rules are written as a JSON Schema in `spec.schema.json` (a test keeps the
 * two in step).
 *
 * Pure and dependency-free on purpose: it runs in the browser, in Node (the
 * local connector) and in Deno (the online connector). The app's own types are
 * imported as TYPES only (erased at build time) and `spec.test.ts` checks every
 * name below against the app's real block, column and colour registries, so the
 * spec can never promise something the app cannot store.
 *
 * Safety: the validator never throws, reads untrusted JSON as plain data,
 * rejects unknown fields, caps every size, and only accepts https links.
 * Nothing in a spec is ever run or fetched; text is inline Markdown only.
 */

export const SPEC_VERSION = 'ln-spec/1'

/** Hard limits (a spec over any of them is refused whole, never trimmed). */
export const LIMITS = {
  maxBytes: 256 * 1024,
  maxPages: 50,
  maxBlocksPerPage: 200,
  maxCards: 500,
  maxDatabases: 10,
  maxColumns: 30,
  maxRows: 1000,
  maxOptions: 50,
  maxDepth: 12,
  maxTableRows: 50,
  maxTableCols: 12,
  maxErrors: 20,
  title: 120,
  summary: 2000,
  text: 20000,
  cell: 5000,
  url: 2000,
  name: 60,
  outline: 5000,
} as const

/** Block types a spec may create. Names match `blockTypes` (checked in a test). */
export const BLOCK_TYPES = [
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'quote',
  'divider',
  'codeBlock',
  'table',
  'toggleListItem',
  'callout',
  'card',
  'mindMap',
  'math',
  'embed',
  'pageLink',
  'database',
] as const
export type SpecBlockType = (typeof BLOCK_TYPES)[number]

/** Column types a spec may create. Names match `listColumnTypes` (checked in a test). */
export const COLUMN_TYPES = [
  'text',
  'number',
  'date',
  'checkbox',
  'choice',
  'choices',
  'url',
] as const
export type SpecColumnType = (typeof COLUMN_TYPES)[number]

/** Page tab colours: the app's tag colours (checked in a test). */
export const TAB_COLOURS = [
  '#2f6feb',
  '#2e9e6b',
  '#d9822b',
  '#c8402f',
  '#8a5cf6',
  '#c2417f',
] as const

export const VIEWS = ['shelf', 'tabs'] as const satisfies readonly NonNullable<
  'shelf' | 'tabs'
>[]
export const PATH_STYLES = [
  'simple',
  'full',
  'page',
] as const satisfies readonly NonNullable<'simple' | 'full' | 'page'>[]
export const SHEETS = ['A4', 'Letter'] as const satisfies readonly NonNullable<
  'A4' | 'Letter'
>[]
export const INK_BGS = [
  'lined',
  'grid',
  'dots',
] as const satisfies readonly NonNullable<'lined' | 'grid' | 'dots'>[]

/** Fields each block type accepts besides `type` and `children`. */
export const BLOCK_FIELDS: Record<SpecBlockType, readonly string[]> = {
  paragraph: ['text'],
  heading: ['text', 'level'],
  bulletListItem: ['text'],
  numberedListItem: ['text'],
  checkListItem: ['text', 'checked'],
  quote: ['text'],
  divider: [],
  codeBlock: ['text', 'language'],
  table: ['rows'],
  toggleListItem: ['text'],
  callout: ['text', 'emoji'],
  card: ['text'],
  mindMap: ['outline'],
  math: ['latex'],
  embed: ['url', 'caption'],
  pageLink: ['page'],
  database: ['database'],
}

/** Types whose `children` are allowed (lists, toggles, a card's answer). */
const CAN_NEST: ReadonlySet<string> = new Set([
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'toggleListItem',
  'card',
  'quote',
  'callout',
])
const MAX_CHILDREN = 50

export type CellValue = string | number | boolean | string[]

export interface SpecBlock {
  type: SpecBlockType
  text?: string
  level?: 1 | 2 | 3
  checked?: boolean
  language?: string
  emoji?: string
  rows?: string[][]
  outline?: string
  latex?: string
  url?: string
  caption?: string
  page?: string
  database?: string
  children?: SpecBlock[]
}
export interface SpecPage {
  title: string
  summary?: string
  tabColour?: string
  blocks: SpecBlock[]
}
export type SpecCard =
  | { kind: 'qa'; q: string; a: string; page?: string }
  | { kind: 'cloze'; text: string; page?: string }
export interface SpecColumn {
  name: string
  type: SpecColumnType
  options?: string[]
}
export interface SpecDatabase {
  key: string
  title: string
  columns: SpecColumn[]
  rows: { title: string; values?: Record<string, CellValue> }[]
}
export interface SpecStyle {
  colour?: string
  view?: (typeof VIEWS)[number]
  pathStyle?: (typeof PATH_STYLES)[number]
  sheet?: (typeof SHEETS)[number]
  inkBg?: (typeof INK_BGS)[number]
}
export interface NotebookSpec {
  version: typeof SPEC_VERSION
  title: string
  summary?: string
  style?: SpecStyle
  pages: SpecPage[]
  cards?: SpecCard[]
  databases?: SpecDatabase[]
}

export interface SpecError {
  /** JSON Pointer to the problem, e.g. "/pages/2/blocks/5/level". */
  path: string
  message: string
}
export type SpecResult =
  | { ok: true; spec: NotebookSpec; counts: SpecCounts }
  | { ok: false; errors: SpecError[] }
export interface SpecCounts {
  pages: number
  blocks: number
  cards: number
  databases: number
  bytes: number
}

type Obj = Record<string, unknown>
const HEX = /^#[0-9a-fA-F]{6}$/
const KEY = /^[a-z0-9_-]{1,40}$/
const DAY = /^\d{4}-\d{2}-\d{2}$/
// Control characters other than tab and newline (NUL included) are refused.
// eslint-disable-next-line no-control-regex
const BAD_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
const CLOZE = /\{\{[^{}]+\}\}/
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  Object.getPrototypeOf(v) === Object.prototype
const isHttps = (s: string): boolean => {
  // eslint-disable-next-line no-control-regex
  if (s.length > LIMITS.url || /[\s\u0000-\u001f]/.test(s)) return false
  try {
    const u = new URL(s)
    return u.protocol === 'https:' && u.hostname.length > 0
  } catch {
    return false
  }
}

/** Collects errors up to a cap, so a hostile spec cannot make a huge report. */
class Report {
  errors: SpecError[] = []
  add(path: string, message: string): void {
    if (this.errors.length < LIMITS.maxErrors)
      this.errors.push({ path, message })
  }
  get full(): boolean {
    return this.errors.length >= LIMITS.maxErrors
  }
}

/**
 * Walks the input once: only plain JSON (no cycles, functions, undefined, NaN,
 * odd prototypes, `__proto__`-style keys), bounded depth, and measures size.
 * Returns the UTF-8 size, or an error message.
 */
function scan(input: unknown): { bytes: number } | { error: string } {
  const seen = new Set<unknown>()
  let nodes = 0
  let bytes = 0
  const enc = new TextEncoder()
  const walk = (v: unknown, depth: number): string | null => {
    if (++nodes > 200_000) return 'The spec has too many values.'
    if (depth > LIMITS.maxDepth + 6) return 'The spec is nested too deeply.'
    if (v === null || typeof v === 'boolean') {
      bytes += 5
      return null
    }
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) return 'Numbers must be finite.'
      bytes += String(v).length
      return null
    }
    if (typeof v === 'string') {
      bytes += enc.encode(v).length + 2
      return null
    }
    if (typeof v !== 'object') return 'The spec must be plain JSON.'
    if (seen.has(v)) return 'The spec must not contain loops.'
    seen.add(v)
    if (Array.isArray(v)) {
      bytes += 2
      for (const item of v) {
        const e = walk(item, depth + 1)
        if (e) return e
        bytes += 1
      }
    } else if (isObj(v)) {
      bytes += 2
      for (const k of Object.keys(v)) {
        if (UNSAFE_KEYS.has(k)) return `The field name "${k}" is not allowed.`
        bytes += enc.encode(k).length + 4
        const e = walk(v[k], depth + 1)
        if (e) return e
      }
    } else return 'The spec must be plain JSON.'
    seen.delete(v)
    if (bytes > LIMITS.maxBytes * 4) return 'too big'
    return null
  }
  const e = walk(input, 0)
  return e ? { error: e } : { bytes }
}

function str(
  r: Report,
  path: string,
  v: unknown,
  max: number,
  opts: { min?: number; multiline?: boolean } = {},
): string | undefined {
  if (typeof v !== 'string') {
    r.add(path, 'Must be a text.')
    return undefined
  }
  const min = opts.min ?? 0
  if (v.length < min || (min > 0 && v.trim().length === 0)) {
    r.add(path, 'Must not be empty.')
    return undefined
  }
  if (v.length > max) {
    r.add(path, `Too long (at most ${max} characters).`)
    return undefined
  }
  if (BAD_CHARS.test(v) || (!opts.multiline && /[\r\n\t]/.test(v))) {
    r.add(path, 'Contains characters that are not allowed.')
    return undefined
  }
  return v
}

function noExtra(
  r: Report,
  path: string,
  o: Obj,
  allowed: readonly string[],
): void {
  for (const k of Object.keys(o)) {
    if (!allowed.includes(k)) r.add(`${path}/${k}`, `Unknown field "${k}".`)
  }
}

function oneOf<T extends string>(
  r: Report,
  path: string,
  v: unknown,
  list: readonly T[],
): T | undefined {
  if (typeof v === 'string' && (list as readonly string[]).includes(v)) {
    return v as T
  }
  r.add(path, `Must be one of: ${list.join(', ')}.`)
  return undefined
}

interface Ctx {
  r: Report
  pageTitles: Set<string>
  dbKeys: Set<string>
  blocks: number
  cards: number
  refs: { path: string; kind: 'page' | 'database'; name: string }[]
}

const norm = (s: string): string => s.trim().toLocaleLowerCase()

function checkBlock(
  c: Ctx,
  path: string,
  v: unknown,
  depth: number,
  pageCount: { n: number },
): void {
  const { r } = c
  if (!isObj(v)) {
    r.add(path, 'Each block must be an object.')
    return
  }
  const type = oneOf(r, `${path}/type`, v.type, BLOCK_TYPES)
  if (!type) return
  if (++pageCount.n > LIMITS.maxBlocksPerPage) {
    if (pageCount.n === LIMITS.maxBlocksPerPage + 1) {
      r.add(path, `A page holds at most ${LIMITS.maxBlocksPerPage} blocks.`)
    }
    return
  }
  c.blocks++
  if (type === 'card' && ++c.cards > LIMITS.maxCards) {
    if (c.cards === LIMITS.maxCards + 1) {
      r.add(path, `At most ${LIMITS.maxCards} cards in one spec.`)
    }
  }
  const allowed = [
    'type',
    ...BLOCK_FIELDS[type],
    ...(CAN_NEST.has(type) ? ['children'] : []),
  ]
  noExtra(r, path, v, allowed)
  const has = (k: string) => v[k] !== undefined
  const need = (k: string) => {
    if (!has(k)) r.add(`${path}/${k}`, `A ${type} block needs "${k}".`)
    return has(k)
  }
  if (BLOCK_FIELDS[type].includes('text') && has('text')) {
    // Code keeps its own line breaks; other text is inline Markdown.
    str(r, `${path}/text`, v.text, LIMITS.text, { multiline: true })
  }
  if (type === 'heading' && has('level')) {
    if (v.level !== 1 && v.level !== 2 && v.level !== 3) {
      r.add(`${path}/level`, 'Must be 1, 2 or 3.')
    }
  }
  if (
    type === 'checkListItem' &&
    has('checked') &&
    typeof v.checked !== 'boolean'
  ) {
    r.add(`${path}/checked`, 'Must be true or false.')
  }
  if (type === 'codeBlock' && has('language')) {
    const l = str(r, `${path}/language`, v.language, 30)
    if (l !== undefined && !/^[a-z0-9+#._-]*$/i.test(l)) {
      r.add(`${path}/language`, 'Use a plain language name, e.g. python.')
    }
  }
  if (type === 'callout' && has('emoji')) {
    str(r, `${path}/emoji`, v.emoji, 16, { min: 1 })
  }
  if (type === 'table' && need('rows')) {
    const rows = v.rows
    if (!Array.isArray(rows) || rows.length === 0) {
      r.add(`${path}/rows`, 'Must be a list of rows.')
    } else if (rows.length > LIMITS.maxTableRows) {
      r.add(`${path}/rows`, `At most ${LIMITS.maxTableRows} rows.`)
    } else {
      let width = -1
      rows.forEach((row, i) => {
        const rp = `${path}/rows/${i}`
        if (!Array.isArray(row) || row.length === 0) {
          r.add(rp, 'Each row must be a list of cells.')
          return
        }
        if (row.length > LIMITS.maxTableCols) {
          r.add(rp, `At most ${LIMITS.maxTableCols} columns.`)
          return
        }
        if (width === -1) width = row.length
        else if (row.length !== width) {
          r.add(rp, 'Every row needs the same number of cells.')
        }
        row.forEach((cell, j) => str(r, `${rp}/${j}`, cell, LIMITS.cell))
      })
    }
  }
  if (type === 'mindMap' && need('outline')) {
    str(r, `${path}/outline`, v.outline, LIMITS.outline, {
      min: 1,
      multiline: true,
    })
  }
  if (type === 'math' && need('latex')) {
    str(r, `${path}/latex`, v.latex, LIMITS.cell, { min: 1, multiline: true })
  }
  if (type === 'embed') {
    if (need('url')) {
      const u = str(r, `${path}/url`, v.url, LIMITS.url, { min: 1 })
      if (u !== undefined && !isHttps(u)) {
        r.add(`${path}/url`, 'Must be a full https:// link.')
      }
    }
    if (has('caption')) str(r, `${path}/caption`, v.caption, 500)
  }
  if (type === 'pageLink' && need('page')) {
    const p = str(r, `${path}/page`, v.page, LIMITS.title, { min: 1 })
    if (p !== undefined)
      c.refs.push({ path: `${path}/page`, kind: 'page', name: p })
  }
  if (type === 'database' && need('database')) {
    const d = str(r, `${path}/database`, v.database, 40, { min: 1 })
    if (d !== undefined)
      c.refs.push({ path: `${path}/database`, kind: 'database', name: d })
  }
  if (has('children')) {
    const kids = v.children
    if (!Array.isArray(kids))
      r.add(`${path}/children`, 'Must be a list of blocks.')
    else if (depth >= 2)
      r.add(`${path}/children`, 'Blocks nest at most 2 levels.')
    else if (kids.length > MAX_CHILDREN) {
      r.add(`${path}/children`, `At most ${MAX_CHILDREN} nested blocks.`)
    } else {
      kids.forEach((k, i) =>
        checkBlock(c, `${path}/children/${i}`, k, depth + 1, pageCount),
      )
    }
  }
}

function checkPages(c: Ctx, v: unknown): void {
  const { r } = c
  if (!Array.isArray(v) || v.length === 0) {
    r.add('/pages', 'Needs at least one page.')
    return
  }
  if (v.length > LIMITS.maxPages) {
    r.add('/pages', `At most ${LIMITS.maxPages} pages.`)
    return
  }
  v.forEach((p, i) => {
    const path = `/pages/${i}`
    if (!isObj(p)) return r.add(path, 'Each page must be an object.')
    noExtra(r, path, p, ['title', 'summary', 'tabColour', 'blocks'])
    const t = str(r, `${path}/title`, p.title, LIMITS.title, { min: 1 })
    if (t !== undefined) {
      if (c.pageTitles.has(norm(t)))
        r.add(`${path}/title`, 'Page titles must be different.')
      c.pageTitles.add(norm(t))
    }
    if (p.summary !== undefined)
      str(r, `${path}/summary`, p.summary, LIMITS.summary, { multiline: true })
    if (p.tabColour !== undefined)
      oneOf(r, `${path}/tabColour`, p.tabColour, TAB_COLOURS)
    if (!Array.isArray(p.blocks))
      return r.add(`${path}/blocks`, 'Must be a list of blocks.')
    const count = { n: 0 }
    // Counting happens block by block, so a huge list is stopped early.
    for (let j = 0; j < p.blocks.length && !r.full; j++) {
      if (count.n > LIMITS.maxBlocksPerPage) break
      checkBlock(c, `${path}/blocks/${j}`, p.blocks[j], 0, count)
    }
  })
}

function checkCards(c: Ctx, v: unknown): void {
  const { r } = c
  if (!Array.isArray(v)) return r.add('/cards', 'Must be a list of cards.')
  if (v.length > LIMITS.maxCards)
    return r.add('/cards', `At most ${LIMITS.maxCards} cards.`)
  v.forEach((card, i) => {
    const path = `/cards/${i}`
    if (!isObj(card)) return r.add(path, 'Each card must be an object.')
    const kind = oneOf(r, `${path}/kind`, card.kind, ['qa', 'cloze'] as const)
    if (kind === 'qa') {
      noExtra(r, path, card, ['kind', 'q', 'a', 'page'])
      str(r, `${path}/q`, card.q, LIMITS.cell, { min: 1, multiline: true })
      str(r, `${path}/a`, card.a, LIMITS.cell, { min: 1, multiline: true })
    } else if (kind === 'cloze') {
      noExtra(r, path, card, ['kind', 'text', 'page'])
      const t = str(r, `${path}/text`, card.text, LIMITS.cell, {
        min: 1,
        multiline: true,
      })
      if (t !== undefined && !CLOZE.test(t)) {
        r.add(`${path}/text`, 'Hide at least one word like {{this}}.')
      }
    }
    if (card.page !== undefined) {
      const p = str(r, `${path}/page`, card.page, LIMITS.title, { min: 1 })
      if (p !== undefined)
        c.refs.push({ path: `${path}/page`, kind: 'page', name: p })
    }
    c.cards++
  })
  if (c.cards > LIMITS.maxCards)
    r.add(
      '/cards',
      `At most ${LIMITS.maxCards} cards (blocks and list together).`,
    )
}

function checkCell(r: Report, path: string, col: SpecColumn, v: unknown): void {
  switch (col.type) {
    case 'text':
      str(r, path, v, LIMITS.cell, { multiline: true })
      return
    case 'number':
      if (typeof v !== 'number' || !Number.isFinite(v))
        r.add(path, 'Must be a number.')
      return
    case 'checkbox':
      if (typeof v !== 'boolean') r.add(path, 'Must be true or false.')
      return
    case 'date':
      if (
        typeof v !== 'string' ||
        !DAY.test(v) ||
        Number.isNaN(Date.parse(`${v}T00:00:00Z`)) ||
        new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) !== v
      ) {
        r.add(path, 'Must be a real date like 2026-11-30.')
      }
      return
    case 'url':
      if (typeof v !== 'string' || !isHttps(v))
        r.add(path, 'Must be a full https:// link.')
      return
    case 'choice':
      if (typeof v !== 'string' || !col.options?.includes(v)) {
        r.add(path, `Must be one of: ${(col.options ?? []).join(', ')}.`)
      }
      return
    case 'choices':
      if (
        !Array.isArray(v) ||
        v.length > LIMITS.maxOptions ||
        v.some((x) => typeof x !== 'string' || !col.options?.includes(x))
      ) {
        r.add(
          path,
          `Must be a list drawn from: ${(col.options ?? []).join(', ')}.`,
        )
      }
      return
  }
}

function checkDatabases(c: Ctx, v: unknown): void {
  const { r } = c
  if (!Array.isArray(v))
    return r.add('/databases', 'Must be a list of databases.')
  if (v.length > LIMITS.maxDatabases)
    return r.add('/databases', `At most ${LIMITS.maxDatabases} databases.`)
  v.forEach((d, i) => {
    const path = `/databases/${i}`
    if (!isObj(d)) return r.add(path, 'Each database must be an object.')
    noExtra(r, path, d, ['key', 'title', 'columns', 'rows'])
    const key = str(r, `${path}/key`, d.key, 40, { min: 1 })
    if (key !== undefined) {
      if (!KEY.test(key)) r.add(`${path}/key`, 'Use a-z, 0-9, - and _ only.')
      else if (c.dbKeys.has(key))
        r.add(`${path}/key`, 'Database keys must be different.')
      c.dbKeys.add(key)
    }
    str(r, `${path}/title`, d.title, LIMITS.title, { min: 1 })
    const cols: SpecColumn[] = []
    if (!Array.isArray(d.columns) || d.columns.length === 0) {
      r.add(`${path}/columns`, 'Needs at least one column.')
    } else if (d.columns.length > LIMITS.maxColumns) {
      r.add(`${path}/columns`, `At most ${LIMITS.maxColumns} columns.`)
    } else {
      const names = new Set<string>(['title'])
      d.columns.forEach((col: unknown, j: number) => {
        const cp = `${path}/columns/${j}`
        if (!isObj(col)) return r.add(cp, 'Each column must be an object.')
        noExtra(r, cp, col, ['name', 'type', 'options'])
        const name = str(r, `${cp}/name`, col.name, LIMITS.name, { min: 1 })
        const type = oneOf(r, `${cp}/type`, col.type, COLUMN_TYPES)
        if (name !== undefined) {
          if (names.has(norm(name)))
            r.add(
              `${cp}/name`,
              'Column names must be different ("title" is the row title).',
            )
          names.add(norm(name))
        }
        let options: string[] | undefined
        const wantsOptions = type === 'choice' || type === 'choices'
        if (col.options !== undefined) {
          if (!wantsOptions)
            r.add(
              `${cp}/options`,
              'Only choice and choices columns have options.',
            )
          else if (
            !Array.isArray(col.options) ||
            col.options.length === 0 ||
            col.options.length > LIMITS.maxOptions
          ) {
            r.add(
              `${cp}/options`,
              `A list of 1 to ${LIMITS.maxOptions} options.`,
            )
          } else {
            options = []
            col.options.forEach((o: unknown, k: number) => {
              const s = str(r, `${cp}/options/${k}`, o, LIMITS.name, { min: 1 })
              if (s !== undefined) options!.push(s)
            })
            if (new Set(options.map(norm)).size !== options.length) {
              r.add(`${cp}/options`, 'Options must be different.')
            }
          }
        } else if (wantsOptions)
          r.add(`${cp}/options`, 'Needs a list of options.')
        if (name !== undefined && type !== undefined)
          cols.push({ name, type, options })
      })
    }
    if (!Array.isArray(d.rows))
      return r.add(`${path}/rows`, 'Must be a list of rows.')
    if (d.rows.length > LIMITS.maxRows)
      return r.add(`${path}/rows`, `At most ${LIMITS.maxRows} rows.`)
    d.rows.forEach((row: unknown, j: number) => {
      const rp = `${path}/rows/${j}`
      if (!isObj(row)) return r.add(rp, 'Each row must be an object.')
      noExtra(r, rp, row, ['title', 'values'])
      str(r, `${rp}/title`, row.title, LIMITS.title, { min: 1 })
      if (row.values === undefined) return
      if (!isObj(row.values))
        return r.add(
          `${rp}/values`,
          'Must be an object of column name to value.',
        )
      for (const [name, val] of Object.entries(row.values)) {
        const col = cols.find((x) => norm(x.name) === norm(name))
        if (!col)
          r.add(`${rp}/values/${name}`, `There is no column named "${name}".`)
        else checkCell(r, `${rp}/values/${name}`, col, val)
      }
    })
  })
}

function checkStyle(r: Report, v: unknown): void {
  if (!isObj(v)) return r.add('/style', 'Must be an object.')
  noExtra(r, '/style', v, ['colour', 'view', 'pathStyle', 'sheet', 'inkBg'])
  if (
    v.colour !== undefined &&
    !(typeof v.colour === 'string' && HEX.test(v.colour))
  ) {
    r.add('/style/colour', 'Must be a colour like #2563EB.')
  }
  if (v.view !== undefined) oneOf(r, '/style/view', v.view, VIEWS)
  if (v.pathStyle !== undefined)
    oneOf(r, '/style/pathStyle', v.pathStyle, PATH_STYLES)
  if (v.sheet !== undefined) oneOf(r, '/style/sheet', v.sheet, SHEETS)
  if (v.inkBg !== undefined) oneOf(r, '/style/inkBg', v.inkBg, INK_BGS)
}

/**
 * Checks a notebook spec (already-parsed JSON). Never throws. On success the
 * returned `spec` is the same object, now known to be valid.
 */
export function validateSpec(input: unknown): SpecResult {
  const r = new Report()
  const scanned = scan(input)
  if ('error' in scanned) {
    return {
      ok: false,
      errors: [
        {
          path: '',
          message:
            scanned.error === 'too big'
              ? `The spec is over ${LIMITS.maxBytes / 1024} KB.`
              : scanned.error,
        },
      ],
    }
  }
  if (scanned.bytes > LIMITS.maxBytes) {
    return {
      ok: false,
      errors: [
        { path: '', message: `The spec is over ${LIMITS.maxBytes / 1024} KB.` },
      ],
    }
  }
  if (!isObj(input)) {
    return {
      ok: false,
      errors: [{ path: '', message: 'The spec must be a JSON object.' }],
    }
  }
  noExtra(r, '', input, [
    'version',
    'title',
    'summary',
    'style',
    'pages',
    'cards',
    'databases',
  ])
  if (input.version !== SPEC_VERSION)
    r.add('/version', `Must be "${SPEC_VERSION}".`)
  str(r, '/title', input.title, LIMITS.title, { min: 1 })
  if (input.summary !== undefined)
    str(r, '/summary', input.summary, LIMITS.summary, { multiline: true })
  if (input.style !== undefined) checkStyle(r, input.style)
  const c: Ctx = {
    r,
    pageTitles: new Set(),
    dbKeys: new Set(),
    blocks: 0,
    cards: 0,
    refs: [],
  }
  checkPages(c, input.pages)
  if (input.databases !== undefined) checkDatabases(c, input.databases)
  if (input.cards !== undefined) checkCards(c, input.cards)
  for (const ref of c.refs) {
    const known =
      ref.kind === 'page'
        ? c.pageTitles.has(norm(ref.name))
        : c.dbKeys.has(ref.name)
    if (!known) {
      r.add(
        ref.path,
        ref.kind === 'page'
          ? `There is no page titled "${ref.name}" in this spec.`
          : `There is no database with the key "${ref.name}" in this spec.`,
      )
    }
  }
  if (r.errors.length) return { ok: false, errors: r.errors }
  const spec = input as unknown as NotebookSpec
  return {
    ok: true,
    spec,
    counts: {
      pages: spec.pages.length,
      blocks: c.blocks,
      cards: c.cards,
      databases: spec.databases?.length ?? 0,
      bytes: scanned.bytes,
    },
  }
}

/** Parses JSON text, then validates it. Never throws. */
export function validateSpecText(text: string): SpecResult {
  if (typeof text !== 'string') {
    return {
      ok: false,
      errors: [{ path: '', message: 'The spec must be text.' }],
    }
  }
  if (text.length > LIMITS.maxBytes) {
    return {
      ok: false,
      errors: [
        { path: '', message: `The spec is over ${LIMITS.maxBytes / 1024} KB.` },
      ],
    }
  }
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return {
      ok: false,
      errors: [{ path: '', message: 'The spec is not valid JSON.' }],
    }
  }
  return validateSpec(json)
}

/** Errors as short plain lines for a tool reply (path then message). */
export function describeErrors(errors: readonly SpecError[]): string {
  return errors
    .map((e) => (e.path ? `${e.path}: ${e.message}` : e.message))
    .join('\n')
}
