import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { stableId } from '../core/ids'
import { isLive } from '../core/records'
import { createTestDb } from '../core/testing'
import type { Page } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import {
  createNotebook,
  findNotebookOfKind,
} from '../notebooks/notebookService'
import { createPage, deletePage, listPages } from '../pages/pageService'
import { bundleFile, exportNotebookBundle, readBundle } from '../share/bundle'
import { importBundle } from '../share/importBundle'
import { dedupeWorkspaces } from '../sync/syncService'
import { restorePage } from '../trash/trashService'
import {
  JOURNAL_REPAIR_BACKUP_KEY,
  findDuplicateMonths,
  journalCounts,
  journalRepairBackupFile,
  repairJournalMonths,
  repairMessage,
  restoreJournalBackup,
} from './journalRepair'
import { openJournalDay } from './journalService'

let db: LearningNotesDB
let ws: string
const NOV_3 = new Date(2026, 10, 3)
const NOV_9 = new Date(2026, 10, 9)
const NOV_14 = new Date(2026, 10, 14)

/** A small in-memory Storage (each test its own). */
function memoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  }
}
let storage: Storage

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
  storage = memoryStorage()
})

afterEach(async () => {
  await db.delete()
})

const journalId = async (d = db) =>
  (await findNotebookOfKind(d, ws, 'journal'))!.id

const novMonths = async (d = db) =>
  (await listPages(d, await journalId(d))).filter(
    (p) => p.journalMonth === '2026-11' && p.parentId === null,
  )

/**
 * Where every page of a notebook sits: parent, place among its siblings and
 * live or not (Undo uses movePage, so the order keys themselves are new).
 */
async function layout(d: LearningNotesDB, notebookId: string) {
  const pages = await d.pages.where('notebookId').equals(notebookId).toArray()
  const place = (p: Page) =>
    pages
      .filter((x) => x.parentId === p.parentId && isLive(x))
      .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
      .findIndex((x) => x.id === p.id)
  return pages
    .map((p) => [p.id, p.parentId, isLive(p) ? place(p) : -1, isLive(p)])
    .sort()
}

/** Sync's rule for one record: the newer save wins. */
async function syncPages(from: LearningNotesDB, to: LearningNotesDB) {
  for (const p of await from.pages.toArray()) {
    const there = await to.pages.get(p.id)
    if (!there || there.updatedAt <= p.updatedAt) await to.pages.put(p)
  }
}

/** A second device holding the same records as `db`. */
async function copyDevice(): Promise<LearningNotesDB> {
  const b = createTestDb()
  for (const table of ['workspaces', 'notebooks', 'pages', 'blocks'] as const)
    await (b[table] as unknown as LearningNotesDB['pages']).bulkPut(
      (await (
        db[table] as unknown as LearningNotesDB['pages']
      ).toArray()) as never,
    )
  return b
}

/**
 * The owner's case: two "November 2026" month pages in the one Journal, each
 * with its own days (made the way sync's notebook merge makes it).
 */
async function twoNovembers(): Promise<{ keep: Page; dup: Page }> {
  const { page: day3 } = await openJournalDay(db, ws, NOV_3)
  const journal = await journalId()
  const keep = (await db.pages.get(day3.parentId!))!
  // A second month page with a random id (as from another device's Journal).
  const dup = await createPage(db, journal, null, 'November 2026')
  await db.pages.update(dup.id, {
    journalMonth: '2026-11',
    createdAt: keep.createdAt + 1000,
  })
  for (const [date, title] of [
    ['2026-11-09', 'Mon 9 Nov'],
    ['2026-11-14', 'Sat 14 Nov'],
  ] as const) {
    const day = await createPage(db, journal, dup.id, title)
    await db.pages.update(day.id, { journalDate: date })
    await createBlock(db, {
      pageId: day.id,
      type: 'paragraph',
      content: { text: [{ type: 'text', text: `note ${date}`, styles: {} }] },
    })
  }
  return { keep, dup: (await db.pages.get(dup.id))! }
}

