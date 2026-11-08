// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, openSidebar } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')

/** Opens "Databases" and makes a Books database with one row, "Dune". */
async function newBooks(page: Page) {
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Databases' })
    .click()
  await main(page).getByRole('button', { name: '+ New database' }).click()
  await page.getByRole('menuitem', { name: /^Books/ }).click()
  await main(page).getByRole('button', { name: '+ New row' }).click()
  await page.getByRole('textbox', { name: /^Title/ }).fill('Dune')
  await page.getByRole('textbox', { name: /^Title/ }).press('Enter')
}

/** Copies the first row of the database `count` times (straight into IndexedDB). */
async function seedRows(page: Page, count: number) {
  await page.evaluate(
    (n) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const idb = open.result
          const tx = idb.transaction('pages', 'readwrite')
          const store = tx.objectStore('pages')
          const all = store.getAll()
          all.onsuccess = () => {
            const first = (all.result as Record<string, unknown>[]).find(
              (p) => p.databaseId && p.title === 'Dune',
            )!
            for (let i = 0; i < n; i++) {
              store.put({
                ...first,
                id: `bulk-${i}`,
                title: `Row ${String(i).padStart(5, '0')}`,
                order: `z${String(i).padStart(6, '0')}`,
              })
            }
          }
          tx.oncomplete = () => {
            idb.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
    count,
  )
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
})

test('Table with 3,000 rows draws only the rows near the screen and scrolls to the end', async ({
  page,
}) => {
  await newBooks(page)
  await seedRows(page, 3000)
  await page.reload()
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Databases' })
    .click()
  await main(page)
    .getByRole('button', { name: /^Books/ })
    .click()
  await main(page).getByRole('button', { name: 'Table', exact: true }).click()
  const rows = main(page).getByRole('rowheader')
  await expect(rows.first()).toBeVisible()
  expect(await rows.count()).toBeLessThan(150)
  await page.evaluate(() => {
    for (let p = document.querySelector('table')?.parentElement; p;) {
      p.scrollTop = p.scrollHeight
      p = p.parentElement
    }
    window.scrollTo(0, document.body.scrollHeight)
  })
  await expect(
    main(page)
      .getByRole('rowheader', { name: /Row 029\d\d/ })
      .first(),
  ).toBeVisible()
  expect(await rows.count()).toBeLessThan(150)
})

test('Group by Status in Table and List, and collapse a group', async ({
  page,
}) => {
  await newBooks(page)
  await main(page).getByRole('combobox', { name: 'Group by' }).selectOption({
    label: 'Status',
  })
  const group = main(page).getByRole('button', { name: /^Collapse / })
  await expect(group.first()).toBeVisible()
  await group.first().click()
  await expect(
    main(page)
      .getByRole('button', { name: /^Expand / })
      .first(),
  ).toBeVisible()

  await main(page).getByRole('button', { name: '+ View' }).click()
  await page
    .getByRole('dialog', { name: 'Add a view' })
    .getByRole('button', { name: 'List' })
    .click()
  await expect(
    main(page).getByRole('button', { name: 'List', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(main(page).getByRole('button', { name: /Dune/ })).toBeVisible()
  await main(page).getByRole('combobox', { name: 'Group by' }).selectOption({
    label: 'Status',
  })
  await expect(
    main(page).getByRole('button', { name: /^Collapse No value/ }),
  ).toBeVisible()
})
