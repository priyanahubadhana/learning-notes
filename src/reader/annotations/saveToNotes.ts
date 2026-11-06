import { addBlocks } from '../../core/blockBulk'
import { listBlocks } from '../../core/blockService'
import type { LearningNotesDB } from '../../core/db'
import type { Annotation, Block } from '../../core/types'
import { updateAnnotation } from './annotationService'
import { deepLinkFor } from './deepLink'

/**
 * "Save to…" (C4): copies a highlight into a page as a quote line with a link
 * back to the exact spot. Highlights of books land on the book page's
 * "Highlights & notes" section automatically.
 */

/** Index (among top-level blocks) just before the second heading, i.e. the end of the first section. */
export function firstSectionEnd(blocks: readonly Block[]): number {
  const top = blocks.filter((b) => b.parentId === null)
  const headings = top
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => b.type === 'heading')
  return headings.length >= 2 ? headings[1].i : top.length
}

/** The block inputs of one saved highlight: quote, then note, linked back. */
export function quoteBlocks(
  a: Pick<Annotation, 'quote' | 'note' | 'pageId' | 'anchor'>,
  where: string,
  base?: string,
) {
  const link = deepLinkFor(a, base)
  const quote = (a.quote?.exact ?? '').replace(/\s+/g, ' ').trim()
  const runs: Record<string, unknown>[] = [
    { type: 'text', text: `“${quote}”`, styles: { italic: true } },
  ]
  if (link && /^https?:\/\//i.test(link) && where) {
    runs.push({ type: 'text', text: ' ', styles: {} })
    runs.push({
      type: 'link',
      href: link,
      content: [{ type: 'text', text: where, styles: {} }],
    })
  } else if (where) {
    runs.push({ type: 'text', text: ` ${where}`, styles: {} })
  }
  const blocks = [{ type: 'paragraph', content: { text: runs } as never }]
  if (a.note?.trim()) {
    blocks.push({
      type: 'paragraph',
      content: {
        text: [{ type: 'text', text: a.note.trim(), styles: {} }],
      } as never,
    })
  }
  return blocks
}

/**
 * Saves `a` into page `targetPageId`. For `section: 'highlights'` it goes
 * before the second heading (the Highlights section of a book page); else at
 * the end. Returns the first block's id.
 */
export async function saveAnnotationTo(
  db: LearningNotesDB,
  a: Annotation,
  targetPageId: string,
  where: string,
  section: 'highlights' | 'end' = 'end',
): Promise<string> {
  const blocks = await listBlocks(db, targetPageId)
  const index = section === 'highlights' ? firstSectionEnd(blocks) : undefined
  const made = await addBlocks(db, targetPageId, quoteBlocks(a, where), {
    index,
  })
  const first = made[0]
  await updateAnnotation(db, a.id, {
    savedTo: [
      ...(a.savedTo ?? []),
      { pageId: targetPageId, blockId: first.id },
    ],
  })
  return first.id
}
