import type { LearningNotesDB } from '../core/db'
import { pageDeleteBlocked } from '../core/editLock'
import { stableId } from '../core/ids'
import { isLive } from '../core/records'
import type { Block, Page } from '../core/types'
import { t } from '../i18n/t'
import { findNotebookOfKind } from '../notebooks/notebookService'
import {
  listPages,
  markMonthJoinDeclined,
  movePage,
} from '../pages/pageService'
import { trashPageWithUndo } from '../pages/pageTrash'
import { monthLabel } from './dates'

/**
 * Journal repair (task H, switch journal.monthRepair). Two month pages of the
 * same month can end up in the one Journal: sync's merge of two Journal
 * notebooks (made on two devices before fixed ids), or a month page brought
 * back from Trash after a new one was made. This joins them, on the device,
 * through the app's own page actions:
 *
 * 1. a backup of every page it will touch is saved first (restorable, and
 *    can be saved as a file);
 * 2. every day moves into the kept month page (movePage);
 * 3. the emptied duplicate goes to Trash (trashPageWithUndo, never deleted);
 * 4. pages, lines and attachments are counted before and after; any
 *    difference puts everything back and stops.
 *
 * The kept page is chosen the same way on every device (the fixed-id one,
 * else the oldest), so two devices that repair before they sync make the same
 * change, and a device that syncs after the other one finds nothing to do.
 * Undo marks the duplicates (monthJoinDeclined, on the page, so it syncs):
 * no device joins them again.
 */

export const JOURNAL_REPAIR_BACKUP_KEY = 'learning-notes:journalRepair:backup'

export interface MonthGroup {
  month: string
  keepId: string
  duplicateIds: string[]
}

interface BackupGroup extends MonthGroup {
  /** The month pages and their direct sub-pages, as they were. */
  pages: Page[]
}

interface Backup {
  version: 1
  at: number
  groups: BackupGroup[]
}

export type RepairOutcome =
  | { kind: 'none' }
  | { kind: 'restored'; reason: string }
  | {
      kind: 'joined'
      months: { month: string; count: number }[]
      undo: () => Promise<void>
    }

export interface JournalCounts {
  pages: number
  lines: number
  attachments: number
}

/** Block types that hold a file, picture or recording. */
const ATTACHMENT_BLOCKS = new Set([
  'image',
  'file',
  'pdf',
  'audio',
  'video',
  'recording',
])

/** Tables whose rows belong to a page (all have `pageId` and soft delete). */
type PageRows =
  | LearningNotesDB['blocks']
  | LearningNotesDB['inkChunks']
  | LearningNotesDB['recordings']
  | LearningNotesDB['bookFiles']
  | LearningNotesDB['annotations']
const asRows = (table: PageRows) =>
  table as unknown as LearningNotesDB['blocks']

const defaultStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function readJson<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/** Month pages of the same month in the Journal (top level, live). */
export async function findDuplicateMonths(
  db: LearningNotesDB,
  workspaceId: string,
): Promise<MonthGroup[]> {
  const journal = await findNotebookOfKind(db, workspaceId, 'journal')
  if (!journal) return []
  const months = (await listPages(db, journal.id)).filter(
    (p) => p.journalMonth && p.parentId === null,
  )
  const byMonth = new Map<string, Page[]>()
  for (const p of months)
    byMonth.set(p.journalMonth!, [...(byMonth.get(p.journalMonth!) ?? []), p])
  const groups: MonthGroup[] = []
  for (const [month, list] of byMonth) {
    if (list.length < 2) continue
    const fixed = stableId(`${journal.id}:month:${month}`)
    const oldest = [...list].sort(
      (a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id),
    )
    const keep = list.find((p) => p.id === fixed) ?? oldest[0]
    // A page the user kept apart (Undo, on any device) is never joined.
    const duplicateIds = list
      .filter((p) => p.id !== keep.id && !p.monthJoinDeclined)
      .map((p) => p.id)
      .sort()
    if (duplicateIds.length > 0)
      groups.push({ month, keepId: keep.id, duplicateIds })
  }
  return groups.sort((a, b) => a.month.localeCompare(b.month))
}

