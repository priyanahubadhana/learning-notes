// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { createNotebook, typeInEditor } from './helpers.ts'

/**
 * Paste chooser, "As text box" on a paper page: the pasted content goes into
 * a new box at the paste spot (the paper's own box API), with an Undo.
 */

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const GEMINI =
  '<message-content><div class="markdown"><h2>Agents explained</h2>' +
  '<p><b>Goal:</b> understand agents</p>' +
  '<ul><li><p>Level 1</p></li><li><p>Level 2</p></li></ul></div></message-content>'

test('As text box: the paste lands in a new box, the page text stays, Undo removes it', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:general.pasteMode', '"ask"'),
  )
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Box paste')
  await typeInEditor(page, 'Main text')
  await page.keyboard.press('Enter')
  await page.evaluate((html) => {
    const data = new DataTransfer()
    data.setData('text/html', html)
    data.setData('text/plain', 'Agents explained\nGoal: understand agents')
    document.querySelector('.bn-editor')!.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    )
  }, GEMINI)
  const chooser = page.getByRole('dialog', { name: 'Paste as' })
  await expect(chooser.getByRole('option')).toHaveCount(3)
  await chooser.getByRole('option', { name: /As text box/ }).click()

  const box = page.locator(EXTRA)
  await expect(box).toHaveCount(1)
  await expect(box.locator('h2')).toContainText('Agents explained')
  await expect(box.locator('[data-content-type="bulletListItem"]')).toHaveCount(
    2,
  )
  await expect(page.locator('[data-paper-box="main"]')).not.toContainText(
    'Agents explained',
  )
  await expect(page.locator('[data-paper-box="main"]')).toContainText(
    'Main text',
  )

  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator(EXTRA)).toHaveCount(0)
})
