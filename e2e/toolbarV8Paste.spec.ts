// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Toolbar v8, slice 1d: the selection bar's Paste uses the one paste planner
 * and Settings > General > "Paste as" (decided 13 Nov 2026, PM-40 to PM-46).
 */
test.use({
  viewport: { width: 1180, height: 820 },
  hasTouch: true,
  permissions: ['clipboard-read', 'clipboard-write'],
})

async function open(page: Page, mode: 'keep' | 'plain') {
  await page.addInitScript((m) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: [] }),
    )
    localStorage.setItem('learning-notes:general.pasteMode', `"${m}"`)
  }, mode)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-lasso').click()
  await page.getByText('The nucleus holds the DNA').click({ force: true })
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home')
  await expect(page.getByTestId('v8-selbar')).toBeVisible()
  await page.evaluate(async () => {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob(
          ['<p>Plain and <b>strong words</b></p><ul><li>first item</li></ul>'],
          { type: 'text/html' },
        ),
        'text/plain': new Blob(['Plain and strong words\nfirst item'], {
          type: 'text/plain',
        }),
      }),
    ])
  })
}

test('TB-33 the bar Paste keeps bold and a list (Keep original)', async ({
  page,
}) => {
  await open(page, 'keep')
  await page.getByTestId('v8-sel-paste').click()
  await expect(page.locator('.bn-editor strong')).toContainText('strong words')
  await expect(
    page.locator('.bn-editor [data-content-type="bulletListItem"]'),
  ).toContainText('first item')
})

test('TB-33 the bar Paste obeys "Paste as" plain text: no bold, no list', async ({
  page,
}) => {
  await open(page, 'plain')
  await page.getByTestId('v8-sel-paste').click()
  await expect(page.locator('.bn-editor')).toContainText('strong words')
  await expect(page.locator('.bn-editor strong')).toHaveCount(0)
  await expect(
    page.locator('.bn-editor [data-content-type="bulletListItem"]'),
  ).toHaveCount(0)
})
