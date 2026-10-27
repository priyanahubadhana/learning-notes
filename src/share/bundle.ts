import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import type {
  Block,
  Card,
  Database,
  DbColumn,
  DbView,
  Notebook,
  Page,
  ReviewLog,
  Tag,
} from '../core/types'
import { tagMap, tagPathIn } from '../tags/tagService'
import { joinTagPath } from '../tags/tagNames'
import type { BackupSnapshot } from '../core/upgradeBackup'

/**
 * The file format for sharing notebooks (and restoring backups): plain
 * JSON with the notebooks, pages, blocks, cards (with schedules), review
 * history, databases, columns and views, and the names of the tags used.
 * Importing always makes new copies (see importBundle.ts).
 */

export const BUNDLE_VERSION = 1
/** Largest file read (bytes). */
export const MAX_BUNDLE_BYTES = 200_000_000

export interface BundleTag {
  id: string
  /** Full name with levels, e.g. "medicine/cardiology". */
  path: string
  /** The tag's colour (one of the app's tag colours), if it has one. */
  color?: string
}

export interface Bundle {
  app: 'learning-notes'
  kind: 'notebook' | 'backup'
  formatVersion: number
  exportedAt: number
  notebooks: Notebook[]
  pages: Page[]
  blocks: Block[]
  cards: Card[]
  reviewLogs: ReviewLog[]
  databases: Database[]
  dbColumns: DbColumn[]
  dbViews: DbView[]
  tags: BundleTag[]
}

const TABLES = [
  'notebooks',
  'pages',
  'blocks',
  'cards',
  'reviewLogs',
  'databases',
  'dbColumns',
  'dbViews',
  'tags',
] as const

const emptyBundle = (kind: Bundle['kind'], now: number): Bundle => ({
  app: 'learning-notes',
  kind,
  formatVersion: BUNDLE_VERSION,
  exportedAt: now,
  notebooks: [],
  pages: [],
  blocks: [],
  cards: [],
  reviewLogs: [],
  databases: [],
  dbColumns: [],
  dbViews: [],
  tags: [],
})

/**
 * Tags whose ids appear in the bundle's text, with the levels above them
 * (so their colours travel too), parents first.
 */
function usedTags(bundle: Bundle, tags: ReadonlyMap<string, Tag>): BundleTag[] {
  const text = JSON.stringify([bundle.pages, bundle.blocks])
  const cells = JSON.stringify(bundle.pages.map((p) => p.values ?? null))
  const wanted = new Map<string, Tag>()
  for (const tag of tags.values()) {
    if (!text.includes(tag.id) && !cells.includes(tag.id)) continue
    for (const level of tagPathIn(tags, tag.id)) wanted.set(level.id, level)
  }
  return [...wanted.values()]
    .map((tag): BundleTag => {
      const path = joinTagPath(tagPathIn(tags, tag.id).map((t) => t.name))
      return { id: tag.id, path, ...(tag.color && { color: tag.color }) }
    })
    .filter((tag) => tag.path !== '')
    .sort((a, b) => a.path.split('/').length - b.path.split('/').length)
}

/** A database's relation columns that point outside `ids` are left out. */
function withoutOutsideRelations(
  columns: DbColumn[],
  databaseIds: ReadonlySet<string>,
): DbColumn[] {
  const dropped = new Set(
    columns
      .filter(
        (c) =>
          c.type === 'relation' &&
          !databaseIds.has(String(c.config.databaseId)),
      )
      .map((c) => c.id),
  )
  // Rollups through a dropped relation have nothing to read.
  return columns.filter(
    (c) =>
      !dropped.has(c.id) &&
      !(c.type === 'rollup' && dropped.has(String(c.config.relationColumnId))),
  )
}

/** What a notebook file carries besides the notebook itself. */
export interface ExportOptions {
  /** The journal days (the Journal notebook). */
  journal?: boolean
  /** The templates (the Templates notebook). */
  templates?: boolean
}

/**
 * Everything of one notebook, ready to write to a file; with the options,
 * also the workspace's journal days and templates.
 */
