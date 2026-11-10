// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { createNotebook, typeInEditor } from './helpers.ts'

/**
 * Bug batch item 5 (rest): rows of a BlockNote table never sit in the gap
 * between two sheets; they continue on the next sheet.
 */
test.use({ viewport: { width: 1336, height: 1100 } })

test('a long table is split at its rows: no row crosses a sheet gap', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Table rows')
  await typeInEditor(page, 'Start')
  await page.locator('.bn-editor').first().click()
  await page.evaluate(() => {
    const el = document.querySelector('.bn-editor') as HTMLElement
    const data = new DataTransfer()
    const rows = Array.from(
      { length: 70 },
      (_, i) => `<tr><td>Row ${i + 1}</td><td>cell b</td></tr>`,
    ).join('')
    data.setData('text/html', `<table><tbody>${rows}</tbody></table>`)
    data.setData(
      'text/plain',
      Array.from({ length: 70 }, (_, i) => `Row ${i + 1}\tcell b`).join('\n'),
    )
    el.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    )
  })
  await expect(page.locator('[data-paper-sheet="2"]')).toBeVisible()
  await expect(page.locator('.bn-editor table tr').first()).toBeVisible()
  await page.waitForTimeout(800)
  const r = await page.evaluate(() => {
    const sheets = [...document.querySelectorAll('[data-paper-sheet]')].map(
      (s) => s.getBoundingClientRect(),
    )
    const gaps = sheets
      .slice(0, -1)
      .map((s, i) => ({ top: s.bottom, bottom: sheets[i + 1].top }))
    const rows = [
      ...document.querySelectorAll(
        '.bn-editor table tr:not([data-ln-row-spacer])',
      ),
    ]
    const bad: string[] = []
    for (const tr of rows) {
      const b = tr.getBoundingClientRect()
      for (const g of gaps)
        if (b.top < g.bottom - 0.5 && b.bottom > g.top + 0.5)
          bad.push(tr.textContent ?? '')
    }
    return { rows: rows.length, bad }
  })
  expect(r.rows).toBeGreaterThan(40)
  expect(r.bad).toEqual([])
})
