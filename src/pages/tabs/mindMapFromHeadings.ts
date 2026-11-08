import { listBlocks, inReadingOrder } from '../../core/blockService'
import type { LearningNotesDB } from '../../core/db'
import type { Block } from '../../core/types'

/** The plain text of a block's text runs. */
function plain(block: Pick<Block, 'content'>): string {
  const runs = block.content.text
  if (!Array.isArray(runs)) return ''
  return runs
    .map((r) =>
      r && typeof r === 'object' && 'text' in r ? String(r.text ?? '') : '',
    )
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * An indented outline of a page's headings (level 1 at the top, deeper levels
 * indented), for building a mind map. Empty when the page has no headings.
 */
export async function headingsOutline(
  db: LearningNotesDB,
  pageId: string,
  title: string,
): Promise<string> {
  const heads = inReadingOrder(await listBlocks(db, pageId))
    .filter((b) => b.type === 'heading' && plain(b))
    .slice(0, 300)
  if (heads.length === 0) return ''
  const lines = [`- ${title.trim() || plain(heads[0])}`]
  for (const h of heads) {
    const level = Math.min(3, Math.max(1, Number(h.content.level) || 1))
    lines.push(`${'  '.repeat(level)}- ${plain(h)}`)
  }
  return lines.join('\n')
}