export async function exportNotebookBundle(
  db: LearningNotesDB,
  notebookId: string,
  options: ExportOptions = {},
  now: number = Date.now(),
): Promise<Bundle> {
  const notebook = await db.notebooks.get(notebookId)
  if (!notebook || !isLive(notebook) || notebook.kind) {
    throw new Error('Only a normal notebook can be exported')
  }
  const bundle = emptyBundle('notebook', now)
  bundle.notebooks = [notebook]
  for (const kind of ['journal', 'templates'] as const) {
    if (!options[kind]) continue
    const found = (
      await db.notebooks
        .where('workspaceId')
        .equals(notebook.workspaceId)
        .toArray()
    ).find((n) => isLive(n) && n.kind === kind)
    if (found) bundle.notebooks.push(found)
  }
  const bundleNotebookIds = bundle.notebooks.map((n) => n.id)
  bundle.pages = (
    await db.pages.where('notebookId').anyOf(bundleNotebookIds).toArray()
  ).filter(isLive)
  const pageIds = bundle.pages.map((p) => p.id)
  bundle.blocks = (
    await db.blocks.where('pageId').anyOf(pageIds).toArray()
  ).filter(isLive)
  const blockIds = new Set(bundle.blocks.map((b) => b.id))
  bundle.cards = (
    await db.cards.where('pageId').anyOf(pageIds).toArray()
  ).filter((c) => blockIds.has(c.blockId))
  const cardIds = bundle.cards.map((c) => c.id)
  bundle.reviewLogs = (
    await db.reviewLogs.where('cardId').anyOf(cardIds).toArray()
  ).filter((l) => l.purgedAt === undefined)
  bundle.databases = (
    await db.databases.where('notebookId').equals(notebookId).toArray()
  ).filter(isLive)
  const databaseIds = new Set(bundle.databases.map((d) => d.id))
  const columns = (
    await db.dbColumns
      .where('databaseId')
      .anyOf([...databaseIds])
      .toArray()
  ).filter(isLive)
  bundle.dbColumns = withoutOutsideRelations(columns, databaseIds)
  bundle.dbViews = (
    await db.dbViews
      .where('databaseId')
      .anyOf([...databaseIds])
      .toArray()
  ).filter((v) => isLive(v) && (!v.blockId || blockIds.has(v.blockId)))
  bundle.tags = usedTags(bundle, await tagMap(db))
  return bundle
}

/** The bundle as a file, written row by row so a big notebook never becomes one giant string. */
export function bundleFile(bundle: Bundle): Blob {
  const {
    notebooks,
    pages,
    blocks,
    cards,
    reviewLogs,
    databases,
    dbColumns,
    dbViews,
    tags,
    ...info
  } = bundle
  const tables = {
    notebooks,
    pages,
    blocks,
    cards,
    reviewLogs,
    databases,
    dbColumns,
    dbViews,
    tags,
  }
  const parts: string[] = [JSON.stringify(info).slice(0, -1)]
  for (const [name, rows] of Object.entries(tables)) {
    parts.push(`,${JSON.stringify(name)}:[`)
    rows.forEach((row, i) =>
      parts.push((i > 0 ? ',' : '') + JSON.stringify(row)),
    )
    parts.push(']')
  }
  parts.push('}')
  return new Blob(parts, { type: 'application/json' })
}

/** "Cardiology.learningnotes.json" */
export const bundleFileName = (notebook: Pick<Notebook, 'title'>): string =>
  `${notebook.title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'notebook'}.learningnotes.json`

// ------------------------------------------------------------------ reading

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** What is wrong with a file that cannot be imported. */
export class BundleError extends Error {}

function need(ok: boolean, message: string): asserts ok {
  if (!ok) throw new BundleError(message)
}

/**
 * Checks parsed JSON and returns it as a bundle: the right app and a
 * version we know, every table a list of objects with text ids, no more
 * than a sane number of rows. Throws a `BundleError` otherwise.
 */
export function checkBundle(data: unknown): Bundle {
  need(isObject(data), 'This is not a Learning Notes file.')
  need(data.app === 'learning-notes', 'This is not a Learning Notes file.')
  need(
    typeof data.formatVersion === 'number' &&
      data.formatVersion >= 1 &&
      data.formatVersion <= BUNDLE_VERSION,
    'This file was made by a newer version of the app.',
  )
  need(
    data.kind === 'notebook' || data.kind === 'backup',
    'Unknown kind of file.',
  )
  const bundle = emptyBundle(data.kind, Number(data.exportedAt) || 0)
  let total = 0
  for (const table of TABLES) {
    const rows = data[table]
    if (rows === undefined) continue
    need(Array.isArray(rows), `The file’s “${table}” list is damaged.`)
    total += rows.length
    need(total <= 2_000_000, 'The file is too big to import.')
    for (const row of rows) {
      need(
        isObject(row) && typeof row.id === 'string' && row.id !== '',
        `The file’s “${table}” list is damaged.`,
      )
      if (table === 'tags') {
        need(typeof row.path === 'string', 'The file’s tag list is damaged.')
      }
    }
    ;(bundle as unknown as Record<string, unknown[]>)[table] = rows
  }
  for (const page of bundle.pages) {
    need(typeof page.notebookId === 'string', 'A page in the file is damaged.')
  }
  for (const block of bundle.blocks) {
    need(
      typeof block.pageId === 'string' && isObject(block.content),
      'A note in the file is damaged.',
    )
  }
  return bundle
}

