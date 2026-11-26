import { expect, test, type Page } from './frameFixture.ts'
import { sidebar } from './helpers.ts'

// Task H: two "November 2026" month pages in the one Journal become one,
// with nothing lost, a quiet toast and Undo (switch journal.monthRepair).
const NOV_3 = new Date(2026, 10, 3, 10, 0)

/** A second November month page with one day under it, as sync can leave it. */
async function addSecondNovember(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction('pages', 'readwrite')
          const store = tx.objectStore('pages')
          const all = store.getAll()
          all.onsuccess = () => {
            const pages = all.result as {
              id: string
              notebookId: string
              journalMonth?: string
              parentId: string | null
              order: string
              createdAt: number
            }[]
            const month = pages.find((p) => p.journalMonth === '2026-11')!
            const now = month.createdAt + 60_000
            const base = {
              notebookId: month.notebookId,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
            }
            store.put({
              ...base,
              id: 'second-november',
              parentId: null,
              title: 'November 2026',
              order: `${month.order}V`,
              journalMonth: '2026-11',
            })
            store.put({
              ...base,
              id: 'second-november-day',
              parentId: 'second-november',
              title: 'Monday, 9 November 2026',
              order: 'a0',
              journalDate: '2026-11-09',
            })
          }
          tx.oncomplete = () => {
            open.result.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
  )
}

test('two month pages of the same month are joined, with Undo', async ({
  page,
}) => {
  await page.clock.setFixedTime(NOV_3)
  await page.goto('/?flags=journal.monthRepair')
  await page.getByRole('button', { name: 'Open today’s journal' }).click()
  const side = sidebar(page)
  const months = side.getByRole('button', {
    name: 'November 2026',
    exact: true,
  })
  await expect(months).toHaveCount(1)

  await addSecondNovember(page)
  await page.reload()
  const toast = page.getByRole('status').filter({ hasText: 'Journal tidied' })
  await expect(toast).toContainText(
    'Journal tidied: two November 2026 pages joined',
    { timeout: 15_000 },
  )
  await expect(months).toHaveCount(1)
  // Both days are under the one month: nothing lost.
  await expect(side.getByRole('button', { name: /9 Nov$/ })).toBeVisible()
  await expect(side.getByRole('button', { name: /3 Nov$/ })).toBeVisible()
  // The backup was saved first: both month pages and both days, as they were.
  const backup = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('learning-notes:journalRepair:backup') ?? 'null',
    ),
  )
  const saved = backup.groups[0].pages as { id: string; parentId: string }[]
  expect(saved.map((p) => p.id)).toContain('second-november')
  expect(saved.find((p) => p.id === 'second-november-day')?.parentId).toBe(
    'second-november',
  )
  expect(saved).toHaveLength(4)

  // Undo puts the two pages back, and this device does not join them again.
  await toast.getByRole('button', { name: 'Undo' }).click()
  await expect(months).toHaveCount(2)
  await page.reload()
  await page.waitForTimeout(5000) // past the repair's quiet wait
  await expect(toast).toHaveCount(0)
  await expect(months).toHaveCount(2)
})

test('with the switch OFF nothing changes', async ({ page }) => {
  await page.clock.setFixedTime(NOV_3)
  await page.goto('/')
  await page.getByRole('button', { name: 'Open today’s journal' }).click()
  await addSecondNovember(page)
  await page.reload()
  await page.waitForTimeout(5000) // past the repair's quiet wait
  await expect(
    page.getByRole('status').filter({ hasText: 'Journal tidied' }),
  ).toHaveCount(0)
  await expect(
    sidebar(page).getByRole('button', { name: 'November 2026', exact: true }),
  ).toHaveCount(2)
})
