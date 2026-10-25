import { expect, test } from '@playwright/test'
import {
  createNotebook,
  row,
  rowAction,
  sidebar,
  slashCommand,
  templateNames,
  typeInEditor,
} from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('starter templates are listed; Daily journal cannot be deleted', async ({
  page,
}) => {
  await expect
    .poll(() => templateNames(page))
    .toEqual([
      'Daily journal',
      'Study notes',
      'Meeting notes',
      'Reading notes',
      'Project plan',
      'Lesson',
      'Lesson (large topic)',
    ])
  await row(page, 'Daily journal').hover()
  await expect(
    row(page, 'Daily journal').getByTitle('Delete template'),
  ).toHaveCount(0)
  await expect(
    row(page, 'Study notes').getByTitle('Delete template'),
  ).toHaveCount(1)
})

test('+ menu: new page from a template', async ({ page }) => {
  await createNotebook(page, 'Notes', 'First')
  await rowAction(page, 'Notes', 'Add page')
  await page.getByRole('menuitem', { name: 'From template…' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Study notes/ })
    .click()

  await expect(page.getByRole('textbox', { name: 'Page title' })).toBeFocused()
  await expect(page.locator('.bn-editor')).toContainText('Key ideas')
  await expect(page.getByRole('status')).toContainText(
    'New page from “Study notes”',
  )
})

test('"/" menu: insert a template at the cursor', async ({ page }) => {
  await createNotebook(page, 'Notes', 'Meeting')
  await slashCommand(page, 'insert')
  await page
    .getByRole('dialog', { name: 'Insert a template' })
    .getByRole('button', { name: /Meeting notes/ })
    .click()
  await expect(page.locator('.bn-editor')).toContainText('Action items')
})

test('Save as template from the action bar and from the "/" menu', async ({
  page,
}) => {
  await createNotebook(page, 'Notes', 'My method')
  await typeInEditor(page, 'Step one')

  await page.getByRole('button', { name: 'Save as template' }).click()
  await expect(page.getByRole('status')).toContainText(
    'Saved “My method” as a template',
  )
  await expect.poll(() => templateNames(page)).toContain('My method')

  await slashCommand(page, 'save page')
  await expect
    .poll(async () =>
      (await templateNames(page)).filter((n) => n === 'My method'),
    )
    .toHaveLength(2)

  // A template opens like a page, with a banner and its content.
  await sidebar(page)
    .locator('div.group')
    .filter({ has: page.locator('span', { hasText: /^📋$/ }) })
    .getByRole('button', { name: 'My method' })
    .first()
    .click()
  await expect(page.getByText('New pages copy this')).toBeVisible()
  await expect(page.locator('.bn-editor')).toContainText('Step one')
  await expect(
    page.getByRole('button', { name: 'Save as template' }),
  ).toHaveCount(0)
})

test('"New page from this template" makes a page in the first notebook', async ({
  page,
}) => {
  await createNotebook(page, 'Notes', 'First')
  await sidebar(page).getByRole('button', { name: 'Reading notes' }).click()
  await page
    .getByRole('button', { name: 'New page from this template' })
    .click()

  await expect(
    page.getByRole('navigation', { name: 'Breadcrumb' }),
  ).toContainText('Notes')
  await expect(page.locator('.bn-editor')).toContainText('Highlights')
})

test('Import and Export are shown but disabled (coming soon)', async ({
  page,
}) => {
  await createNotebook(page, 'Notes', 'First')
  for (const name of [/Import/, /Export/]) {
    const button = page.getByRole('button', { name })
    await expect(button).toBeVisible()
    await expect(button).toBeDisabled()
    await expect(button).toContainText('Soon')
  }
})
