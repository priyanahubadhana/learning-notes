// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote, option, tool } from './mainBarHelpers.ts'

/**
 * The Write pad (Scribble MVP): a docked pad with one big textarea. Insert
 * puts the text at the cursor, Replace swaps the selected words; the pad
 * stays open. Runs in chromium and in the iPad project (typing stands in for
 * Scribble, which only a real iPad can test).
 */

test.use({ viewport: { width: 1024, height: 768 } })

const pad = (page: Page) => page.locator('[data-write-pad]')
const input = (page: Page) => page.locator('[data-write-pad-input]')

async function openPad(page: Page) {
  await tool(page, 'Insert').click()
  await option(page, 'Write pad').click()
  await expect(pad(page)).toBeVisible()
}

/** Selects the first `word` in the page text with the page focused. */
async function selectWord(page: Page, word: string) {
  await page.locator('.bn-editor').focus()
  await page.evaluate((w) => {
    const walker = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const i = n.textContent!.indexOf(w)
      if (i >= 0) {
        getSelection()!.setBaseAndExtent(n, i, n, i + w.length)
        return
      }
    }
  }, word)
}

test('type in the pad, Insert at the cursor, then Replace the selection', async ({
  page,
}, testInfo) => {
  await openNote(page, 'touch')
  await openPad(page)
  if (testInfo.project.name === 'chromium') {
    await expect(pad(page)).toContainText(
      'On iPad, write here with Apple Pencil (Scribble)',
    )
  }

  // Preview shows what will be inserted; Insert is off while it is empty.
  await expect(page.getByTestId('write-pad-insert')).toBeDisabled()
  await input(page).fill(' really')
  await expect(page.locator('[data-write-pad-preview]')).toContainText('really')
  await page.getByTestId('write-pad-insert').click()

  const editor = page.locator('.bn-editor')
  await expect(editor).toContainText('The nucleus holds the DNA really')
  const hand = editor.locator('[data-hand]')
  await expect(hand).toHaveText(' really')
  await expect(hand).toHaveAttribute('data-hand', /^caveat\.normal\.125$/)
  // The pad stays open and is empty, ready for more.
  await expect(pad(page)).toBeVisible()
  await expect(input(page)).toHaveValue('')

  // Select "DNA" on the page, write a replacement in the pad.
  await selectWord(page, 'DNA')
  await input(page).focus()
  await input(page).fill('RNA')
  await page.getByTestId('write-pad-replace').click()
  await expect(editor).toContainText('The nucleus holds the RNA really')
  await expect(editor).not.toContainText('DNA')
})

test('the pad resizes from its top edge and has a writing zoom', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  const before = (await pad(page).boundingBox())!.height
  await page.locator('[data-write-pad-grip]').focus()
  await page.keyboard.press('ArrowUp')
  await expect
    .poll(async () => (await pad(page).boundingBox())!.height)
    .toBeGreaterThan(before)

  const size = () =>
    input(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  const small = await size()
  await page.getByRole('button', { name: 'Bigger writing' }).click()
  expect(await size()).toBeGreaterThan(small)

  await page.getByTestId('write-pad-close').click()
  await expect(pad(page)).toHaveCount(0)
})

test('the keys edit the text in the pad', async ({ page }) => {
  await openNote(page, 'touch')
  await openPad(page)
  await input(page).fill('ab')
  await pad(page).getByRole('button', { name: 'Space', exact: true }).click()
  await pad(page).getByRole('button', { name: 'New line' }).click()
  await expect(input(page)).toHaveValue('ab \n')
  await pad(page).getByRole('button', { name: 'Delete' }).click()
  await expect(input(page)).toHaveValue('ab ')
})

test('the main bar Undo and Redo work inside the pad, then on the page (R6-7)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  await input(page).fill('ab')
  await pad(page).getByRole('button', { name: 'New line' }).click()
  await expect(input(page)).toHaveValue('ab\n')
  await tool(page, 'Undo').click()
  await expect(input(page)).toHaveValue('ab')
  await tool(page, 'Undo').click()
  await expect(input(page)).toHaveValue('')
  await tool(page, 'Redo').click()
  await expect(input(page)).toHaveValue('ab')
  // After Insert the pad history is gone: Undo takes the text off the page.
  await page.getByTestId('write-pad-insert').click()
  await expect(page.locator('.bn-editor')).toContainText('ab')
  await tool(page, 'Undo').click()
  await expect(page.locator('.bn-editor [data-hand]')).toHaveCount(0)
})

test('the action keys sit at the top of the pad, above the writing box (R6-5)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  const box = (await input(page).boundingBox())!
  const insert = (await page.getByTestId('write-pad-insert').boundingBox())!
  const keys = (await page.locator('[data-write-pad-actions]').boundingBox())!
  expect(insert.y + insert.height).toBeLessThanOrEqual(box.y)
  expect(keys.y + keys.height).toBeLessThanOrEqual(box.y)
})
