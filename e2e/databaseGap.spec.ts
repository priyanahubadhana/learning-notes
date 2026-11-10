// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { addPage, createNotebook } from './helpers.ts'

/**
 * Bug batch 1 leftovers (item 48): rows of a database table never sit in the
 * gap between two sheets; they continue on the next sheet.
 */
test.use({ viewport: { width: 1336, height: 1100 } })

test('a long database table is split at its rows: no row crosses a sheet gap', async ({
  page,
}) => {
  test.setTimeout(150_000)
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await addPage(page, 'Cardiology', 'Drug list')
  const start = page.locator('[data-new-page-start]')
  await start.getByRole('button', { name: /^Database page/ }).click()
  const add = page.getByRole('main').getByRole('button', { name: '+ New row' })
  await expect(add).toBeVisible()
  const table = page.getByRole('main').getByRole('button', { name: /Table/ })
  if (await table.first().isVisible()) await table.first().click()
  for (let i = 1; i <= 45; i++) {
    await add.click()
    const name = page.getByRole('textbox', { name: /^(Title|Name)/ })
    await name.fill('Drug ' + i)
    await name.press('Enter')
  }
  await expect(page.locator('[data-paper-sheet="2"]')).toBeVisible()
  await page.waitForTimeout(1200)
  const r = await page.evaluate(() => {
    const sheets = [...document.querySelectorAll('[data-paper-sheet]')].map(
      (s) => s.getBoundingClientRect(),
    )
    const gaps = sheets
      .slice(0, -1)
      .map((s, i) => ({ top: s.bottom, bottom: sheets[i + 1].top }))
    const rows = [...document.querySelectorAll('tr[data-page-row]')]
    const bad: string[] = []
    for (const tr of rows) {
      const b = tr.getBoundingClientRect()
      for (const g of gaps)
        if (b.top < g.bottom - 0.5 && b.bottom > g.top + 0.5)
          bad.push(tr.textContent ?? '')
    }
    return { rows: rows.length, bad }
  })
  expect(r.rows).toBeGreaterThan(30)
  expect(r.bad).toEqual([])
})
