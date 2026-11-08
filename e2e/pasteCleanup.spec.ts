// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, openPage } from './helpers.ts'

/**
 * Paste chooser, 4th option "Clean up with AI": the owner's own key (mocked
 * here, nothing leaves the test), the library prompt shown and editable, the
 * cost shown first, a preview with anything unplaced flagged, then Insert.
 */

const editor = (page: Page) => page.locator('.bn-editor')

const MESSY =
  'Cells  power things   mitochondria make ATP about 36 per glucose.\n' +
  'Nucleus holds DNA - 46 chromosomes in humans\n' +
  'ribosomes build protein. Golgi packs it. Cell membrane controls what enters and leaves, a thin double layer of lipids. Random note: call Sam at 5pm'

const CLEANED =
  '## Cells\n\n- Mitochondria make ATP, about 36 per glucose\n- Nucleus holds DNA: 46 chromosomes in humans\n- Ribosomes build protein\n- Golgi packs it\n\n## Not placed\n\n- Random note: call Sam at 5pm\n'

async function setUpAi(page: Page) {
  await page.goto('/#/settings/ai')
  await page.getByTestId('ai-enable').check()
  await page.getByTestId('ai-key').fill('sk-ant-test-1234567890')
  await page.getByTestId('ai-key-save').click()
  await expect(page.getByTestId('ai-key-masked')).toContainText('sk-…7890')
  await page.goto('/#/settings/permissions')
  const sw = page.getByRole('switch', { name: 'Allow AI in Clean' })
  await sw.focus()
  await page.keyboard.press('Space')
  await expect(sw).toBeChecked()
}

const paste = (page: Page, text: string) =>
  page.evaluate((t) => {
    const data = new DataTransfer()
    data.setData('text/plain', t)
    document.querySelector('.bn-editor')!.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    )
  }, text)

test('Clean up with AI: cost first, editable prompt, preview flags what is unplaced, Insert, chip swaps back', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:general.pasteMode', '"ask"'),
  )
  const bodies: string[] = []
  await page.route('https://api.anthropic.com/v1/messages', (route) => {
    bodies.push(route.request().postData() ?? '')
    return route.fulfill({
      json: {
        content: [{ type: 'text', text: CLEANED }],
        usage: { input_tokens: 120, output_tokens: 80 },
      },
    })
  })
  await page.goto('/')
  await createNotebook(page, 'Clean', 'Page one')
  await setUpAi(page)
  await page.goto('/')
  await openPage(page, 'Page one')
  await editor(page).click()

  await paste(page, MESSY)
  const chooser = page.getByRole('dialog', { name: 'Paste as' })
  await expect(chooser).toBeVisible()
  await expect(chooser.getByRole('option')).toHaveCount(2)
  await chooser.getByRole('option', { name: /Clean up with AI/ }).click()

  // The prompt is the library's, editable; the cost is shown before sending.
  const dialog = page.getByTestId('cleanup-dialog')
  await expect(dialog.getByTestId('cleanup-prompt')).toHaveValue(
    /Rebuild the structure/,
  )
  await expect(dialog.getByTestId('cleanup-cost')).toContainText('₹')
  await expect(dialog.getByTestId('cleanup-cost')).toContainText('tokens')
  expect(bodies).toHaveLength(0)
  await dialog
    .getByTestId('cleanup-prompt')
    .fill('Rebuild the structure of the messy text below. Be gentle.')
  await dialog.getByTestId('cleanup-run').click()
  await dialog.getByTestId('cleanup-privacy-ok').click()

  await expect(dialog.getByTestId('cleanup-preview')).toContainText('## Cells')
  await expect(dialog.getByTestId('cleanup-unplaced')).toContainText(
    'call Sam at 5pm',
  )
  expect(bodies).toHaveLength(1)
  expect(bodies[0]).toContain('Be gentle.')
  expect(bodies[0]).toContain('Random note: call Sam')

  await dialog.getByTestId('cleanup-insert').click()
  await expect(editor(page).locator('h2').first()).toContainText('Cells')
  await expect(
    editor(page).locator('[data-content-type="bulletListItem"]'),
  ).toHaveCount(5)
  await expect(editor(page)).toContainText('call Sam at 5pm')

  // The chip can go back to the original words in one Undo.
  const chip = page.getByRole('group', { name: 'Pasted as' })
  await chip.getByRole('button', { name: 'Plain text' }).click()
  await expect(editor(page).locator('h2')).toHaveCount(0)
  await expect(editor(page)).toContainText('Nucleus holds DNA')
})

test('Clean up with AI is not offered without an AI key', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:general.pasteMode', '"ask"'),
  )
  await page.goto('/')
  await createNotebook(page, 'Clean', 'Page one')
  await editor(page).click()
  await paste(page, '## Title\n\n- one\n- two\n\nSome words here to be long.')
  const chooser = page.getByRole('dialog', { name: 'Paste as' })
  await expect(chooser).toBeVisible()
  await expect(chooser.getByRole('option', { name: /Clean up/ })).toHaveCount(0)
})
