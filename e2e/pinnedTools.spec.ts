import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { barMenu, mainBar } from './mainBarHelpers.ts'

/**
 * Pinned tools (R7-12): a newly pinned tool goes first, and the pinned list
 * can be re-ordered with ↑ ↓ (drag is in editToolbar.spec.ts).
 */

const panel = (page: Page) => page.getByRole('dialog', { name: 'Search' })
const names = (page: Page) =>
  mainBar(page)
    .getByRole('button')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))

async function pin(page: Page, text: string, label: RegExp) {
  await page.keyboard.press('Control+Shift+K')
  await panel(page).getByRole('button', { name: 'Features' }).click()
  await panel(page)
    .getByRole('combobox', { name: 'Search everything' })
    .fill(text)
  await panel(page).getByRole('button', { name: label }).click()
  await page.keyboard.press('Escape')
}

test('a newly pinned tool goes first; ↑ ↓ re-order the pinned list', async ({
  page,
}) => {
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await pin(page, 'write pad', /^Pin Write pad to the bar/)
  await pin(page, 'heading 1', /^Pin Heading 1 to the bar/)
  // After Undo and Redo (not in this list): the newest pin first.
  const bar = await names(page)
  expect(bar.indexOf('Heading 1')).toBeLessThan(bar.indexOf('Write pad'))
  expect(bar.indexOf('Heading 1')).toBeLessThan(bar.indexOf('Text'))

  await barMenu(page).click()
  await page.getByRole('button', { name: 'Bar settings…' }).click()
  const group = page.getByRole('group', { name: 'Edit bar' })
  await group.getByRole('button', { name: 'Move Heading 1 later' }).click()
  const after = await names(page)
  expect(after.indexOf('Write pad')).toBeLessThan(after.indexOf('Heading 1'))
})
