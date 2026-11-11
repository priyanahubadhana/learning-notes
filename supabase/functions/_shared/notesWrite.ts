/**
 * Turns a notebook spec (src/connector/spec.ts, validated first) into the
 * app's own records: notebook, pages, blocks, recall cards, databases (with
 * columns, views and row pages) and mind maps, in the same shapes the app
 * stores (src/core/types.ts). Pure: no network, no clock of its own, so the
 * Node tests can check every field.
 *
 * Everything Claude makes is marked `source: 'ai'` with one `batchId`, so the
 * app's "Remove this AI result" can take a whole creation away in one step.
 * There is no delete here. New records have new ids and are saved with "must
 * be new" (see PushItem.baseRev = 0). The only edits of existing records are
 * `baseRev` ones (refine_page, apply_style): they name the revision they were
 * made from, so a record that changed meanwhile is never overwritten.
 */
import { stableId } from './e2e.ts'
import { ToolFail } from './escrow.ts'
import { orderBetween } from './fracindex.ts'
import { outlineToMap } from './mindmap.ts'
import type {
  NotebookSpec,
  SpecBlock,
  SpecCard,
  SpecColumn,
  SpecDatabase,
  SpecPage,
  SpecStyle,
} from './spec.ts'
import type { Notebook } from './notesModel.ts'

type Rec = Record<string, unknown>
export interface MadeRecord {
  table:
    | 'notebooks'
    | 'pages'
    | 'blocks'
    | 'cards'
    | 'databases'
    | 'dbColumns'
    | 'dbViews'
    | 'pageVersions'
    | 'claudeInbox'
  id: string
  value: Rec
  /** 0 or unset = a new record. Otherwise the revision this edit was made from. */
  baseRev?: number
}
export interface Counts {
  pages: number
  blocks: number
  cards: number
  databases?: number
  rows?: number
}
export interface Made {
  /** In the order they must be saved: blocks and cards first, the page or notebook last. */
  records: MadeRecord[]
  notebookId: string
  pageIds: string[]
  counts: Counts
}
export interface MakeOptions {
  now: number
  newId: () => string
  /** One id for everything made in this call (the "AI result"). */
  batchId: string
}

// ---- order keys (fractional indexing, as src/core/order.ts) ----

const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

/** The i-th key of an increasing run, valid for the app's fractional-indexing library. */
export function orderKey(i: number): string {
  if (i < 62) return 'a' + DIGITS[i]
  const j = i - 62
  if (j < 62 * 62) return 'b' + DIGITS[Math.floor(j / 62)] + DIGITS[j % 62]
  const k = j - 62 * 62
  if (k < 62 ** 3)
    return (
      'c' +
      DIGITS[Math.floor(k / 3844)] +
      DIGITS[Math.floor(k / 62) % 62] +
      DIGITS[k % 62]
    )
  throw new ToolFail('Too many items in one place.')
}

/**
 * A key that sorts after `last` (a sibling's key) and never ends in "0".
 * Two random digits make a clash with another device unlikely.
 */
export function orderAfter(last: string | null): string {
  if (last === null) return orderKey(0)
  const pick = crypto.getRandomValues(new Uint8Array(2))
  return last + 'V' + DIGITS[1 + (pick[0] % 61)] + DIGITS[1 + (pick[1] % 61)]
}

/** A run of keys, each after the one before (starting after `last`); compact, unlike chained `orderAfter`. */
export function appendKeys(last: string | null): () => string {
  let prev = last
  return () => (prev = orderBetween(prev, null))
}

// ---- inline Markdown -> the editor's rich-text runs (as src/editor/textBlocks.ts inlineRuns) ----

type Run = Rec
const run = (text: string, styles: Rec = {}): Run => ({
  type: 'text',
  text,
  styles,
})
const isHttps = (u: string) => {
  try {
    return new URL(u).protocol === 'https:'
  } catch {
    return false
  }
}

