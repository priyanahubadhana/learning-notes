import { listBlocks, saveBlockChanges } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { newRecordFields } from '../core/records'
import type { PageVersion, VersionBlock } from '../core/types'
import { getPage, renamePage } from '../pages/pageService'
import { syncCardRecords } from '../recall/cardService'

/** Copies kept per page; older ones are dropped. */
export const KEEP_VERSIONS = 30
/** While editing, a new copy is taken at most this often. */
export const VERSION_GAP_MS = 5 * 60 * 1000

/** The page's live title and blocks as they are now. */
async function currentState(db: LearningNotesDB, pageId: string) {
  const page = await getPage(db, pageId)
  if (!page) return null
  const blocks: VersionBlock[] = (await listBlocks(db, pageId)).map((b) => ({
    id: b.id,
    parentId: b.parentId,
    type: b.type,
    content: b.content,
    order: b.order,
  }))
  return { title: page.title, blocks }
}

const same = (
  a: { title: string; blocks: VersionBlock[] },
  b: { title: string; blocks: VersionBlock[] },
) =>
  a.title === b.title && JSON.stringify(a.blocks) === JSON.stringify(b.blocks)

/** A page's copies, newest first. */
export async function listVersions(
  db: LearningNotesDB,
  pageId: string,
): Promise<PageVersion[]> {
  const all = await db.pageVersions.where('pageId').equals(pageId).toArray()
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Keeps a copy of the page as it is now. Skipped when nothing changed since
 * the newest copy; unless `force`, also skipped when that copy is younger
 * than `VERSION_GAP_MS`. Returns the new copy, if one was made.
 */
export async function recordVersion(
  db: LearningNotesDB,
  pageId: string,
  { force = false, now = Date.now() } = {},
): Promise<PageVersion | null> {
  return db.transaction(
    'rw',
    db.pages,
    db.blocks,
    db.pageVersions,
    async () => {
      const state = await currentState(db, pageId)
      if (!state) return null
      const versions = await listVersions(db, pageId)
      const newest = versions[0]
      // A first copy of an empty page would hold nothing worth bringing back.
      if (!newest && state.blocks.length === 0) return null
      if (newest) {
        if (!force && now - newest.createdAt < VERSION_GAP_MS) return null
        if (same(newest, state)) return null
      }
      const version: PageVersion = {
        ...newRecordFields(),
        createdAt: now,
        updatedAt: now,
        pageId,
        ...state,
      }
      await db.pageVersions.add(version)
      const extra = versions.slice(KEEP_VERSIONS - 1)
      if (extra.length > 0) {
        await db.pageVersions.bulkDelete(extra.map((v) => v.id))
      }
      return version
    },
  )
}

/**
 * Puts a copy back as the live page. What the page was just before is kept
 * as a copy first, so a restore can itself be undone.
 */
export async function restoreVersion(
  db: LearningNotesDB,
  versionId: string,
): Promise<void> {
  await db.transaction(
    'rw',
    [db.pages, db.blocks, db.cards, db.pageVersions],
    async () => {
      const version = await db.pageVersions.get(versionId)
      if (!version) throw new Error('That copy no longer exists')
      await recordVersion(db, version.pageId, { force: true })
      const live = await listBlocks(db, version.pageId)
      const keep = new Set(version.blocks.map((b) => b.id))
      const liveById = new Map(live.map((b) => [b.id, b]))
      // Only what differs is written (a big page stays quick).
      const upserts = version.blocks.filter((b) => {
        const now = liveById.get(b.id)
        return (
          !now ||
          now.parentId !== b.parentId ||
          now.type !== b.type ||
          now.order !== b.order ||
          JSON.stringify(now.content) !== JSON.stringify(b.content)
        )
      })
      await saveBlockChanges(db, version.pageId, {
        upserts,
        deletes: live.filter((b) => !keep.has(b.id)).map((b) => b.id),
      })
      await renamePage(db, version.pageId, version.title)
      await syncCardRecords(db, version.pageId)
    },
  )
}
