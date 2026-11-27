/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { mainBar } from './mainBarHelpers.ts'

/**
 * R15: Redo always redoes exactly one step. Cause: Undo stayed on until its
 * (slow) last step had finished, so a quick extra click undid nothing but was
 * counted as a step (45 Undos, 44 Redos). The buttons now turn off at the
 * click that takes the last step.
 */
const btn = (p: Page, name: 'Undo' | 'Redo') =>
  mainBar(p).getByRole('button', { name, exact: true })

test('R15: quick Undo clicks to the start and quick Redo clicks back match one for one', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'History', 'Undo page')
  await typeInEditor(page, 'First line')
  await page.waitForTimeout(900)
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(850) // each line is its own step
    await page.locator('[data-paper-box="main"] .bn-editor').first().click()
    await page.keyboard.press('Control+End')
    await page.keyboard.press('Enter')
    await page.keyboard.type(`Line ${i}`)
  }
  await page.waitForTimeout(900)
  // No waiting between clicks: a click on a button that is still on must
  // always do a real step.
  let undone = 0
  while ((await btn(page, 'Undo').isEnabled()) && undone < 40) {
    await btn(page, 'Undo').click()
    undone++
  }
  await expect(page.getByText('Nothing left to undo.')).toHaveCount(0)
  let redone = 0
  while ((await btn(page, 'Redo').isEnabled()) && redone < 40) {
    await btn(page, 'Redo').click()
    redone++
  }
  await expect(page.getByText('Nothing left to redo.')).toHaveCount(0)
  expect(undone).toBeGreaterThan(5)
  expect(redone).toBe(undone)
})