/** **bold**, __bold__, *italic*, `code`, [text](https://link). Nothing else is read as markup. */
export function inlineRuns(text: string): Run[] {
  const runs: Run[] = []
  const pattern =
    /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\s][^*]*)\*|`([^`]+)`|\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g
  let last = 0
  for (const m of text.matchAll(pattern)) {
    const at = m.index ?? 0
    if (at > last) runs.push(run(text.slice(last, at)))
    if (m[1] ?? m[2]) runs.push(run(m[1] ?? m[2], { bold: true }))
    else if (m[3]) runs.push(run(m[3], { italic: true }))
    else if (m[4]) runs.push(run(m[4], { code: true }))
    else if (m[5] && isHttps(m[6])) {
      runs.push({ type: 'link', href: m[6], content: [run(m[5])] })
    } else runs.push(run(m[0]))
    last = at + m[0].length
  }
  if (last < text.length) runs.push(run(text.slice(last)))
  return runs
}

/** "The {{heart}} pumps" -> runs with the hidden word styled as a blank. */
function clozeRuns(
  text: string,
  newId: () => string,
): { runs: Run[]; blanks: string[] } {
  const runs: Run[] = []
  const blanks: string[] = []
  let last = 0
  for (const m of text.matchAll(/\{\{([^{}]+)\}\}/g)) {
    const at = m.index ?? 0
    if (at > last) runs.push(...inlineRuns(text.slice(last, at)))
    const id = newId()
    blanks.push(id)
    runs.push(run(m[1], { blank: id }))
    last = at + m[0].length
  }
  if (last < text.length) runs.push(...inlineRuns(text.slice(last)))
  return { runs, blanks }
}

// ---- building ----

const norm = (s: string): string => s.trim().toLocaleLowerCase()
const baseFields = (id: string, now: number) => ({
  id,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
})

interface PageCtx extends MakeOptions {
  notebookId: string
  pageId: string
  pageTitle: string
  /** page title (normalised) -> page id, for page links. */
  pageIds: Map<string, string>
  /** database key (from the spec) -> database id, for database blocks. */
  dbIds: Map<string, string>
  records: MadeRecord[]
  counts: Counts
}

function contentFor(b: SpecBlock, c: PageCtx): Rec {
  const text = () => inlineRuns(b.text ?? '')
  switch (b.type) {
    case 'paragraph':
    case 'bulletListItem':
    case 'numberedListItem':
    case 'quote':
    case 'toggleListItem':
    case 'card':
      return { text: text() }
    case 'heading':
      return { level: b.level ?? 1, text: text() }
    case 'checkListItem':
      return { checked: b.checked ?? false, text: text() }
    case 'divider':
      return {}
    case 'codeBlock':
      // Code is literal: no Markdown, line breaks kept.
      return {
        language: b.language ?? 'plaintext',
        text: b.text ? [run(b.text)] : [],
      }
    case 'callout':
      return { emoji: b.emoji ?? '💡', text: text() }
    case 'table':
      return {
        text: {
          type: 'tableContent',
          rows: (b.rows ?? []).map((cells) => ({
            cells: cells.map((cell) => inlineRuns(cell)),
          })),
        },
      }
    case 'math':
      return { latex: b.latex ?? '' }
    case 'embed':
      return {
        url: b.url ?? '',
        provider: 'link',
        videoId: '',
        start: 0,
        caption: b.caption ?? '',
      }
    case 'pageLink':
      return { pageId: c.pageIds.get(norm(b.page ?? '')) ?? '' }
    case 'mindMap':
      // An editable tree (never a picture), stored as JSON text, as the app does.
      return {
        data: JSON.stringify(
          outlineToMap(b.outline ?? '', c.pageTitle, c.newId),
        ),
        theme: 'calm',
      }
    case 'database':
      return { databaseId: c.dbIds.get(b.database ?? '') ?? '' }
    default:
      throw new ToolFail(`The block type "${b.type}" is not available.`)
  }
}

/** Adds blocks (and their children) as records; returns the ids of the top-level ones. */
function addBlocks(
  c: PageCtx,
  list: readonly SpecBlock[],
  parentId: string | null,
  topOrders?: readonly string[],
): string[] {
  const ids: string[] = []
  list.forEach((b, i) => {
    const id = c.newId()
    ids.push(id)
    c.records.push({
      table: 'blocks',
      id,
      value: {
        ...baseFields(id, c.now),
        pageId: c.pageId,
        parentId,
        type: b.type,
        content: contentFor(b, c),
        order: topOrders ? topOrders[i] : orderKey(i),
        source: 'ai',
        batchId: c.batchId,
      },
    })
    c.counts.blocks++
    if (b.type === 'card') addCardRecord(c, id, 'main')
    if (b.type === 'database') {
      const databaseId = c.dbIds.get(b.database ?? '')
      // The block's own view of the database (as the app makes on first show).
      if (databaseId) {
        const viewId = c.newId()
        c.records.push({
          table: 'dbViews',
          id: viewId,
          value: {
            ...baseFields(viewId, c.now),
            databaseId,
            blockId: id,
            name: 'Table',
            type: 'table',
            config: {},
            order: orderKey(0),
          },
        })
      }
    }
    if (b.children?.length) addBlocks(c, b.children, id)
  })
  return ids
}

function addCardRecord(c: PageCtx, blockId: string, part: string): void {
  const id = stableId(`card:${blockId}/${part}`)
  c.records.push({
    table: 'cards',
    id,
    value: {
      ...baseFields(id, c.now),
      blockId,
      part,
      pageId: c.pageId,
      notebookId: c.notebookId,
      due: c.now,
      intervalDays: 0,
      step: 0,
      reps: 0,
      lapses: 0,
      suspendedAt: null,
    },
  })
  c.counts.cards++
}

/**
 * Recall cards as blocks at the end of a page: an optional "Recall cards"
 * heading, then one block per card (a Card block with its answer as a child,
 * or a sentence with hidden words and a card record per blank). `nextOrder`
 * gives the position of each top-level block in turn.
 */
function addRecallCards(
  c: PageCtx,
  cards: readonly SpecCard[],
  nextOrder: () => string,
  heading: boolean,
): void {
  const block = (
    id: string,
    parentId: string | null,
    type: string,
    content: Rec,
    order: string,
  ) => {
    c.records.push({
      table: 'blocks',
      id,
      value: {
        ...baseFields(id, c.now),
        pageId: c.pageId,
        parentId,
        type,
        content,
        order,
        source: 'ai',
        batchId: c.batchId,
      },
    })
    c.counts.blocks++
  }
  if (heading)
    block(
      c.newId(),
      null,
      'heading',
      { level: 2, text: [run('Recall cards')] },
      nextOrder(),
    )
  for (const card of cards) {
    const id = c.newId()
    const order = nextOrder()
    if (card.kind === 'qa') {
      block(id, null, 'card', { text: inlineRuns(card.q) }, order)
      addCardRecord(c, id, 'main')
      block(
        c.newId(),
        id,
        'paragraph',
        { text: inlineRuns(card.a) },
        orderKey(0),
      )
    } else {
      const { runs, blanks } = clozeRuns(card.text, c.newId)
      block(id, null, 'paragraph', { text: runs }, order)
      for (const part of blanks) addCardRecord(c, id, part)
    }
  }
}

interface Style {
  inkBg?: string
  sheet?: string
}

function pageRecord(
  page: SpecPage,
  id: string,
  o: {
    notebookId: string
    parentId: string | null
    order: string
    now: number
    style?: Style
  },
): MadeRecord {
  return {
    table: 'pages',
    id,
    value: {
      ...baseFields(id, o.now),
      notebookId: o.notebookId,
      parentId: o.parentId,
      title: page.title,
      order: o.order,
      ...(page.summary ? { summary: page.summary } : {}),
      ...(page.tabColour ? { tabColour: page.tabColour } : {}),
      ...(o.style?.inkBg ? { inkBg: o.style.inkBg } : {}),
      ...(o.style?.sheet ? { sheet: o.style.sheet } : {}),
    },
  }
}

// ---- databases ----

/** What a database needs from its surroundings. */
export interface DatabaseOptions extends MakeOptions {
  workspaceId: string
  notebookId: string
  /** The order key of the last database of the workspace (the new one goes after it). */
  lastOrder: string | null
}

/**
 * A database as the app stores it (src/databases/databaseService.ts
 * `createDatabase`, `addColumn`, `addRows`): the database, its columns, its
 * three starter views (Table, Dashboard, Board) and one row page per row with
 * the cells by column id. Choice cells hold option ids; empty cells and
 * unticked boxes are left out, as the app does.
 */
export function databaseFromSpec(
  spec: SpecDatabase,
  o: DatabaseOptions,
): { databaseId: string; records: MadeRecord[]; rows: number; order: string } {
  const records: MadeRecord[] = []
  const databaseId = o.newId()
  const order = orderAfter(o.lastOrder)
  const views: [string, string][] = [
    ['table', 'Table'],
    ['dashboard', 'Dashboard'],
    ['board', 'Board'],
  ]
  views.forEach(([type, name], i) => {
    const id = o.newId()
    records.push({
      table: 'dbViews',
      id,
      value: {
        ...baseFields(id, o.now),
        databaseId,
        name,
        type,
        config: {},
        order: orderKey(i),
      },
    })
  })
  interface Col {
    id: string
    spec: SpecColumn
    options: Map<string, string>
  }
  const cols = new Map<string, Col>()
  spec.columns.forEach((col, i) => {
    const id = o.newId()
    const options = new Map<string, string>()
    let config: Rec = {}
    if (col.type === 'number') config = { format: 'number' }
    if (col.type === 'choice' || col.type === 'choices') {
      config = {
        options: (col.options ?? []).map((name) => {
          const optionId = o.newId()
          options.set(name, optionId)
          return { id: optionId, name }
        }),
      }
    }
    records.push({
      table: 'dbColumns',
      id,
      value: {
        ...baseFields(id, o.now),
        databaseId,
        name: col.name,
        type: col.type,
        config,
        order: orderKey(i),
      },
    })
    cols.set(norm(col.name), { id, spec: col, options })
  })
  spec.rows.forEach((row, j) => {
    const id = o.newId()
    const values: Rec = {}
    for (const [name, v] of Object.entries(row.values ?? {})) {
      const col = cols.get(norm(name))
      if (!col) continue
      const stored = cellValue(col.spec, col.options, v)
      if (stored !== null) values[col.id] = stored
    }
    records.push({
      table: 'pages',
      id,
      value: {
        ...baseFields(id, o.now),
        notebookId: o.notebookId,
        parentId: null,
        title: row.title,
        order: orderKey(j),
        databaseId,
        ...(Object.keys(values).length ? { values } : {}),
      },
    })
  })
  // The database itself is saved last: until it exists, nothing points to its parts.
  records.push({
    table: 'databases',
    id: databaseId,
    value: {
      ...baseFields(databaseId, o.now),
      workspaceId: o.workspaceId,
      notebookId: o.notebookId,
      title: spec.title,
      titleName: 'Name',
      order,
    },
  })
  return { databaseId, records, rows: spec.rows.length, order }
}

/** A cell as the app's column types store it (null = leave empty). */
function cellValue(
  col: SpecColumn,
  options: Map<string, string>,
  v: unknown,
): unknown {
  switch (col.type) {
    case 'text':
      return typeof v === 'string' && v !== '' ? v : null
    case 'number':
      return typeof v === 'number' && Number.isFinite(v) ? v : null
    case 'date':
    case 'url':
      return typeof v === 'string' && v !== '' ? v : null
    case 'checkbox':
      return v === true ? true : null
    case 'choice':
      return typeof v === 'string' ? (options.get(v) ?? null) : null
    case 'choices': {
      const ids = Array.isArray(v)
        ? [...new Set(v.map((x) => options.get(String(x))))].filter(
            (x): x is string => !!x,
          )
        : []
      return ids.length ? ids : null
    }
  }
}

/** Everything a validated notebook spec makes. `opts.workspaceId` is the person's workspace. */
export function notebookFromSpec(
  spec: NotebookSpec,
  opts: MakeOptions & {
    workspaceId: string
    lastNotebookOrder: string | null
    lastDatabaseOrder?: string | null
  },
): Made {
  const notebookId = opts.newId()
  const records: MadeRecord[] = []
  const counts: Counts = { pages: 0, blocks: 0, cards: 0 }
  const pageIds = new Map<string, string>()
  const ids = spec.pages.map((p) => {
    const id = opts.newId()
    pageIds.set(norm(p.title), id)
    return id
  })
  // Databases first, so database blocks can point to them.
  const dbIds = new Map<string, string>()
  let lastDb = opts.lastDatabaseOrder ?? null
  let rows = 0
  for (const d of spec.databases ?? []) {
    const made = databaseFromSpec(d, {
      ...opts,
      notebookId,
      lastOrder: lastDb,
    })
    dbIds.set(d.key, made.databaseId)
    lastDb = made.order
    records.push(...made.records)
    rows += made.rows
  }
  const style = spec.style
  const pagesOut: MadeRecord[] = []
  spec.pages.forEach((page, i) => {
    const c: PageCtx = {
      ...opts,
      notebookId,
      pageId: ids[i],
      pageTitle: page.title,
      pageIds,
      dbIds,
      records,
      counts,
    }
    const blocks: SpecBlock[] = [...page.blocks]
    if (i === 0 && spec.summary)
      blocks.unshift({ type: 'callout', emoji: '📝', text: spec.summary })
    // Recall cards the spec lists for this page (or, with no page named, the first).
    const mine = (spec.cards ?? []).filter((card) =>
      card.page ? norm(card.page) === norm(page.title) : i === 0,
    )
    addBlocks(c, blocks, null)
    if (mine.length) {
      let k = blocks.length
      addRecallCards(c, mine, () => orderKey(k++), true)
    }
    pagesOut.push(
      pageRecord(page, ids[i], {
        notebookId,
        parentId: null,
        order: orderKey(i),
        now: opts.now,
        style,
      }),
    )
    counts.pages++
  })
  if (dbIds.size) {
    counts.databases = dbIds.size
    counts.rows = rows
  }
  // Saved in this order: the notebook comes last, so a save that stops half
  // way leaves only records no notebook points to (invisible), never a
  // notebook with holes.
  records.push(...pagesOut)
  const nb: Notebook & Rec = {
    ...baseFields(notebookId, opts.now),
    workspaceId: opts.workspaceId,
    title: spec.title,
    order: orderAfter(opts.lastNotebookOrder),
    tabs: defaultTabs(notebookId),
    ...(style?.colour ? { colour: style.colour } : {}),
    ...(style?.view ? { view: style.view } : {}),
    ...(style?.pathStyle ? { pathStyle: style.pathStyle } : {}),
  } as unknown as Notebook & Rec
  records.push({ table: 'notebooks', id: notebookId, value: nb as Rec })
  return { records, notebookId, pageIds: ids, counts }
}

/** The default tabs of a normal notebook (src/databases/notebookTabs.ts `defaultNotebookTabs`). */
export function defaultTabs(notebookId: string) {
  return [
    { id: 'notes', kind: 'notes' },
    { id: 'summary', kind: 'summary' },
    { id: 'database', kind: 'database', databaseId: `tracker:${notebookId}` },
    { id: 'cards', kind: 'cards' },
    { id: 'revise', kind: 'revise' },
  ]
}

/** One page for an existing notebook (a validated one-page spec). */
export function pageIntoNotebook(
  page: SpecPage,
  opts: MakeOptions & {
    notebookId: string
    parentId: string | null
    lastSiblingOrder: string | null
    style?: Style
  },
): Made {
  const pageId = opts.newId()
  const records: MadeRecord[] = []
  const counts: Counts = { pages: 1, blocks: 0, cards: 0 }
  const c: PageCtx = {
    ...opts,
    pageId,
    pageTitle: page.title,
    pageIds: new Map([[norm(page.title), pageId]]),
    dbIds: new Map(),
    records,
    counts,
  }
  addBlocks(c, page.blocks, null)
  records.push(
    pageRecord(page, pageId, {
      notebookId: opts.notebookId,
      parentId: opts.parentId,
      order: orderAfter(opts.lastSiblingOrder),
      now: opts.now,
      style: opts.style,
    }),
  )
  return { records, notebookId: opts.notebookId, pageIds: [pageId], counts }
}

// ---- slice 6: more on existing notebooks and pages ----

/** Recall cards added to an existing page (after its last top-level block). */
export function cardsIntoPage(
  cards: readonly SpecCard[],
  opts: MakeOptions & {
    notebookId: string
    pageId: string
    pageTitle: string
    lastBlockOrder: string | null
    /** The page already has a "Recall cards" heading: no second one. */
    hasHeading: boolean
  },
): Made {
  const records: MadeRecord[] = []
  const counts: Counts = { pages: 0, blocks: 0, cards: 0 }
  const c: PageCtx = {
    ...opts,
    pageIds: new Map(),
    dbIds: new Map(),
    records,
    counts,
  }
  addRecallCards(c, cards, appendKeys(opts.lastBlockOrder), !opts.hasHeading)
  return {
    records,
    notebookId: opts.notebookId,
    pageIds: [opts.pageId],
    counts,
  }
}

/**
 * A database for an existing notebook, optionally shown on a page as a
 * database block (at the end of the page, with its own Table view).
 */
export function databaseIntoNotebook(
  spec: SpecDatabase,
  opts: DatabaseOptions & {
    page?: { id: string; title: string; lastBlockOrder: string | null }
  },
): Made & { databaseId: string } {
  const made = databaseFromSpec(spec, opts)
  const records = made.records
  const counts: Counts = {
    pages: 0,
    blocks: 0,
    cards: 0,
    databases: 1,
    rows: made.rows,
  }
  if (opts.page) {
    const c: PageCtx = {
      ...opts,
      pageId: opts.page.id,
      pageTitle: opts.page.title,
      pageIds: new Map(),
      dbIds: new Map([[spec.key, made.databaseId]]),
      records,
      counts,
    }
    addBlocks(c, [{ type: 'database', database: spec.key }], null, [
      orderBetween(opts.page.lastBlockOrder, null),
    ])
  }
  return {
    records,
    notebookId: opts.notebookId,
    pageIds: opts.page ? [opts.page.id] : [],
    counts,
    databaseId: made.databaseId,
  }
}

/** The fields a style changes, split by where they live. */
export function styleFields(style: SpecStyle): { notebook: Rec; page: Rec } {
  const notebook: Rec = {}
  const page: Rec = {}
  if (style.colour) notebook.colour = style.colour
  if (style.view) notebook.view = style.view
  if (style.pathStyle) notebook.pathStyle = style.pathStyle
  if (style.sheet) page.sheet = style.sheet
  if (style.inkBg) page.inkBg = style.inkBg
  return { notebook, page }
}

/** A changed copy of an existing record, to be saved against the revision it was read at. */
export function edited(
  table: MadeRecord['table'],
  value: Rec,
  rev: number,
  changes: Rec,
  now: number,
): MadeRecord {
  return {
    table,
    id: String(value.id),
    value: { ...value, ...changes, updatedAt: now },
    baseRev: rev,
  }
}

// ---- slice 7: single blocks for refine_page ----

/** One new block (with any children) and its records, ready to save; `order` is its place among siblings. */
export function blockTree(
  block: SpecBlock,
  opts: MakeOptions & {
    notebookId: string
    pageId: string
    pageTitle: string
    parentId: string | null
    order: string
  },
): { records: MadeRecord[]; blockId: string; counts: Counts } {
  const records: MadeRecord[] = []
  const counts: Counts = { pages: 0, blocks: 0, cards: 0 }
  const c: PageCtx = {
    ...opts,
    pageIds: new Map(),
    dbIds: new Map(),
    records,
    counts,
  }
  const [blockId] = addBlocks(c, [block], opts.parentId, [opts.order])
  return { records, blockId, counts }
}
