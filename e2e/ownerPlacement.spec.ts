// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  openRibbon,
  startInMode,
  typeInEditor,
  pickBox,
} from './helpers.ts'
import { line, stroke } from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'

/**
 * Owner bug batch items 22e and 22h: while a picture preview waits for the
 * check or the cross, placement is a mode. A Pencil drag of the preview is
 * owned by the drag alone (no Lasso trail, no ink, no selection); the
 * Lasso, ink and text selection are off; a tool change says why it did not
 * happen.
 */
test.use({ viewport: { width: 1000, height: 1000 }, hasTouch: true })

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP8z8Dwn4GBgYEBAA0OAgFx+3JoAAAAAElFTkSuQmCC',
  'base64',
)

async function previewOpen(page: Page) {
  await startInMode(page, 'pencil')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA and more words here')
  const menu = page.getByRole('button', { name: 'Toolbar menu' })
  if (await menu.isVisible()) await openRibbon(page)
  const insert = dockedBar(page)
    .getByRole('tablist', { name: 'Tool tabs' })
    .getByRole('tab', { name: 'Insert', exact: true })
  const panel = dockedBar(page).getByRole('tabpanel')
  if (
    (await insert.getAttribute('aria-selected')) !== 'true' ||
    !(await panel.isVisible())
  )
    await insert.click()
  await dockedBar(page)
    .getByRole('tabpanel')
    .getByRole('button', { name: 'Picture', exact: true })
    .click()
  await page.getByTestId('picture-input-photos').setInputFiles({
    name: 'p.png',
    mimeType: 'image/png',
    buffer: PNG,
  })
  await expect(page.locator('[data-picture-preview]')).toBeVisible()
}

test('22e/22h: a Pencil drag of the preview leaves no Lasso trail, ink or selection; tools are off', async ({
  page,
}) => {
  await previewOpen(page)
  await expect(page.locator('html')).toHaveAttribute('data-placing', '')
  const p = (await page.locator('[data-picture-preview]').boundingBox())!
  const from: [number, number] = [p.x + p.width / 2, p.y + p.height / 2]
  await stroke(page, line(from, [from[0] + 60, from[1] - 80], 14), { id: 61 })
  await expect(page.locator('[data-paper-lasso]')).toHaveCount(0)
  await expect(page.locator('.bn-editor .ln-sel')).toHaveCount(0)
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('')
  // A tool change is refused with a hint; the preview stays.
  await page.getByRole('button', { name: 'Short bar' }).click()
  await tool(page, 'Eraser').click()
  await expect(
    page.getByText('Place or cancel the picture first'),
  ).toBeVisible()
  await expect(page.locator('[data-picture-preview]')).toBeVisible()
  // A loop on the page does nothing.
  const t = await page.evaluate(() => {
    const r = document.querySelector('.bn-editor')!.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width }
  })
  await stroke(
    page,
    [
      [t.x + 5, t.y - 4],
      [t.x + t.w, t.y - 4],
      [t.x + t.w, t.y + 30],
      [t.x + 5, t.y + 30],
      [t.x + 5, t.y - 4],
    ],
    { id: 62 },
  )
  await expect(page.locator('.bn-editor .ln-sel, .ln-sel-node')).toHaveCount(0)
  await expect(page.locator('[data-ink-box]')).toHaveCount(0)
  // The cross ends the mode.
  await page.keyboard.press('Escape')
  await expect(page.locator('html')).not.toHaveAttribute('data-placing', '')
})

test('item 25: a box dragged by its grip owns input; no red drop line', async ({
  page,
}) => {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Drag')
  await typeInEditor(page, 'Main text')
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const extra = page.locator('[data-paper-box]:not([data-paper-box="main"])')
  for (let n = 0; n < 2; n++) {
    await page.mouse.click(
      sheet.x + sheet.width * 0.2,
      main.y + main.height + 60 + n * 110,
    )
    await expect(extra).toHaveCount(n + 1)
    // Type only once the new box has the caret (an empty box is removed).
    await expect(extra.nth(n).locator('.bn-editor')).toBeFocused()
    await page.keyboard.type('Box ' + (n + 1))
  }
  await expect(extra).toHaveCount(2)
  await page.waitForTimeout(500)
  const a = extra.nth(0)
  const yb = (await extra.nth(1).boundingBox())!.y
  await pickBox(page, a)
  const g = (await a.locator('[data-box-grip]').boundingBox())!
  const gx = g.x + g.width / 2
  const gy = g.y + g.height / 2
  await page.mouse.move(gx, gy)
  await page.mouse.down()
  await page.mouse.move(gx, gy + (yb - (await a.boundingBox())!.y), {
    steps: 8,
  })
  await expect(page.locator('html')).toHaveAttribute('data-grip-drag', '')
  // The old red landing line is gone: nothing red marks the drop.
  await expect(page.locator('[data-drop-line]')).toHaveCount(0)
  // Typing while dragging goes nowhere: no slash menu, no text change.
  await page.keyboard.type('/')
  await expect(page.locator('.bn-suggestion-menu')).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('data-grip-drag', '')
  await page.mouse.up()
  await expect(a).not.toContainText('/')
  await expect(page.locator('html')).not.toHaveAttribute('data-grip-drag', '')
})

test('item 9: a Pencil tap on blank paper with the Pen goes back to the Lasso and makes no box', async ({
  page,
}) => {
  await startInMode(page, 'pencil')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Tap')
  await typeInEditor(page, 'Main text')
  await tool(page, 'Pen').click()
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  await stroke(page, [[sheet.x + 8, main.y + 200]], { id: 71 })
  await expect(tool(page, 'Lasso')).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.locator('[data-paper-box]:not([data-paper-box="main"])'),
  ).toHaveCount(0)
})

test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus && process.env.SHOT)
    await page.screenshot({ path: process.env.SHOT })
})