/**
 * Reads a file's text: a notebook file, or a backup file saved by the
 * upgrade screen (which holds raw tables).
 */
export function readAnyFile(text: string): Bundle {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BundleError('This file could not be read (it is not valid JSON).')
  }
  if (isObject(data) && isObject(data.tables) && data.kind === undefined) {
    need(data.app === 'learning-notes', 'This is not a Learning Notes file.')
    need(typeof data.version === 'number', 'This backup file is damaged.')
    const tables: Record<string, unknown[]> = {}
    for (const [name, rows] of Object.entries(data.tables)) {
      need(Array.isArray(rows), 'This backup file is damaged.')
      tables[name] = rows
    }
    const snapshot = {
      app: 'learning-notes',
      dbName: String(data.dbName ?? ''),
      version: data.version,
      createdAt: Number(data.createdAt) || 0,
      tables,
    } as const
    // The same checks as a notebook file, on what the backup holds.
    return checkBundle(bundleFromSnapshot(snapshot))
  }
  return checkBundle(data)
}

/** Parses and checks a file's text. */
export function readBundle(text: string): Bundle {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BundleError('This file could not be read (it is not valid JSON).')
  }
  return checkBundle(data)
}

// ------------------------------------------------------------------- backup

/**
 * A backup (what the upgrade screen saves) as a bundle: its notebooks with
 * their pages, notes, cards and databases, the journal days and templates,
 * and loose databases with their rows.
 */
export function bundleFromSnapshot(snapshot: BackupSnapshot): Bundle {
  const rows = <T>(name: string): T[] => (snapshot.tables[name] ?? []) as T[]
  const live = <T extends { deletedAt?: number | null }>(list: T[]) =>
    list.filter((r) => r.deletedAt === null || r.deletedAt === undefined)
  const bundle = emptyBundle('backup', snapshot.createdAt)
  const allNotebooks = live(rows<Notebook>('notebooks'))
  // Normal notebooks, plus the journal days and the templates.
  bundle.notebooks = allNotebooks.filter(
    (n) => !n.kind || n.kind === 'journal' || n.kind === 'templates',
  )
  const notebookIds = new Set(bundle.notebooks.map((n) => n.id))
  const databases = live(rows<Database>('databases'))
  bundle.databases = databases.filter(
    (d) => d.notebookId === null || notebookIds.has(d.notebookId),
  )
  const databaseIds = new Set(bundle.databases.map((d) => d.id))
  const pages = live(rows<Page>('pages'))
  bundle.pages = pages.filter(
    (p) =>
      notebookIds.has(p.notebookId) ||
      (p.databaseId !== undefined && databaseIds.has(p.databaseId)),
  )
  const pageIds = new Set(bundle.pages.map((p) => p.id))
  bundle.blocks = live(rows<Block>('blocks')).filter((b) =>
    pageIds.has(b.pageId),
  )
  const blockIds = new Set(bundle.blocks.map((b) => b.id))
  bundle.cards = rows<Card>('cards').filter((c) => blockIds.has(c.blockId))
  const cardIds = new Set(bundle.cards.map((c) => c.id))
  bundle.reviewLogs = rows<ReviewLog>('reviewLogs').filter(
    (l) => cardIds.has(l.cardId) && l.purgedAt === undefined,
  )
  bundle.dbColumns = withoutOutsideRelations(
    live(rows<DbColumn>('dbColumns')).filter((c) =>
      databaseIds.has(c.databaseId),
    ),
    databaseIds,
  )
  bundle.dbViews = live(rows<DbView>('dbViews')).filter(
    (v) =>
      databaseIds.has(v.databaseId) && (!v.blockId || blockIds.has(v.blockId)),
  )
  const tags = new Map(live(rows<Tag>('tags')).map((t) => [t.id, t]))
  bundle.tags = usedTags(bundle, tags)
  return bundle
}
