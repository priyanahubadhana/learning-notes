import { expect, test, type Page } from '@playwright/test'
import {
  cardRecordCount,
  createNotebook,
  selectText,
  typeInEditor,
} from './helpers.ts'

const SENTENCE = 'S2 closes the aortic and pulmonary valves'
const blanks = (page: Page) => page.locator('.bn-editor .recall-blank')
const makeBlank = (page: Page) =>
  page.getByRole('button', { name: 'Make blank (hide these words in review)' })

async function pageWithSentence(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, SENTENCE)
}

test('Make blank snaps to whole words, saves, and schedules a card', async ({
  page,
}) => {
  await pageWithSentence(page)
  await selectText(page, 'rtic and pulmon')
  await makeBlank(page).click()
  await expect(blanks(page)).toHaveText('aortic and pulmonary')
  await expect(page.locator('.bn-editor')).toContainText(SENTENCE)

  await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(1)
  await page.reload()
  await expect(blanks(page)).toHaveText('aortic and pulmonary')
})

test('Ctrl+Z undoes Make blank; using it on a blank removes it', async ({
  page,
}) => {
  await pageWithSentence(page)
  await selectText(page, 'valves')
  await makeBlank(page).click()
  await expect(blanks(page)).toHaveCount(1)
  await page.keyboard.press('ControlOrMeta+z')
  await expect(blanks(page)).toHaveCount(0)

  await selectText(page, 'aortic')
  await makeBlank(page).click()
  await expect(blanks(page)).toHaveCount(1)
  await selectText(page, 'ort')
  await page.getByRole('button', { name: 'Remove blank' }).click()
  await expect(blanks(page)).toHaveCount(0)
})

test('the selection toolbar can also make a card (touch-friendly)', async ({
  page,
}) => {
  await pageWithSentence(page)
  await selectText(page, 'closes')
  await page.getByRole('button', { name: 'Make card' }).click()
  await expect(
    page.locator('.bn-block-content[data-content-type="card"]'),
  ).toContainText(SENTENCE)
})
