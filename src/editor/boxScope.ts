import type { LearningNotesDB } from '../core/db'
import type { Block } from '../core/types'
import { groupBlocksByBox, MAIN_BOX } from '../paper/boxes'
import type { BlockDraft } from './diff'

/**
 * Phase Q: one editor per box. These keep an editor to its own box's
 * blocks. A page with no boxes (every page before Phase Q) is untouched:
 * all blocks, no box ids written.
 */

export async function hasBoxes(
  db: LearningNotesDB,
  pageId: string,
): Promise<boolean> {
  return ((await db.pages.get(pageId))?.boxes?.length ?? 0) > 0
}

/** The records of `boxId` (unset = the default box). */
export async function blocksOfBox(
  db: LearningNotesDB,
  pageId: string,
  records: Block[],
  boxId: string | undefined,
): Promise<Block[]> {
  const page = await db.pages.get(pageId)
  if (!page?.boxes?.length) return boxId && boxId !== MAIN_BOX ? [] : records
  return groupBlocksByBox(page, records).get(boxId ?? MAIN_BOX) ?? []
}

/** Gives the top-level drafts of a box their box id (none for the default box). */
export function tagDrafts(
  drafts: BlockDraft[],
  boxId: string | undefined,
): BlockDraft[] {
  if (!boxId || boxId === MAIN_BOX) return drafts
  return drafts.map((d) => (d.parentId === null ? { ...d, boxId } : d))
}
