// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { device, makeServer, setupA, setupB } from './syncMock.ts'

/**
 * Settings that follow you (mocked connector): two devices share one
 * in-memory server. The What syncs panel has a switch per group; a setting
 * can be kept on one device; a language, theme or limit set on A reaches B.
 */

test.use({ viewport: { width: 1200, height: 800 } })

const NEW_PER_DAY = '[data-setting-id="review.newPerDay"]'

async function twoDevices(
  browser: Parameters<typeof device>[0],
): Promise<{ a: Page; b: Page }> {
  const { serve, pages } = makeServer()
  const a = await device(browser, serve, pages)
  await setupA(a, ['one line'])
  const b = await device(browser, serve, pages)
  await setupB(b)
  return { a, b }
}

async function setNewPerDay(page: Page, value: string) {
  await page.goto('/#/settings/review')
  const input = page.locator(`${NEW_PER_DAY} input`)
  await input.fill(value)
  await input.press('Tab')
  await expect(input).toHaveValue(value)
  // Let the save and the send finish.
  await page.waitForTimeout(600)
}

test('What syncs: a group switched off on B ignores A until it is switched on', async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const { a, b } = await twoDevices(browser)

  // B turns the Review group off (the switches are per device).
  await b.goto('/#/settings/sync')
  const panel = b.getByTestId('what-syncs')
  await expect(panel).toBeVisible()
  const review = panel.getByTestId('sync-group-review')
  await expect(review).toBeChecked()
  await review.uncheck()
  await expect(review).not.toBeChecked()
  // The AI keys row is off by default.
  await expect(panel.getByTestId('sync-group-aiKeys')).not.toBeChecked()

  await b.goto('/#/settings/review')
  const bInput = b.locator(`${NEW_PER_DAY} input`)
  const before = await bInput.inputValue()

  // A changes a Review setting.
  await setNewPerDay(a, '37')

  // B does not follow while the group is off.
  await b.waitForTimeout(2500)
  await b.goto('/#/settings/review')
  await expect(bInput).toHaveValue(before)

  // Switched on again: B takes A's value at once.
  await b.goto('/#/settings/sync')
  await b.getByTestId('sync-group-review').check()
  await b.goto('/#/settings/review')
  await expect(bInput).toHaveValue('37', { timeout: 20_000 })
})

test('two devices: a limit set on A reaches B; B can keep its own value and reset', async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const { a, b } = await twoDevices(browser)

  await setNewPerDay(a, '31')
  await b.goto('/#/settings/review')
  const bRow = b.locator(NEW_PER_DAY)
  const bInput = bRow.locator('input')
  await expect(bInput).toHaveValue('31', { timeout: 20_000 })
  await expect(bRow.getByTestId('setting-tag')).toHaveText('All devices')

  // B keeps its own value on this device only.
  await bRow.getByTestId('setting-sync-menu').click()
  await b.getByRole('menuitem', { name: 'Keep on this device only' }).click()
  await expect(bRow.getByTestId('setting-tag')).toHaveText('This device only')

  // A changes it again: B keeps 31.
  await setNewPerDay(a, '44')
  await b.waitForTimeout(2500)
  await b.goto('/#/settings/review')
  await expect(bInput).toHaveValue('31')

  // Reset to synced value: B takes A's 44.
  await bRow.getByTestId('setting-sync-menu').click()
  await b.getByRole('menuitem', { name: 'Reset to synced value' }).click()
  await expect(bInput).toHaveValue('44')
  await expect(bRow.getByTestId('setting-tag')).toHaveText('All devices')

  // The footer button clears every override on this device.
  await bRow.getByTestId('setting-sync-menu').click()
  await b.getByRole('menuitem', { name: 'Keep on this device only' }).click()
  await b.goto('/#/settings/sync')
  await b.getByTestId('reset-device-settings').click()
  await expect(
    b.getByText('This device now follows your synced settings.'),
  ).toBeVisible()
})

test('the AI spending limit set on A shows on B', async ({ browser }) => {
  test.setTimeout(180_000)
  const { a, b } = await twoDevices(browser)

  await a.goto('/#/settings/ai')
  const capA = a.getByTestId('ai-cap')
  await capA.fill('12')
  await capA.press('Tab')
  await a.waitForTimeout(800)

  await b.goto('/#/settings/ai')
  await expect(b.getByTestId('ai-cap')).toHaveValue('12', { timeout: 20_000 })
})

/**
 * The one-time step per device: a value this device already had is sent with
 * the oldest clock, so the account's newer value wins, and a quiet notice
 * says how many changed, with Undo (keeps this device's own value).
 */
const SIZE = '[data-setting-id="reading.size"]'

async function arrivedOnB(browser: Parameters<typeof device>[0]) {
  const { serve, pages } = makeServer()
  const a = await device(browser, serve, pages)
  await setupA(a, ['one line'])
  // A changes the text size (a Reading setting that follows the account).
  await a.goto('/#/settings/reading')
  await a.locator(`${SIZE} select`).selectOption('150')
  await expect(a.locator(`${SIZE} select`)).toHaveValue('150')
  await a.waitForTimeout(800)

  const b = await device(browser, serve, pages)
  // B is a device from before settings followed you: it already has its own
  // text size and has not done the one-time step yet.
  await b.context().addInitScript(() => {
    if (!localStorage.getItem('learning-notes:settings.migrated.v1'))
      localStorage.setItem('learning-notes:reading.size', '115')
  })
  // The first start does the one-time step (and opens the notice window).
  await b.goto('/')
  await expect
    .poll(() =>
      b.evaluate(() =>
        localStorage.getItem('learning-notes:settings.migrated.v1'),
      ),
    )
    .toBe('true')
  await setupB(b)
  return { a, b }
}

test('migration notice: says what changed to match your other devices, and Undo keeps this device’s value', async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const { b } = await arrivedOnB(browser)
  const notice = b.getByTestId('settings-notice')
  await expect(notice).toContainText('Settings now follow you', {
    timeout: 20_000,
  })
  await expect(notice).toContainText('1 changed to match your other devices')
  await b.goto('/#/settings/reading')
  await expect(b.locator(`${SIZE} select`)).toHaveValue('150')
  await expect(b.getByTestId('settings-notice')).toBeVisible()
  await b
    .getByTestId('settings-notice')
    .getByRole('button', { name: 'Undo' })
    .click()
  await expect(b.getByTestId('settings-notice')).toHaveCount(0)
  // This device's own value is back, and it stays its own.
  await expect(b.locator(`${SIZE} select`)).toHaveValue('115')
  await expect(b.locator(SIZE).getByTestId('setting-tag')).toHaveText(
    'This device only',
  )
  await b.reload()
  await expect(b.locator(`${SIZE} select`)).toHaveValue('115')
  await expect(b.getByTestId('settings-notice')).toHaveCount(0)
})

test('migration notice: OK keeps the synced value and the notice goes', async ({
  browser,
}) => {
  test.setTimeout(180_000)
  const { b } = await arrivedOnB(browser)
  const notice = b.getByTestId('settings-notice')
  await expect(notice).toBeVisible({ timeout: 20_000 })
  await notice.getByRole('button', { name: 'OK' }).click()
  await expect(notice).toHaveCount(0)
  await b.goto('/#/settings/reading')
  await expect(b.locator(`${SIZE} select`)).toHaveValue('150')
  await expect(b.locator(SIZE).getByTestId('setting-tag')).toHaveText(
    'All devices',
  )
  await b.reload()
  await expect(b.getByTestId('settings-notice')).toHaveCount(0)
})
