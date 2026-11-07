import type { LearningNotesDB } from '../core/db'
import { newRecordFields } from '../core/records'
import type { Block, PageVersion, VersionBlock } from '../core/types'

/**
 * Keeps the other device's text in History when this device's text wins a
 * same-block conflict (sync merge rules): a copy of the page as it is here,
 * with their version of the losing blocks swapped in. Returns false when
 * the page is unknown.
 */
export async function keepTheirsInHistory(
  db: LearningNotesDB,
  pageId: string,
  theirs: readonly Block[],
): Promise<boolean> {
  const page = await db.pages.get(pageId)
  if (!page) return false
  const swap = new Map(theirs.map((b) => [b.id, b]))
  const blocks: VersionBlock[] = (
    await db.blocks.where('pageId').equals(pageId).toArray()
  )
    .filter((b) => b.deletedAt === null || swap.has(b.id))
    .map((b) => swap.get(b.id) ?? b)
    .filter((b) => b.deletedAt === null)
    .map((b) => ({
      id: b.id,
      parentId: b.parentId,
      type: b.type,
      content: b.content,
      order: b.order,
    }))
  const version: PageVersion = {
    ...newRecordFields(),
    pageId,
    title: page.title,
    blocks,
  }
  await db.pageVersions.add(version)
  return true
}
