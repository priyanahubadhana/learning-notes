import { expect, test } from '@playwright/test'
import { closeSidebarIfNarrow, startInMode } from './helpers.ts'
import { addBox, EXTRA, pick, start } from './cBoxesHelpers.ts'

/** Re-test 18 Nov, bug 1: the tool row never hides because a box is selected or the last box was deleted. */
const MODE = 'pencil' as const
const FLAGS = [
  'foundation.shell',
  'toolbar.v8',
  'toolbar.menu',
  'page.menus',
  'textbox.v2',
  'settings.v3',
  'update.v2',
  'storage.safety',
]

test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

test('RB-1 the tool row stays when a box is selected and after the only box is deleted', async ({
  page,
}) => {
  await startInMode(page, MODE)
  await start(page, 'Row', true, FLAGS)
  await closeSidebarIfNarrow(page)
  const text = page.getByRole('button', { name: 'Text', exact: true }).first()
  const pen = page.getByRole('button', { name: 'Pen', exact: true }).first()
  await expect(pen).toBeVisible()
  // The page's only box is its first (main) box.
  await text.click()
  await page.keyboard.press('Escape')
  const mb = (await page.locator('[data-paper-box="main"]').boundingBox())!
  await page.touchscreen.tap(mb.x + mb.width - 30, mb.y + mb.height / 2)
  await expect(page.locator('[data-main-chrome] [data-box-grip]')).toBeVisible()
  await expect(pen).toBeVisible()
  await expect(text).toBeVisible()
  const bar = page.locator('[data-box-bar]')
  const direct = bar.getByRole('button', { name: 'Delete box' })
  if (await direct.count()) await direct.click()
  else {
    await bar.getByRole('button', { name: 'Box actions' }).click()
    await page
      .getByRole('menu', { name: 'Box actions' })
      .getByRole('menuitem', { name: /Delete box/ })
      .click()
  }
  await page.waitForTimeout(800)
  await expect(pen).toBeVisible()
  await pen.click()
  await text.click()
  await expect(text).toBeVisible()
})

test('RB-1b the tool row stays after the only new box is deleted, and tools still switch', async ({
  page,
}) => {
  await startInMode(page, MODE)
  await start(page, 'Row2', false, FLAGS)
  await closeSidebarIfNarrow(page)
  const text = page.getByRole('button', { name: 'Text', exact: true }).first()
  const pen = page.getByRole('button', { name: 'Pen', exact: true }).first()
  await text.click()
  const box = await addBox(page, ['Hello'])
  await pick(page, box)
  await expect(pen).toBeVisible()
  const bar = page.locator('[data-box-bar]')
  const direct = bar.getByRole('button', { name: 'Delete box' })
  if (await direct.count()) await direct.click()
  else {
    await bar.getByRole('button', { name: 'Box actions' }).click()
    await page
      .getByRole('menu', { name: 'Box actions' })
      .getByRole('menuitem', { name: /Delete box/ })
      .click()
  }
  await expect(page.locator(EXTRA)).toHaveCount(0)
  await expect(pen).toBeVisible()
  await expect(text).toBeVisible()
  await pen.click()
  await expect(pen).toBeVisible()
  await text.click()
  await expect(text).toBeVisible()
})
