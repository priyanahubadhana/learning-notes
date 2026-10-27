import { expect, test, type Page } from '@playwright/test'
import { createNotebook, sidebar } from './helpers.ts'

/** Pretends the app was first used 8 days ago. */
async function makeOld(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction('meta', 'readwrite')
          tx.objectStore('meta').put({
            id: 'backupReminder',
            value: { firstSeenAt: Date.now() - 8 * 24 * 3600 * 1000 },
          })
          tx.oncomplete = () => {
            open.result.close()
            resolve()
          }
        }
      }),
  )
}

const bar = (page: Page) =>
  page.getByRole('region', { name: 'Backup reminder' })

test('no reminder in the first week', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Fresh', 'Page')
  await page.reload()
  await expect(sidebar(page)).toBeVisible()
  await expect(bar(page)).toHaveCount(0)
})

test('after a week: Remind me later hides it, saving a backup file ends it', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Old', 'Page')
  await makeOld(page)
  await page.reload()
  await expect(bar(page)).toBeVisible()

  await bar(page).getByRole('button', { name: 'Remind me later' }).click()
  await expect(bar(page)).toHaveCount(0)
  await page.reload()
  await expect(sidebar(page)).toBeVisible()
  await expect(bar(page)).toHaveCount(0)

  await makeOld(page)
  await page.reload()
  await bar(page).getByRole('button', { name: 'Save backup now' }).click()
  await expect(
    page.getByRole('heading', { name: 'Backup & files', level: 1 }),
  ).toBeVisible()
  await expect(bar(page)).toHaveCount(0) // not shown on that screen
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Save everything' }).click()
  await downloading
  await sidebar(page).getByRole('button', { name: 'Settings' }).click()
  await expect(bar(page)).toHaveCount(0)
})
