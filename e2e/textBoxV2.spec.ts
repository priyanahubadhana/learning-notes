// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Text box v2 (owner 11 Nov 2026): step 1, the bugs. */
test.use({ viewport: { width: 1336, height: 1100 }, hasTouch: true })

const rect = async (l: Locator) => (await l.boundingBox())!

async function start(page: Page, name: string) {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
}

test('the first box shows frame, 8 handles and the full menu (no Lock)', async ({
  page,
}) => {
  await start(page, 'First')
  await page.locator('[data-paper-box="main"] .bn-editor').click()
  const chrome = page.locator('[data-main-chrome]')
  await expect(chrome.locator('[data-resize-handle]')).toHaveCount(8)
  await expect(chrome.locator('[data-main-frame]')).toBeVisible()
  await chrome.locator('[data-box-menu]').click()
  for (const name of [
    'Box style',
    'Colour',
    'Duplicate',
    'Copy',
    'Cut',
    'Layout',
  ])
    await expect(page.getByRole('menuitem', { name })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: /Lock/ })).toHaveCount(0)
})

test('a lone full-width box can change width from its right handle', async ({
  page,
}) => {
  await start(page, 'Width')
  await page.locator('[data-paper-box="main"] .bn-editor').click()
  const before = (await rect(page.locator('[data-paper-box="main"]'))).width
  const h = await rect(
    page.locator('[data-main-chrome] [data-resize-handle="e"]'),
  )
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(h.x - 250, h.y + h.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect
    .poll(
      async () => (await rect(page.locator('[data-paper-box="main"]'))).width,
    )
    .toBeLessThan(before - 150)
  await page.waitForTimeout(2000)
  expect(
    (await rect(page.locator('[data-paper-box="main"]'))).width,
  ).toBeLessThan(before - 150)
})
