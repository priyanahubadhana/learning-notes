import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  confirmDialog,
  createNotebook,
  openPage,
  rowAction,
  setTitle,
  sidebar,
  slashCommand,
  typeInEditor,
} from './helpers.ts'

const picker = (page: Page) =>
  page.getByRole('dialog', { name: 'Link to a page' })
const linkedFrom = (page: Page) =>
  page.getByRole('region', { name: 'Linked from' })
const editorLink = (page: Page) => page.locator('.bn-editor .note-link')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, '## S2')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Valves closing.')
  await addPage(page, 'Cardiology', 'Murmurs')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('A murmur is systolic; see ')
})

/** Types "[[" and picks the page (and heading) from the picker. */
async function linkWithKeys(page: Page, search: string, heading?: string) {
  await page.keyboard.type('[[')
  await expect(picker(page)).toBeVisible()
  await page.keyboard.type(search)
  await expect(picker(page).getByRole('option').first()).toContainText(
    'Heart sounds',
  )
  if (heading) {
    await page.keyboard.press('ArrowRight')
    await page.keyboard.type(heading)
    await expect(picker(page).getByRole('option').nth(1)).toContainText(heading)
    await page.keyboard.press('ArrowDown') // past "Whole page"
  }
  await page.keyboard.press('Enter')
  await expect(picker(page)).toBeHidden()
}

test('[[ links to a heading; the link opens it; Linked from shows the sentence', async ({
  page,
}) => {
  await linkWithKeys(page, 'heart', 'S2')
  await page.keyboard.type('for timing.')
  await expect(editorLink(page)).toHaveText('Heart sounds › S2')
  await expect(page.locator('.bn-editor')).toContainText(
    'see Heart sounds › S2 for timing.',
  )
  await page.waitForTimeout(800) // autosave

  // No links to Murmurs yet.
  await expect(linkedFrom(page)).toContainText('No pages link here yet')

  await editorLink(page).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Heart sounds',
  )
  const entry = linkedFrom(page).getByRole('button')
  await expect(entry).toContainText('Murmurs')
  await expect(entry).toContainText(
    'A murmur is systolic; see Heart sounds › S2 for timing.',
  )

  // Renaming the page updates the link everywhere.
  await setTitle(page, 'Heart sounds S1–S4')
  await entry.click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Murmurs',
  )
  await expect(editorLink(page)).toHaveText('Heart sounds S1–S4 › S2')
})

test('Esc leaves "[[" as text; "/ Link to page" opens the picker too', async ({
  page,
}) => {
  await page.keyboard.type('[[')
  await expect(picker(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(picker(page)).toBeHidden()
  await expect(page.locator('.bn-editor')).toContainText('see [[')

  await slashCommand(page, 'link to page')
  await expect(picker(page)).toBeVisible()
  // Before typing: recently opened pages.
  await picker(page)
    .getByRole('option', { name: /Heart sounds/ })
    .click()
  await expect(editorLink(page)).toHaveText('Heart sounds')

  // Keyboard: Ctrl+Enter next to a link opens it.
  await page.keyboard.press('ArrowLeft') // before the space after the link
  await page.waitForTimeout(100) // the editor reads the moved cursor
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Heart sounds',
  )
})

test('a link to a page in the Trash offers Restore', async ({ page }) => {
  await linkWithKeys(page, 'heart')
  await page.waitForTimeout(800) // autosave
  await rowAction(page, 'Heart sounds', 'Delete page')
  await confirmDialog(page, 'Delete')
  await expect(editorLink(page)).toHaveClass(/note-link-gone/)

  await editorLink(page).click()
  await page.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Heart sounds',
  )
  await openPage(page, 'Murmurs')
  await expect(editorLink(page)).not.toHaveClass(/note-link-gone/)
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
  ['Day', 844, 390],
] as const) {
  test(`screenshots: ${theme} ${width}×${height}`, async ({ page }) => {
    await sidebar(page)
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme })
      .click()
    await page.setViewportSize({ width, height })
    await page.locator('.bn-editor').click()
    await page.keyboard.press('Control+End')
    // A sentence around the link, as Linked from shows it.
    await page.keyboard.type('A soft murmur can follow ')
    await page.keyboard.type('[[')
    await expect(picker(page)).toBeVisible()
    await page.keyboard.type('heart')
    await expect(picker(page).getByRole('option').first()).toContainText(
      'Heart sounds',
    )
    await page.keyboard.press('ArrowRight')
    await expect(picker(page)).toContainText('S2')
    await page.waitForTimeout(400) // let the theme fade finish
    const name = `${theme}-${width}x${height}`
    await page.screenshot({
      path: `test-results/screens/link-picker-${name}.png`,
    })
    await page.keyboard.press('Enter')
    await page.keyboard.type(' in older patients.')
    await page.waitForTimeout(800) // autosave
    await openPage(page, 'Heart sounds')
    await expect(linkedFrom(page).getByRole('button')).toHaveCount(1)
    await linkedFrom(page).scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `test-results/screens/linked-from-${name}.png`,
    })
  })
}
