import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import type { Database, DbColumn, JsonValue } from '../core/types'
import {
  addColumn,
  addRows,
  createDatabase,
  listColumns,
  listRows,
  setCells,
  trashRowIds,
  restoreTrashedRows,
  type TrashedRows,
} from '../databases/databaseService'
import { t, type MessageKey } from '../i18n/t'
import {
  INPUT_KINDS,
  LIB_KEYS,
  OUTPUT_KINDS,
  PURPOSES,
  itemFromRow,
  itemToCells,
  withRating,
  withVersion,
  type LibKey,
  type PromptItem,
} from './promptModel'

/**
 * The prompt library lives in one built-in database (`kind: 'promptLibrary'`).
 * This file finds or makes it, seeds the shipped prompts once, and reads and
 * writes items. Everything else (views, search, sync, backup) is the database
 * engine's job.
 */

export interface Library {
  database: Database
  /** Column by key. */
  cols: Record<LibKey, DbColumn>
}

interface Spec {
  key: LibKey
  label: MessageKey
  type: 'text' | 'choice' | 'checkbox' | 'number'
  options?: readonly (readonly [string, MessageKey])[]
}

const opts = (prefix: string, ids: readonly string[]) =>
  ids.map((id) => [id, `${prefix}${id}` as MessageKey] as const)

const SPECS: readonly Spec[] = [
  {
    key: 'kind',
    label: 'prompts.col.kind',
    type: 'choice',
    options: opts('prompts.kind.', ['prompt', 'skill']),
  },
  {
    key: 'purpose',
    label: 'prompts.col.purpose',
    type: 'choice',
    options: opts('prompts.purpose.', PURPOSES),
  },
  {
    key: 'input',
    label: 'prompts.col.input',
    type: 'choice',
    options: opts('prompts.input.', INPUT_KINDS),
  },
  {
    key: 'output',
    label: 'prompts.col.output',
    type: 'choice',
    options: opts('prompts.output.', OUTPUT_KINDS),
  },
  { key: 'subjects', label: 'prompts.col.subjects', type: 'text' },
  { key: 'text', label: 'prompts.col.text', type: 'text' },
  {
    key: 'provider',
    label: 'prompts.col.provider',
    type: 'choice',
    options: [
      ['anthropic', 'ai.provider.anthropic'],
      ['openai', 'ai.provider.openai'],
      ['gemini', 'ai.provider.gemini'],
    ],
  },
  { key: 'model', label: 'prompts.col.model', type: 'text' },
  { key: 'usePreferred', label: 'prompts.col.usePreferred', type: 'checkbox' },
  { key: 'stars', label: 'prompts.col.stars', type: 'number' },
  { key: 'versions', label: 'prompts.col.versions', type: 'text' },
  { key: 'ratings', label: 'prompts.col.ratings', type: 'text' },
  { key: 'parts', label: 'prompts.col.parts', type: 'text' },
  { key: 'starterId', label: 'prompts.col.starterId', type: 'text' },
  { key: 'licence', label: 'prompts.col.licence', type: 'text' },
]

const COLORS = ['#2f6feb', '#2e9e6b', '#d9822b', '#8a5cf6'] as const

const keyOf = (c: DbColumn): LibKey | undefined => {
  const k = c.config.key
  return typeof k === 'string' && (LIB_KEYS as readonly string[]).includes(k)
    ? (k as LibKey)
    : undefined
}

async function columnsByKey(
  db: LearningNotesDB,
  databaseId: string,
): Promise<Record<LibKey, DbColumn> | undefined> {
  const out: Partial<Record<LibKey, DbColumn>> = {}
  for (const c of await listColumns(db, databaseId)) {
    const k = keyOf(c)
    if (k) out[k] = c
  }
  return LIB_KEYS.every((k) => out[k])
    ? (out as Record<LibKey, DbColumn>)
    : undefined
}

/** An older library lacks Purpose options added later (Import): add them with their fixed ids. */
async function ensurePurposeOptions(
  db: LearningNotesDB,
  column: DbColumn,
): Promise<void> {
  const have = (column.config.options ?? []) as unknown as { id: string }[]
  const missing = PURPOSES.filter((p) => !have.some((o) => o.id === p))
  if (missing.length === 0) return
  const added = missing.map((id, i) => ({
    id,
    name: t(`prompts.purpose.${id}` as MessageKey),
    color: COLORS[(have.length + i) % COLORS.length],
  }))
  await db.dbColumns.update(column.id, {
    config: {
      ...column.config,
      options: [...have, ...added] as unknown as JsonValue,
    },
    updatedAt: Date.now(),
  })
}

let making: Promise<Library> | undefined

