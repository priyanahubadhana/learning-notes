import { expect, test, type Page } from '@playwright/test'
import {
  cardRecordCount,
  createNotebook,
  slashCommand,
  typeInEditor,
} from './helpers.ts'

const cards = (page: Page) =>
  page.locator('.bn-block-content[data-content-type="card"]')

/** Opens the ⋮⋮ block menu of the block containing `text`. */
async function openBlockMenu(page: Page, text: string) {
  await page.locator('.bn-block-content', { hasText: text }).first().hover()
  await page.locator('.bn-side-menu [draggable="true"]').click()
}

test('Make card turns a block into a card, saves it and schedules it', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'Which valves close in S1?')

  await openBlockMenu(page, 'Which valves close in S1?')
  await page.getByRole('menuitem', { name: 'Make card' }).click()
  await expect(cards(page)).toHaveCount(1)
  await expect(cards(page)).toContainText('Which valves close in S1?')

  // The cursor is on the answer line.
  await page.keyboard.type('Mitral and tricuspid')
  await expect(page.locator('.bn-editor')).toContainText('Mitral and tricuspid')
  await page.waitForTimeout(800) // autosave
  await expect.poll(() => cardRecordCount(page)).toBe(1)

  await page.reload()
  await expect(cards(page)).toHaveCount(1)
  await expect(page.locator('.bn-editor')).toContainText('Mitral and tricuspid')
})

test('Ctrl+Z undoes Make card, back to the original text', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Cells')
  await typeInEditor(page, 'Mitochondria make ATP')

  await openBlockMenu(page, 'Mitochondria make ATP')
  await page.getByRole('menuitem', { name: 'Make card' }).click()
  await expect(cards(page)).toHaveCount(1)

  await page.keyboard.press('ControlOrMeta+z')
  await expect(cards(page)).toHaveCount(0)
  await expect(
    page.locator('.bn-block-content[data-content-type="paragraph"]', {
      hasText: 'Mitochondria make ATP',
    }),
  ).toHaveCount(1)
})

test('"/card" inserts an empty card', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Chemistry', 'Bonds')
  await typeInEditor(page, 'Intro')
  await slashCommand(page, 'card')
  await expect(cards(page)).toHaveCount(1)
  await page.keyboard.type('What is a covalent bond?')
  await expect(cards(page)).toContainText('What is a covalent bond?')
})

test('Duplicate copies a card with its answer as a new card; Ctrl+Z undoes it', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'Which valves close in S2?')
  await openBlockMenu(page, 'Which valves close in S2?')
  await page.getByRole('menuitem', { name: 'Make card' }).click()
  await page.keyboard.type('Aortic and pulmonary')
  await page.waitForTimeout(800) // autosave
  await expect.poll(() => cardRecordCount(page)).toBe(1)

  await openBlockMenu(page, 'Which valves close in S2?')
  await page.getByRole('menuitem', { name: 'Duplicate' }).click()
  await expect(cards(page)).toHaveCount(2)
  await expect(
    page.locator('.bn-block-content', { hasText: 'Aortic and pulmonary' }),
  ).toHaveCount(2)
  await page.waitForTimeout(800) // autosave
  await expect.poll(() => cardRecordCount(page)).toBe(2)

  await page.keyboard.press('ControlOrMeta+z')
  await expect(cards(page)).toHaveCount(1)

  // Plain text blocks duplicate too.
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('A plain note')
  await openBlockMenu(page, 'A plain note')
  await page.getByRole('menuitem', { name: 'Duplicate' }).click()
  await expect(
    page.locator('.bn-block-content', { hasText: 'A plain note' }),
  ).toHaveCount(2)
})
