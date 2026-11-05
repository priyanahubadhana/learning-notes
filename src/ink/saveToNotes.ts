import { createBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { plainText } from '../editor/mapping'
import { createPage, getPage, listChildPages } from '../pages/pageService'

/**
 * "Save to notes": keeps a highlighted passage in a page called
 * "Highlights" at the top level of the same notebook (made when first
 * needed), as a quote line followed by the page it came from. Nothing is
 * changed in the page the words came from.
 */
export async function saveToHighlightsPage(
  db: LearningNotesDB,
  notebookId: string,
  fromPageId: string,
  title: string,
  text: string,
): Promise<string> {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean === '') return ''
  const top = await listChildPages(db, notebookId, null)
  let page = top.find((p) => p.title === title)
  if (!page) page = await createPage(db, notebookId, null, title)
  const from = await getPage(db, fromPageId)
  const source = from?.title ? ` (${from.title})` : ''
  await createBlock(db, {
    pageId: page.id,
    type: 'quote',
    content: { text: plainText(`${clean}${source}`) },
  })
  return page.id
}
