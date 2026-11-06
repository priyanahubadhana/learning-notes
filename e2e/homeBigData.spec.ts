// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { closeCorner } from './helpers.ts'

/** Polish 1 · item 5: Home opens fast with years of finished tasks. */

test('Home opens fast with 5,000 tasks (4,950 of them done long ago)', async ({
  page,
}) => {
  await page.goto('/')
  await closeCorner(page)
  // Seed the database directly: 50 open tasks and 4,950 old done ones.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('tasks', 'readwrite')
          const store = tx.objectStore('tasks')
          const now = Date.now()
          for (let i = 0; i < 5000; i++) {
            const done = i >= 50
            store.put({
              id: `bulk-${i}`,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
              title: `Task ${i}`,
              status: done ? 'done' : 'open',
              quadrant: 0,
              order: String(i).padStart(6, '0'),
              carried: [],
              ...(done ? { doneDay: '2020-01-01', doneAt: now } : {}),
            })
          }
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
  )
  await page.reload()
  await closeCorner(page)

  await page.locator('[data-space="home"]').waitFor()
  const ms = await page.evaluate(async () => {
    const t0 = performance.now()
    document.querySelector<HTMLElement>('[data-space="home"]')!.click()
    for (;;) {
      if (document.querySelector('[data-testid="home-screen"]')) break
      await new Promise((r) => requestAnimationFrame(r))
    }
    await new Promise((r) => requestAnimationFrame(r))
    return performance.now() - t0
  })
  await expect(page.getByTestId('home-screen')).toBeVisible()
  // The Tasks tab shows the 50 open tasks, not the old finished ones.
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  await expect(page.getByTestId('task-row')).toHaveCount(50)
  expect(ms).toBeLessThan(300)
  // "Show older" brings them back.
  await page.getByTestId('completed-older').click()
  await expect(page.getByTestId('task-row')).toHaveCount(5000)
})
