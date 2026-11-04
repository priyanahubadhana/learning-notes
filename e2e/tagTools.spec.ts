import { expect, test, type Page } from '@playwright/test'
import {
  confirmDialog,
  createNotebook,
  openSearchPopup,
  searchResults,
  sidebar,
  typeInEditor,
  openGroup,
} from './helpers.ts'

const tree = (page: Page) =>
  sidebar(page).getByRole('group', { name: 'Tags', exact: true })
const tagButton = (page: Page, name: string) =>
  tree(page).getByRole('button', { name: `#${name}`, exact: true })
const pageChips = (page: Page) =>
  page.getByRole('group', { name: 'Page tags' }).locator('.tag-chip')
const editorTags = (page: Page) => page.locator('.bn-editor .tag-chip')

/** Opens a tag's ⋯ menu and picks a tool. */
async function tagTool(page: Page, path: string, tool: string) {
  await sidebar(page).getByLabel(`Tag options for #${path}`).click()
  await page.getByRole('menuitem', { name: tool }).click()
}

async function addPageTag(page: Page, name: string) {
  await page.getByRole('button', { name: '+ Add tag' }).click()
  await page.keyboard.type(name)
  await expect(
    page
      .getByRole('dialog', { name: 'Add a tag' })
      .getByRole('option')
      .filter({ hasText: name })
      .first(),
  ).toBeVisible()
  await page.keyboard.press('Enter')
}

/** Types "#name" in the editor and picks the tag. */
async function typeTag(page: Page, name: string) {
  await page.keyboard.type(`#${name}`)
  await expect(page.locator('.bn-suggestion-menu')).toContainText(`#${name}`)
  await page.keyboard.press('Enter')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await openGroup(page, 'Tags') // the Tags group starts folded
})

test('Tags in the sidebar: empty note, new tag, tree with counts', async ({
  page,
}) => {
  await expect(sidebar(page)).toContainText('No tags yet.')
  await sidebar(page).getByLabel('New tag').click()
  await page.keyboard.type('medicine/cardio')
  await page.keyboard.press('Enter')
  // New nested tags open so you can see them.
  await expect(tagButton(page, 'medicine')).toBeVisible()
  await expect(tagButton(page, 'cardio')).toBeVisible()

  await addPageTag(page, 'medicine/cardio')
  const row = tagButton(page, 'medicine').locator('xpath=ancestor::div[1]')
  await expect(row).toContainText('1')
  await sidebar(page).getByLabel('Collapse #medicine').click()
  await expect(tagButton(page, 'cardio')).toBeHidden()

  await tagButton(page, 'medicine').click()
  await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible()
  await expect(searchResults(page).getByRole('listitem')).toHaveCount(1)
})

test('rename, colour and move show everywhere at once', async ({ page }) => {
  await addPageTag(page, 'cardoi')
  await typeInEditor(page, 'S1 is loud ')
  await typeTag(page, 'cardoi')

  await tagTool(page, 'cardoi', 'Rename')
  await page.keyboard.type('Cardio')
  await page.keyboard.press('Enter')
  await expect(pageChips(page)).toHaveText('#Cardio')
  await expect(editorTags(page)).toHaveText('#Cardio')
  await expect(page.getByText('Renamed to #Cardio everywhere')).toBeVisible()

  await tagTool(page, 'Cardio', 'Colour')
  const colours = page.getByRole('dialog', { name: 'Colour for #Cardio' })
  await colours.getByRole('button', { name: 'Blue' }).click()
  await expect(colours.getByRole('button', { name: 'Blue' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await colours.getByRole('button', { name: 'Done' }).click()
  await expect(pageChips(page)).toHaveClass(/tag-chip-colored/)

  await sidebar(page).getByLabel('New tag').click()
  await page.keyboard.type('medicine')
  await page.keyboard.press('Enter')
  await tagTool(page, 'Cardio', 'Move under…')
  await page.keyboard.type('medi')
  await page.keyboard.press('Enter')
  await expect(pageChips(page)).toHaveText('#medicine/Cardio')
  await expect(tagButton(page, 'Cardio')).toBeVisible() // parent opened
})

test('merge moves page and text tags; delete keeps the notes', async ({
  page,
}) => {
  await addPageTag(page, 'cardio')
  await addPageTag(page, 'cardoi')
  await typeInEditor(page, 'Mitral ')
  await typeTag(page, 'cardoi')
  await page.keyboard.type('valve ')
  await typeTag(page, 'exam')
  await page.waitForTimeout(800) // autosave

  await tagTool(page, 'cardoi', 'Merge into…')
  await page.keyboard.type('cardio')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Merged into #cardio')).toBeVisible()
  await expect(pageChips(page)).toHaveText(['#cardio'])
  await expect(editorTags(page)).toHaveText(['#cardio', '#exam'])
  await expect(tagButton(page, 'cardoi')).toBeHidden()

  await tagTool(page, 'exam', 'Delete tag')
  await expect(page.getByRole('dialog')).toContainText(
    'It comes off the 1 page, note or card that has it. Your notes and cards stay.',
  )
  await confirmDialog(page, 'Delete tag')
  await expect(editorTags(page)).toHaveText(['#cardio'])
  await expect(page.locator('.bn-editor')).toContainText('Mitral #cardio valve')
  await expect(tagButton(page, 'exam')).toBeHidden()
})

test('search rows show tags, and words find tag names', async ({ page }) => {
  await addPageTag(page, 'high-yield')
  await typeInEditor(page, 'S1 closes the mitral valve')
  await page.waitForTimeout(800) // autosave

  const popup = await openSearchPopup(page)
  await page.keyboard.type('yield')
  await expect(popup.getByRole('option')).toHaveCount(1)
  await expect(popup.getByRole('option')).toContainText('#high-yield')
})
