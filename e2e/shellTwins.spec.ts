import { expect, test, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * Slice 0h: flag-on twins of three specs that cannot hold as written when
 * `foundation.shell` is ON (the flag-off originals are unchanged):
 *
 * - deviceModeButton "phone: the button fits next to the path": the new
 *   shell keeps Device mode in the gear menu on a phone, not in the top bar.
 * - topBar "dragging the handle shares the screen": the new sidebar starts
 *   at 288 px (D1), not 260 px.
 */
const ON = '/?flags=foundation.shell'

const list = (page: Page) => page.getByRole('menu', { name: 'Device mode' })
const side = (page: Page) => page.locator('#sidebar')

test('phone (shell on): Device mode is in the gear menu and its list stays on screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(ON)
  await expect(page.locator('.sh-frame')).toBeVisible()
  await createNotebook(page, 'Biology', 'Cells')
  // The top bar leaves its room to the page; the button is not there.
  await expect(
    page.locator('header[data-shell-top]').getByTestId('device-mode-button'),
  ).toBeHidden()
  await page
    .locator('nav[data-shell-tabbar]')
    .getByRole('button', { name: 'Quiet corner' })
    .click()
  await page.getByRole('button', { name: /^Device mode/ }).click()
  const m = (await list(page).boundingBox())!
  expect(m.x).toBeGreaterThanOrEqual(0)
  expect(m.x + m.width).toBeLessThanOrEqual(390)
  expect(m.y + m.height).toBeLessThanOrEqual(844)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(overflow).toBe(false)
})

test('dragging the handle shares the screen, and this device remembers (shell on, 288 px start)', async ({
  page,
}) => {
  await page.goto(ON)
  const handle = page.getByRole('separator', { name: 'Resize menu' })
  const width = async () => (await side(page).boundingBox())!.width
  await expect.poll(width).toBe(288)

  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2)
  await page.mouse.up()
  await expect.poll(width).toBe(368)
  await page.reload()
  await expect.poll(width).toBe(368)

  await handle.focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(width).toBe(352)
  await handle.dblclick()
  await expect.poll(width).toBe(288)

  await page.getByRole('button', { name: 'Hide menu' }).click()
  await expect(handle).toBeHidden()
})
