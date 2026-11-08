import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'
import { pageAction } from './helpers.ts'
import {
  enterCode,
  lockScreen,
  openLockSettings,
  setCode,
} from './lockHelpers.ts'

/** R8-6: AI does not read a locked page unless the notebook allows it. */

test.use({ viewport: { width: 1200, height: 800 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openBook(page: Page) {
  await space(page, 'Library').click()
  await page
    .getByTestId('source-card')
    .getByRole('button', { name: 'Cell Book' })
    .click()
}

async function toggle(page: Page, name: string) {
  const sw = page.getByRole('switch', { name })
  await sw.focus()
  await page.keyboard.press('Space')
  await expect(sw).toBeChecked()
}

test('a locked page is not sent to AI until the notebook allows it', async ({
  page,
}) => {
  const calls: string[] = []
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    calls.push(route.request().postData() ?? '')
    return route.fulfill({
      json: {
        content: [{ type: 'text', text: 'Locked page summary.' }],
        usage: { input_tokens: 50, output_tokens: 10 },
      },
    })
  })
  await page.goto('/')
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'b.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(['Cells make energy in mitochondria'], {
      title: 'Cell Book',
    }),
  })
  await page.goto('/#/settings/ai')
  await page.getByTestId('ai-enable').check()
  await page.getByTestId('ai-key').fill('sk-ant-test-1234567890')
  await page.getByTestId('ai-key-save').click()
  await expect(page.getByTestId('ai-key-masked')).toBeVisible()
  await page.goto('/#/settings/permissions')
  // The new switch only shows once AI is allowed for the notebook.
  await expect(page.getByTestId('ai-allow-locked')).toHaveCount(0)
  await toggle(page, 'Allow AI in Books')
  await expect(page.getByTestId('ai-allow-locked')).toHaveCount(1)
  await expect(page.getByTestId('ai-allow-locked')).not.toBeChecked()

  await page.goto('/')
  await openLockSettings(page)
  await setCode(page, 'PIN', '4821')
  await openBook(page)
  await expect(page.getByTestId('book-continue')).toBeVisible()
  await pageAction(page, 'Lock this page')
  await enterCode(page, '4821')
  await expect(lockScreen(page)).toHaveCount(0)

  await page.getByTestId('ai-summary').click()
  await expect(page.getByRole('status')).toContainText('This page is locked')
  expect(calls).toHaveLength(0)

  await page.goto('/#/settings/permissions')
  await toggle(page, 'Allow AI while locked for Books')
  await page.goto('/')
  await openBook(page)
  await enterCode(page, '4821')
  await page.getByTestId('ai-summary').click()
  await page.getByTestId('ai-privacy-ok').click()
  await expect(page.getByTestId('ai-preview-text')).toContainText(
    'Locked page summary.',
  )
  expect(calls).toHaveLength(1)
})
