// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  savedInk,
  stroke,
  textBox,
  type Pt,
} from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'

/**
 * The universal Lasso (Phase A2): one loop picks drawings and the page's own
 * text together. Mixed selection: Copy, Cut, Delete (one Undo), Screenshot,
 * Make card, and the cross. Drawings alone keep their handles.
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

const around = (
  b: { x: number; y: number; width: number; height: number },
  sideways = 14,
) =>
  [
    [b.x - sideways, b.y + b.height + 10],
    [b.x - sideways, b.y - 8],
    [b.x + b.width + sideways, b.y - 8],
    [b.x + b.width + sideways, b.y + b.height + 10],
    [b.x - sideways + 2, b.y + b.height + 8],
  ] as Pt[]

/** A loop made of many small steps (a hand does not jump). */
const loop = (corners: Pt[]) =>
  corners.slice(1).flatMap((c, i) => line(corners[i], c, 10))

async function inkOverText(page: Page) {
  // The Lasso picks ink only by default; here its Text and Pictures filters are on.
  await inkNote(page, 'Pen', 'pencil', {
    'ink.lasso': { text: true, pictures: true },
  })
  await page.waitForTimeout(800) // the hint line goes; the text settles
  const box = await textBox(page)
  await stroke(
    page,
    line(
      [box.x + 10, box.y + box.height / 2],
      [box.x + 160, box.y + box.height / 2],
    ),
  )
  await expectStrokes(page, 1)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape') // the pill would cover the text
  await page.waitForTimeout(300)
  return textBox(page)
}

test('a loop around text and ink gives the mixed menu; Delete removes both with one Undo', async ({
  page,
}) => {
  const box = await inkOverText(page)
  await stroke(page, loop(around(box, -4)))
  const menu = page.locator('[data-ink-menu="mixed"]')
  await expect(menu).toBeVisible()
  await expect(
    menu
      .getByRole('button')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))),
  ).resolves.toEqual([
    'Copy',
    'Cut',
    'Delete',
    'Screenshot of the selection',
    'Make card',
    'Deselect',
  ])
  // The handles move, resize and turn the ink only; the menu says so.
  expect(
    await page.locator('[data-handle="scale"]').count(),
  ).toBeGreaterThanOrEqual(4)
  await expect(page.locator('[data-ink-move-note]')).toBeVisible()
  await menu.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('.bn-editor')).not.toContainText('nucleus')
  await expect.poll(async () => (await savedInk(page)).strokes.length).toBe(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).first().click()
  await expect(page.locator('.bn-editor')).toContainText('nucleus')
  await expect.poll(async () => (await savedInk(page)).strokes.length).toBe(1)
})

test('the cross clears a mixed selection; Make card keeps working', async ({
  page,
}) => {
  const box = await inkOverText(page)
  await stroke(page, loop(around(box, -4)))
  const menu = page.locator('[data-ink-menu="mixed"]')
  await expect(menu).toBeVisible()
  await menu.getByRole('button', { name: 'Deselect' }).click()
  await expect(menu).toHaveCount(0)
})

test('a loop around drawings alone keeps the drawing menu and handles', async ({
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
  await page.waitForTimeout(500) // the closed pill gives the page its room back
  const now = await textBox(page)
  const at = y + (now.y - box.y)
  await stroke(
    page,
    loop(around({ x: box.x + 20, y: at - 4, width: 280, height: 8 })),
  )
  await expect(page.locator('[data-ink-menu]')).toBeVisible()
  await expect(page.locator('[data-ink-menu="mixed"]')).toHaveCount(0)
  expect(
    await page.locator('[data-handle="scale"]').count(),
  ).toBeGreaterThanOrEqual(4)
})
