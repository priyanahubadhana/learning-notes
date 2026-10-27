import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { sidebar } from './helpers.ts'

/**
 * Replaces the app's database with one saved by an older version (Dexie
 * version 7 = IndexedDB version 70) holding one answered card, then opens the app.
 */
async function reloadWithOldDatabase(page: Page) {
  // A plain file of the same site: the app is not running, so nothing holds
  // or reopens the database while it is replaced.
  await page.goto('/favicon.svg')
  await page.evaluate(async () => {
    const wait = (r: IDBRequest | IDBOpenDBRequest) =>
      new Promise((resolve, reject) => {
        r.onsuccess = () => resolve(r.result)
        r.onerror = () => reject(r.error)
      })
    await wait(indexedDB.deleteDatabase('learning-notes'))
    await wait(indexedDB.deleteDatabase('learning-notes-backup'))
    const open = indexedDB.open('learning-notes', 70)
    open.onupgradeneeded = () => {
      open.result.createObjectStore('cards', { keyPath: 'id' })
      open.result.createObjectStore('reviewLogs', { keyPath: 'id' })
    }
    const db = (await wait(open)) as IDBDatabase
    const tx = db.transaction(['cards', 'reviewLogs'], 'readwrite')
    tx.objectStore('cards').put({ id: 'c1', due: 1, notebookId: 'nb' })
    tx.objectStore('reviewLogs').put({
      id: 'l1',
      cardId: 'c1',
      rating: 'good',
      createdAt: 5,
    })
    await new Promise((resolve) => (tx.oncomplete = resolve))
    db.close()
  })
  await page.goto('/')
}

const dialog = (page: Page) =>
  page.getByRole('dialog', { name: 'Updating how your notes are stored' })

test('an upgrade first backs up the data, then opens the app', async ({
  page,
}) => {
  await reloadWithOldDatabase(page)
  await expect(dialog(page)).toContainText('backup copy of everything')
  await page.screenshot({ path: 'test-results/screens/upgrade-backup.png' })

  const downloading = page.waitForEvent('download')
  await dialog(page)
    .getByRole('button', { name: 'Save backup file and update' })
    .click()
  const file = await downloading
  expect(file.suggestedFilename()).toMatch(
    /^learning-notes-backup-v7-\d{4}-\d\d-\d\d\.json$/,
  )
  const saved = JSON.parse(await readFile(await file.path(), 'utf8'))
  expect(saved).toMatchObject({ version: 7, tables: { cards: [{ id: 'c1' }] } })

  await expect(sidebar(page)).toBeVisible()
  const result = await page.evaluate(async () => {
    const open = (name: string) =>
      new Promise<IDBDatabase>((resolve) => {
        const r = indexedDB.open(name)
        r.onsuccess = () => resolve(r.result)
      })
    const get = (db: IDBDatabase, store: string, key: string) =>
      new Promise<unknown>((resolve) => {
        const r = db.transaction(store).objectStore(store).get(key)
        r.onsuccess = () => resolve(r.result)
      })
    const app = await open('learning-notes')
    const backup = await open('learning-notes-backup')
    return {
      version: app.version,
      card: await get(app, 'cards', 'c1'),
      backedUp: await get(backup, 'tables', 'cards'),
    }
  })
  // Upgraded (v8 copied the newest answer onto the card; v9 added a column) …
  expect(result.version).toBe(110)
  expect(result.card).toMatchObject({ lastReviewAt: 5, lastRating: 'good' })
  // … and the browser backup holds the data as it was before.
  expect(result.backedUp).toEqual([{ id: 'c1', due: 1, notebookId: 'nb' }])

  // Next start: nothing to upgrade, no question.
  await page.reload()
  await expect(sidebar(page)).toBeVisible()
  await expect(dialog(page)).toHaveCount(0)
})

test('the update can go ahead without a file', async ({ page }) => {
  await reloadWithOldDatabase(page)
  await dialog(page)
    .getByRole('button', { name: 'Skip the file, just update' })
    .click()
  await expect(sidebar(page)).toBeVisible()
})
