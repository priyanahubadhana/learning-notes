import { t } from '../i18n/t'
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
import { toBase64 } from '../core/base64'
import { imageIdsIn, isImageType } from '../images/imageRef'
import { tagMap, tagPathIn } from '../tags/tagService'
import { joinTagPath } from '../tags/tagNames'
import type { BackupSnapshot } from '../core/upgradeBackup'
import { checkedRow } from './checkRows'

/**
 * The file format for sharing notebooks (and restoring backups): plain
 * JSON with the notebooks, pages, blocks, cards (with schedules), review
 * history, databases, columns and views, and the names of the tags used.
 * Importing always makes new copies (see importBundle.ts).
 */

export const BUNDLE_VERSION = 1
/** Largest file read (bytes). */
export const MAX_BUNDLE_BYTES = 200_000_000

/** A saved file this big could not be opened again here. */
export const tooBigToRestore = (bytes: number): boolean =>
  bytes > MAX_BUNDLE_BYTES

export interface BundleTag {
  id: string
  /** Full name with levels, e.g. "medicine/cardiology". */
  path: string
  /** The tag's colour (one of the app's tag colours), if it has one. */
  color?: string
}

/** A picture in a file: its bytes as base64 text. */
export interface BundleImage {
  id: string
  name: string
  type: string
  width: number
  height: number
  data: string
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
  images: BundleImage[]
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
  'images',
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
  images: [],
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

/**
 * The pictures a bundle's notes and cells use, as base64 text. In the
 * database they are bytes; in an upgrade backup file already base64 text.
 */
function bundleImages(
  bundle: Bundle,
  stored: readonly {
    id: string
    name: string
    type: string
    width: number
    height: number
    data: unknown
    deletedAt?: number | null
  }[],
): BundleImage[] {
  const wanted = imageIdsIn([bundle.pages, bundle.blocks])
  return stored
    .filter(
      (img) =>
        wanted.has(img.id) &&
        (img.data instanceof ArrayBuffer || typeof img.data === 'string') &&
        (img.deletedAt === null || img.deletedAt === undefined),
    )
    .map((img) => ({
      id: img.id,
      name: img.name,
      type: img.type,
      width: img.width,
      height: img.height,
      data:
        typeof img.data === 'string'
          ? img.data
          : toBase64(img.data as ArrayBuffer),
    }))
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
  // Only the pictures used, so one notebook never loads every picture.
  const used = [...imageIdsIn([bundle.pages, bundle.blocks])]
  bundle.images = bundleImages(
    bundle,
    (await db.images.bulkGet(used)).filter((image) => image !== undefined),
  )
  return bundle
}

/**
 * The whole workspace as one file: every notebook with its pages, notes,
 * cards, review history, databases and tags, plus the journal days, the
 * templates and databases that live outside notebooks.
 */
export async function exportWorkspaceBundle(
  db: LearningNotesDB,
  now: number = Date.now(),
): Promise<Bundle> {
  const tables: Record<string, unknown[]> = {}
  for (const name of [...TABLES]) tables[name] = await db.table(name).toArray()
  return bundleFromSnapshot({
    app: 'learning-notes',
    dbName: db.name,
    version: db.verno,
    createdAt: now,
    tables,
  })
}

/** "Learning Notes 2026-10-28.learningnotes.json" */
export const workspaceFileName = (now: number = Date.now()): string =>
  `Learning Notes ${new Date(now).toISOString().slice(0, 10)}.learningnotes.json`

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
    images,
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
    images,
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

function need(ok: boolean, message: string | (() => string)): asserts ok {
  if (!ok) {
    throw new BundleError(typeof message === 'string' ? message : message())
  }
}

/**
 * Checks parsed JSON and returns it as a bundle: the right app and a
 * version we know, every table a list of objects with unique text ids, every
 * row's fields of the right kind (see checkRows.ts), no more than a sane
 * number of rows. Rows are rebuilt from known fields only. Throws a
 * `BundleError` otherwise. Nothing is written, so a refused file changes
 * nothing.
 */
export function checkBundle(data: unknown): Bundle {
  need(isObject(data), t('err.notOurFile'))
  need(data.app === 'learning-notes', t('err.notOurFile'))
  need(
    typeof data.formatVersion === 'number' &&
      data.formatVersion >= 1 &&
      data.formatVersion <= BUNDLE_VERSION,
    t('err.newerFile'),
  )
  need(data.kind === 'notebook' || data.kind === 'backup', t('err.unknownKind'))
  const bundle = emptyBundle(data.kind, Number(data.exportedAt) || 0)
  let total = 0
  for (const table of TABLES) {
    const rows = data[table]
    if (rows === undefined) continue
    need(Array.isArray(rows), () => t('err.listDamaged', { table }))
    total += rows.length
    need(total <= 2_000_000, t('err.tooBigFile'))
    const damaged = () =>
      table === 'tags'
        ? t('err.tagsDamaged')
        : table === 'pages'
          ? t('err.pageDamaged')
          : table === 'blocks'
            ? t('err.noteDamaged')
            : table === 'images'
              ? t('err.imageDamaged')
              : t('err.listDamaged', { table })
    const seen = new Set<string>()
    const clean = rows.map((row: unknown) => {
      need(isObject(row) && typeof row.id === 'string' && row.id !== '', () =>
        t('err.listDamaged', { table }),
      )
      need(!seen.has(row.id), () => t('err.listDamaged', { table }))
      seen.add(row.id)
      const checked = checkedRow(table, row)
      need(checked !== null, damaged)
      return checked
    })
    ;(bundle as unknown as Record<string, unknown[]>)[table] = clean
  }
  for (const image of bundle.images) {
    need(
      isImageType(String(image.type)) &&
        typeof image.data === 'string' &&
        image.data.length < 60_000_000 &&
        /^[A-Za-z0-9+/]*={0,2}$/.test(image.data),
      () => t('err.imageDamaged'),
    )
    image.name = String(image.name ?? 'picture').slice(0, 200)
    image.width = Number(image.width) || 0
    image.height = Number(image.height) || 0
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
    throw new BundleError(t('err.notJson'))
  }
  if (isObject(data) && isObject(data.tables) && data.kind === undefined) {
    need(data.app === 'learning-notes', t('err.notOurFile'))
    need(typeof data.version === 'number', t('err.backupDamaged'))
    const tables: Record<string, unknown[]> = {}
    for (const [name, rows] of Object.entries(data.tables)) {
      need(Array.isArray(rows), t('err.backupDamaged'))
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
    throw new BundleError(t('err.notJson'))
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
  bundle.images = bundleImages(bundle, rows('images'))
  return bundle
}
