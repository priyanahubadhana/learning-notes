import type { LearningNotesDB } from './db'
import type { Page } from './types'

/**
 * The `limit` most recently changed pages that pass `accept`, newest first.
 * Pages have no `updatedAt` index (a new one needs a Dexie version), so the
 * table is streamed once and only a short list is kept: memory stays small
 * with tens of thousands of pages.
 */
export async function recentPages(
  db: LearningNotesDB,
  accept: (page: Page) => boolean,
  limit: number,
): Promise<Page[]> {
  const best: Page[] = []
  await db.pages.each((page) => {
    if (!accept(page)) return
    if (best.length === limit && page.updatedAt <= best[limit - 1].updatedAt) {
      return
    }
    // Insert in order (newest first) and drop the oldest past the limit.
    let i = best.length
    while (i > 0 && best[i - 1].updatedAt < page.updatedAt) i--
    best.splice(i, 0, page)
    if (best.length > limit) best.pop()
  })
  return best
}
