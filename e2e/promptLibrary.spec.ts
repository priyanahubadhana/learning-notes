import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'

/** Prompt library and skills (queue 3b). AI is mocked; nothing leaves the test. */

test.use({ viewport: { width: 1200, height: 800 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openLibrary(page: Page) {
  await page.goto('/')
  await space(page, 'Library').click()
  await page.getByTestId('ai-prompts').click()
  await expect(page.getByTestId('prompts-dialog')).toBeVisible()
  await expect(page.getByTestId('prompt-row').first()).toBeVisible()
}

test('library: seeded prompts, search, filter, new prompt, edit keeps a version', async ({
  page,
}) => {
  await openLibrary(page)
  const dialog = page.getByTestId('prompts-dialog')
  await dialog.getByTestId('prompt-search').fill('quiz')
  await expect(dialog.getByTestId('prompt-row').first()).toContainText(
    'Quiz me',
  )
  await dialog.getByTestId('prompt-search').fill('')
  await dialog.getByRole('combobox', { name: 'Purpose' }).selectOption('plan')
  await expect(dialog.getByTestId('prompt-row')).toHaveCount(1)
  await dialog.getByRole('combobox', { name: 'Purpose' }).selectOption('')

  await dialog.getByTestId('prompt-new').click()
  await dialog.getByTestId('prompt-name').fill('Check my maths')
  await dialog.getByTestId('prompt-subjects').fill('Maths, exam')
  await dialog.getByTestId('prompt-text').fill('Check each step.')
  await dialog.getByTestId('prompt-save').click()
  await dialog.getByTestId('prompt-search').fill('maths')
  await expect(dialog.getByTestId('prompt-row')).toHaveCount(1)

  // Editing the text keeps the old text as a version.
  await dialog.getByRole('button', { name: 'Edit Check my maths' }).click()
  await dialog.getByTestId('prompt-text').fill('Check each step twice.')
  await dialog.getByTestId('prompt-save').click()
  await dialog.getByRole('button', { name: 'Edit Check my maths' }).click()
  await expect(dialog.getByText('1 earlier version')).toBeVisible()
})

/** Settings > AI: on, one key, and the Books notebook allowed. */
async function setUpAi(page: Page) {
  await page.goto('/#/settings/ai')
  await expect(page.getByTestId('ai-section')).toBeVisible()
  await page.getByTestId('ai-enable').check()
  await page.getByTestId('ai-key').fill('sk-ant-test-1234567890')
  await page.getByTestId('ai-key-save').click()
  await expect(page.getByTestId('ai-key-masked')).toContainText('sk-…7890')
  await page.goto('/#/settings/permissions')
  const sw = page.getByRole('switch', { name: 'Allow AI in Books' })
  await sw.focus()
  await page.keyboard.press('Space')
  await expect(sw).toBeChecked()
}

/** Imports a small PDF book and opens its page. */
async function bookPage(page: Page) {
  await page.goto('/')
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'b.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(['Cells make energy in mitochondria'], {
      title: 'Cell Book',
    }),
  })
  await page
    .getByTestId('source-card')
    .getByRole('button', { name: 'Cell Book' })
    .click()
  await expect(page.getByTestId('book-continue')).toBeVisible()
}

test('run a prompt on a page: cost in rupees first, only the page words sent, rate, add, Undo', async ({
  page,
}) => {
  const bodies: string[] = []
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    bodies.push(route.request().postData() ?? '')
    return route.fulfill({
      json: {
        content: [{ type: 'text', text: 'Mitochondria make energy.' }],
        usage: { input_tokens: 90, output_tokens: 12 },
      },
    })
  })
  await bookPage(page)
  await setUpAi(page)
  await space(page, 'Library').click()
  await page
    .getByTestId('source-card')
    .getByRole('button', { name: 'Cell Book' })
    .click()
  await page.getByTestId('ai-prompts').click()
  const dialog = page.getByTestId('prompts-dialog')
  await dialog.getByTestId('prompt-search').fill('summarise')
  await dialog.getByTestId('prompt-row').first().click()
  // The cost is shown before anything is sent.
  await expect(dialog.getByTestId('cost-line')).toContainText('₹')
  await expect(dialog.getByTestId('cost-line')).toContainText('tokens')
  await expect(dialog.getByTestId('cost-line')).toContainText(
    'Claude Haiku 5.5',
  )
  expect(bodies).toHaveLength(0)
  await expect(dialog.getByTestId('input-status')).toBeVisible()
  await dialog.getByTestId('run-ai').click()
  await dialog.getByTestId('ai-privacy-ok').click()
  await expect(dialog.getByTestId('run-answer')).toHaveValue(
    'Mitochondria make energy.',
  )
  expect(bodies).toHaveLength(1)
  expect(bodies[0]).toContain('Summarise the text')
  await dialog.getByRole('button', { name: '4 stars' }).click()
  await dialog.getByTestId('run-apply').click()
  await expect(
    page.getByRole('main').getByText('Mitochondria make energy.'),
  ).toBeVisible()
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(
    page.getByRole('main').getByText('Mitochondria make energy.'),
  ).toHaveCount(0)
})
