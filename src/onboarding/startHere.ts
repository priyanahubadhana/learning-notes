import { createBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import type { JsonObject, Notebook, Page } from '../core/types'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { syncCardRecords } from '../recall/cardService'
import { t, type MessageKey } from '../i18n/t'

/**
 * "Start here" (polish 2, item 2): a small notebook that teaches the app by
 * doing. Five short pages, each with a "Try it" line: write on paper, make a
 * box, Lasso and convert, the Write pad, make a card and review it. It is an
 * ordinary notebook (rename it, edit it, delete it). Its texts come from the
 * language of the app when it is made. Lazy-loaded; not part of the first
 * download.
 */

/** The five lessons: the text key stem of each (title, body, try). */
export const START_PAGES = [
  'startHere.p1',
  'startHere.p2',
  'startHere.p3',
  'startHere.p4',
  'startHere.p5',
] as const

const runs = (text: string): JsonObject => ({
  text: [{ type: 'text', text, styles: {} }],
})
const key = (stem: string, part: string) => `${stem}.${part}` as MessageKey

export async function loadStartHere(
  db: LearningNotesDB,
  workspaceId: string,
  now: number = Date.now(),
): Promise<{ notebook: Notebook; pages: Page[] }> {
  const notebook = await createNotebook(db, workspaceId, t('startHere.title'))
  const pages: Page[] = []
  for (const stem of START_PAGES) {
    const page = await createPage(db, notebook.id, null, t(key(stem, 'title')))
    pages.push(page)
    await createBlock(db, {
      pageId: page.id,
      type: 'paragraph',
      content: runs(t(key(stem, 'body'))),
    })
    await createBlock(db, {
      pageId: page.id,
      type: 'callout',
      content: { emoji: '👉', ...runs(t(key(stem, 'try'))) },
    })
    if (stem === 'startHere.p5') {
      // A real card: the question, with its answer inside it.
      const card = await createBlock(db, {
        pageId: page.id,
        type: 'card',
        content: runs(t('startHere.card.q')),
      })
      await createBlock(db, {
        pageId: page.id,
        type: 'paragraph',
        parentId: card.id,
        content: runs(t('startHere.card.a')),
      })
      await syncCardRecords(db, page.id, now)
    }
  }
  return { notebook, pages }
}