/** Live pages of a notebook (leaving out `skip`), their lines and attachments. */
export async function journalCounts(
  db: LearningNotesDB,
  notebookId: string,
  skip: readonly string[] = [],
): Promise<JournalCounts> {
  const ids = (await db.pages.where('notebookId').equals(notebookId).toArray())
    .filter((p) => isLive(p) && !skip.includes(p.id))
    .map((p) => p.id)
  const live = async (table: PageRows) =>
    (await asRows(table).where('pageId').anyOf(ids).toArray()).filter(isLive)
  const blocks = await live(db.blocks)
  const files =
    (await live(db.inkChunks)).length +
    (await live(db.recordings)).length +
    (await live(db.bookFiles)).length +
    (await live(db.annotations)).length
  return {
    pages: ids.length,
    lines: blocks.length,
    attachments:
      files + blocks.filter((b) => ATTACHMENT_BLOCKS.has(b.type)).length,
  }
}

/** An empty paragraph (no text, or spaces only) is not content. */
function isEmptyLine(block: Block): boolean {
  if (block.type !== 'paragraph') return false
  const runs = (block.content as { text?: unknown } | null)?.text
  return (
    !Array.isArray(runs) ||
    !runs.some(
      (r) =>
        typeof (r as { text?: unknown })?.text === 'string' &&
        (r as { text: string }).text.trim() !== '',
    )
  )
}

/** Does a month page hold anything of its own (lines, drawings, files)? */
async function hasOwnContent(db: LearningNotesDB, pageId: string) {
  const lines = await db.blocks.where('pageId').equals(pageId).toArray()
  if (lines.some((b) => isLive(b) && !isEmptyLine(b))) return true
  for (const table of [
    db.inkChunks,
    db.recordings,
    db.bookFiles,
    db.annotations,
  ] as const) {
    const rows = await asRows(table).where('pageId').equals(pageId).toArray()
    if (rows.some(isLive)) return true
  }
  return false
}

type RestorePage = (db: LearningNotesDB, id: string) => Promise<void>
const loadRestorePage = async (): Promise<RestorePage> =>
  (await import('../trash/trashService')).restorePage

/**
 * Puts the saved pages back with the app's own actions: duplicates out of
 * Trash (restorePage), then each day to its saved parent and place
 * (movePage), in the saved order.
 */
async function restoreGroups(
  db: LearningNotesDB,
  groups: BackupGroup[],
  restorePage: RestorePage,
) {
  for (const g of groups)
    for (const id of g.duplicateIds) {
      const page = await db.pages.get(id)
      if (page && page.deletedAt !== null) await restorePage(db, id)
    }
  for (const g of groups) {
    const parents = new Map<string, Page[]>()
    for (const p of g.pages)
      if (p.parentId !== null)
        parents.set(p.parentId, [...(parents.get(p.parentId) ?? []), p])
    for (const [parentId, list] of parents) {
      const sorted = [...list].sort((a, b) =>
        a.order < b.order ? -1 : a.order > b.order ? 1 : 0,
      )
      for (const [index, saved] of sorted.entries()) {
        const page = await db.pages.get(saved.id)
        if (!page || !isLive(page) || page.parentId === parentId) continue
        await movePage(db, saved.id, parentId, index)
      }
    }
  }
}

/** Restores the last saved backup (Settings or support can call this). */
export async function restoreJournalBackup(
  db: LearningNotesDB,
  storage: Storage | undefined = defaultStorage(),
): Promise<boolean> {
  const backup = readJson<Backup>(storage, JOURNAL_REPAIR_BACKUP_KEY)
  if (!backup) return false
  await restoreGroups(db, backup.groups, await loadRestorePage())
  return true
}

/** The last backup as a file the user can save (null when there is none). */
export function journalRepairBackupFile(
  storage: Storage | undefined = defaultStorage(),
): File | null {
  const raw = (() => {
    try {
      return storage?.getItem(JOURNAL_REPAIR_BACKUP_KEY) ?? null
    } catch {
      return null
    }
  })()
  if (!raw) return null
  const day = new Date().toISOString().slice(0, 10)
  return new File([raw], `journal-repair-backup-${day}.json`, {
    type: 'application/json',
  })
}

/**
 * Joins month pages of the same month into one. Safe to run at every start:
 * it does nothing when there is nothing to join.
 */
