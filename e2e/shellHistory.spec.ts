import { expect, test, type Page } from '@playwright/test'
import { createNotebook, typeInEditor } from './helpers.ts'
import { line, savedInk, stroke } from './inkHelpers.ts'
import { mainBar, tool } from './mainBarHelpers.ts'

/**
 * Slice 0h: flag-on twins of undoHistory and pinnedHistory. With
 * `foundation.shell` ON the editor toolbar has no Undo / Redo pair (the top
 * bar has the one pair), so the specs that press the toolbar's pair are
 * repeated here against the top bar. The flag-off originals are unchanged.
 */
const ON = '/?flags=foundation.shell'
const top = (page: Page) => page.locator('header[data-shell-top]')
const undoBtn = (page: Page) => top(page).getByTestId('history-undo')
const redoBtn = (page: Page) => top(page).getByTestId('history-redo')

async function start(page: Page) {
  await page.goto(ON)
  await expect(page.locator('.sh-frame')).toBeVisible()
  await createNotebook(page, 'History', 'Undo page')
  await typeInEditor(page, 'First line')
  await page.waitForTimeout(900)
}

test('typing, then Undo and Redo from the top bar', async ({ page }) => {
  await start(page)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second line')
  await page.waitForTimeout(900)
  await expect(page.locator('.bn-editor')).toContainText('Second line')
  await expect(undoBtn(page)).toBeEnabled()
  await undoBtn(page).click()
  await expect(page.locator('.bn-editor')).not.toContainText('Second line')
  await expect(redoBtn(page)).toBeEnabled()
  await redoBtn(page).click()
  await expect(page.locator('.bn-editor')).toContainText('Second line')
})

test('a drawing is a step the top bar can undo', async ({ page }) => {
  await start(page)
  await tool(page, 'Pen').click()
  await expect(page.locator('[data-ink-pad]')).toBeAttached()
  const box = (await page.locator('.bn-editor').first().boundingBox())!
  await stroke(
    page,
    line([box.x + 40, box.y + 120], [box.x + 240, box.y + 160]),
    { type: 'mouse' },
  )
  await expect.poll(async () => (await savedInk(page)).strokes.length).toBe(1)
  await expect(undoBtn(page)).toBeEnabled()
  await undoBtn(page).click()
  await expect.poll(async () => (await savedInk(page)).strokes.length).toBe(0)
  await expect(redoBtn(page)).toBeEnabled()
})

for (const width of [320, 560, 820, 1336]) {
  test(`width ${width}: the one Undo / Redo pair stays in the top bar; the toolbar has none`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto(ON)
    await expect(page.locator('.sh-frame')).toBeVisible()
    await expect(undoBtn(page)).toBeVisible()
    await expect(redoBtn(page)).toBeVisible()
    const box = (await undoBtn(page).boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    await expect(mainBar(page).locator('[data-slot="history"]')).toHaveCount(0)
    await expect(page.locator('[data-slot="history"]')).toHaveCount(1)
  })
}
