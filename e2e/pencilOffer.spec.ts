// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote } from './mainBarHelpers.ts'

/**
 * R8-2: the first Pencil touch on a device not in Pencil mode offers Pencil
 * mode once ("Pencil writes, finger scrolls and taps"). The answer is kept
 * for the device and the question never comes back.
 */

test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true })

async function pen(page: Page) {
  await page.evaluate(() => {
    const init = { pointerType: 'pen', bubbles: true, pointerId: 9 }
    document.body.dispatchEvent(new PointerEvent('pointerdown', init))
    document.body.dispatchEvent(new PointerEvent('pointerup', init))
  })
}
const offer = (page: Page) => page.locator('[data-pencil-offer]')
const mode = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem('learning-notes:general.deviceMode')!),
  )

test('a finger or mouse never asks', async ({ page }) => {
  await openNote(page, 'touch')
  await page.evaluate(() => {
    const init = { pointerType: 'touch', bubbles: true, pointerId: 3 }
    document.body.dispatchEvent(new PointerEvent('pointerdown', init))
    document.body.dispatchEvent(new PointerEvent('pointerup', init))
  })
  await expect(offer(page)).toHaveCount(0)
})

test('Yes switches to Pencil mode and it is never asked again', async ({
  page,
}) => {
  await openNote(page, 'touch')
  await pen(page)
  await expect(offer(page)).toContainText(
    'Pencil writes, finger scrolls and taps',
  )
  await offer(page).getByRole('button', { name: 'Yes' }).click()
  await expect(offer(page)).toHaveCount(0)
  expect(await mode(page)).toBe('pencil')
  await page.reload()
  await pen(page)
  await expect(offer(page)).toHaveCount(0)
})

test('Not now keeps the mode and is never asked again', async ({ page }) => {
  await openNote(page, 'touch')
  await pen(page)
  await offer(page).getByRole('button', { name: 'Not now' }).click()
  await expect(offer(page)).toHaveCount(0)
  expect(await mode(page)).toBe('touch')
  await page.reload()
  await pen(page)
  await page.waitForTimeout(300)
  await expect(offer(page)).toHaveCount(0)
})

test('a device already in Pencil mode is not asked', async ({ page }) => {
  await openNote(page, 'pencil')
  await pen(page)
  await page.waitForTimeout(300)
  await expect(offer(page)).toHaveCount(0)
})
