// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, dockedBar, startInMode } from './helpers.ts'

/**
 * Auto switch: an Apple Pencil (pointerType "pen") switches to Pencil mode
 * with a message and Undo; "Both ways" lets a finger switch back; "Off"
 * does nothing. The pen is simulated with dispatched pointer events.
 */

test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true })

type Pointer = 'pen' | 'touch' | 'mouse'

/** A press and release by this kind of pointer. */
async function tap(page: Page, pointerType: Pointer) {
  await page.evaluate((type) => {
    const init = { pointerType: type, bubbles: true, pointerId: 7 }
    document.body.dispatchEvent(new PointerEvent('pointerdown', init))
    document.body.dispatchEvent(new PointerEvent('pointerup', init))
  }, pointerType)
}

const toast = (page: Page, text: string) =>
  page.getByRole('status').filter({ hasText: text })
const deviceMode = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem('learning-notes:general.deviceMode')!),
  )

async function openPage(page: Page, autoSwitch?: string) {
  await startInMode(page, 'touch')
  if (autoSwitch) {
    await page.addInitScript((value) => {
      localStorage.setItem(
        'learning-notes:advanced.autoSwitch',
        JSON.stringify(value),
      )
    }, autoSwitch)
  }
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  // Typing just now counts as an edit: a switch waits for a quiet moment.
  await page.waitForTimeout(1700)
}

test('the default is "Pencil only": a pen switches, with Undo', async ({
  page,
}) => {
  await openPage(page)
  await tap(page, 'pen')
  await expect(toast(page, 'Switched to Pencil mode')).toBeVisible()
  expect(await deviceMode(page)).toBe('pencil')
  // Pencil mode: large buttons.
  await expect
    .poll(
      async () =>
        (await dockedBar(page)
          .getByRole('button', { name: 'Done', exact: true })
          .boundingBox())!.height,
    )
    .toBeGreaterThanOrEqual(53.5)
  await toast(page, 'Switched').getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => deviceMode(page)).toBe('touch')
})

test('"Pencil only": a finger does not switch back', async ({ page }) => {
  await openPage(page)
  await tap(page, 'pen')
  await expect.poll(() => deviceMode(page)).toBe('pencil')
  await page.waitForTimeout(1800)
  await tap(page, 'touch')
  await page.waitForTimeout(300)
  expect(await deviceMode(page)).toBe('pencil')
})

test('"Both ways": a finger switches back, but never straight away', async ({
  page,
}) => {
  await openPage(page, 'both')
  await tap(page, 'pen')
  await expect.poll(() => deviceMode(page)).toBe('pencil')
  // Right after the switch (mid-gesture, a palm): no flipping back.
  await tap(page, 'touch')
  await page.waitForTimeout(300)
  expect(await deviceMode(page)).toBe('pencil')
  // After a quiet moment, a finger switches to Touch.
  await page.waitForTimeout(1800)
  await tap(page, 'touch')
  await expect.poll(() => deviceMode(page)).toBe('touch')
  await expect(toast(page, 'Switched to Touch mode')).toBeVisible()
})

test('a pen waits while a finger is down or a key was just pressed', async ({
  page,
}) => {
  await openPage(page)
  await page.evaluate(() => {
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'touch',
        pointerId: 1,
        bubbles: true,
      }),
    )
    document.body.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'pen',
        pointerId: 2,
        bubbles: true,
      }),
    )
  })
  await page.waitForTimeout(300)
  expect(await deviceMode(page)).toBe('touch')
  await page.evaluate(() => {
    for (const id of [1, 2]) {
      document.body.dispatchEvent(
        new PointerEvent('pointerup', { pointerId: id, bubbles: true }),
      )
    }
  })
  // Typing counts as an edit: no switch right after a key press.
  await page.keyboard.press('a')
  await tap(page, 'pen')
  await page.waitForTimeout(300)
  expect(await deviceMode(page)).toBe('touch')
  await page.waitForTimeout(1800)
  await tap(page, 'pen')
  await expect.poll(() => deviceMode(page)).toBe('pencil')
})

test('"Off": nothing switches', async ({ page }) => {
  await openPage(page, 'off')
  await tap(page, 'pen')
  await page.waitForTimeout(500)
  expect(await deviceMode(page)).toBe('touch')
  await expect(toast(page, 'Switched')).toHaveCount(0)
})

test('a mouse never switches', async ({ page }) => {
  await openPage(page, 'both')
  await tap(page, 'mouse')
  await page.waitForTimeout(300)
  expect(await deviceMode(page)).toBe('touch')
})

test('Settings › Advanced has Auto switch, kept per device', async ({
  page,
}) => {
  await page.goto('/#/settings')
  await page.getByRole('button', { name: /^Advanced/ }).click()
  const row = page.locator('[data-setting-id="advanced.autoSwitch"]')
  await expect(
    row.getByRole('button', { name: 'Pencil only', pressed: true }),
  ).toBeVisible()
  await row.getByRole('button', { name: 'Both ways' }).click()
  await page.reload()
  await page.getByRole('button', { name: /^Advanced/ }).click()
  await expect(
    page
      .locator('[data-setting-id="advanced.autoSwitch"]')
      .getByRole('button', { name: 'Both ways', pressed: true }),
  ).toBeVisible()
})
