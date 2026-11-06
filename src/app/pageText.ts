import type { LearningNotesDB } from '../core/db'
import { blockText } from '../search/searchText'
import { inReadingOrder } from './panel/panelModel'

/** Block types that hold a line to read: bullets, numbers, ticks, text. */
const LINE_TYPES = new Set([
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'paragraph',
  'quote',
])

/**
 * The lines of a page, one per bullet or paragraph, in reading order (for
 * Affirmations: a page of bullet points). Headings are left out.
 */
export async function pageLines(
  db: LearningNotesDB,
  pageId: string,
): Promise<string[]> {
  const blocks = await db.blocks.where('pageId').equals(pageId).toArray()
  return inReadingOrder(blocks)
    .filter((b) => LINE_TYPES.has(b.type))
    .map((b) => blockText(b.content).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}