describe('cause: where a second month page comes from', () => {
  it('import keeps the Journal to one month page (the imported days are a plain copy notebook)', async () => {
    await openJournalDay(db, ws, NOV_3)
    const nb = await createNotebook(db, ws, 'Notes')
    const bundle = readBundle(
      await bundleFile(
        await exportNotebookBundle(db, nb.id, { journal: true }),
      ).text(),
    )
    expect(bundle.pages.some((p) => p.journalMonth === '2026-11')).toBe(true)
    await importBundle(db, ws, bundle)
    await openJournalDay(db, ws, NOV_9)
    // Brief's theory not confirmed: the Journal itself still has one month.
    expect(await novMonths()).toHaveLength(1)
  })

  it('sync merging two Journal notebooks leaves two month pages of the same month', async () => {
    await openJournalDay(db, ws, NOV_3)
    // Another device's Journal (made before fixed ids, so its id differs).
    const now = Date.now()
    // Synced in: a journal notebook of the same kind with another id.
    await db.notebooks.add({
      id: 'other-journal',
      workspaceId: ws,
      title: 'Journal',
      order: 'z',
      kind: 'journal',
      createdAt: now + 5000,
      updatedAt: now + 5000,
      deletedAt: null,
    } as never)
    const month = await createPage(db, 'other-journal', null, 'November 2026')
    await db.pages.update(month.id, { journalMonth: '2026-11' })
    await dedupeWorkspaces(db)
    expect(await novMonths()).toHaveLength(2) // confirmed cause
  })

  it('a month page restored from Trash after a new one was made gives two', async () => {
    const { page } = await openJournalDay(db, ws, NOV_3)
    const first = page.parentId!
    await deletePage(db, first)
    await openJournalDay(db, ws, NOV_9) // makes a new month (random id)
    await restorePage(db, first)
    expect(await novMonths()).toHaveLength(2) // confirmed cause
  })
})

