import type { LearningNotesDB } from '../core/db'
import { pageDeleteBlocked } from '../core/editLock'
import { stableId } from '../core/ids'
import { isLive } from '../core/records'
import type { Page } from '../core/types'
import { t } from '../i18n/t'
import { findNotebookOfKind } from '../notebooks/notebookService'
import { listPages, movePage } from '../pages/pageService'
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
 */

export const JOURNAL_REPAIR_BACKUP_KEY = 'learning-notes:journalRepair:backup'
/** Groups this device must not join again (the user tapped Undo). */
export const JOURNAL_REPAIR_DECLINED_KEY =
  'learning-notes:journalRepair:declined'

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

const groupKey = (g: MonthGroup) => [g.keepId, ...g.duplicateIds].join('|')

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
    groups.push({
      month,
      keepId: keep.id,
      duplicateIds: list
        .filter((p) => p.id !== keep.id)
        .map((p) => p.id)
        .sort(),
    })
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

/** Does a month page hold anything of its own (lines, drawings, files)? */
async function hasOwnContent(db: LearningNotesDB, pageId: string) {
  for (const table of [
    db.blocks,
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

/** Puts the saved pages back: duplicates out of Trash, days where they were. */
async function restoreGroups(db: LearningNotesDB, groups: BackupGroup[]) {
  for (const g of groups)
    for (const id of g.duplicateIds) {
      const page = await db.pages.get(id)
      if (page && page.deletedAt !== null)
        await import('../trash/trashService').then((m) => m.restorePage(db, id))
    }
  const now = Date.now()
  await db.transaction('rw', db.pages, async () => {
    for (const saved of groups.flatMap((g) => g.pages)) {
      const page = await db.pages.get(saved.id)
      if (!page) continue
      if (page.parentId !== saved.parentId || page.order !== saved.order)
        await db.pages.update(saved.id, {
          parentId: saved.parentId,
          order: saved.order,
          updatedAt: now,
        })
    }
  })
}

/** Restores the last saved backup (Settings or support can call this). */
export async function restoreJournalBackup(
  db: LearningNotesDB,
  storage: Storage | undefined = defaultStorage(),
): Promise<boolean> {
  const backup = readJson<Backup>(storage, JOURNAL_REPAIR_BACKUP_KEY)
  if (!backup) return false
  await restoreGroups(db, backup.groups)
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
  const declined = new Set(
    readJson<string[]>(storage, JOURNAL_REPAIR_DECLINED_KEY) ?? [],
  )
  const groups: MonthGroup[] = []
  for (const g of await findDuplicateMonths(db, workspaceId)) {
    if (declined.has(groupKey(g))) continue
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
    await restoreGroups(db, saved)
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
    undo: async () => {
      await restoreGroups(db, saved)
      try {
        storage.setItem(
          JOURNAL_REPAIR_DECLINED_KEY,
          JSON.stringify([...declined, ...groups.map(groupKey)]),
        )
      } catch {
        // Storage blocked: the next start may offer the join again.
      }
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
