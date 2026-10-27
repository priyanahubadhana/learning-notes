import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import { orderBetween } from '../core/order'
import type { JsonValue, Notebook } from '../core/types'
import { rebuildRowRefs, rowNotebookIdOf } from '../databases/databaseService'
import { studyTrackerId } from '../databases/notebookTabs'
import { listNotebooks } from '../notebooks/notebookService'
import { findOrCreateTagPath } from '../tags/tagService'
import { t } from '../i18n/t'
import type { Bundle } from './bundle'
import { remapJson } from './remapJson'

/**
 * Imports a bundle as NEW COPIES: every notebook, page, note, card,
 * database, column and view gets a fresh id, so nothing that exists is
 * ever changed or replaced. Links inside the file are re-pointed to the
 * copies; tags are matched by name (made if missing) because tags belong
 * to the whole workspace.
 */

export interface ImportSummary {
  notebooks: number
  pages: number
  cards: number
  databases: number
}

export async function importBundle(
  db: LearningNotesDB,
  workspaceId: string,
  bundle: Bundle,
  now: number = Date.now(),
): Promise<ImportSummary> {
  // Tags first (their own transactions): old tag id → live tag id here.
  const ids = new Map<string, string>()
  for (const tag of bundle.tags) {
    ids.set(tag.id, (await findOrCreateTagPath(db, tag.path)).id)
  }
  // Fresh ids for everything else.
  const fresh = (items: readonly { id: string }[]) =>
    items.forEach((item) => ids.set(item.id, createId()))
  fresh(bundle.notebooks)
  fresh(bundle.pages)
  fresh(bundle.blocks)
  fresh(bundle.cards)
  fresh(bundle.reviewLogs)
  fresh(bundle.dbColumns)
  fresh(bundle.dbViews)
  for (const database of bundle.databases) {
    // A Study tracker's id comes from its notebook's id.
    ids.set(
      database.id,
      database.kind === 'studyTracker' && database.notebookId
        ? studyTrackerId(ids.get(database.notebookId) ?? createId())
        : createId(),
    )
  }
  const map = <T extends JsonValue>(value: T): T => remapJson(value, ids)
  const id = (old: string | null | undefined) =>
    old ? (ids.get(old) ?? old) : old

  const databaseIds = new Set(bundle.databases.map((d) => d.id))
  const notebookIds = new Set(bundle.notebooks.map((n) => n.id))

  return db.transaction(
    'rw',
    [
      db.workspaces,
      db.notebooks,
      db.pages,
      db.blocks,
      db.cards,
      db.reviewLogs,
      db.databases,
      db.dbColumns,
      db.dbViews,
      db.rowRefs,
      db.tags,
      db.meta,
      db.searchEntries,
      db.links,
      db.blockTags,
    ],
    async () => {
      const last = (await listNotebooks(db, workspaceId)).at(-1)
      let order = last?.order ?? null
      const notebooks = bundle.notebooks.map((n): Notebook => {
        order = orderBetween(order, null)
        const copy = { ...n } as Notebook
        return {
          ...copy,
          id: id(n.id)!,
          workspaceId,
          title: t('import.copyName', { name: n.title }),
          order,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          ...(n.tabs && { tabs: map(n.tabs as unknown as JsonValue) as never }),
        }
      })
      await db.notebooks.bulkAdd(notebooks)

      const databases = bundle.databases.map((d) => ({
        ...d,
        id: id(d.id)!,
        workspaceId,
        notebookId:
          d.notebookId && notebookIds.has(d.notebookId)
            ? id(d.notebookId)!
            : null,
        ...(d.openViewId && { openViewId: id(d.openViewId)! }),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      }))
      await db.databases.bulkAdd(databases)

      // Rows of loose databases live in the hidden "Databases" notebook.
      const homeFor = new Map<string, string>()
      for (const d of databases.filter((x) => x.notebookId === null)) {
        homeFor.set(d.id, await rowNotebookIdOf(db, d))
      }
      const pages = bundle.pages.flatMap((p) => {
        const databaseId =
          p.databaseId && databaseIds.has(p.databaseId)
            ? id(p.databaseId)!
            : undefined
        const notebookId = notebookIds.has(p.notebookId)
          ? id(p.notebookId)!
          : databaseId
            ? homeFor.get(databaseId)
            : undefined
        if (!notebookId) return []
        const {
          journalDate: _journalDate,
          journalMonth: _journalMonth,
          templateRole: _templateRole,
          ...rest
        } = p
        void _journalDate
        void _journalMonth
        void _templateRole
        return [
          {
            ...rest,
            id: id(p.id)!,
            notebookId,
            parentId: id(p.parentId) ?? null,
            ...(databaseId && { databaseId }),
            ...(p.tagIds && { tagIds: p.tagIds.map((x) => id(x)!) }),
            ...(p.values && { values: map(p.values) }),
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ]
      })
      await db.pages.bulkAdd(pages)
      const pageIds = new Set(pages.map((p) => p.id))

      const blocks = bundle.blocks
        .filter((b) => pageIds.has(id(b.pageId)!))
        .map((b) => ({
          ...b,
          id: id(b.id)!,
          pageId: id(b.pageId)!,
          parentId: id(b.parentId) ?? null,
          content: map(b.content),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        }))
      await db.blocks.bulkAdd(blocks)
      const blockIds = new Set(blocks.map((b) => b.id))

      const cards = bundle.cards
        .filter((c) => blockIds.has(id(c.blockId)!))
        .map((c) => ({
          ...c,
          id: id(c.id)!,
          blockId: id(c.blockId)!,
          pageId: id(c.pageId)!,
          notebookId: pages.find((p) => p.id === id(c.pageId))!.notebookId,
          ...(c.schedulerData && { schedulerData: map(c.schedulerData) }),
        }))
      await db.cards.bulkAdd(cards)
      const cardIds = new Set(cards.map((c) => c.id))
      await db.reviewLogs.bulkAdd(
        bundle.reviewLogs
          .filter((l) => cardIds.has(id(l.cardId)!))
          .map((l) => ({ ...l, id: id(l.id)!, cardId: id(l.cardId)! })),
      )

      const columns = bundle.dbColumns
        .filter((c) => databaseIds.has(c.databaseId))
        .map((c) => ({
          ...c,
          id: id(c.id)!,
          databaseId: id(c.databaseId)!,
          config: map(c.config),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        }))
      await db.dbColumns.bulkAdd(columns)
      await db.dbViews.bulkAdd(
        bundle.dbViews
          .filter(
            (v) =>
              databaseIds.has(v.databaseId) &&
              (!v.blockId || blockIds.has(id(v.blockId)!)),
          )
          .map((v) => ({
            ...v,
            id: id(v.id)!,
            databaseId: id(v.databaseId)!,
            ...(v.blockId && { blockId: id(v.blockId)! }),
            config: map(v.config),
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          })),
      )
      await rebuildRowRefs(
        db,
        databases.map((d) => d.id),
      )
      return {
        notebooks: notebooks.length,
        pages: pages.length,
        cards: cards.length,
        databases: databases.length,
      }
    },
  )
}
