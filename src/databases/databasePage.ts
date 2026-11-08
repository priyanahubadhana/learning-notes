import type { LearningNotesDB } from '../core/db'
import { createBlock, deleteBlock, listBlocks } from '../core/blockService'
import { getLive } from '../core/records'
import { toPlainText } from '../editor/mapping'
import { ensureBlockView } from './blockViews'
import { updateView } from './databaseService'
import { createStarterDatabase, type StarterId } from './starterDatabases'

/**
 * "Database page": a still-blank page becomes a full page holding one
 * database, shown at full width. It is the same database block as "/database"
 * (so Open, views, rows-as-pages and search all work), plus an empty line
 * below to keep typing notes. The page takes the database's name if it has
 * no title yet. Returns the new database's id, or null when the page already
 * has writing (nothing changes).
 */
export async function makeDatabasePage(
  db: LearningNotesDB,
  pageId: string,
  starter: StarterId = 'blank',
): Promise<string | null> {
  return db.transaction(
    'rw',
    [
      db.workspaces,
      db.notebooks,
      db.pages,
      db.blocks,
      db.cards,
      db.databases,
      db.dbColumns,
      db.dbViews,
    ],
    async () => {
      const existing = await listBlocks(db, pageId)
      if (
        !existing.every(
          (b) => b.type === 'paragraph' && toPlainText(b.content).trim() === '',
        )
      ) {
        return null
      }
      const page = await getLive(db.pages, pageId)
      const notebook = await getLive(db.notebooks, page.notebookId)
      for (const block of await listBlocks(db, pageId)) {
        if (block.parentId === null) await deleteBlock(db, block.id)
      }
      const database = await createStarterDatabase(
        db,
        notebook.workspaceId,
        notebook.kind ? null : notebook.id,
        starter,
      )
      const block = await createBlock(db, {
        pageId,
        type: 'database',
        content: { databaseId: database.id },
      })
      const view = await ensureBlockView(db, database.id, block.id)
      if (view) {
        await updateView(db, view.id, { config: { fullWidth: true } })
      }
      await createBlock(db, {
        pageId,
        type: 'paragraph',
        content: { text: [] },
      })
      if (!page.title.trim()) {
        await db.pages.update(pageId, {
          title: database.title,
          updatedAt: Date.now(),
        })
      }
      return database.id
    },
  )
}
