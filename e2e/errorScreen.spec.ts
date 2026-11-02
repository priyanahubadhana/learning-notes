import { expect, test, type Page } from '@playwright/test'
import { createNotebook, sidebar } from './helpers.ts'

const errorScreen = (page: Page) =>
  page.getByRole('alert').filter({ hasText: 'could not be shown' })

/** Damages the stored block holding "first line" (found again by a mark). */
async function damageBlock(page: Page, text: unknown) {
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const store = open.result
            .transaction('blocks', 'readwrite')
            .objectStore('blocks')
          const all = store.getAll()
          all.onsuccess = () => {
            const block = all.result.find(
              (b) =>
                JSON.stringify(b.content).includes('first line') ||
                b.content.damaged,
            )
            block.content.text = value
            block.content.damaged = true
            const put = store.put(block)
            put.onsuccess = () => {
              open.result.close()
              resolve()
            }
            put.onerror = () => reject(put.error)
          }
        }
      }),
    text,
  )
}

test('a damaged note shows a safe line and the stored record stays', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'Damaged')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('first line')
  await page.waitForTimeout(800)
  for (const bad of [5, [{ type: 'madeUp', text: 'x' }]]) {
    await damageBlock(page, bad)
    await page.reload()
    await expect(page.locator('.bn-editor')).toContainText(
      'This line could not be shown',
    )
    await expect(sidebar(page)).toBeVisible()
    const stored = await page.evaluate(
      () =>
        new Promise<unknown>((resolve) => {
          const open = indexedDB.open('learning-notes')
          open.onsuccess = () => {
            const all = open.result
              .transaction('blocks')
              .objectStore('blocks')
              .getAll()
            all.onsuccess = () => {
              open.result.close()
              resolve(all.result.find((b) => b.content.damaged).content.text)
            }
          }
        }),
    )
    expect(stored).toEqual(bad) // opening never rewrites it
  }
})

test('a screen file that cannot download reloads once, then offers a way out', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'First page')
  await page.route(/\/assets\/PageView-.*\.js$/, (route) => route.abort())
  await page.reload()
  await expect(errorScreen(page)).toBeVisible()
  await expect(sidebar(page)).toBeVisible()

  const saving = page.waitForEvent('download')
  await errorScreen(page)
    .getByRole('button', { name: 'Save everything' })
    .click()
  expect((await saving).suggestedFilename()).toMatch(/\.learningnotes\.json$/)

  await errorScreen(page).getByRole('button', { name: 'Go home' }).click()
  await expect(errorScreen(page)).toHaveCount(0)
})