export async function repairJournalMonths(
  db: LearningNotesDB,
  workspaceId: string,
  options: {
    storage?: Storage
    /** Tests: runs between the moves and the Trash step. */
    afterMoves?: () => Promise<void>
  } = {},
): Promise<RepairOutcome> {
  const storage = options.storage ?? defaultStorage()
  const journal = await findNotebookOfKind(db, workspaceId, 'journal')
  if (!journal) return { kind: 'none' }
  const groups: MonthGroup[] = []
  for (const g of await findDuplicateMonths(db, workspaceId)) {
    let safe = true
    for (const id of g.duplicateIds)
      if ((await hasOwnContent(db, id)) || (await pageDeleteBlocked(db, id)))
        safe = false
    if (safe) groups.push(g)
  }
  if (groups.length === 0) return { kind: 'none' }

  // 1. Backup first; no backup, no change.
  const all = await listPages(db, journal.id)
  const saved: BackupGroup[] = groups.map((g) => {
    const ids = new Set([g.keepId, ...g.duplicateIds])
    return {
      ...g,
      pages: all.filter(
        (p) => ids.has(p.id) || (p.parentId !== null && ids.has(p.parentId)),
      ),
    }
  })
  try {
    if (!storage) return { kind: 'none' }
    const backup: Backup = { version: 1, at: Date.now(), groups: saved }
    storage.setItem(JOURNAL_REPAIR_BACKUP_KEY, JSON.stringify(backup))
  } catch {
    return { kind: 'none' }
  }

  const dupIds = groups.flatMap((g) => g.duplicateIds)
  const before = await journalCounts(db, journal.id, dupIds)
  const putBack = async (reason: string): Promise<RepairOutcome> => {
    await restoreGroups(db, saved, await loadRestorePage())
    return { kind: 'restored', reason }
  }
  try {
    // 2. Every day into the kept month, in date order, after its own days.
    for (const g of saved) {
      const moving = g.pages
        .filter(
          (p) => p.parentId !== null && g.duplicateIds.includes(p.parentId),
        )
        .sort((a, b) =>
          (a.journalDate ?? a.title).localeCompare(b.journalDate ?? b.title),
        )
      for (const p of moving)
        await movePage(db, p.id, g.keepId, Number.MAX_SAFE_INTEGER)
    }
    await options.afterMoves?.()
    // A day that arrived (by sync) under a duplicate meanwhile: stop.
    const left = (
      await db.pages.where('notebookId').equals(journal.id).toArray()
    ).filter((p) => isLive(p) && p.parentId && dupIds.includes(p.parentId))
    if (left.length > 0) return putBack('new sub-page')
    // 3. The emptied duplicates to Trash (the app's own Trash action).
    for (const id of dupIds) {
      const page = await db.pages.get(id)
      if (page && isLive(page)) await trashPageWithUndo(db, page, () => {})
    }
    // 4. Nothing lost?
    const after = await journalCounts(db, journal.id, dupIds)
    const trashed = await Promise.all(dupIds.map((id) => db.pages.get(id)))
    if (trashed.some((p) => !p || isLive(p))) return putBack('not in Trash')
    if (
      after.pages !== before.pages ||
      after.lines !== before.lines ||
      after.attachments !== before.attachments
    )
      return putBack('counts differ')
  } catch (error) {
    return putBack(error instanceof Error ? error.message : 'failed')
  }

  return {
    kind: 'joined',
    months: groups.map((g) => ({
      month: g.month,
      count: 1 + g.duplicateIds.length,
    })),
    // One transaction: the pages come back AND are marked, or nothing
    // changes. Done in steps, the app closing (or reloading) between the
    // steps left the duplicate back but not marked, and the next start
    // joined it again.
    undo: async () => {
      // Loaded first: inside the transaction only database work is awaited.
      const restorePage = await loadRestorePage()
      await db.transaction(
        'rw',
        [
          db.notebooks,
          db.pages,
          db.blocks,
          db.databases,
          db.dbColumns,
          db.dbViews,
        ],
        async () => {
          await restoreGroups(db, saved, restorePage)
          await markMonthJoinDeclined(db, dupIds)
        },
      )
    },
  }
}

/** The one quiet toast after a join. */
export function repairMessage(
  outcome: Extract<RepairOutcome, { kind: 'joined' }>,
): string {
  if (outcome.months.length > 1)
    return t('journal.tidiedMonths', { count: outcome.months.length })
  const { month, count } = outcome.months[0]
  return count === 2
    ? t('journal.tidiedTwo', { month: monthLabel(month) })
    : t('journal.tidiedMany', { month: monthLabel(month), count })
}
