// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { cardRecordCount, sheetFill } from './helpers.ts'
import {
  expectStrokes,
  inkNote,
  line,
  stroke,
  textBox,
  type Pt,
} from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'

/**
 * Polish 2, item 12: loop handwriting with the Lasso, choose Make card, give
 * the question, and the drawing is the card's picture answer.
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

const around = (b: { x: number; y: number; width: number; height: number }) =>
  [
    [b.x - 14, b.y + b.height + 10],
    [b.x - 14, b.y - 8],
    [b.x + b.width + 14, b.y - 8],
    [b.x + b.width + 14, b.y + b.height + 10],
    [b.x - 12, b.y + b.height + 8],
  ] as Pt[]
const loop = (corners: Pt[]) =>
  corners.slice(1).flatMap((c, i) => line(corners[i], c, 10))

test('loop ink, Make card, name the question: the answer is the picture', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  await page.waitForTimeout(800)
  const box = await textBox(page)
  const y = box.y + 150
  await stroke(page, line([box.x + 20, y], [box.x + 300, y]))
  await expectStrokes(page, 1)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  const now = await textBox(page)
  const at = y + (now.y - box.y)
  await stroke(
    page,
    loop(around({ x: box.x + 20, y: at - 4, width: 280, height: 8 })),
  )
  const menu = page.locator('[data-ink-menu]')
  await expect(menu).toBeVisible()
  await menu.getByRole('button', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Make card' }).click()

  // The question goes in the Name it sheet.
  expect(await sheetFill(page, 'What is this line?')).toBe(true)

  // A card with a picture answer is now at the end of the page.
  const editor = page.locator('.bn-editor')
  await expect(editor).toContainText('What is this line?')
  await expect(
    editor.locator('.bn-block-content[data-content-type="image"]'),
  ).toHaveCount(1)
  await expect.poll(() => cardRecordCount(page)).toBe(1)
})
