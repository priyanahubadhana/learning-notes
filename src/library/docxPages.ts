import { addBlocks, type BlockInput } from '../core/blockBulk'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { sanitizePastedHtml } from '../editor/clipboard'
import { runText } from '../editor/mapping'
import { htmlToBlocks } from '../editor/textBlocks'
import { createPage } from '../pages/pageService'

/** Most chapters made from one document (a safety cap). */
const MAX_CHAPTERS = 300

/** Plain words of a heading block. */
const headingText = (b: BlockInput): string =>
  Array.isArray(b.content.text)
    ? b.content.text
        .map((r) => runText(r))
        .join('')
        .trim()
    : ''

/** Blocks split into chapters at each Heading 1. */
export function splitAtHeading1(
  blocks: readonly BlockInput[],
  firstTitle: string,
): { title: string; blocks: BlockInput[] }[] {
  const chapters: { title: string; blocks: BlockInput[] }[] = []
  let current: { title: string; blocks: BlockInput[] } | null = null
  for (const block of blocks) {
    if (block.type === 'heading' && block.content.level === 1) {
      current = { title: headingText(block), blocks: [] }
      chapters.push(current)
      continue
    }
    if (!current) {
      current = { title: firstTitle, blocks: [] }
      chapters.push(current)
    }
    current.blocks.push(block)
  }
  return chapters
}

/**
 * Turns a DOCX (already converted to HTML) into chapter pages under the book
 * page. Each chapter opens locked to reading, so it reads with the same
 * reader, ink and highlights as notes.
 */
export async function addDocxChapters(
  db: LearningNotesDB,
  book: Page,
  html: string,
  firstTitle: string,
): Promise<number> {
  const blocks = htmlToBlocks(sanitizePastedHtml(html))
  const chapters = splitAtHeading1(blocks, firstTitle).slice(0, MAX_CHAPTERS)
  for (const chapter of chapters) {
    const page = await createPage(
      db,
      book.notebookId,
      book.id,
      chapter.title.slice(0, 200),
    )
    await db.pages.update(page.id, { readFirst: true })
    if (chapter.blocks.length) await addBlocks(db, page.id, chapter.blocks)
  }
  return chapters.length
}
