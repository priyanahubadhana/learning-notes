import type { Block } from '../core/types'
import { toPlainText } from '../editor/mapping'

/** Pages with at least this many sections show the jump chips. */
const MIN_SECTIONS = 3

export interface Section {
  blockId: string
  title: string
}

/**
 * A page's sections for the jump chips: its top-level headings (not nested
 * in another block) of the largest size used on the page, with text.
 * Returns [] when there are fewer than MIN_SECTIONS.
 */
export function pageSections(blocks: readonly Block[]): Section[] {
  const headings = blocks.filter(
    (b) =>
      b.type === 'heading' &&
      b.parentId === null &&
      toPlainText(b.content).trim() !== '',
  )
  const level = (b: Block) => Number(b.content.level ?? 1)
  const top = Math.min(...headings.map(level))
  const sections = headings
    .filter((b) => level(b) === top)
    .map((b) => ({ blockId: b.id, title: toPlainText(b.content).trim() }))
  return sections.length >= MIN_SECTIONS ? sections : []
}
