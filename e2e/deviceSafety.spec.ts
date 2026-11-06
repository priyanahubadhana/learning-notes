import { expect, test } from '@playwright/test'
import { cornerAction } from './helpers.ts'

test('Settings shows how safe this device is and how to install', async ({
  page,
}) => {
  await page.goto('/')
  await cornerAction(page, 'Settings')
  const section = page.getByRole('region', { name: 'This device' })
  await expect(section).toContainText('Storage:')
  await expect(section).toContainText('No backup file saved yet.')
  await expect(section).toContainText('Install first, then start')
})

test('a database that will not open is never shown as an empty app', async ({
  page,
}) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException('Internal error', 'UnknownError')
    }
  })
  await page.goto('/')
  // The check before the upgrade fails first; it lets the user go on.
  const goOn = page.getByRole('button', { name: 'Skip the file, just update' })
  const failed = page.getByRole('alert')
  await expect(goOn.or(failed).first()).toBeVisible()
  if (await goOn.isVisible()) await goOn.click()
  await expect(failed).toContainText('Your notes could not be opened')
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await expect(page.locator('aside')).toBeHidden()
})

test('a full device says so', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('aside')).toBeAttached()
  await page.evaluate(() => {
    void Promise.reject(new DOMException('full', 'QuotaExceededError'))
  })
  await expect(page.getByText('This device is out of space')).toBeVisible()
})
