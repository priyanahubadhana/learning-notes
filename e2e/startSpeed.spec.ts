import { expect, test, type Page } from '@playwright/test'
import { sidebar } from './helpers.ts'

/**
 * perf-start: the first start used to write ~600 starter records one by one
 * and wait for them (about 14 s on iPad Safari). They are now written in the
 * background, one bulk write per table for each starter. The app must be
 * ready fast, and every starter template must still arrive.
 */

const counts = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<{ pages: number; blocks: number }>((resolve, reject) => {
        void indexedDB.databases().then((dbs) => {
          const req = indexedDB.open(dbs[0]?.name as string)
          req.onerror = () => reject(req.error)
          req.onsuccess = () => {
            const d = req.result
            const out = { pages: 0, blocks: 0 }
            const tx = d.transaction(['pages', 'blocks'], 'readonly')
            tx.objectStore('pages').count().onsuccess = (e) => {
              out.pages = (e.target as IDBRequest<number>).result
            }
            tx.objectStore('blocks').count().onsuccess = (e) => {
              out.blocks = (e.target as IDBRequest<number>).result
            }
            tx.oncomplete = () => {
              d.close()
              resolve(out)
            }
          }
        })
      }),
  )

test('first start is ready fast and still gets every starter template', async ({
  page,
}) => {
  const t0 = Date.now()
  await page.goto('/')
  await sidebar(page).waitFor({ state: 'attached', timeout: 40000 })
  const ms = Date.now() - t0
  console.log(`START-MS ${ms}`)
  expect(ms).toBeLessThan(4000)

  await expect
    .poll(async () => (await counts(page)).pages, { timeout: 60000 })
    .toBeGreaterThanOrEqual(16)
  const done = await counts(page)
  console.log(`SEEDED-MS ${Date.now() - t0} ${JSON.stringify(done)}`)
  expect(done.blocks).toBeGreaterThanOrEqual(112)

  // A second start finds everything in place and adds nothing.
  await page.reload()
  await sidebar(page).waitFor({ state: 'attached' })
  await page.waitForTimeout(1500)
  expect(await counts(page)).toEqual(done)
})
