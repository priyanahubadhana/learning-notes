// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { openSearchPopup } from './helpers.ts'
import { inkNote } from './inkHelpers.ts'

/**
 * A search hit inside a paper box that is still a lazy placeholder (far below
 * the screen): the jump makes that box's editor, then scrolls to the hit.
 */

test.use({ viewport: { width: 1024, height: 700 }, hasTouch: true })

const BOXES = 40

test('a search hit in a far, placeholder box wakes its editor and scrolls to the hit', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  await page.waitForTimeout(700) // autosave
  await page.evaluate(async (boxes) => {
    const open = indexedDB.open('learning-notes')
    const db: IDBDatabase = await new Promise((res) => {
      open.onsuccess = () => res(open.result)
    })
    const read = (store: string) =>
      new Promise<Record<string, any>[]>((res) => {
        const r = db.transaction(store).objectStore(store).getAll()
        r.onsuccess = () => res(r.result)
      })
    const [notePage] = (await read('pages')).filter((p) => p.title === 'First')
    const [block] = await read('blocks')
    const ids = Array.from({ length: boxes }, (_, i) => 'jumpbox-' + i)
    const blocks = ids.map((id, i) => ({
      ...block,
      id: 'jumpblock-' + i,
      pageId: notePage.id,
      boxId: id,
      parentId: null,
      order: 'a' + String(i + 1).padStart(3, '1'),
      type: 'paragraph',
      content: {
        text: [
          {
            type: 'text',
            text: i === boxes - 1 ? 'Quokkazebra is here' : 'Filler ' + i,
            styles: {},
          },
        ],
      },
    }))
    await new Promise<void>((res) => {
      const tx = db.transaction(
        ['pages', 'blocks', 'searchEntries'],
        'readwrite',
      )
      tx.objectStore('pages').put({
        ...notePage,
        boxes: ids.map((id, i) => ({
          id,
          x: 15 + (i % 2) * 40,
          y: 40 + Math.floor(i / 2) * 120,
          w: 34,
        })),
      })
      for (const b of blocks) tx.objectStore('blocks').put(b)
      // The raw writes skip the search index: add the one entry we look for.
      tx.objectStore('searchEntries').put({
        id: 'jumpblock-' + (boxes - 1),
        kind: 'text',
        pageId: notePage.id,
        notebookId: notePage.notebookId,
        blockId: 'jumpblock-' + (boxes - 1),
        words: ['quokkazebra', 'here'],
        updatedAt: Date.now(),
      })
      tx.oncomplete = () => res()
    })
    db.close()
  }, BOXES)

  await page.reload()
  await expect(page.locator('[data-paper-box]')).toHaveCount(BOXES + 1, {
    timeout: 15000,
  })
  const target = page.locator('[data-paper-box="jumpbox-' + (BOXES - 1) + '"]')
  // It is far away: only a placeholder stands there, and it is off screen.
  await expect(target.locator('.bn-editor')).toHaveCount(0)
  await expect(target.locator('[data-box-placeholder]')).toBeAttached()
  await expect(target).not.toBeInViewport()

  const popup = await openSearchPopup(page)
  await page.keyboard.type('quokkazebra')
  const option = popup.getByRole('option').filter({ hasText: 'is here' })
  await expect(option).toHaveCount(1)
  await option.click()

  // The editor is made, and the hit scrolled into view.
  await expect(target.locator('.bn-editor')).toHaveCount(1)
  const hit = page.locator(
    '.bn-block-outer[data-id="jumpblock-' + (BOXES - 1) + '"]',
  )
  await expect(hit).toContainText('Quokkazebra')
  await expect(hit).toBeInViewport()
})
