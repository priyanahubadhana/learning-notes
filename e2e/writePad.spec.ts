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

test('Enter presses are real newlines, shown as marks, and the keys edit them (R6-9)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  const marks = pad(page).locator('[data-write-pad-break]')
  await input(page).fill('one')
  await pad(page).getByRole('button', { name: 'New line' }).click()
  await page.keyboard.type('two')
  await pad(page).getByRole('button', { name: 'New line' }).click()
  await expect(input(page)).toHaveValue('one\ntwo\n')
  await expect(marks).toHaveCount(2)
  await expect(page.locator('[data-write-pad-preview]')).toContainText('↵')
  // Delete takes the last Enter away (caret is at the end).
  await pad(page).getByRole('button', { name: 'Delete' }).click()
  await expect(input(page)).toHaveValue('one\ntwo')
  await expect(marks).toHaveCount(1)
  // An Enter typed in the box is a newline too.
  await input(page).press('Enter')
  await expect(input(page)).toHaveValue('one\ntwo\n')
  await expect(marks).toHaveCount(2)
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

test('switching Read with keeps the text, both ways (R6-15)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  await input(page).fill('keep me')
  await pad(page).getByRole('button', { name: 'AI', exact: true }).click()
  await expect(pad(page).locator('[data-write-pad-canvas]')).toBeVisible()
  await expect(pad(page).locator('[data-write-pad-kept]')).toHaveText('keep me')
  await expect(page.locator('[data-write-pad-preview]')).toContainText(
    'keep me',
  )
  await pad(page).getByRole('button', { name: 'Scribble', exact: true }).click()
  await expect(input(page)).toHaveValue('keep me')
})

test('unread canvas writing asks before it is thrown away (R6-15)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  await input(page).fill('typed')
  await pad(page).getByRole('button', { name: 'AI', exact: true }).click()
  const canvas = pad(page).locator('[data-write-pad-canvas]')
  const b = (await canvas.boundingBox())!
  await canvas.evaluate((el, r) => {
    const fire = (type: string, x: number, y: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 3,
          pointerType: 'pen',
          clientX: r.x + x,
          clientY: r.y + y,
          pressure: 0.5,
        }),
      )
    fire('pointerdown', 20, 20)
    for (let i = 1; i <= 6; i++) fire('pointermove', 20 + i * 8, 20 + i * 3)
    fire('pointerup', 70, 40)
  }, b)
  await pad(page).getByRole('button', { name: 'Scribble', exact: true }).click()
  await expect(pad(page).locator('[data-write-pad-ask]')).toBeVisible()
  await expect(canvas).toBeVisible()
  // Keep writing: stays in AI mode, text untouched.
  await pad(page).getByRole('button', { name: 'Keep writing' }).click()
  await expect(pad(page).locator('[data-write-pad-ask]')).toHaveCount(0)
  await expect(canvas).toBeVisible()
  // Closing and reopening keeps the unread writing too.
  await page.getByTestId('write-pad-close').click()
  await openPad(page)
  await pad(page).getByRole('button', { name: 'Scribble', exact: true }).click()
  await expect(pad(page).locator('[data-write-pad-ask]')).toBeVisible()
  await page.getByTestId('write-pad-discard').click()
  await expect(input(page)).toHaveValue('typed')
})

test('close, reload, resize, zoom and font never lose the text (R6-15)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  await input(page).fill('still here')
  // Resize, zoom and a font change keep it.
  await page.locator('[data-write-pad-grip]').focus()
  await page.keyboard.press('ArrowUp')
  await page.getByRole('button', { name: 'Bigger writing' }).click()
  await pad(page)
    .getByRole('button', { name: 'Normal', exact: true })
    .first()
    .click()
  await expect(input(page)).toHaveValue('still here')
  // Close and open again: the draft is back.
  await page.getByTestId('write-pad-close').click()
  await expect(pad(page)).toHaveCount(0)
  await openPad(page)
  await expect(input(page)).toHaveValue('still here')
  // A reload (or another page and back) keeps the page's draft.
  await page.getByTestId('write-pad-close').click()
  await page.reload()
  await expect(page.locator('.bn-editor')).toContainText('nucleus')
  await openPad(page)
  await expect(input(page)).toHaveValue('still here')
  // Insert clears the draft.
  await page.getByTestId('write-pad-insert').click()
  await page.getByTestId('write-pad-close').click()
  await openPad(page)
  await expect(input(page)).toHaveValue('')
})

test('live writing: the text shows as a ghost at the cursor, not in the page, then Insert is one Undo (R6-16)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  const ghost = page.locator('.bn-editor [data-write-pad-ghost]')
  await expect(ghost).toHaveCount(0)
  await input(page).fill(' live')
  await expect(ghost).toHaveText(' live')
  await expect(ghost).toHaveCSS('text-decoration-style', 'dashed')
  // Not a document change: no hand text in the page, Undo is still the pad's.
  await expect(page.locator('.bn-editor [data-hand]')).toHaveCount(0)
  await input(page).fill(' live words')
  await expect(ghost).toHaveText(' live words')
  await page.getByTestId('write-pad-insert').click()
  await expect(ghost).toHaveCount(0)
  await expect(page.locator('.bn-editor [data-hand]')).toHaveText(' live words')
  await tool(page, 'Undo').click()
  await expect(page.locator('.bn-editor [data-hand]')).toHaveCount(0)
  // Closing the pad removes a ghost.
  await input(page).fill('gone soon')
  await expect(ghost).toHaveCount(1)
  await page.getByTestId('write-pad-close').click()
  await expect(ghost).toHaveCount(0)
})

test('Insert automatically when I pause (2 s) is off by default and works when on (R6-16)', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await openPad(page)
  const auto = page.getByTestId('write-pad-auto')
  await expect(auto).not.toBeChecked()
  await input(page).fill(' idle')
  await page.waitForTimeout(2600)
  await expect(page.locator('.bn-editor [data-hand]')).toHaveCount(0)
  await auto.check()
  await input(page).fill(' idle auto')
  await expect(page.locator('.bn-editor [data-hand]')).toHaveText(
    ' idle auto',
    { timeout: 6000 },
  )
  await expect(input(page)).toHaveValue('')
})
