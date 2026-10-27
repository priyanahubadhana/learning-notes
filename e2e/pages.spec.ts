import { expect, test } from '@playwright/test'
import {
  addPage,
  createNotebook,
  openPage,
  row,
  rowAction,
  sidebar,
} from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('move a sub-page to the top level, keeping its own sub-pages', async ({
  page,
}) => {
  await createNotebook(page, 'Test NB', 'A')
  await addPage(page, 'Test NB', 'B')
  await addPage(page, 'A', 'A1', 'sub-page')
  await addPage(page, 'A1', 'A1x', 'sub-page')

  // Only sub-pages offer the option.
  await row(page, 'A').hover()
  await expect(row(page, 'A').getByLabel('Move to top level')).toHaveCount(0)

  await rowAction(page, 'A1', 'Move to top level')

  // Top level is now A, B, A1 (A1 at the end), and A1 keeps its sub-page.
  const topLevel = sidebar(page)
    .locator('div.group')
    .filter({ hasNot: page.getByLabel('Move to top level') })
    .filter({ has: page.getByLabel('Add sub-page') })
  await expect(topLevel.getByRole('button', { name: /^(A|B|A1)$/ })).toHaveText(
    ['A', 'B', 'A1'],
  )
  await expect(row(page, 'A1x').getByLabel('Move to top level')).toHaveCount(1)

  // The breadcrumb follows the move.
  await openPage(page, 'A1x')
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(
    'Test NB/A1/A1x',
  )
})

test('changes kept when a tab was closed come back when the page opens', async ({
  page,
}) => {
  await createNotebook(page, 'Stash NB', 'Stash page')
  const id = new URL(page.url()).hash.split('/')[2]
  await page.evaluate((pageId) => {
    localStorage.setItem(
      `learning-notes:pending:${pageId}`,
      JSON.stringify({
        savedAt: Date.now(),
        changes: {
          upserts: [
            {
              id: crypto.randomUUID(),
              parentId: null,
              type: 'paragraph',
              content: {
                text: [{ type: 'text', text: 'Last words', styles: {} }],
              },
              order: 'a0',
            },
          ],
          deletes: [],
        },
      }),
    )
  }, id)
  await page.reload()
  await expect(page.locator('.bn-editor')).toContainText('Last words')
})
