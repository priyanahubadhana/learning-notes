// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { expectStrokes, inkNote, line, stroke, textBox } from './inkHelpers.ts'
import { addPage } from './helpers.ts'
import { openNote, tool } from './mainBarHelpers.ts'
import { editableTargetsInRect } from './scribbleProbe.ts'

/**
 * A1: with Pen, Highlighter or Eraser chosen, the page cannot be edited at
 * all (not editable, inert, nothing focused), so a Pencil stroke can only
 * draw. Text brings typing back.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const blockTexts = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .bn-block-content')].map(
      (b) => b.textContent,
    ),
  )

for (const name of ['Pen', 'Highlighter', 'Eraser'] as const) {
  test(`${name}: the page is not editable, inert, unfocused; Text restores typing`, async ({
    page,
  }) => {
    await inkNote(page, name)
    const editor = page.locator('.bn-editor')
    await expect(editor).toHaveAttribute('contenteditable', 'false')
    await expect(page.locator('[data-page-content]')).toHaveAttribute(
      'inert',
      '',
    )
    await expect(page.locator('textarea[data-page-title]')).toHaveJSProperty(
      'readOnly',
      true,
    )
    expect(
      await page.evaluate(
        () =>
          !!document.activeElement?.closest('[data-page-content], textarea'),
      ),
    ).toBe(false)
    expect(await page.evaluate(() => getSelection()?.toString())).toBe('')
    await tool(page, 'Text').click()
    await expect(editor).toHaveAttribute('contenteditable', 'true')
    await expect(page.locator('[data-page-content]')).not.toHaveAttribute(
      'inert',
      '',
    )
    await expect(page.locator('textarea[data-page-title]')).toHaveJSProperty(
      'readOnly',
      false,
    )
  })
}

test('Pen across a text line saves one stroke and leaves the text byte-identical', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const before = await blockTexts(page)
  const box = await textBox(page)
  await stroke(page, line([box.x + 10, box.y + 8], [box.x + 260, box.y + 10]))
  await expectStrokes(page, 1)
  expect(await blockTexts(page)).toEqual(before)
  expect(await page.evaluate(() => getSelection()?.toString())).toBe('')
})

test('Highlighter across text keeps the text and the selection empty', async ({
  page,
}) => {
  await inkNote(page, 'Highlighter')
  const before = await blockTexts(page)
  const box = await textBox(page)
  await stroke(page, line([box.x + 10, box.y + 8], [box.x + 200, box.y + 9]))
  expect(await blockTexts(page)).toEqual(before)
  expect(await page.evaluate(() => getSelection()?.toString())).toBe('')
})

test('Pen on the blank room below the text saves a stroke', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  await stroke(
    page,
    line([box.x + 20, box.y + 300], [box.x + 300, box.y + 330]),
  )
  await expectStrokes(page, 1)
})

test('Pen on a brand-new empty page draws at once', async ({ page }) => {
  await openNote(page, 'pencil')
  await addPage(page, 'Biology', 'Empty')
  await tool(page, 'Pen').click()
  await expect(page.locator('[data-ink-pad]')).toBeAttached()
  const pad = await page.locator('[data-ink-pad]').boundingBox()
  expect(pad).not.toBeNull()
  // The pad is tall enough to draw on, even though the page has no text.
  expect(pad!.height).toBeGreaterThan(300)
  await stroke(
    page,
    line([pad!.x + 40, pad!.y + 120], [pad!.x + 300, pad!.y + 150]),
  )
  await expectStrokes(page, 1)
})

test('Scribble probe: with Pen chosen no editable element lies under the page', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const pad = await page.locator('[data-ink-pad]').boundingBox()
  const found = await editableTargetsInRect(page, {
    x: pad!.x,
    y: pad!.y,
    width: pad!.width,
    height: Math.min(pad!.height, 500),
  })
  expect(found).toEqual([])
  // Control: with Text chosen the probe does find the page text.
  await tool(page, 'Text').click()
  const box = await textBox(page)
  expect(
    (await editableTargetsInRect(page, { ...box, width: box.width })).length,
  ).toBeGreaterThan(0)
})
