import { addBlocks } from '../core/blockBulk'
import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import { t } from '../i18n/t'
import { createPage } from '../pages/pageService'
import { syncCardRecords } from './cardService'

/**
 * Look up → "Add to vocabulary" (CR3): a card with the word as the question
 * and the sentence it came from as the answer, on a "Vocabulary" page of the
 * book's notebook (made once, reused).
 */

/** The single word (or short phrase) of a selection, trimmed of punctuation. */
export function vocabWord(selected: string): string {
  return selected
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .slice(0, 60)
}

/** The context sentence around a quote (prefix + word + suffix), trimmed. */
export function vocabContext(q: {
  exact: string
  prefix: string
  suffix: string
}): string {
  const around = `${q.prefix}${q.exact}${q.suffix}`.replace(/\s+/g, ' ').trim()
  return around.length > 240 ? around.slice(0, 240) : around
}

export async function addVocabulary(
  db: LearningNotesDB,
  notebookId: string,
  word: string,
  context: string,
): Promise<string> {
  const clean = vocabWord(word)
  const title = t('recall.vocabPage')
  const pages = await db.pages.where('notebookId').equals(notebookId).toArray()
  const page =
    pages.find((p) => isLive(p) && p.parentId === null && p.title === title) ??
    (await createPage(db, notebookId, null, title))
  const run = (text: string) => ({ type: 'text', text, styles: {} })
  await addBlocks(db, page.id, [
    {
      type: 'card',
      content: { text: [run(clean)] },
      children: [
        {
          type: 'paragraph',
          content: { text: [run(context || clean)] },
        },
      ],
    },
  ])
  await syncCardRecords(db, page.id)
  return page.id
}
