import { expect, test, type Page } from '@playwright/test'
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
    for (const n of ['backup', 'auto-1', 'auto-2', 'auto-3'])
      await wait(indexedDB.deleteDatabase('learning-notes-' + n))
    localStorage.removeItem('learning-notes:backup.auto')
    const open = indexedDB.open('learning-notes', 70)
    open.onupgradeneeded = () => {
      open.result.createObjectStore('cards', { keyPath: 'id' })
      open.result.createObjectStore('reviewLogs', { keyPath: 'id' })
      open.result.createObjectStore('images', { keyPath: 'id' })
    }
    const db = (await wait(open)) as IDBDatabase
    const tx = db.transaction(['cards', 'reviewLogs', 'images'], 'readwrite')
    tx.objectStore('images').put({
      id: 'img1',
      type: 'image/png',
      data: new Uint8Array([104, 105]).buffer,
    })
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

test('an upgrade backs up silently (no question), keeps every row and the bar', async ({
  page,
}) => {
  await page.goto('/favicon.svg')
  await page.evaluate(() =>
    localStorage.setItem(
      'learning-notes:toolbar.main',
      JSON.stringify(['text', 'pen', 'read']),
    ),
  )
  await reloadWithOldDatabase(page)
  await expect(sidebar(page)).toBeVisible()
  await expect(dialog(page)).toHaveCount(0)

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
    const backup = await open('learning-notes-auto-1')
    return {
      version: app.version,
      card: await get(app, 'cards', 'c1'),
      log: await get(app, 'reviewLogs', 'l1'),
      backedUp: await get(backup, 'tables', 'cards'),
      bar: localStorage.getItem('learning-notes:toolbar.main'),
    }
  })
  // Upgraded (v8 copied the newest answer onto the card; v9 added a column) …
  expect(result.version).toBeGreaterThanOrEqual(140)
  expect(result.card).toMatchObject({ lastReviewAt: 5, lastRating: 'good' })
  expect(result.log).toMatchObject({ id: 'l1' })
  // … the silent browser backup holds the data as it was before …
  expect(result.backedUp).toEqual([{ id: 'c1', due: 1, notebookId: 'nb' }])
  // … and the owner's bar layout is untouched.
  expect(JSON.parse(result.bar ?? '[]').slice(0, 3)).toEqual([
    'text',
    'pen',
    'read',
  ])

  // Next start: nothing to upgrade, no question.
  await page.reload()
  await expect(sidebar(page)).toBeVisible()
  await expect(dialog(page)).toHaveCount(0)
})
