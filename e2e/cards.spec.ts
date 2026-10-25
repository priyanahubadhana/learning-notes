// Browser types for the database check that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, slashCommand, typeInEditor } from './helpers.ts'

const cards = (page: Page) =>
  page.locator('.bn-block-content[data-content-type="card"]')

/** Number of review records in the app database. */
const cardRecordCount = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const count = open.result
            .transaction('cards')
            .objectStore('cards')
            .count()
          count.onsuccess = () => {
            resolve(count.result)
            open.result.close()
          }
        }
      }),
  )

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