/** The library database of a workspace: found, or made with its columns. */
export function ensureLibrary(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<Library> {
  making ??= makeLibrary(db, workspaceId).finally(() => {
    making = undefined
  })
  return making
}

async function makeLibrary(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<Library> {
  const all = await db.databases
    .where('workspaceId')
    .equals(workspaceId)
    .toArray()
  const found = all
    .filter((d) => isLive(d) && d.kind === 'promptLibrary')
    .sort((a, b) => a.createdAt - b.createdAt)[0]
  if (found) {
    const cols = await columnsByKey(db, found.id)
    if (cols) {
      await ensurePurposeOptions(db, cols.purpose)
      return { database: found, cols }
    }
  }
  const database =
    found ??
    (await createDatabase(db, workspaceId, null, t('prompts.libraryTitle')))
  if (!found) {
    await db.databases.update(database.id, {
      kind: 'promptLibrary',
      titleName: t('prompts.col.name'),
    })
  }
  for (const spec of SPECS) {
    await addColumn(db, database.id, {
      name: t(spec.label),
      type: spec.type,
      config: {
        key: spec.key,
        ...(spec.type === 'number' && { format: 'stars', max: 5 }),
        ...(spec.options && {
          options: spec.options.map(([id, label], i) => ({
            id,
            name: t(label),
            color: COLORS[i % COLORS.length],
          })) as unknown as JsonValue,
        }),
      },
    })
  }
  const cols = await columnsByKey(db, database.id)
  if (!cols) throw new Error('Prompt library columns missing')
  return { database: { ...database, kind: 'promptLibrary' }, cols }
}

function cellValues(lib: Library, item: PromptItem): Record<string, JsonValue> {
  const cells = itemToCells(item)
  const out: Record<string, JsonValue> = {}
  for (const key of LIB_KEYS) {
    const v = cells[key]
    const col = lib.cols[key]
    // Empty text and empty choices clear the cell.
    out[col.id] = (v === '' || v === undefined ? null : v) as JsonValue
  }
  return out
}

/** All live prompts and skills (a starter that appears twice shows once). */
export async function listPrompts(
  db: LearningNotesDB,
  lib: Library,
): Promise<PromptItem[]> {
  const rows = await listRows(db, lib.database.id)
  const seen = new Set<string>()
  const items: PromptItem[] = []
  for (const row of rows) {
    const item = itemFromRow(row, (key) => row.values?.[lib.cols[key].id])
    if (item.starterId) {
      if (seen.has(item.starterId)) continue
      seen.add(item.starterId)
    }
    items.push(item)
  }
  return items
}

/** Saves a prompt: a new row, or the changes of an existing one (the old text becomes a version). */
export async function savePrompt(
  db: LearningNotesDB,
  lib: Library,
  item: PromptItem,
  old?: PromptItem,
): Promise<PromptItem> {
  const next = old ? withVersion(old, item, Date.now()) : item
  const name = next.name.trim().slice(0, 200)
  if (!name) throw new Error('A prompt needs a name')
  const values = cellValues(lib, next)
  if (next.id) {
    await setCells(db, next.id, { title: name, ...values })
    return { ...next, name }
  }
  const [row] = await addRows(db, lib.database.id, [{ title: name, values }])
  return { ...next, id: row.id, name }
}

/** Rates the current version of a prompt (1-5 stars). */
export async function ratePrompt(
  db: LearningNotesDB,
  lib: Library,
  item: PromptItem,
  stars: number,
): Promise<PromptItem> {
  const next = withRating(item, stars, Date.now())
  const cells = cellValues(lib, next)
  const keep = [lib.cols.ratings.id, lib.cols.stars.id]
  await setCells(
    db,
    next.id,
    Object.fromEntries(keep.map((id) => [id, cells[id]])),
  )
  return next
}

/** Moves a prompt to Trash. The result is for Undo. */
export const trashPrompt = (
  db: LearningNotesDB,
  id: string,
): Promise<TrashedRows> => trashRowIds(db, [id])
export const restorePrompt = restoreTrashedRows

/**
 * Adds the shipped prompts that are not in the library yet (by starter id).
 * Edited or deleted-and-kept ones are never touched again: the ids already
 * seen on this device are remembered in `seenIds`.
 */
export async function seedLibrary(
  db: LearningNotesDB,
  lib: Library,
  seenIds: ReadonlySet<string>,
): Promise<string[]> {
  const { SEEDS } = await import('./seedPrompts')
  const have = new Set((await listPrompts(db, lib)).map((i) => i.starterId))
  const fresh = SEEDS.filter(
    (s) => !have.has(s.starterId) && !seenIds.has(s.starterId),
  )
  if (fresh.length === 0) return []
  await addRows(
    db,
    lib.database.id,
    fresh.map((s) => ({ title: s.name, values: cellValues(lib, s) })),
  )
  return fresh.map((s) => s.starterId)
}
