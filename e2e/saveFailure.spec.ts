import { expect, test, type Page } from '@playwright/test'
import { addPage, createNotebook, openPage } from './helpers.ts'

/** Makes writes to the notes table fail, as a browser database crash would. */
const breakSaving = (page: Page, broken: boolean) =>
  page.evaluate((on) => {
    const proto = IDBObjectStore.prototype as IDBObjectStore & {
      realPut?: IDBObjectStore['put']
    }
    proto.realPut ??= proto.put
    proto.put = function (this: IDBObjectStore, ...args) {
      if (on && this.name === 'blocks') {
        throw new DOMException('Internal error', 'UnknownError')
      }
      return proto.realPut!.apply(this, args)
    } as IDBObjectStore['put']
  }, broken)

/** Words saved in the app database. */
const storedText = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const all = open.result
            .transaction('blocks')
            .objectStore('blocks')
            .getAll()
          all.onsuccess = () => {
            open.result.close()
            resolve(JSON.stringify(all.result.map((b) => b.content)))
          }
        }
      }),
  )

const notice = (page: Page) =>
  page.getByRole('alert').filter({ hasText: 'Not saved yet' })

test('a failed save shows a lasting notice and is retried', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'First page')
  await breakSaving(page, true)
  await page.locator('.bn-editor').click()
  await page.keyboard.type('must not vanish')
  await expect(notice(page)).toBeVisible()
  expect(await storedText(page)).not.toContain('must not vanish')

  await breakSaving(page, false)
  await notice(page).getByRole('button', { name: 'Try again' }).click()
  await expect(notice(page)).toHaveCount(0)
  expect(await storedText(page)).toContain('must not vanish')
})

test('typing whose save failed survives leaving the page', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Test NB', 'First page')
  await addPage(page, 'Test NB', 'Second page')
  await openPage(page, 'First page')
  await breakSaving(page, true)
  await page.locator('.bn-editor').click()
  await page.keyboard.type('kept while leaving')
  await expect(notice(page)).toBeVisible()

  await openPage(page, 'Second page')
  await expect(notice(page)).toBeVisible() // still not saved
  await breakSaving(page, false)
  await notice(page).getByRole('button', { name: 'Try again' }).click()
  await expect(notice(page)).toHaveCount(0)
  await openPage(page, 'First page')
  await expect(page.locator('.bn-editor')).toContainText('kept while leaving')
})
