/// <reference lib="dom" />
import type { Page } from '@playwright/test'

/** Book title, colour, sentence: five highlights across two books. */
export const QUOTES: [string, string, string][] = [
  ['Alpha Book', 'yellow', 'Memory is strengthened each time you recall it.'],
  ['Alpha Book', 'blue', 'Spacing reviews over days beats one long session.'],
  ['Bravo Book', 'green', 'A question you ask yourself is worth ten you read.'],
  ['Bravo Book', 'yellow', 'Sleep turns the day into long-term memory.'],
  ['Alpha Book', 'pink', 'Explain an idea simply and you will know it well.'],
]

/** Writes the highlights straight into the local database (books must exist). */
export async function addHighlights(
  page: Page,
  list: [string, string, string][] = QUOTES,
) {
  await page.evaluate(async (list) => {
    const db: IDBDatabase = await new Promise((res, rej) => {
      const r = indexedDB.open('learning-notes')
      r.onsuccess = () => res(r.result)
      r.onerror = () => rej(r.error)
    })
    const pages: { id: string; title: string }[] = await new Promise(
      (res, rej) => {
        const r = db.transaction('pages').objectStore('pages').getAll()
        r.onsuccess = () => res(r.result as { id: string; title: string }[])
        r.onerror = () => rej(r.error)
      },
    )
    const now = Date.now()
    await new Promise<void>((res, rej) => {
      const tx = db.transaction('annotations', 'readwrite')
      list.forEach(([title, colour, text], i) => {
        const book = pages.find((p) => p.title === title)
        if (!book) throw new Error('book not found: ' + title)
        tx.objectStore('annotations').put({
          id: 'h-shot-' + i,
          createdAt: now - i * 3_600_000,
          updatedAt: now - i * 3_600_000,
          deletedAt: null,
          pageId: book.id,
          kind: 'highlight',
          colour,
          anchor: {
            type: 'pdf',
            page: 1 + (i % 3),
            rects: [0, 0.1, 0.5, 0.05],
          },
          quote: { exact: text, prefix: '', suffix: '' },
          origin: 'user',
        })
      })
      tx.oncomplete = () => res()
      tx.onerror = () => rej(tx.error)
    })
    db.close()
  }, list)
}
