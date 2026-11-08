import { expect, test, type Page } from '@playwright/test'

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