describe('repairJournalMonths', () => {
  it('finds month pages of the same month', async () => {
    const { keep, dup } = await twoNovembers()
    const groups = await findDuplicateMonths(db, ws)
    expect(groups).toEqual([
      { month: '2026-11', keepId: keep.id, duplicateIds: [dup.id] },
    ])
  })

  it('keeps the fixed-id month, moves every day into it and sends the empty one to Trash', async () => {
    const { keep, dup } = await twoNovembers()
    const before = await journalCounts(db, await journalId(), [dup.id])
    const outcome = await repairJournalMonths(db, ws, { storage })
    expect(outcome.kind).toBe('joined')
    expect(keep.id).toBe(stableId(`${await journalId()}:month:2026-11`))

    const months = await novMonths()
    expect(months.map((m) => m.id)).toEqual([keep.id])
    const days = (await listPages(db, await journalId())).filter(
      (p) => p.journalDate,
    )
    expect(days.map((d) => d.journalDate).sort()).toEqual([
      '2026-11-03',
      '2026-11-09',
      '2026-11-14',
    ])
    expect(days.every((d) => d.parentId === keep.id)).toBe(true)
    // Never deleted: the empty duplicate is in Trash.
    const gone = await db.pages.get(dup.id)
    expect(gone?.deletedAt).not.toBeNull()
    // Nothing lost.
    expect(await journalCounts(db, await journalId(), [dup.id])).toEqual(before)
    // The toast words.
    expect(outcome.kind === 'joined' && repairMessage(outcome)).toBe(
      'Journal tidied: two November 2026 pages joined',
    )
    // A day opened later goes into the kept month, never a third.
    await openJournalDay(db, ws, new Date(2026, 10, 20))
    expect(await novMonths()).toHaveLength(1)
  })

  it('saves a backup of both months and their days before changing anything, which can be exported', async () => {
    const { keep, dup } = await twoNovembers()
    await repairJournalMonths(db, ws, { storage })
    const saved = JSON.parse(storage.getItem(JOURNAL_REPAIR_BACKUP_KEY)!)
    const ids = saved.groups[0].pages.map((p: Page) => p.id)
    expect(ids).toContain(keep.id)
    expect(ids).toContain(dup.id)
    // The saved copy is from before: the days still point at the duplicate.
    expect(
      saved.groups[0].pages.filter((p: Page) => p.parentId === dup.id),
    ).toHaveLength(2)
    const file = journalRepairBackupFile(storage)!
    expect(file.name).toMatch(/journal-repair-backup.*\.json$/)
    expect(JSON.parse(await file.text())).toEqual(saved)
  })

  it('restores and stops when the counts before and after differ', async () => {
    const { dup } = await twoNovembers()
    const journal = await journalId()
    const snapshot = () => layout(db, journal)
    const before = await snapshot()
    const outcome = await repairJournalMonths(db, ws, {
      storage,
      // A fault while moving: one line goes missing.
      afterMoves: async () => {
        const day = (await listPages(db, journal)).find(
          (p) => p.journalDate === '2026-11-09',
        )!
        const line = (
          await db.blocks.where('pageId').equals(day.id).toArray()
        )[0]
        await db.blocks.update(line.id, { deletedAt: Date.now() })
      },
    })
    expect(outcome.kind).toBe('restored')
    expect(await snapshot()).toEqual(before)
    expect((await db.pages.get(dup.id))?.deletedAt).toBeNull()
  })

  it('Undo puts every page back where it was', async () => {
    const { dup } = await twoNovembers()
    const journal = await journalId()
    const snapshot = () => layout(db, journal)
    const before = await snapshot()
    const outcome = await repairJournalMonths(db, ws, { storage })
    if (outcome.kind !== 'joined') throw new Error('not joined')
    await outcome.undo()
    expect(await snapshot()).toEqual(before)
    expect((await db.pages.get(dup.id))?.deletedAt).toBeNull()
    // After an Undo this device does not join them again by itself.
    expect((await repairJournalMonths(db, ws, { storage })).kind).toBe('none')
  })

  it('Undo is all or nothing: never back but not marked', async () => {
    const { dup } = await twoNovembers()
    const outcome = await repairJournalMonths(db, ws, { storage })
    if (outcome.kind !== 'joined') throw new Error('not joined')
    const joined = await layout(db, await journalId())
    // The last step (the mark) fails, as when the app closes mid-Undo.
    const update = db.pages.update.bind(db.pages)
    db.pages.update = ((id: string, changes: Partial<Page>) =>
      'monthJoinDeclined' in changes
        ? Promise.reject(new Error('closed'))
        : update(id, changes)) as typeof db.pages.update
    await expect(outcome.undo()).rejects.toThrow()
    db.pages.update = update
    // Nothing changed: the duplicate is still in Trash, the days still joined.
    expect((await db.pages.get(dup.id))?.deletedAt).not.toBeNull()
    expect(await layout(db, await journalId())).toEqual(joined)
    // A second Undo works, and then nothing joins them again.
    await outcome.undo()
    expect((await db.pages.get(dup.id))?.monthJoinDeclined).toBe(true)
    expect((await repairJournalMonths(db, ws, { storage })).kind).toBe('none')
  })

  it('restoreJournalBackup brings the saved pages back', async () => {
    const { dup } = await twoNovembers()
    await repairJournalMonths(db, ws, { storage })
    await restoreJournalBackup(db, storage)
    expect((await db.pages.get(dup.id))?.deletedAt).toBeNull()
    expect(
      (await listPages(db, await journalId())).filter(
        (p) => p.parentId === dup.id,
      ),
    ).toHaveLength(2)
  })

  it('is idempotent: a second run changes nothing', async () => {
    await twoNovembers()
    expect((await repairJournalMonths(db, ws, { storage })).kind).toBe('joined')
    const after = await db.pages.toArray()
    expect((await repairJournalMonths(db, ws, { storage })).kind).toBe('none')
    expect(await db.pages.toArray()).toEqual(after)
  })

  it('two devices choose the same page: after sync there is one month, never a third', async () => {
    await twoNovembers()
    // Device B holds the same records (synced before the repair).
    const b = await copyDevice()
    try {
      // Both repair before they sync again.
      await repairJournalMonths(db, ws, { storage })
      await repairJournalMonths(b, ws, { storage: memoryStorage() })
      const shape = async (d: LearningNotesDB) =>
        (await d.pages.toArray())
          .map((p) => [p.id, p.parentId, p.deletedAt === null])
          .sort()
      expect(await shape(b)).toEqual(await shape(db))
      // A's records reach B (newer wins): still one live month.
      await b.pages.bulkPut(await db.pages.toArray())
      expect(await novMonths(b)).toHaveLength(1)
      expect(
        (await repairJournalMonths(b, ws, { storage: memoryStorage() })).kind,
      ).toBe('none')
      await openJournalDay(b, ws, NOV_14)
      expect(await novMonths(b)).toHaveLength(1)
    } finally {
      await b.delete()
    }
  })

  it('leaves a duplicate that has its own notes untouched', async () => {
    const { dup } = await twoNovembers()
    await createBlock(db, {
      pageId: dup.id,
      type: 'paragraph',
      content: { text: [{ type: 'text', text: 'month note', styles: {} }] },
    })
    const before = await db.pages.toArray()
    expect((await repairJournalMonths(db, ws, { storage })).kind).toBe('none')
    expect(await db.pages.toArray()).toEqual(before)
  })

  it('Undo holds on every device: the other device never joins them again', async () => {
    await twoNovembers()
    const b = await copyDevice()
    try {
      // B joins first; A joins, the user taps Undo on A.
      await repairJournalMonths(b, ws, { storage: memoryStorage() })
      await new Promise((r) => setTimeout(r, 5))
      const outcome = await repairJournalMonths(db, ws, { storage })
      if (outcome.kind !== 'joined') throw new Error('not joined')
      await outcome.undo()
      const kept = layout(db, await journalId())
      // A's newer records reach B; B's start-up repair leaves them alone.
      await syncPages(db, b)
      expect(
        (await repairJournalMonths(b, ws, { storage: memoryStorage() })).kind,
      ).toBe('none')
      expect(await novMonths(b)).toHaveLength(2)
      expect(await layout(b, await journalId(b))).toEqual(await kept)
      // A third device that only now syncs does not join them either.
      const c = createTestDb()
      try {
        await syncPages(db, c)
        for (const table of ['workspaces', 'notebooks', 'blocks'] as const)
          await (c[table] as unknown as LearningNotesDB['pages']).bulkPut(
            (await (
              db[table] as unknown as LearningNotesDB['pages']
            ).toArray()) as never,
          )
        expect(
          (await repairJournalMonths(c, ws, { storage: memoryStorage() })).kind,
        ).toBe('none')
      } finally {
        await c.delete()
      }
    } finally {
      await b.delete()
    }
  })

  it('puts everything back when a day arrives under the duplicate during the run', async () => {
    const { dup } = await twoNovembers()
    const journal = await journalId()
    const before = await layout(db, journal)
    const now = Date.now()
    const outcome = await repairJournalMonths(db, ws, {
      storage,
      // Sync writes a new day under the duplicate between the moves and Trash.
      afterMoves: async () => {
        await db.pages.add({
          id: 'synced-day',
          notebookId: journal,
          parentId: dup.id,
          title: 'Fri 20 Nov',
          order: 'a5',
          journalDate: '2026-11-20',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })
      },
    })
    expect(outcome.kind).toBe('restored')
    expect((await db.pages.get(dup.id))?.deletedAt).toBeNull()
    const arrived = await db.pages.get('synced-day')
    expect(arrived?.deletedAt).toBeNull()
    expect(arrived?.parentId).toBe(dup.id)
    expect(
      (await layout(db, journal)).filter(([id]) => id !== 'synced-day'),
    ).toEqual(before)
  })

  it('a duplicate holding only an empty line counts as empty', async () => {
    const { dup } = await twoNovembers()
    for (const text of ['', '   '])
      await createBlock(db, {
        pageId: dup.id,
        type: 'paragraph',
        content: { text: text ? [{ type: 'text', text, styles: {} }] : [] },
      })
    expect((await repairJournalMonths(db, ws, { storage })).kind).toBe('joined')
    expect((await db.pages.get(dup.id))?.deletedAt).not.toBeNull()
  })

  it('does nothing when there is no Journal or no duplicate', async () => {
    expect((await repairJournalMonths(db, ws, { storage })).kind).toBe('none')
    await openJournalDay(db, ws, NOV_3)
    expect((await repairJournalMonths(db, ws, { storage })).kind).toBe('none')
    expect(storage.getItem(JOURNAL_REPAIR_BACKUP_KEY)).toBeNull()
  })
})
