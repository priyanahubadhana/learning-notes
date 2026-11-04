import { expect, test, type Page } from '@playwright/test'
import { addPage, createNotebook, typeInEditor, openGroup } from './helpers.ts'

const pageTags = (page: Page) => page.getByRole('group', { name: 'Page tags' })
const tagMenu = (page: Page) => page.locator('.bn-suggestion-menu')
const editorTags = (page: Page) => page.locator('.bn-editor .tag-chip')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await openGroup(page, 'Tags') // the Tags group starts folded
})

test('Add tag puts a nested tag on the page; the chip menu removes it', async ({
  page,
}) => {
  await pageTags(page).getByRole('button', { name: '+ Add tag' }).click()
  const picker = page.getByRole('dialog', { name: 'Add a tag' })
  await page.keyboard.type('Medicine/heart sounds')
  await expect(picker.getByRole('option')).toHaveText(
    'Create #Medicine/heart-sounds',
  )
  await page.keyboard.press('Enter')
  const chip = pageTags(page).locator('.tag-chip')
  await expect(chip).toHaveText('#Medicine/heart-sounds')

  // Typing the same name in another case finds it (no duplicate).
  await pageTags(page).getByRole('button', { name: '+ Add tag' }).click()
  await page.keyboard.type('MEDICINE')
  await expect(picker.getByRole('option')).toHaveText(['#Medicine'])
  await page.keyboard.press('Escape')

  await chip.click()
  await page.getByRole('menuitem', { name: 'Remove from this page' }).click()
  await expect(chip).toHaveCount(0)
})

test('# in text tags the line; "C#" and "#1" stay text', async ({ page }) => {
  await typeInEditor(page, 'I like C# and ')
  await expect(tagMenu(page)).toBeHidden()
  await page.keyboard.type('#1')
  await page.keyboard.type(' item ')
  await expect(tagMenu(page)).toBeHidden()
  await page.keyboard.type('#exam')
  await expect(tagMenu(page)).toContainText('Create #exam')
  await page.keyboard.press('Enter')
  await expect(editorTags(page)).toHaveText('#exam')
  await expect(page.locator('.bn-editor')).toContainText(
    'I like C# and #1 item',
  )

  // "# " at a line start still makes a heading.
  await page.keyboard.press('Enter')
  await page.keyboard.type('# Title')
  await expect(page.locator('.bn-editor h1')).toHaveText('Title')
})

test('a tag opens Search with everything tagged, including inherited cards', async ({
  page,
}) => {
  await pageTags(page).getByRole('button', { name: '+ Add tag' }).click()
  await page.keyboard.type('exam')
  await page.keyboard.press('Enter')
  await typeInEditor(page, '/card')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Which valves close in S1?')
  await addPage(page, 'Cardiology', 'Murmurs') // saves Heart sounds
  await typeInEditor(page, 'Systolic #ex')
  await expect(tagMenu(page)).toContainText('#exam')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(800) // autosave

  await editorTags(page).click()
  await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible()
  const results = page.getByRole('list', { name: 'Results' })
  await expect(results.getByRole('listitem')).toHaveCount(3)
  await expect(results).toContainText('Which valves close in S1?')
  await expect(results).toContainText('Systolic')
  await expect(
    page.locator('main').getByRole('button', { name: '#exam', exact: true }),
  ).toBeVisible()
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
] as const) {
  test(`screenshot: ${theme} ${width}×${height}`, async ({ page }) => {
    await page
      .locator('aside')
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme })
      .click()
    for (const name of ['medicine/cardiology', 'exam', 'high-yield']) {
      await pageTags(page).getByRole('button', { name: '+ Add tag' }).click()
      await page.keyboard.type(name)
      await expect(
        page
          .getByRole('dialog', { name: 'Add a tag' })
          .getByRole('option')
          .first(),
      ).toContainText(name)
      await page.keyboard.press('Enter')
    }
    // The sidebar tree: one level open, one tag coloured.
    const side = page.locator('aside')
    await side.getByLabel('Expand #medicine').click()
    await side.getByLabel('Tag options for #exam').click()
    await page.getByRole('menuitem', { name: 'Colour' }).click()
    await page.getByRole('button', { name: 'Blue' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click()
    await typeInEditor(
      page,
      'S1 is the mitral and tricuspid valves closing. #hi',
    )
    await page.keyboard.press('Enter')
    await page.keyboard.type(' #')
    await expect(tagMenu(page)).toContainText('#exam')
    if (width < 600) {
      // The page view has no phone layout yet (README); Search has.
      await page.keyboard.press('Escape')
      await pageTags(page).locator('.tag-chip').first().click()
      await page
        .getByRole('menuitem', { name: 'Show everything tagged' })
        .click()
      await expect(page.getByRole('heading', { name: 'Search' })).toBeVisible()
    }
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(400) // let the theme fade finish
    await page.screenshot({
      path: `test-results/screens/tags-${theme}-${width}x${height}.png`,
    })
  })
}

test('# typed at full speed still makes the whole tag', async ({ page }) => {
  await typeInEditor(page, ' ')
  await page.keyboard.type('#exam') // no pause between keys
  await page.keyboard.press('Enter')
  await expect(editorTags(page)).toHaveText('#exam')
})
