// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Toolbar v8, slice 1a: the switch chooses the old or the new bar. */
test.use({ viewport: { width: 1000, height: 1180 }, hasTouch: true })

async function open(page: import('@playwright/test').Page, url: string) {
  await startInMode(page, 'touch')
  await page.goto(url)
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

test('flag on: the new bar shows and the old bar does not', async ({
  page,
}) => {
  await open(page, '/?flags=toolbar.v8')
  await expect(page.getByTestId('toolbar-v8')).toBeVisible()
  await expect(page.locator('[data-main-bar]')).toHaveCount(0)
})

test("flag off: today's bar shows and the new bar does not", async ({
  page,
}) => {
  await open(page, '/')
  await expect(page.locator('[data-main-bar]')).toBeVisible()
  await expect(page.getByTestId('toolbar-v8')).toHaveCount(0)
})
